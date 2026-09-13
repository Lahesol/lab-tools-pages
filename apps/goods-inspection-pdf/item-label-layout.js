(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ItemLabelLayout = factory();
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  const PT_TO_MM = 0.352778;
  const MAX_FONT_PT = 10.5;
  const MIN_FONT_PT = 8;
  const LINE_HEIGHT = 1.3;
  const PADDING_X_MM = 3;
  const PADDING_Y_MM = 1.5;
  const QUANTITY_FONT_PT = 8.5;
  const QUANTITY_GAP_MM = 2;
  const FONT_FAMILY = '"Malgun Gothic", "맑은 고딕", sans-serif';
  const segmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("ko", { granularity: "grapheme" }) : null;

  // Keep every character. Whitespace is a preferred break; long part numbers
  // may break between graphemes, and explicit newlines always start a new line.
  function wrapText(text, maxWidth, measure) {
    const lines = [];
    for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
      const characters = segmenter
        ? Array.from(segmenter.segment(paragraph), (part) => part.segment)
        : Array.from(paragraph);
      let line = "";
      for (const character of characters) {
        if (line && measure(line + character) > maxWidth) {
          const breakAt = Math.max(line.lastIndexOf(" "), line.lastIndexOf("\t")) + 1;
          if (breakAt > 0 && line.slice(0, breakAt).trim()) {
            lines.push(line.slice(0, breakAt));
            line = line.slice(breakAt);
          }
          if (line && measure(line + character) > maxWidth) {
            lines.push(line);
            line = "";
          }
        }
        line += character;
      }
      lines.push(line);
    }
    return lines;
  }

  // measure(text, pointSize, weight) returns millimetres, independently of the
  // screen zoom or output resolution. Preview and PDF consume this same result.
  function build(items, config, measure, columns = 2, minimumSlots = 4) {
    const slotCount = Math.ceil(Math.max(minimumSlots, items.length) / columns) * columns;
    const cellWidth = config.contentWidth / columns;
    const labels = Array.from({ length: slotCount }, (_, index) => {
      const item = items[index];
      const name = String(item?.name || "").trim();
      const text = `${index + 1}. 품명${name ? `: ${name}` : ""}`;
      const numericQuantity = Math.round(Number(item?.quantity));
      const quantity = name ? `수량 ${Number.isFinite(numericQuantity) ? Math.min(9999, Math.max(1, numericQuantity)) : 1}` : "";
      const quantityWidth = quantity ? measure(quantity, QUANTITY_FONT_PT, "400") : 0;
      // Extra rounding allowance prevents a browser/font rasterizer difference
      // from touching the neighbouring quantity or cell edge.
      const textWidth = cellWidth - PADDING_X_MM * 2 - quantityWidth
        - (quantity ? QUANTITY_GAP_MM : 0) - 0.6;
      let fontPt = MAX_FONT_PT;
      let lines;
      let lineHeight;
      for (; fontPt >= MIN_FONT_PT; fontPt -= 0.5) {
        lineHeight = fontPt * PT_TO_MM * LINE_HEIGHT;
        lines = wrapText(text, textWidth, (value) => measure(value, fontPt, "700"));
        if (lines.length * lineHeight + PADDING_Y_MM * 2 <= config.labelHeight
          || fontPt === MIN_FONT_PT) break;
      }
      return {
        text, lines, fontPt, lineHeight, textWidth, quantity, quantityWidth,
        height: Math.max(config.labelHeight, lines.length * lineHeight + PADDING_Y_MM * 2),
      };
    });
    let gridHeight = 0;
    const rows = [];
    for (let start = 0; start < slotCount; start += columns) {
      const labelHeight = Math.max(...labels.slice(start, start + columns).map((label) => label.height));
      const blockHeight = labelHeight + config.photoHeight;
      rows.push({ y: gridHeight, labelHeight, blockHeight });
      gridHeight += blockHeight;
    }
    const extraHeight = Math.max(0, gridHeight - minimumSlots / columns * config.blockHeight);
    return { labels, rows, cellWidth, slotCount, gridHeight, extraHeight,
      documentHeight: config.baseHeight + extraHeight };
  }

  return Object.freeze({ build, wrapText, PT_TO_MM, MIN_FONT_PT, MAX_FONT_PT,
    LINE_HEIGHT, PADDING_X_MM, PADDING_Y_MM, QUANTITY_FONT_PT, QUANTITY_GAP_MM, FONT_FAMILY });
});
