(function attachInvoiceParser(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.InvoiceParser = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createInvoiceParser() {
  "use strict";

  const TABLE_ITEM_HEADER = /(?:품\s*목\s*명?|품\s*명|상품명|제품명|내역|description|item\s*(?:name|description)?|product\s*(?:name|description)?)/i;
  const TABLE_VALUE_HEADER = /(?:규격|수량|단가|금액|가격|qty|quantity|unit\s*price|amount|price)/i;
  const TABLE_END = /(?:^|\s)(?:소계|합계|총계|총액|공급가액|부가세|세액|결제금액|결제정보|subtotal|grand\s*total|total|vat|tax|balance\s*due|amount\s*due)(?:\s|[:：]|$)/i;
  const STANDALONE_COLUMN_HEADER = /^(?:no\.?|번호|품\s*목\s*명?|품\s*명|상품명|제품명|내역|description|item|product|qty|quantity|수량|단가|금액|amount|price)$/i;
  const LEADING_ROW_NUMBER = /^\s*(?:(?:no\.?|item)\s*)?(\d{1,3})[.)-]?\s+/i;
  const NUMERIC_TOKEN = /^(?:(?:KRW|USD|EUR|JPY|CNY|₩|\$|€|¥)\s*)?[-+]?\d[\d,.]*(?:%|원|개|ea|pcs?)?$/i;
  const COLUMN_UNIT_TOKEN = /^(?:ea|pcs?|개|box|set|lot|unit|units|원|krw|usd|eur|jpy|cny)$/i;
  const MEANINGFUL_TEXT = /[가-힣A-Za-z]/;

  const METADATA_PATTERNS = [
    /^(?:invoice|receipt|credit\s*card\s*receipt|tax\s*invoice|quotation|estimate)(?:\s|[-:：]|$)/i,
    /(?:송장|영수증).*(?:송장|영수증|신용카드|번호|일자|페이지)/i,
    /(?:invoice|receipt)\s*(?:no\.?|number|date|page)/i,
    /(?:고객\s*(?:서비스|주문|번호|담당자)|customer\s*(?:service|number|no\.?|id)|bill\s*to|ship\s*to)/i,
    /(?:master\s*tracker|tracking\s*(?:no\.?|number)|트래커\s*번호|추적\s*번호)/i,
    /(?:phone|tel|fax|e-?mail|website|전화|팩스|이메일|담당자|주소)\s*[:：]/i,
    /(?:swift|iban|bank\s*account|account\s*(?:no\.?|number)|currency|exchange\s*rate|환율|통화)\s*[:：]/i,
    /(?:사업자|등록번호|대표자|공급자|공급받는자|상호|납기|발행일|작성일|결제일|주문일|배송일)/i,
    /(?:페이지|page)\s*(?:번호|no\.?|number|\d+\s*(?:\/|of)\s*\d+)/i,
    /^\s*(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+)/i,
    /\b\d{1,6}\s+[A-Za-z0-9 .'-]+\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?)\b/i,
    /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b.*\bUSA\b/i,
    /^(?:date|invoice\s*date|receipt\s*date|송장\s*일자|거래\s*일시|승인\s*일시)\b/i,
    /(?:credit\s*card|신용카드|카드\s*번호|승인\s*번호|마스터\s*트래커)/i,
  ];

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeLine(entry, index) {
    if (typeof entry === "string") return { text: normalizeText(entry), index, pageNumber: 1, y: null, xMin: null };
    return {
      ...entry,
      text: normalizeText(entry?.text),
      index,
      pageNumber: Number(entry?.pageNumber || 1),
      y: Number.isFinite(entry?.y) ? Number(entry.y) : null,
      xMin: Number.isFinite(entry?.xMin) ? Number(entry.xMin) : null,
    };
  }

  function isTableHeader(text) {
    return TABLE_ITEM_HEADER.test(text) && TABLE_VALUE_HEADER.test(text);
  }

  function isTableEnd(text) {
    return text.length <= 100 && TABLE_END.test(text);
  }

  function looksLikePhoneNumber(text) {
    const compact = String(text || "").trim();
    if (!/^\+?\d[\d\s()/-]{7,}$/.test(compact)) return false;
    const groups = compact.split(/[\s()/-]+/).filter(Boolean);
    return groups.length >= 2 && groups.every((group) => group.length <= 4);
  }

  function isMetadataLine(text) {
    return looksLikePhoneNumber(text) || METADATA_PATTERNS.some((pattern) => pattern.test(text));
  }

  function stripTrailingColumns(text, inTable) {
    const tokens = text.split(/\s+/);
    let cursor = tokens.length - 1;
    let numericCount = 0;
    let removableStart = tokens.length;

    while (cursor >= 0) {
      const token = tokens[cursor].replace(/^[([{]+|[\])},;]+$/g, "");
      if (NUMERIC_TOKEN.test(token)) {
        numericCount += 1;
        removableStart = cursor;
        cursor -= 1;
        continue;
      }
      if (numericCount > 0 && COLUMN_UNIT_TOKEN.test(token)) {
        removableStart = cursor;
        cursor -= 1;
        continue;
      }
      break;
    }

    const shouldStrip = numericCount >= 2 || (inTable && numericCount >= 1);
    return {
      text: shouldStrip ? tokens.slice(0, removableStart).join(" ") : text,
      numericColumnCount: shouldStrip ? numericCount : 0,
    };
  }

  function parseCandidateLine(line, inTable) {
    const original = normalizeText(line.text);
    if (!original || original.length < 3 || original.length > 180) return null;
    if (isTableHeader(original) || isTableEnd(original) || isMetadataLine(original) || STANDALONE_COLUMN_HEADER.test(original)) return null;

    const leadingMatch = original.match(LEADING_ROW_NUMBER);
    let working = leadingMatch ? original.slice(leadingMatch[0].length) : original;
    const trailing = stripTrailingColumns(working, inTable);
    working = normalizeText(trailing.text)
      .replace(/^[-•·:|]+\s*/, "")
      .replace(/\s*[-•·:|]+$/, "")
      .trim();

    if (!working || working.length < 3 || working.length > 110) return null;
    const codeLike = /^[A-Za-z0-9][A-Za-z0-9._\/-]{4,}$/.test(working)
      && /\d/.test(working)
      && /[._\/-]/.test(working);
    if ((!MEANINGFUL_TEXT.test(working) && !codeLike) || isMetadataLine(working)) return null;
    if (/^[A-Za-z가-힣 ]{1,3}$/.test(working)) return null;
    if (/^(?:of|page|no|item)\s*\d*$/i.test(working)) return null;
    if (/^[^:：]{1,24}[:：]\s*/.test(working) && trailing.numericColumnCount === 0) return null;

    let score = 1;
    if (inTable) score += 3;
    if (leadingMatch) score += 4;
    if (trailing.numericColumnCount >= 2) score += 4;
    else if (trailing.numericColumnCount === 1) score += 2;
    if (!inTable && score < 5) return null;

    return {
      name: working,
      score,
      hasLeadingIndex: Boolean(leadingMatch),
      numericColumnCount: trailing.numericColumnCount,
      line,
    };
  }

  function addUniqueCandidate(candidates, candidate, maxItems) {
    const normalized = candidate.name.toLocaleLowerCase("ko-KR").replace(/[^0-9a-z가-힣]+/gi, " ").trim();
    if (!normalized) return;
    if (candidates.some((entry) => entry.normalized === normalized)) return;
    candidates.push({ ...candidate, normalized });
    if (candidates.length > maxItems) candidates.length = maxItems;
  }

  function parseInvoiceItems(sourceLines, options = {}) {
    const maxItems = Math.max(1, Math.min(200, Number(options.maxItems) || 40));
    const lines = (Array.isArray(sourceLines) ? sourceLines : [])
      .map(normalizeLine)
      .filter((line) => line.text);
    const tableHeaderCount = lines.filter((line) => isTableHeader(line.text)).length;
    const candidates = [];

    if (tableHeaderCount) {
      let inTable = false;
      for (const line of lines) {
        if (isTableHeader(line.text)) {
          inTable = true;
          continue;
        }
        if (!inTable) continue;
        if (isTableEnd(line.text)) {
          inTable = false;
          continue;
        }
        const candidate = parseCandidateLine(line, true);
        if (candidate) addUniqueCandidate(candidates, candidate, maxItems);
        if (candidates.length >= maxItems) break;
      }
    }

    if (!candidates.length) {
      for (const line of lines) {
        const candidate = parseCandidateLine(line, false);
        if (candidate) addUniqueCandidate(candidates, candidate, maxItems);
        if (candidates.length >= maxItems) break;
      }
    }

    return {
      items: candidates.map((candidate) => candidate.name),
      method: candidates.length ? (tableHeaderCount ? "table" : "row-pattern") : "none",
      confidence: candidates.length ? (tableHeaderCount ? "high" : "medium") : "low",
      sourceLineCount: lines.length,
      tableHeaderCount,
    };
  }

  function extractItemCandidates(sourceLines, options = {}) {
    return parseInvoiceItems(sourceLines, options).items;
  }

  function extractRoiCandidates(sourceLines, options = {}) {
    const maxItems = Math.max(1, Math.min(200, Number(options.maxItems) || 40));
    const candidates = [];
    const lines = (Array.isArray(sourceLines) ? sourceLines : [])
      .map(normalizeLine)
      .filter((line) => line.text);

    for (const line of lines) {
      const candidate = parseCandidateLine(line, true);
      if (candidate) addUniqueCandidate(candidates, candidate, maxItems);
      if (candidates.length >= maxItems) break;
    }

    return {
      items: candidates.map((candidate) => candidate.name),
      sourceLineCount: lines.length,
    };
  }

  return {
    extractItemCandidates,
    extractRoiCandidates,
    isMetadataLine,
    isTableHeader,
    parseInvoiceItems,
  };
});
