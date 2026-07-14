(() => {
  "use strict";

  const ITEMS_PER_PAGE = 4;
  const MAX_ITEMS = 40;
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
  const SIGNATURE_STORAGE_PREFIX = "goods-inspection.signature.v1.";
  const REVIEWERS = [
    { id: "kim-jaehoon", name: "김재훈" },
    { id: "yoo-youngwoo", name: "유영우" },
    { id: "hwang-seokyoung", name: "황석영" },
    { id: "p-kim", name: "P. Kim" },
  ];

  const state = {
    invoiceFile: null,
    invoiceText: "",
    invoiceCandidates: [],
    photos: [],
    items: [],
    countMode: "auto",
    manualCount: 4,
    previewPage: 0,
    draggedPhotoId: null,
    selectedReviewerId: null,
    inspectionDate: todayIso(),
    exporting: false,
  };

  const elements = {
    readyState: document.querySelector("#readyState"),
    readyStateTitle: document.querySelector("#readyStateTitle"),
    readyStateDetail: document.querySelector("#readyStateDetail"),
    invoiceInput: document.querySelector("#invoiceInput"),
    invoiceDropzone: document.querySelector("#invoiceDropzone"),
    invoiceStatus: document.querySelector("#invoiceStatus"),
    invoiceFileName: document.querySelector("#invoiceFileName"),
    invoiceResult: document.querySelector("#invoiceResult"),
    invoiceResultTitle: document.querySelector("#invoiceResultTitle"),
    invoiceResultMessage: document.querySelector("#invoiceResultMessage"),
    invoiceRawText: document.querySelector("#invoiceRawText"),
    photoInput: document.querySelector("#photoInput"),
    photoDropzone: document.querySelector("#photoDropzone"),
    photoCount: document.querySelector("#photoCount"),
    photoStrip: document.querySelector("#photoStrip"),
    itemRows: document.querySelector("#itemRows"),
    emptyItems: document.querySelector("#emptyItems"),
    itemCounter: document.querySelector("#itemCounter"),
    countModeInputs: [...document.querySelectorAll('input[name="countMode"]')],
    manualItemCount: document.querySelector("#manualItemCount"),
    autoCountStatus: document.querySelector("#autoCountStatus"),
    addItemButton: document.querySelector("#addItemButton"),
    resetButton: document.querySelector("#resetButton"),
    reviewerGrid: document.querySelector("#reviewerGrid"),
    inspectionDate: document.querySelector("#inspectionDate"),
    documentPreview: document.querySelector("#documentPreview"),
    previewItems: document.querySelector("#previewItems"),
    previewDate: document.querySelector("#previewDate"),
    previewReviewerName: document.querySelector("#previewReviewerName"),
    previewSignature: document.querySelector("#previewSignature"),
    previewMeta: document.querySelector("#previewMeta"),
    previewPrevButton: document.querySelector("#previewPrevButton"),
    previewNextButton: document.querySelector("#previewNextButton"),
    previewPageIndicator: document.querySelector("#previewPageIndicator"),
    previewPageNumber: document.querySelector("#previewPageNumber"),
    previewThumbnails: document.querySelector("#previewThumbnails"),
    refreshPreviewButton: document.querySelector("#refreshPreviewButton"),
    validationTitle: document.querySelector("#validationTitle"),
    validationMessage: document.querySelector("#validationMessage"),
    exportButton: document.querySelector("#exportButton"),
    exportLabel: document.querySelector("#exportLabel"),
    toast: document.querySelector("#toast"),
  };

  let pdfJsPromise = null;
  let toastTimer = null;

  initialize();

  function initialize() {
    elements.inspectionDate.value = state.inspectionDate;
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    elements.invoiceInput.addEventListener("change", (event) => {
      const [file] = event.target.files;
      if (file) handleInvoiceFile(file);
      event.target.value = "";
    });

    elements.photoInput.addEventListener("change", (event) => {
      handlePhotoFiles([...event.target.files]);
      event.target.value = "";
    });

    attachDropzone(elements.invoiceDropzone, (files) => {
      const file = files.find((entry) => entry.type === "application/pdf" || entry.name.toLowerCase().endsWith(".pdf"));
      if (!file) {
        showToast("PDF 파일을 선택해 주세요.", "error");
        return;
      }
      handleInvoiceFile(file);
    });

    attachDropzone(elements.photoDropzone, (files) => {
      const imageFiles = files.filter((entry) => entry.type.startsWith("image/"));
      if (!imageFiles.length) {
        showToast("JPG, PNG 또는 WEBP 사진을 선택해 주세요.", "error");
        return;
      }
      handlePhotoFiles(imageFiles);
    });

    elements.addItemButton.addEventListener("click", () => {
      if (state.items.length >= MAX_ITEMS) {
        showToast(`최대 ${MAX_ITEMS}개 품목까지 만들 수 있습니다.`, "error");
        return;
      }
      state.countMode = "manual";
      state.manualCount = state.items.length + 1;
      ensureItemCount(state.manualCount);
      renderAll();
      const input = elements.itemRows.querySelector(`[data-item-index="${state.items.length - 1}"] input[data-field="name"]`);
      input?.focus();
    });

    elements.countModeInputs.forEach((input) => {
      input.addEventListener("change", (event) => {
        state.countMode = event.target.value;
        if (state.countMode === "manual") {
          state.manualCount = Math.max(1, state.items.length || state.manualCount || ITEMS_PER_PAGE);
          ensureItemCount(state.manualCount);
        } else {
          syncAutomaticItemCount();
        }
        renderAll();
      });
    });

    elements.manualItemCount.addEventListener("input", (event) => {
      state.manualCount = clampItemCount(event.target.value, 1);
      if (state.countMode === "manual") {
        ensureItemCount(state.manualCount);
        renderAll();
      }
    });

    elements.resetButton.addEventListener("click", () => {
      if (!state.items.length && !state.photos.length && !state.invoiceFile) return;
      if (!window.confirm("현재 문서의 Invoice, 사진, 품목 입력을 초기화할까요? 등록된 검수자 서명은 유지됩니다.")) return;
      state.invoiceFile = null;
      state.invoiceText = "";
      state.invoiceCandidates = [];
      state.photos = [];
      state.items = [];
      state.countMode = "auto";
      state.manualCount = ITEMS_PER_PAGE;
      state.previewPage = 0;
      elements.invoiceResult.hidden = true;
      renderAll();
      showToast("현재 문서를 초기화했습니다.");
    });

    elements.inspectionDate.addEventListener("change", (event) => {
      state.inspectionDate = event.target.value || todayIso();
      renderPreview();
      updateValidation();
    });

    elements.refreshPreviewButton.addEventListener("click", () => {
      renderPreview();
      showToast("미리보기를 최신 입력값으로 갱신했습니다.");
    });

    elements.previewPrevButton.addEventListener("click", () => {
      state.previewPage = Math.max(0, state.previewPage - 1);
      renderPreview();
    });

    elements.previewNextButton.addEventListener("click", () => {
      state.previewPage = Math.min(getPageCount() - 1, state.previewPage + 1);
      renderPreview();
    });

    elements.exportButton.addEventListener("click", exportPdf);
  }

  function attachDropzone(dropzone, onFiles) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
      });
    });

    dropzone.addEventListener("drop", (event) => onFiles([...event.dataTransfer.files]));
  }

  async function handleInvoiceFile(file) {
    state.invoiceFile = file;
    state.invoiceText = "";
    state.invoiceCandidates = [];
    elements.invoiceResult.hidden = false;
    elements.invoiceResultTitle.textContent = "Invoice 분석 중";
    elements.invoiceResultMessage.textContent = "PDF의 텍스트를 브라우저에서 읽고 있습니다.";
    elements.invoiceRawText.textContent = "";
    renderInvoiceStatus("processing");

    try {
      const lines = await extractPdfLines(file);
      state.invoiceText = lines.join("\n");
      const candidates = extractItemCandidates(lines);
      mergeInvoiceCandidates(candidates);

      elements.invoiceResultTitle.textContent = "Invoice 분석 결과";
      if (candidates.length) {
        elements.invoiceResultMessage.textContent = `${candidates.length}개 품목 후보를 입력했습니다. Invoice 형식에 따라 오인식될 수 있으므로 품목명을 확인해 주세요.`;
      } else {
        elements.invoiceResultMessage.textContent = "품목 후보를 자동으로 찾지 못했습니다. 스캔형 PDF이거나 표 구조가 복잡할 수 있으니 품목명을 직접 입력해 주세요.";
      }
      elements.invoiceRawText.textContent = state.invoiceText || "추출된 텍스트가 없습니다.";
      renderInvoiceStatus("complete");
      renderAll();
    } catch (error) {
      console.error(error);
      elements.invoiceResultTitle.textContent = "Invoice 자동 분석을 완료하지 못했습니다";
      elements.invoiceResultMessage.textContent = "품목명을 직접 입력할 수 있습니다. 암호화되었거나 이미지로 스캔된 PDF는 OCR 없이 텍스트를 추출할 수 없습니다.";
      elements.invoiceRawText.textContent = error instanceof Error ? error.message : String(error);
      renderInvoiceStatus("error");
      renderAll();
      showToast("Invoice 텍스트를 읽지 못했습니다. 품목명을 직접 입력해 주세요.", "error");
    }
  }

  async function extractPdfLines(file) {
    const pdfjsLib = await getPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const lines = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const buckets = [];

      for (const item of textContent.items) {
        const text = String(item.str || "").trim();
        if (!text) continue;
        const x = Number(item.transform?.[4] || 0);
        const y = Number(item.transform?.[5] || 0);
        let bucket = buckets.find((entry) => Math.abs(entry.y - y) <= 2.6);
        if (!bucket) {
          bucket = { y, parts: [] };
          buckets.push(bucket);
        }
        bucket.parts.push({ x, text });
      }

      buckets
        .sort((a, b) => b.y - a.y)
        .forEach((bucket) => {
          const line = bucket.parts
            .sort((a, b) => a.x - b.x)
            .map((entry) => entry.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (line) lines.push(line);
        });
    }

    return lines;
  }

  async function getPdfJs() {
    if (!pdfJsPromise) {
      pdfJsPromise = import("./vendor/pdfjs/pdf.min.mjs").then((pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", window.location.href).href;
        return pdfjsLib;
      });
    }
    return pdfJsPromise;
  }

  function extractItemCandidates(lines) {
    const excluded = /(?:invoice|tax invoice|quotation|estimate|receipt|거래명세|공급자|공급받는자|사업자|등록번호|상호|대표|주소|전화|팩스|이메일|작성일|발행일|결제일|납기|주문|배송|합계|소계|공급가|부가세|세액|total|subtotal|amount|balance|bill to|ship to|payment|date|description|item name|product name|품목명|품명|규격|단가|수량|금액|비고|page \d+)/i;
    const candidates = [];

    for (const sourceLine of lines) {
      let line = sourceLine
        .replace(/^\s*(?:no\.?|item)?\s*\d+[.)-]?\s*/i, "")
        .replace(/\s+(?:(?:KRW|USD|EUR|₩|\$|€)\s*)?[\d,.]+(?:\s+(?:(?:KRW|USD|EUR|₩|\$|€)\s*)?[\d,.]+)+\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!line || line.length < 3 || line.length > 80 || excluded.test(line)) continue;
      if (!/[가-힣A-Za-z]/.test(line)) continue;
      if (/^[A-Za-z가-힣 ]{1,3}$/.test(line)) continue;
      if (/^(?:www\.|https?:|[\w.+-]+@[\w.-]+)/i.test(line)) continue;

      line = line.replace(/^[-•·:|]+\s*/, "").replace(/\s*[-•·:|]+$/, "").trim();
      const normalized = line.toLocaleLowerCase("ko-KR");
      if (!line || candidates.some((entry) => entry.toLocaleLowerCase("ko-KR") === normalized)) continue;
      candidates.push(line);
      if (candidates.length === MAX_ITEMS) break;
    }

    return candidates;
  }

  function mergeInvoiceCandidates(candidates) {
    state.invoiceCandidates = candidates.slice(0, MAX_ITEMS);
    if (state.countMode === "auto" && state.invoiceCandidates.length) {
      ensureItemCount(state.invoiceCandidates.length);
    } else if (state.countMode === "manual") {
      ensureItemCount(state.manualCount);
    }

    state.invoiceCandidates.slice(0, state.items.length).forEach((candidate, index) => {
      if (state.items[index] && !state.items[index].name.trim()) state.items[index].name = candidate;
    });
    syncItemsToPhotoOrder();
  }

  async function handlePhotoFiles(files) {
    const availableSlots = MAX_ITEMS - state.photos.length;
    const accepted = files.slice(0, availableSlots);

    if (!availableSlots) {
      showToast(`최대 ${MAX_ITEMS}장의 물품 사진을 넣을 수 있습니다.`, "error");
      return;
    }

    if (files.length > accepted.length) {
      showToast(`최대 ${MAX_ITEMS}장까지만 추가되어 나머지 사진은 제외했습니다.`, "error");
    }

    for (const file of accepted) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        showToast(`${file.name}은 20MB를 초과해 제외했습니다.`, "error");
        continue;
      }
      const dataUrl = await fileToDataUrl(file);
      state.photos.push({ id: cryptoRandomId(), name: file.name, dataUrl });
    }

    if (state.countMode === "auto" && !state.invoiceCandidates.length) syncAutomaticItemCount();
    syncItemsToPhotoOrder();
    renderAll();
  }

  function syncItemsToPhotoOrder() {
    state.items.forEach((item, index) => {
      item.photoId = state.photos[index]?.id || "";
    });
  }

  function ensureItemCount(value) {
    const target = clampItemCount(value, state.countMode === "manual" ? 1 : 0);
    while (state.items.length < target) state.items.push(createItem());
    if (state.items.length > target) state.items.splice(target);
    syncItemsToPhotoOrder();
    state.previewPage = Math.min(state.previewPage, getPageCount() - 1);
  }

  function syncAutomaticItemCount() {
    const detectedCount = state.invoiceCandidates.length || state.photos.length;
    ensureItemCount(detectedCount);
  }

  function clampItemCount(value, minimum = 0) {
    const numeric = Math.round(Number(value));
    if (!Number.isFinite(numeric)) return minimum;
    return Math.min(MAX_ITEMS, Math.max(minimum, numeric));
  }

  function getPageCount() {
    return Math.max(1, Math.ceil(state.items.length / ITEMS_PER_PAGE));
  }

  function renderAll() {
    renderInvoiceStatus();
    renderCountControls();
    renderPhotoStrip();
    renderItemRows();
    renderReviewers();
    renderPreview();
    updateValidation();
  }

  function renderCountControls() {
    elements.countModeInputs.forEach((input) => {
      input.checked = input.value === state.countMode;
    });
    elements.manualItemCount.disabled = state.countMode !== "manual";
    elements.manualItemCount.value = String(state.manualCount);

    if (state.countMode === "manual") {
      elements.autoCountStatus.textContent = `수동으로 ${state.items.length}개 품목 칸을 사용합니다. 페이지당 ${ITEMS_PER_PAGE}개씩 배치됩니다.`;
    } else if (state.invoiceCandidates.length) {
      elements.autoCountStatus.textContent = `Invoice에서 ${state.invoiceCandidates.length}개 품목을 감지해 ${getPageCount()}쪽으로 구성했습니다.`;
    } else if (state.photos.length) {
      elements.autoCountStatus.textContent = `Invoice 품목을 아직 감지하지 못해 사진 ${state.photos.length}장 기준으로 임시 구성했습니다.`;
    } else {
      elements.autoCountStatus.textContent = "Invoice를 올리면 감지한 품목 수만큼 칸이 만들어집니다.";
    }
  }

  function renderInvoiceStatus(stateOverride) {
    const status = stateOverride || (state.invoiceFile ? "complete" : "empty");
    elements.invoiceFileName.textContent = state.invoiceFile?.name || "PDF를 선택하거나 놓으세요";
    if (status === "processing") {
      elements.invoiceStatus.textContent = "분석 중";
    } else if (status === "error") {
      elements.invoiceStatus.textContent = "수동 입력 필요";
    } else if (status === "complete") {
      elements.invoiceStatus.textContent = formatFileSize(state.invoiceFile?.size || 0);
    } else {
      elements.invoiceStatus.textContent = "선택 안 됨";
    }
  }

  function renderPhotoStrip() {
    elements.photoStrip.replaceChildren();
    elements.photoCount.textContent = `${state.photos.length}장`;

    state.photos.forEach((photo, index) => {
      const container = document.createElement("div");
      container.className = "photo-order-item";
      container.draggable = true;
      container.dataset.photoId = photo.id;

      const number = document.createElement("span");
      number.className = "photo-order-item__number";
      number.textContent = String(index + 1);

      const thumbnail = document.createElement("div");
      thumbnail.className = "photo-order-item__thumb";
      const image = document.createElement("img");
      image.src = photo.dataUrl;
      image.alt = photo.name;
      thumbnail.append(image);

      const name = document.createElement("span");
      name.className = "photo-order-item__name";
      name.textContent = photo.name;
      name.title = photo.name;

      const actions = document.createElement("div");
      actions.className = "photo-order-item__actions";
      const moveUpButton = createPhotoOrderButton("up", `${photo.name}을 앞 순서로 이동`, index === 0);
      const moveDownButton = createPhotoOrderButton("down", `${photo.name}을 뒤 순서로 이동`, index === state.photos.length - 1);
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.dataset.action = "remove";
      removeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>';
      removeButton.setAttribute("aria-label", `${photo.name} 사진 삭제`);
      moveUpButton.addEventListener("click", () => movePhoto(photo.id, -1));
      moveDownButton.addEventListener("click", () => movePhoto(photo.id, 1));
      removeButton.addEventListener("click", () => removePhoto(photo.id));
      actions.append(moveUpButton, moveDownButton, removeButton);
      container.append(number, thumbnail, name, actions);

      container.addEventListener("dragstart", (event) => {
        state.draggedPhotoId = photo.id;
        container.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", photo.id);
      });
      container.addEventListener("dragend", () => {
        state.draggedPhotoId = null;
        container.classList.remove("is-dragging");
        elements.photoStrip.querySelectorAll(".is-drop-target").forEach((entry) => entry.classList.remove("is-drop-target"));
      });
      container.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        container.classList.add("is-drop-target");
      });
      container.addEventListener("dragleave", () => container.classList.remove("is-drop-target"));
      container.addEventListener("drop", (event) => {
        event.preventDefault();
        container.classList.remove("is-drop-target");
        const sourceId = state.draggedPhotoId || event.dataTransfer.getData("text/plain");
        reorderPhotoBefore(sourceId, photo.id);
      });
      elements.photoStrip.append(container);
    });
  }

  function createPhotoOrderButton(direction, label, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = disabled;
    button.setAttribute("aria-label", label);
    button.innerHTML = direction === "up"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6" /></svg>';
    return button;
  }

  function movePhoto(photoId, delta) {
    const sourceIndex = state.photos.findIndex((photo) => photo.id === photoId);
    const targetIndex = Math.min(state.photos.length - 1, Math.max(0, sourceIndex + delta));
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    const [moved] = state.photos.splice(sourceIndex, 1);
    state.photos.splice(targetIndex, 0, moved);
    syncItemsToPhotoOrder();
    renderAll();
  }

  function reorderPhotoBefore(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return;
    const sourceIndex = state.photos.findIndex((photo) => photo.id === sourceId);
    const targetIndex = state.photos.findIndex((photo) => photo.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = state.photos.splice(sourceIndex, 1);
    const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    state.photos.splice(insertionIndex, 0, moved);
    syncItemsToPhotoOrder();
    renderAll();
  }

  function removePhoto(photoId) {
    state.photos = state.photos.filter((photo) => photo.id !== photoId);
    state.items.forEach((item) => {
      if (item.photoId === photoId) item.photoId = "";
    });
    if (state.countMode === "auto" && !state.invoiceCandidates.length) syncAutomaticItemCount();
    else syncItemsToPhotoOrder();
    renderAll();
  }

  function renderItemRows() {
    elements.itemRows.replaceChildren();
    elements.emptyItems.hidden = state.items.length > 0;
    elements.itemCounter.textContent = `${state.items.length}개 · ${getPageCount()}쪽`;
    elements.addItemButton.disabled = state.items.length >= MAX_ITEMS;

    state.items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.dataset.itemIndex = String(index);
      row.setAttribute("role", "row");
      row.innerHTML = `
        <span class="item-row__number" role="cell">${index + 1}</span>
        <label role="cell">
          <span class="visually-hidden">${index + 1}번 품목명</span>
          <input class="field" data-field="name" type="text" maxlength="70" placeholder="Invoice 품목명 입력" />
        </label>
        <label role="cell">
          <span class="visually-hidden">${index + 1}번 수량</span>
          <input class="field" data-field="quantity" type="number" min="1" max="9999" inputmode="numeric" />
        </label>
        <div class="item-row__photo" role="cell">
          <div class="item-photo-preview" aria-hidden="true"></div>
          <label>
            <span class="visually-hidden">${index + 1}번 사진 선택</span>
            <select class="photo-select" data-field="photoId"></select>
          </label>
        </div>
        <div role="cell">
          <button class="icon-button" type="button" aria-label="${index + 1}번 품목 삭제">×</button>
        </div>
      `;

      const nameInput = row.querySelector('[data-field="name"]');
      nameInput.value = item.name;
      nameInput.addEventListener("input", (event) => {
        item.name = event.target.value;
        renderPreview();
        updateValidation();
      });

      const quantityInput = row.querySelector('[data-field="quantity"]');
      quantityInput.value = String(item.quantity);
      quantityInput.addEventListener("input", (event) => {
        item.quantity = clampQuantity(event.target.value);
        renderPreview();
        updateValidation();
      });

      const photoSelect = row.querySelector('[data-field="photoId"]');
      const emptyOption = new Option("사진 선택", "");
      photoSelect.add(emptyOption);
      state.photos.forEach((photo, photoIndex) => photoSelect.add(new Option(`사진 ${photoIndex + 1}`, photo.id)));
      photoSelect.value = item.photoId;
      photoSelect.addEventListener("change", (event) => {
        item.photoId = event.target.value;
        renderItemRows();
        renderPreview();
        updateValidation();
      });

      const preview = row.querySelector(".item-photo-preview");
      const photo = getPhoto(item.photoId);
      if (photo) {
        const image = document.createElement("img");
        image.src = photo.dataUrl;
        image.alt = "";
        preview.append(image);
      }

      row.querySelector(".icon-button").addEventListener("click", () => {
        state.countMode = "manual";
        state.items.splice(index, 1);
        if (!state.items.length) state.items.push(createItem());
        state.manualCount = state.items.length;
        syncItemsToPhotoOrder();
        state.previewPage = Math.min(state.previewPage, getPageCount() - 1);
        renderAll();
      });

      elements.itemRows.append(row);
    });
  }

  function renderReviewers() {
    elements.reviewerGrid.replaceChildren();

    REVIEWERS.forEach((reviewer) => {
      const signature = readStoredSignature(reviewer.id);
      const card = document.createElement("article");
      card.className = `reviewer-card${state.selectedReviewerId === reviewer.id ? " is-selected" : ""}`;
      card.dataset.reviewerId = reviewer.id;

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "reviewer-card__select";
      selectButton.setAttribute("aria-pressed", String(state.selectedReviewerId === reviewer.id));
      selectButton.innerHTML = `
        <span class="reviewer-card__heading"><span class="reviewer-radio" aria-hidden="true"></span><span></span></span>
        <span class="signature-box"></span>
      `;
      selectButton.querySelector(".reviewer-card__heading span:last-child").textContent = reviewer.name;
      const signatureBox = selectButton.querySelector(".signature-box");
      if (signature) {
        const image = document.createElement("img");
        image.src = signature;
        image.alt = `${reviewer.name} 등록 서명`;
        signatureBox.append(image);
      } else {
        signatureBox.textContent = "서명 등록 필요";
      }
      selectButton.addEventListener("click", () => {
        state.selectedReviewerId = reviewer.id;
        renderReviewers();
        renderPreview();
        updateValidation();
      });

      const actions = document.createElement("div");
      actions.className = "reviewer-card__actions";
      const uploadButton = document.createElement("button");
      uploadButton.type = "button";
      uploadButton.textContent = signature ? "서명 교체" : "서명 등록";
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.dataset.action = "remove-signature";
      removeButton.textContent = "서명 삭제";
      removeButton.hidden = !signature;
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/png,image/jpeg,image/webp";

      uploadButton.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async (event) => {
        const [file] = event.target.files;
        if (!file) return;
        await storeReviewerSignature(reviewer, file);
      });
      removeButton.addEventListener("click", () => {
        try {
          localStorage.removeItem(signatureStorageKey(reviewer.id));
        } catch (error) {
          console.warn(error);
        }
        renderReviewers();
        renderPreview();
        updateValidation();
        showToast(`${reviewer.name} 서명을 이 브라우저에서 삭제했습니다.`);
      });

      actions.append(uploadButton, removeButton, fileInput);
      card.append(selectButton, actions);
      elements.reviewerGrid.append(card);
    });
  }

  async function storeReviewerSignature(reviewer, file) {
    if (!file.type.startsWith("image/")) {
      showToast("PNG, JPG 또는 WEBP 서명 이미지를 선택해 주세요.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("서명 이미지는 5MB 이하로 등록해 주세요.", "error");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    try {
      localStorage.setItem(signatureStorageKey(reviewer.id), dataUrl);
    } catch (error) {
      console.error(error);
      showToast("브라우저 저장 공간에 서명을 보관하지 못했습니다.", "error");
      return;
    }
    state.selectedReviewerId = reviewer.id;
    renderReviewers();
    renderPreview();
    updateValidation();
    showToast(`${reviewer.name} 서명을 이 브라우저에 등록했습니다.`);
  }

  function renderPreview() {
    elements.previewItems.replaceChildren();
    const pageCount = getPageCount();
    state.previewPage = Math.min(Math.max(0, state.previewPage), pageCount - 1);
    const startIndex = state.previewPage * ITEMS_PER_PAGE;

    for (let index = 0; index < ITEMS_PER_PAGE; index += 1) {
      const globalIndex = startIndex + index;
      const item = state.items[globalIndex] || createItem();
      const itemElement = document.createElement("div");
      itemElement.className = "template-item";
      const label = document.createElement("div");
      label.className = "template-item__label";
      const name = document.createElement("span");
      name.textContent = `${globalIndex + 1}. 품명${item.name.trim() ? `: ${item.name.trim()}` : ""}`;
      const quantity = document.createElement("small");
      quantity.textContent = item.name.trim() ? `수량 ${clampQuantity(item.quantity)}` : "";
      label.append(name, quantity);

      const photoBox = document.createElement("div");
      photoBox.className = "template-item__photo";
      const photo = getPhoto(item.photoId);
      if (photo) {
        const image = document.createElement("img");
        image.src = photo.dataUrl;
        image.alt = `${globalIndex + 1}번 ${item.name || "물품"} 사진`;
        photoBox.append(image);
      } else {
        photoBox.textContent = "사진을 추가하세요";
      }
      itemElement.append(label, photoBox);
      elements.previewItems.append(itemElement);
    }

    elements.previewMeta.textContent = `A4 ${pageCount}쪽 · 페이지당 ${ITEMS_PER_PAGE}개 품목`;
    elements.previewPageIndicator.textContent = `${state.previewPage + 1} / ${pageCount}`;
    elements.previewPrevButton.disabled = state.previewPage === 0;
    elements.previewNextButton.disabled = state.previewPage >= pageCount - 1;
    elements.documentPreview.setAttribute("aria-label", `물품검수확인서 ${state.previewPage + 1}페이지 미리보기`);
    elements.previewPageNumber.textContent = `${state.previewPage + 1} / ${pageCount}`;
    elements.previewPageNumber.hidden = pageCount === 1;
    elements.previewDate.textContent = formatKoreanDate(state.inspectionDate);
    const reviewer = getSelectedReviewer();
    elements.previewReviewerName.textContent = reviewer?.name || "검수자 미선택";
    const signature = reviewer ? readStoredSignature(reviewer.id) : "";
    if (signature) {
      elements.previewSignature.src = signature;
      elements.previewSignature.hidden = false;
    } else {
      elements.previewSignature.removeAttribute("src");
      elements.previewSignature.hidden = true;
    }

    renderPreviewThumbnails(pageCount);
  }

  function renderPreviewThumbnails(pageCount) {
    elements.previewThumbnails.replaceChildren();
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const start = pageIndex * ITEMS_PER_PAGE;
      const pageItems = state.items.slice(start, start + ITEMS_PER_PAGE);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `preview-thumbnail${pageIndex === state.previewPage ? " is-selected" : ""}`;
      button.setAttribute("aria-pressed", String(pageIndex === state.previewPage));
      button.setAttribute("aria-label", `${pageIndex + 1}페이지 미리보기`);
      const title = document.createElement("strong");
      title.textContent = `페이지 ${pageIndex + 1}`;
      const summary = document.createElement("span");
      summary.textContent = pageItems.length
        ? pageItems.map((item, itemIndex) => `${start + itemIndex + 1}. ${item.name.trim() || "품목명 미입력"}`).join(" · ")
        : "비어 있는 페이지";
      button.append(title, summary);
      button.addEventListener("click", () => {
        state.previewPage = pageIndex;
        renderPreview();
      });
      elements.previewThumbnails.append(button);
    }
  }

  function updateValidation() {
    const issues = [];
    if (!state.items.length) issues.push("품목");
    if (state.items.some((item) => !item.name.trim())) issues.push("품목명");
    if (state.items.some((item) => !getPhoto(item.photoId))) issues.push("물품 사진");
    const reviewer = getSelectedReviewer();
    if (!reviewer) issues.push("검수자");
    if (reviewer && !readStoredSignature(reviewer.id)) issues.push("검수자 서명");
    if (!state.inspectionDate) issues.push("검수일");

    const uniqueIssues = [...new Set(issues)];
    const ready = uniqueIssues.length === 0;
    elements.exportButton.disabled = !ready || state.exporting;
    elements.readyState.dataset.state = ready ? "ready" : "incomplete";

    if (ready) {
      elements.readyStateTitle.textContent = "모든 항목이 준비되었습니다";
      elements.readyStateDetail.textContent = "PDF로 바로 내보낼 수 있습니다";
      elements.validationTitle.textContent = "내보낼 준비가 되었습니다";
      elements.validationMessage.textContent = `${state.items.length}개 품목 · A4 ${getPageCount()}쪽 · ${getSelectedReviewer().name} 검수`;
    } else {
      elements.readyStateTitle.textContent = "자료를 확인해 주세요";
      elements.readyStateDetail.textContent = `${uniqueIssues.join(", ")} 입력이 필요합니다`;
      elements.validationTitle.textContent = "필수 항목을 확인해 주세요";
      elements.validationMessage.textContent = `${uniqueIssues.join(", ")} 입력이 필요합니다.`;
    }
  }

  async function exportPdf() {
    updateValidation();
    if (elements.exportButton.disabled) {
      showToast("PDF 내보내기에 필요한 항목을 먼저 채워 주세요.", "error");
      return;
    }
    if (!window.PDFLib) {
      showToast("PDF 생성 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.", "error");
      return;
    }

    state.exporting = true;
    elements.exportLabel.textContent = "PDF 생성 중…";
    elements.exportButton.disabled = true;

    try {
      await document.fonts?.ready;
      const { PDFDocument } = window.PDFLib;
      const pdfDocument = await PDFDocument.create();
      pdfDocument.setTitle("물품검수확인서");
      pdfDocument.setSubject("가천대학교 물품검수 확인 문서");
      pdfDocument.setCreator("물품검수 확인서 생성 정적 웹 도구");
      const pageCount = getPageCount();

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        elements.exportLabel.textContent = `${pageIndex + 1} / ${pageCount} 페이지 생성 중…`;
        const canvas = await renderDocumentCanvas(pageIndex, pageCount);
        const imageBytes = await canvasToJpegBytes(canvas, 0.97);
        const page = pdfDocument.addPage([595.28, 841.89]);
        const image = await pdfDocument.embedJpg(imageBytes);
        page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
        canvas.width = 1;
        canvas.height = 1;
      }

      const bytes = await pdfDocument.save();
      const reviewer = getSelectedReviewer();
      const fileName = `물품검수확인서_${state.inspectionDate}_${sanitizeFileName(reviewer.name)}.pdf`;
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), fileName);
      showToast("물품검수확인서 PDF를 생성했습니다.");
    } catch (error) {
      console.error(error);
      showToast("PDF를 생성하지 못했습니다. GitHub Pages 또는 같은 출처의 정적 호스팅에서 다시 시도해 주세요.", "error");
    } finally {
      state.exporting = false;
      elements.exportLabel.textContent = "PDF로 내보내기";
      updateValidation();
    }
  }

  async function renderDocumentCanvas(pageIndex, pageCount) {
    const width = 2480;
    const height = 3508;
    const scale = width / 210;
    const mm = (value) => value * scale;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#000000";
    context.strokeStyle = "#111111";
    context.lineWidth = mm(0.25);
    context.textBaseline = "middle";

    const reviewer = getSelectedReviewer();
    const signatureDataUrl = reviewer ? readStoredSignature(reviewer.id) : "";
    const pageStartIndex = pageIndex * ITEMS_PER_PAGE;
    const pageItems = state.items.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
    const [logo, seal, signature, ...itemImages] = await Promise.all([
      safeLoadImage("./assets/gachon-logo.png"),
      safeLoadImage("./assets/gachon-seal.png"),
      safeLoadImage(signatureDataUrl),
      ...Array.from({ length: ITEMS_PER_PAGE }, (_, index) => safeLoadImage(getPhoto(pageItems[index]?.photoId)?.dataUrl || "")),
    ]);

    drawCenteredText(context, "‘2027 TOP 10’ 글로벌 명문 도약", mm(105), mm(17), 12, "400", scale);

    if (logo) drawImageContain(context, logo, mm(14), mm(23), mm(44.45), mm(11.64));
    else drawText(context, "가천대학교", mm(14), mm(29), 12, "700", "left", scale);
    drawCenteredText(context, "물품검수확인서", mm(105), mm(31), 22, "900", scale);
    if (seal) drawImageContain(context, seal, mm(174), mm(21), mm(21.17), mm(19.84));

    const left = 12.7;
    const contentWidth = 184.6;
    const headingY = 48;
    context.strokeRect(mm(left), mm(headingY), mm(contentWidth), mm(17));
    drawCenteredText(context, "물품 사진", mm(105), mm(54), 12, "700", scale);
    drawCenteredText(context, "(※ 거래명세서 순서대로 사진을 첨부하세요.)", mm(105), mm(60.5), 9.5, "700", scale);

    const gap = 2.2;
    const cellWidth = (contentWidth - gap) / 2;
    const labelHeight = 10.5;
    const photoHeight = 42.7;
    const blockHeight = labelHeight + photoHeight;
    const gridStartY = 65;

    for (let index = 0; index < ITEMS_PER_PAGE; index += 1) {
      const globalIndex = pageStartIndex + index;
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = left + column * (cellWidth + gap);
      const y = gridStartY + row * (blockHeight + 2.2);
      const item = pageItems[index] || createItem();

      context.strokeRect(mm(x), mm(y), mm(cellWidth), mm(blockHeight));
      context.beginPath();
      context.moveTo(mm(x), mm(y + labelHeight));
      context.lineTo(mm(x + cellWidth), mm(y + labelHeight));
      context.stroke();

      const labelText = `${globalIndex + 1}. 품명${item.name.trim() ? `: ${item.name.trim()}` : ""}`;
      drawFitText(context, labelText, mm(x + 3), mm(y + labelHeight / 2), mm(cellWidth - 24), 10.5, 7, "700", "left", scale);
      if (item.name.trim()) drawText(context, `수량 ${clampQuantity(item.quantity)}`, mm(x + cellWidth - 3), mm(y + labelHeight / 2), 8.5, "400", "right", scale);

      const image = itemImages[index];
      if (image) {
        drawImageContain(context, image, mm(x + 3), mm(y + labelHeight + 2), mm(cellWidth - 6), mm(photoHeight - 4));
      }
    }

    drawCenteredText(context, "상기와 같이 신청 물품이 동일함을 확인하였습니다.", mm(105), mm(195), 11, "400", scale);
    drawCenteredText(context, formatKoreanDate(state.inspectionDate), mm(105), mm(215), 11, "700", scale);

    drawText(context, "물품 검수자:", mm(127), mm(236), 11, "700", "left", scale);
    drawText(context, reviewer?.name || "", mm(164), mm(236), 11, "700", "center", scale);
    drawText(context, "(인)", mm(187), mm(236), 11, "700", "center", scale);
    if (signature) drawImageContain(context, signature, mm(176), mm(230), mm(22), mm(12), 0.92);

    drawText(context, "가천대학교 총장 귀하", mm(18), mm(278), 19, "700", "left", scale);
    if (pageCount > 1) drawText(context, `${pageIndex + 1} / ${pageCount}`, mm(192), mm(278), 8, "400", "right", scale);
    return canvas;
  }

  function drawText(context, text, x, y, pointSize, weight, align, scale) {
    context.save();
    context.font = `${weight} ${pointSize * 0.352778 * scale}px "Malgun Gothic", "맑은 고딕", sans-serif`;
    context.textAlign = align;
    context.fillStyle = "#000000";
    context.fillText(text, x, y);
    context.restore();
  }

  function drawCenteredText(context, text, x, y, pointSize, weight, scale) {
    drawText(context, text, x, y, pointSize, weight, "center", scale);
  }

  function drawFitText(context, text, x, y, maxWidth, startPointSize, minPointSize, weight, align, scale) {
    context.save();
    context.textAlign = align;
    context.fillStyle = "#000000";
    let pointSize = startPointSize;
    do {
      context.font = `${weight} ${pointSize * 0.352778 * scale}px "Malgun Gothic", "맑은 고딕", sans-serif`;
      if (context.measureText(text).width <= maxWidth) break;
      pointSize -= 0.5;
    } while (pointSize > minPointSize);

    let renderedText = text;
    if (context.measureText(renderedText).width > maxWidth) {
      while (renderedText.length > 1 && context.measureText(`${renderedText}…`).width > maxWidth) renderedText = renderedText.slice(0, -1);
      renderedText = `${renderedText}…`;
    }
    context.fillText(renderedText, x, y);
    context.restore();
  }

  function drawImageContain(context, image, x, y, width, height, alpha = 1) {
    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * ratio;
    const drawHeight = image.naturalHeight * ratio;
    context.save();
    context.globalAlpha = alpha;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    context.restore();
  }

  function safeLoadImage(source) {
    if (!source) return Promise.resolve(null);
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
    });
  }

  function canvasToJpegBytes(canvas, quality) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error("Canvas JPEG conversion returned no data."));
            return;
          }
          resolve(new Uint8Array(await blob.arrayBuffer()));
        }, "image/jpeg", quality);
      } catch (error) {
        reject(error);
      }
    });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function createItem() {
    return { name: "", quantity: 1, photoId: "" };
  }

  function getPhoto(photoId) {
    return state.photos.find((photo) => photo.id === photoId) || null;
  }

  function getSelectedReviewer() {
    return REVIEWERS.find((reviewer) => reviewer.id === state.selectedReviewerId) || null;
  }

  function signatureStorageKey(reviewerId) {
    return `${SIGNATURE_STORAGE_PREFIX}${reviewerId}`;
  }

  function readStoredSignature(reviewerId) {
    try {
      return localStorage.getItem(signatureStorageKey(reviewerId)) || "";
    } catch (error) {
      console.warn(error);
      return "";
    }
  }

  function formatKoreanDate(isoDate) {
    const [year, month, day] = (isoDate || todayIso()).split("-");
    return `${year}년  ${month} 월  ${day} 일`;
  }

  function todayIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  function clampQuantity(value) {
    const numeric = Math.round(Number(value));
    if (!Number.isFinite(numeric)) return 1;
    return Math.min(9999, Math.max(1, numeric));
  }

  function cryptoRandomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("파일을 읽지 못했습니다."));
      reader.readAsDataURL(file);
    });
  }

  function formatFileSize(bytes) {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function sanitizeFileName(value) {
    return String(value).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_");
  }

  function showToast(message, kind = "info") {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.dataset.kind = kind;
    elements.toast.hidden = false;
    toastTimer = setTimeout(() => {
      elements.toast.hidden = true;
    }, 3600);
  }
})();
