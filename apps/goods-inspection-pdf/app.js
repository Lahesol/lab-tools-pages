(() => {
  "use strict";

  const BASE_ITEM_SLOTS = 4;
  const ITEM_COLUMNS = 2;
  const ITEM_CELL_HEIGHT_MM = 53.2;
  const DOCUMENT_WIDTH_MM = 210;
  const BASE_DOCUMENT_HEIGHT_MM = 297;
  const MAX_ITEMS = 40;
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
  const SIGNATURE_STORAGE_PREFIX = "goods-inspection.signature.v2.";

  const state = {
    invoiceFile: null,
    invoiceText: "",
    invoiceCandidates: [],
    invoicePdf: null,
    invoiceLines: [],
    photos: [],
    items: [],
    countMode: "auto",
    manualCount: 4,
    previewPage: 0,
    draggedPhotoId: null,
    reviewerName: "",
    inspectionDate: todayIso(),
    exporting: false,
    roiPageNumber: 1,
    roiRect: null,
    roiCandidates: [],
    roiDrawing: null,
    roiMatchedTextCount: 0,
    roiCandidateSource: "",
    ocrRunning: false,
    ocrCancelRequested: false,
    ocrProgress: 0,
    ocrStatus: "",
    ocrRawText: "",
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
    roiOpenButton: document.querySelector("#roiOpenButton"),
    roiDialog: document.querySelector("#roiDialog"),
    roiCloseButton: document.querySelector("#roiCloseButton"),
    roiPrevPageButton: document.querySelector("#roiPrevPageButton"),
    roiNextPageButton: document.querySelector("#roiNextPageButton"),
    roiPageIndicator: document.querySelector("#roiPageIndicator"),
    roiApplyAllPages: document.querySelector("#roiApplyAllPages"),
    roiCanvasStage: document.querySelector("#roiCanvasStage"),
    roiCanvasSurface: document.querySelector("#roiCanvasSurface"),
    roiCanvas: document.querySelector("#roiCanvas"),
    roiCanvasHint: document.querySelector("#roiCanvasHint"),
    roiSelection: document.querySelector("#roiSelection"),
    roiCandidateTitle: document.querySelector("#roiCandidateTitle"),
    roiCandidateMessage: document.querySelector("#roiCandidateMessage"),
    roiOcrButton: document.querySelector("#roiOcrButton"),
    roiOcrProgressGroup: document.querySelector("#roiOcrProgressGroup"),
    roiOcrProgress: document.querySelector("#roiOcrProgress"),
    roiOcrStatus: document.querySelector("#roiOcrStatus"),
    roiOcrCancelButton: document.querySelector("#roiOcrCancelButton"),
    roiOcrRawDetails: document.querySelector("#roiOcrRawDetails"),
    roiOcrRawText: document.querySelector("#roiOcrRawText"),
    roiToggleCandidatesButton: document.querySelector("#roiToggleCandidatesButton"),
    roiCandidateList: document.querySelector("#roiCandidateList"),
    roiResetButton: document.querySelector("#roiResetButton"),
    roiApplyButton: document.querySelector("#roiApplyButton"),
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
    reviewerName: document.querySelector("#reviewerName"),
    reviewerSignaturePreview: document.querySelector("#reviewerSignaturePreview"),
    reviewerSignatureImage: document.querySelector("#reviewerSignatureImage"),
    reviewerSignatureStatus: document.querySelector("#reviewerSignatureStatus"),
    reviewerSignatureUploadButton: document.querySelector("#reviewerSignatureUploadButton"),
    reviewerSignatureRemoveButton: document.querySelector("#reviewerSignatureRemoveButton"),
    reviewerSignatureInput: document.querySelector("#reviewerSignatureInput"),
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
  let roiRenderToken = 0;
  let roiResizeTimer = null;
  let ocrWorker = null;
  let ocrWorkerPromise = null;
  let ocrRunToken = 0;
  let ocrPageIndex = 0;
  let ocrPageTotal = 1;

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
          state.manualCount = Math.max(1, state.items.length || state.manualCount || BASE_ITEM_SLOTS);
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
      if (!window.confirm("현재 문서의 Invoice, 사진, 품목 입력을 초기화할까요? 검수자 이름과 등록 서명은 유지됩니다.")) return;
      state.invoiceFile = null;
      state.invoiceText = "";
      state.invoiceCandidates = [];
      state.invoicePdf?.destroy?.();
      state.invoicePdf = null;
      state.invoiceLines = [];
      state.photos = [];
      state.items = [];
      state.countMode = "auto";
      state.manualCount = BASE_ITEM_SLOTS;
      state.previewPage = 0;
      resetRoiState();
      if (elements.roiDialog.open) elements.roiDialog.close();
      elements.invoiceResult.hidden = true;
      renderAll();
      showToast("현재 문서를 초기화했습니다.");
    });

    elements.inspectionDate.addEventListener("change", (event) => {
      state.inspectionDate = event.target.value || todayIso();
      renderPreview();
      updateValidation();
    });

    elements.reviewerName.addEventListener("input", (event) => {
      state.reviewerName = event.target.value;
      renderReviewerEntry();
      renderPreview();
      updateValidation();
    });

    elements.reviewerSignatureUploadButton.addEventListener("click", () => {
      if (!getSelectedReviewer()) {
        elements.reviewerName.focus();
        showToast("검수자 이름을 먼저 입력해 주세요.", "error");
        return;
      }
      elements.reviewerSignatureInput.click();
    });

    elements.reviewerSignatureInput.addEventListener("change", async (event) => {
      const [file] = event.target.files;
      event.target.value = "";
      if (file) await storeReviewerSignature(file);
    });

    elements.reviewerSignatureRemoveButton.addEventListener("click", removeReviewerSignature);

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

    elements.roiOpenButton.addEventListener("click", openRoiDialog);
    elements.roiCloseButton.addEventListener("click", closeRoiDialog);
    elements.roiDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeRoiDialog();
    });
    elements.roiDialog.addEventListener("click", (event) => {
      if (event.target === elements.roiDialog) closeRoiDialog();
    });
    elements.roiPrevPageButton.addEventListener("click", () => changeRoiPage(-1));
    elements.roiNextPageButton.addEventListener("click", () => changeRoiPage(1));
    elements.roiApplyAllPages.addEventListener("change", () => {
      if (state.ocrRunning) cancelRoiOcr(true);
      resetOcrResult();
      if (state.roiRect) extractRoiText();
    });
    elements.roiCanvasSurface.addEventListener("pointerdown", startRoiSelection);
    elements.roiCanvasSurface.addEventListener("pointermove", updateRoiSelection);
    elements.roiCanvasSurface.addEventListener("pointerup", finishRoiSelection);
    elements.roiCanvasSurface.addEventListener("pointercancel", cancelRoiDrawing);
    elements.roiResetButton.addEventListener("click", resetRoiSelection);
    elements.roiOcrButton.addEventListener("click", runRoiOcr);
    elements.roiOcrCancelButton.addEventListener("click", cancelRoiOcr);
    elements.roiToggleCandidatesButton.addEventListener("click", toggleRoiCandidates);
    elements.roiApplyButton.addEventListener("click", applyRoiCandidates);
    window.addEventListener("resize", () => {
      if (!elements.roiDialog.open) return;
      window.clearTimeout(roiResizeTimer);
      roiResizeTimer = window.setTimeout(renderRoiPage, 120);
    });

    elements.exportButton.addEventListener("click", exportPdf);
    window.addEventListener("pagehide", () => {
      ocrWorker?.terminate().catch(() => {});
      ocrWorker = null;
    });
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
    state.invoicePdf?.destroy?.();
    state.invoiceFile = file;
    state.invoiceText = "";
    state.invoiceCandidates = [];
    state.invoicePdf = null;
    state.invoiceLines = [];
    resetRoiState();
    elements.roiOpenButton.disabled = true;
    elements.invoiceResult.hidden = false;
    elements.invoiceResultTitle.textContent = "Invoice 분석 중";
    elements.invoiceResultMessage.textContent = "PDF의 텍스트를 브라우저에서 읽고 있습니다.";
    elements.invoiceRawText.textContent = "";
    renderInvoiceStatus("processing");

    try {
      const { pdf, lines } = await extractPdfData(file);
      state.invoicePdf = pdf;
      state.invoiceLines = lines;
      state.invoiceText = lines.map((line) => line.text).join("\n");
      if (!window.InvoiceParser?.parseInvoiceItems) throw new Error("Invoice 품목 분석 모듈을 불러오지 못했습니다.");
      const analysis = window.InvoiceParser.parseInvoiceItems(lines, { maxItems: MAX_ITEMS });
      const candidates = analysis.items;
      mergeInvoiceCandidates(candidates);

      elements.invoiceResultTitle.textContent = "Invoice 분석 결과";
      if (candidates.length) {
        const basis = analysis.method === "table" ? "표의 품목 행" : "행 번호와 수량·금액 패턴이 확인된 줄";
        elements.invoiceResultMessage.textContent = `${basis}에서 ${candidates.length}개 품목 후보를 입력했습니다. 주소·연락처·결제정보는 제외했으며 품목명만 최종 확인해 주세요.`;
      } else {
        elements.invoiceResultMessage.textContent = state.invoiceLines.length
          ? "확실한 품목 행을 찾지 못했습니다. 영역 직접 지정에서 품목명 열을 선택해 다시 추출해 주세요."
          : "PDF 텍스트가 없습니다. 이미지로 스캔된 Invoice라면 영역 직접 지정에서 품목명 영역을 선택한 뒤 OCR을 실행해 주세요.";
      }
      elements.invoiceRawText.textContent = state.invoiceText || "추출된 텍스트가 없습니다.";
      elements.roiOpenButton.disabled = false;
      renderInvoiceStatus("complete");
      renderAll();
    } catch (error) {
      console.error(error);
      elements.invoiceResultTitle.textContent = "Invoice 자동 분석을 완료하지 못했습니다";
      elements.invoiceResultMessage.textContent = "PDF를 열지 못했습니다. 암호화 여부를 확인하거나 품목명을 직접 입력해 주세요. 열 수 있는 이미지형 PDF는 영역 직접 지정 OCR을 사용할 수 있습니다.";
      elements.invoiceRawText.textContent = error instanceof Error ? error.message : String(error);
      elements.roiOpenButton.disabled = true;
      renderInvoiceStatus("error");
      renderAll();
      showToast("Invoice 텍스트를 읽지 못했습니다. 품목명을 직접 입력해 주세요.", "error");
    }
  }

  async function extractPdfData(file) {
    const pdfjsLib = await getPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const lines = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
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
        bucket.parts.push({ x, text, width: Number(item.width || 0), height: Number(item.height || 0) });
      }

      buckets
        .sort((a, b) => b.y - a.y)
        .forEach((bucket) => {
          const parts = bucket.parts.sort((a, b) => a.x - b.x);
          const line = parts
            .map((entry) => entry.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (line) {
            const height = Math.max(8, ...parts.map((entry) => entry.height || 0));
            lines.push({
              text: line,
              pageNumber,
              pageWidth: viewport.width,
              pageHeight: viewport.height,
              y: bucket.y,
              height,
              xMin: Math.min(...parts.map((entry) => entry.x)),
              xMax: Math.max(...parts.map((entry) => entry.x + entry.width)),
              parts,
            });
          }
        });
    }

    return { pdf, lines };
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

  function resetRoiState() {
    if (state.ocrRunning) cancelRoiOcr(true);
    state.roiPageNumber = 1;
    state.roiRect = null;
    state.roiCandidates = [];
    state.roiDrawing = null;
    state.roiMatchedTextCount = 0;
    state.roiCandidateSource = "";
    resetOcrResult();
    renderRoiSelection();
    renderRoiCandidates();
  }

  function openRoiDialog() {
    if (!state.invoicePdf) {
      showToast("먼저 Invoice PDF를 올려 주세요.", "error");
      return;
    }
    const pageCount = state.invoicePdf.numPages || 1;
    state.roiPageNumber = Math.min(Math.max(1, state.roiPageNumber), pageCount);
    elements.roiApplyAllPages.disabled = pageCount === 1;
    if (pageCount === 1) elements.roiApplyAllPages.checked = false;
    if (!elements.roiDialog.open) elements.roiDialog.showModal();
    renderRoiCandidates();
    window.requestAnimationFrame(renderRoiPage);
  }

  function closeRoiDialog() {
    if (state.ocrRunning) cancelRoiOcr(true);
    if (elements.roiDialog.open) elements.roiDialog.close();
  }

  function changeRoiPage(delta) {
    if (!state.invoicePdf) return;
    if (state.ocrRunning) cancelRoiOcr(true);
    state.roiPageNumber = Math.min(state.invoicePdf.numPages, Math.max(1, state.roiPageNumber + delta));
    renderRoiPage().then(() => {
      if (state.roiRect) extractRoiText();
    });
  }

  async function renderRoiPage() {
    if (!state.invoicePdf || !elements.roiDialog.open) return;
    const token = ++roiRenderToken;
    const pageNumber = Math.min(state.invoicePdf.numPages, Math.max(1, state.roiPageNumber));
    state.roiPageNumber = pageNumber;
    elements.roiPageIndicator.textContent = `${pageNumber} / ${state.invoicePdf.numPages}`;
    elements.roiPrevPageButton.disabled = pageNumber === 1;
    elements.roiNextPageButton.disabled = pageNumber === state.invoicePdf.numPages;

    try {
      const page = await state.invoicePdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, elements.roiCanvasStage.clientWidth - 32);
      const cssScale = Math.min(1.35, availableWidth / baseViewport.width);
      const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const viewport = page.getViewport({ scale: cssScale * pixelRatio });
      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = Math.ceil(viewport.width);
      renderCanvas.height = Math.ceil(viewport.height);
      const context = renderCanvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      if (token !== roiRenderToken || !elements.roiDialog.open) return;

      const cssWidth = viewport.width / pixelRatio;
      const cssHeight = viewport.height / pixelRatio;
      elements.roiCanvas.width = renderCanvas.width;
      elements.roiCanvas.height = renderCanvas.height;
      elements.roiCanvas.style.width = `${cssWidth}px`;
      elements.roiCanvas.style.height = `${cssHeight}px`;
      elements.roiCanvasSurface.style.width = `${cssWidth}px`;
      elements.roiCanvasSurface.style.height = `${cssHeight}px`;
      const visibleContext = elements.roiCanvas.getContext("2d", { alpha: false });
      visibleContext.drawImage(renderCanvas, 0, 0);
      renderRoiSelection();
    } catch (error) {
      console.error(error);
      elements.roiCanvasHint.textContent = "PDF 페이지를 표시하지 못했습니다. 창을 닫고 다시 시도해 주세요.";
      showToast("PDF 영역 지정 화면을 표시하지 못했습니다.", "error");
    }
  }

  function startRoiSelection(event) {
    if (!state.invoicePdf || event.button !== 0) return;
    if (state.ocrRunning) cancelRoiOcr(true);
    const point = getRoiPoint(event);
    if (!point) return;
    event.preventDefault();
    state.roiDrawing = { pointerId: event.pointerId, startX: point.x, startY: point.y };
    state.roiRect = { x: point.x, y: point.y, width: 0, height: 0 };
    state.roiCandidates = [];
    state.roiMatchedTextCount = 0;
    state.roiCandidateSource = "";
    resetOcrResult();
    elements.roiCanvasSurface.setPointerCapture?.(event.pointerId);
    renderRoiSelection();
    renderRoiCandidates();
  }

  function updateRoiSelection(event) {
    if (!state.roiDrawing || state.roiDrawing.pointerId !== event.pointerId) return;
    const point = getRoiPoint(event);
    if (!point) return;
    event.preventDefault();
    state.roiRect = normalizedRoiRect(state.roiDrawing.startX, state.roiDrawing.startY, point.x, point.y);
    renderRoiSelection();
  }

  function finishRoiSelection(event) {
    if (!state.roiDrawing || state.roiDrawing.pointerId !== event.pointerId) return;
    updateRoiSelection(event);
    elements.roiCanvasSurface.releasePointerCapture?.(event.pointerId);
    state.roiDrawing = null;
    if (!state.roiRect || state.roiRect.width < 0.012 || state.roiRect.height < 0.012) {
      resetRoiSelection();
      showToast("품목 영역을 조금 더 크게 드래그해 주세요.", "error");
      return;
    }
    extractRoiText();
  }

  function cancelRoiDrawing(event) {
    if (!state.roiDrawing || state.roiDrawing.pointerId !== event.pointerId) return;
    state.roiDrawing = null;
    resetRoiSelection();
  }

  function getRoiPoint(event) {
    const bounds = elements.roiCanvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    };
  }

  function normalizedRoiRect(startX, startY, endX, endY) {
    return {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };
  }

  function renderRoiSelection() {
    const rect = state.roiRect;
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      elements.roiSelection.hidden = true;
      elements.roiCanvasHint.textContent = "PDF 위에서 품목명이 있는 영역을 드래그하세요.";
      return;
    }
    elements.roiSelection.hidden = false;
    elements.roiSelection.style.left = `${rect.x * 100}%`;
    elements.roiSelection.style.top = `${rect.y * 100}%`;
    elements.roiSelection.style.width = `${rect.width * 100}%`;
    elements.roiSelection.style.height = `${rect.height * 100}%`;
    elements.roiCanvasHint.textContent = "청록색 영역을 선택했습니다. PDF 텍스트 결과를 확인하거나 선택 영역 OCR을 실행하세요.";
  }

  function resetRoiSelection() {
    if (state.ocrRunning) cancelRoiOcr(true);
    state.roiRect = null;
    state.roiCandidates = [];
    state.roiDrawing = null;
    state.roiMatchedTextCount = 0;
    state.roiCandidateSource = "";
    resetOcrResult();
    renderRoiSelection();
    renderRoiCandidates();
  }

  function extractRoiText() {
    if (!state.roiRect || !state.invoicePdf) return;
    const pageNumbers = elements.roiApplyAllPages.checked && state.invoicePdf.numPages > 1
      ? Array.from({ length: state.invoicePdf.numPages }, (_, index) => index + 1)
      : [state.roiPageNumber];
    const roiLines = [];

    pageNumbers.forEach((pageNumber) => {
      state.invoiceLines
        .filter((line) => line.pageNumber === pageNumber)
        .forEach((line) => {
          const selectedParts = (line.parts || [])
            .filter((part) => partIntersectsRoi(line, part, state.roiRect))
            .sort((a, b) => a.x - b.x);
          if (!selectedParts.length) return;
          const text = selectedParts.map((part) => part.text).join(" ").replace(/\s+/g, " ").trim();
          if (text) roiLines.push({ ...line, text });
        });
    });

    const analysis = window.InvoiceParser.extractRoiCandidates(roiLines, { maxItems: MAX_ITEMS });
    state.roiMatchedTextCount = roiLines.length;
    state.roiCandidateSource = "pdf-text";
    state.roiCandidates = analysis.items.map((name, index) => ({
      id: `roi-${index}-${name.toLocaleLowerCase("ko-KR")}`,
      name,
      selected: true,
    }));
    renderRoiCandidates();
  }

  function resetOcrResult() {
    state.ocrCancelRequested = false;
    state.ocrProgress = 0;
    state.ocrStatus = "";
    state.ocrRawText = "";
    renderOcrControls();
  }

  function renderOcrControls() {
    const runtimeReady = Boolean(window.Tesseract?.createWorker);
    elements.roiOcrButton.disabled = !state.roiRect || state.ocrRunning || !runtimeReady;
    elements.roiOcrButton.textContent = state.ocrRunning ? "OCR 분석 중…" : "선택 영역 OCR";
    elements.roiOcrProgressGroup.hidden = !state.ocrRunning;
    elements.roiOcrProgress.value = Math.min(1, Math.max(0, state.ocrProgress || 0));
    elements.roiOcrStatus.textContent = state.ocrStatus || "OCR 준비 중…";
    elements.roiOcrCancelButton.disabled = !state.ocrRunning;
    elements.roiOcrRawDetails.hidden = !state.ocrRawText;
    elements.roiOcrRawText.textContent = state.ocrRawText;
  }

  function translateOcrStatus(status) {
    const labels = {
      "loading tesseract core": "OCR 엔진 불러오는 중",
      "loaded tesseract core": "OCR 엔진 준비 완료",
      "initializing tesseract": "OCR 엔진 초기화 중",
      "initialized tesseract": "OCR 엔진 초기화 완료",
      "loading language traineddata": "한글·영문 모델 불러오는 중",
      "loaded language traineddata": "한글·영문 모델 준비 완료",
      "initializing api": "OCR 분석기 준비 중",
      "initialized api": "OCR 분석기 준비 완료",
      "recognizing text": "선택 영역 글자 인식 중",
    };
    return labels[status] || "OCR 처리 중";
  }

  function handleOcrProgress(message) {
    if (!state.ocrRunning || !message) return;
    const progress = Math.min(1, Math.max(0, Number(message.progress) || 0));
    const recognizing = message.status === "recognizing text";
    state.ocrProgress = recognizing
      ? Math.min(1, (ocrPageIndex + progress) / Math.max(1, ocrPageTotal))
      : Math.max(state.ocrProgress, progress * 0.16);
    const pageLabel = ocrPageTotal > 1 && recognizing ? ` · ${ocrPageIndex + 1}/${ocrPageTotal}페이지` : "";
    state.ocrStatus = `${translateOcrStatus(message.status)}${pageLabel} · ${Math.round(state.ocrProgress * 100)}%`;
    renderOcrControls();
  }

  async function getOcrWorker() {
    if (ocrWorker) return ocrWorker;
    if (!window.Tesseract?.createWorker) throw new Error("Tesseract.js runtime is unavailable.");
    if (!ocrWorkerPromise) {
      const promise = (async () => {
        const worker = await window.Tesseract.createWorker(["kor", "eng"], 1, {
          workerPath: "./vendor/tesseract/worker.min.js",
          langPath: "./vendor/tesseract/lang",
          corePath: "./vendor/tesseract/core",
          gzip: true,
          logger: handleOcrProgress,
          errorHandler: (error) => console.error("OCR worker error", error),
        });
        await worker.setParameters({
          tessedit_pageseg_mode: window.Tesseract.PSM?.SINGLE_BLOCK || "6",
          preserve_interword_spaces: "1",
        });
        return worker;
      })();
      ocrWorkerPromise = promise;
      try {
        const worker = await promise;
        if (ocrWorkerPromise === promise) {
          ocrWorker = worker;
          ocrWorkerPromise = null;
        }
        return worker;
      } catch (error) {
        if (ocrWorkerPromise === promise) ocrWorkerPromise = null;
        throw error;
      }
    }
    return ocrWorkerPromise;
  }

  async function renderRoiOcrCanvas(pageNumber) {
    const page = await state.invoicePdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = Math.min(4, Math.max(2.4, 2400 / Math.max(1, baseViewport.width)));
    const viewport = page.getViewport({ scale: renderScale });
    const source = document.createElement("canvas");
    source.width = Math.ceil(viewport.width);
    source.height = Math.ceil(viewport.height);
    const sourceContext = source.getContext("2d", { alpha: false, willReadFrequently: false });
    sourceContext.fillStyle = "#ffffff";
    sourceContext.fillRect(0, 0, source.width, source.height);
    await page.render({ canvasContext: sourceContext, viewport }).promise;

    const roi = state.roiRect;
    const sourceX = Math.max(0, Math.floor(roi.x * source.width));
    const sourceY = Math.max(0, Math.floor(roi.y * source.height));
    const sourceWidth = Math.max(1, Math.min(source.width - sourceX, Math.ceil(roi.width * source.width)));
    const sourceHeight = Math.max(1, Math.min(source.height - sourceY, Math.ceil(roi.height * source.height)));
    const padding = 18;
    const crop = document.createElement("canvas");
    crop.width = sourceWidth + padding * 2;
    crop.height = sourceHeight + padding * 2;
    const cropContext = crop.getContext("2d", { alpha: false, willReadFrequently: true });
    cropContext.fillStyle = "#ffffff";
    cropContext.fillRect(0, 0, crop.width, crop.height);
    cropContext.imageSmoothingEnabled = true;
    cropContext.imageSmoothingQuality = "high";
    cropContext.filter = "grayscale(1) contrast(1.18)";
    cropContext.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, padding, padding, sourceWidth, sourceHeight);
    cropContext.filter = "none";
    source.width = 1;
    source.height = 1;
    return crop;
  }

  async function runRoiOcr() {
    if (!state.roiRect || !state.invoicePdf || state.ocrRunning) return;
    if (!window.Tesseract?.createWorker) {
      showToast("OCR 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.", "error");
      return;
    }

    const pageNumbers = elements.roiApplyAllPages.checked && state.invoicePdf.numPages > 1
      ? Array.from({ length: state.invoicePdf.numPages }, (_, index) => index + 1)
      : [state.roiPageNumber];
    const runToken = ++ocrRunToken;
    ocrPageIndex = 0;
    ocrPageTotal = pageNumbers.length;
    state.ocrRunning = true;
    state.ocrCancelRequested = false;
    state.ocrProgress = 0;
    state.ocrStatus = "OCR 엔진 준비 중 · 0%";
    state.ocrRawText = "";
    state.roiCandidates = [];
    state.roiMatchedTextCount = 0;
    state.roiCandidateSource = "ocr";
    renderOcrControls();
    renderRoiCandidates();

    const pageTexts = [];
    try {
      const worker = await getOcrWorker();
      if (runToken !== ocrRunToken) return;
      for (let index = 0; index < pageNumbers.length; index += 1) {
        if (runToken !== ocrRunToken) return;
        ocrPageIndex = index;
        state.ocrStatus = `선택 영역 이미지 준비 중 · ${index + 1}/${pageNumbers.length}페이지`;
        renderOcrControls();
        const crop = await renderRoiOcrCanvas(pageNumbers[index]);
        if (runToken !== ocrRunToken) {
          crop.width = 1;
          crop.height = 1;
          return;
        }
        const result = await worker.recognize(crop);
        crop.width = 1;
        crop.height = 1;
        pageTexts.push(String(result.data?.text || "").trim());
      }

      if (runToken !== ocrRunToken) return;
      state.ocrRawText = pageTexts
        .map((text, index) => pageNumbers.length > 1 ? `[${pageNumbers[index]}페이지]\n${text}` : text)
        .filter(Boolean)
        .join("\n\n");
      const ocrLines = pageTexts
        .flatMap((text) => text.split(/\r?\n/))
        .map((text) => ({ text: text.replace(/\s+/g, " ").trim() }))
        .filter((line) => line.text);
      const analysis = window.InvoiceParser.extractRoiCandidates(ocrLines, { maxItems: MAX_ITEMS });
      state.roiMatchedTextCount = ocrLines.length;
      state.roiCandidates = analysis.items.map((name, index) => ({
        id: `ocr-${index}-${name.toLocaleLowerCase("ko-KR")}`,
        name,
        selected: true,
      }));
      state.ocrProgress = 1;
      state.ocrStatus = "OCR 분석 완료 · 100%";
      renderRoiCandidates();
      showToast(state.roiCandidates.length
        ? `OCR로 품목 후보 ${state.roiCandidates.length}개를 찾았습니다.`
        : "OCR 원문은 읽었지만 품목 후보를 찾지 못했습니다.", state.roiCandidates.length ? "info" : "error");
    } catch (error) {
      if (runToken !== ocrRunToken || state.ocrCancelRequested) return;
      console.error(error);
      state.ocrStatus = "OCR 분석 실패";
      showToast("OCR을 완료하지 못했습니다. 영역을 다시 선택해 시도해 주세요.", "error");
    } finally {
      if (runToken === ocrRunToken) {
        state.ocrRunning = false;
        renderOcrControls();
        renderRoiCandidates();
      }
    }
  }

  function cancelRoiOcr(silent = false) {
    if (!state.ocrRunning && !ocrWorkerPromise) return;
    ocrRunToken += 1;
    state.ocrCancelRequested = true;
    state.ocrRunning = false;
    state.ocrStatus = "OCR 취소됨";
    const worker = ocrWorker;
    const pendingWorker = ocrWorkerPromise;
    ocrWorker = null;
    ocrWorkerPromise = null;
    worker?.terminate().catch(() => {});
    pendingWorker?.then((createdWorker) => createdWorker.terminate()).catch(() => {});
    renderOcrControls();
    if (!silent) showToast("OCR 분석을 취소했습니다.");
  }

  function partIntersectsRoi(line, part, roi) {
    const pageWidth = Math.max(1, Number(line.pageWidth || 1));
    const pageHeight = Math.max(1, Number(line.pageHeight || 1));
    const partHeight = Math.max(6, Number(part.height || line.height || 8));
    const left = Number(part.x || 0) / pageWidth;
    const right = (Number(part.x || 0) + Math.max(1, Number(part.width || 0))) / pageWidth;
    const top = (pageHeight - (Number(line.y || 0) + partHeight + 2)) / pageHeight;
    const bottom = (pageHeight - (Number(line.y || 0) - 2)) / pageHeight;
    return right >= roi.x
      && left <= roi.x + roi.width
      && bottom >= roi.y
      && top <= roi.y + roi.height;
  }

  function renderRoiCandidates() {
    renderOcrControls();
    elements.roiCandidateList.replaceChildren();
    const candidates = state.roiCandidates;

    if (!candidates.length) {
      const empty = document.createElement("p");
      empty.className = "roi-candidate-empty";
      if (state.ocrRunning) {
        elements.roiCandidateTitle.textContent = "선택 영역을 OCR로 분석 중입니다";
        elements.roiCandidateMessage.textContent = state.ocrStatus || "한글·영문 OCR 엔진을 준비하고 있습니다.";
        empty.textContent = "분석이 끝나면 품목 후보가 여기에 표시됩니다.";
      } else if (state.roiCandidateSource === "ocr" && state.roiRect && state.roiMatchedTextCount === 0) {
        elements.roiCandidateTitle.textContent = "OCR로 글자를 읽지 못했습니다";
        elements.roiCandidateMessage.textContent = "글자가 선명하게 보이도록 품목명 영역을 다시 선택하거나 더 좁게 지정해 주세요.";
        empty.textContent = "OCR 원문에 인식된 텍스트가 없습니다.";
      } else if (state.roiCandidateSource === "ocr" && state.roiRect) {
        elements.roiCandidateTitle.textContent = "OCR 품목 후보를 찾지 못했습니다";
        elements.roiCandidateMessage.textContent = "글자는 인식했지만 머리글·주소·금액 정보로 판단했습니다. OCR 원문을 확인해 주세요.";
        empty.textContent = "품목명 열만 포함하도록 영역을 조금 더 좁게 선택해 보세요.";
      } else if (state.roiRect && state.roiMatchedTextCount === 0) {
        elements.roiCandidateTitle.textContent = "선택 영역에 PDF 텍스트가 없습니다";
        elements.roiCandidateMessage.textContent = "이미지형 PDF라면 위의 선택 영역 OCR을 실행하세요.";
        empty.textContent = "PDF 텍스트 객체를 찾지 못했습니다. OCR로 전환할 수 있습니다.";
      } else if (state.roiRect) {
        elements.roiCandidateTitle.textContent = "품목 후보를 찾지 못했습니다";
        elements.roiCandidateMessage.textContent = "선택 영역에 글자는 있지만 품목명이 아닌 머리글·주소·금액 정보로 판단했습니다.";
        empty.textContent = "품목명 열을 조금 더 좁게 다시 선택해 보세요.";
      } else {
        elements.roiCandidateTitle.textContent = "영역을 선택해 주세요";
        elements.roiCandidateMessage.textContent = "PDF 텍스트를 먼저 찾고, 이미지형 PDF는 선택 영역만 OCR합니다.";
        empty.textContent = "아직 선택된 영역이 없습니다.";
      }
      elements.roiCandidateList.append(empty);
      elements.roiToggleCandidatesButton.disabled = true;
      elements.roiApplyButton.disabled = true;
      return;
    }

    const sourceLabel = state.roiCandidateSource === "ocr" ? "OCR로" : "PDF 텍스트에서";
    elements.roiCandidateTitle.textContent = `${sourceLabel} ${candidates.length}개 품목 후보를 찾았습니다`;
    const scopeLabel = elements.roiApplyAllPages.checked
      ? "같은 위치를 전체 PDF 페이지에 적용했습니다."
      : `${state.roiPageNumber}페이지의 선택 영역을 적용했습니다.`;
    elements.roiCandidateMessage.textContent = state.roiCandidateSource === "ocr"
      ? `${scopeLabel} 인식 원문과 품목명을 최종 확인해 주세요.`
      : `${scopeLabel} PDF 텍스트 좌표 추출 결과입니다.`;

    candidates.forEach((candidate, index) => {
      const label = document.createElement("label");
      label.className = "roi-candidate-item";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = candidate.selected;
      checkbox.addEventListener("change", () => {
        candidate.selected = checkbox.checked;
        updateRoiCandidateActions();
      });
      const number = document.createElement("span");
      number.textContent = String(index + 1);
      const name = document.createElement("strong");
      name.textContent = candidate.name;
      label.append(checkbox, number, name);
      elements.roiCandidateList.append(label);
    });
    updateRoiCandidateActions();
  }

  function updateRoiCandidateActions() {
    const selectedCount = state.roiCandidates.filter((candidate) => candidate.selected).length;
    const allSelected = selectedCount === state.roiCandidates.length && selectedCount > 0;
    elements.roiToggleCandidatesButton.disabled = state.roiCandidates.length === 0;
    elements.roiToggleCandidatesButton.textContent = allSelected ? "전체 해제" : "전체 선택";
    elements.roiApplyButton.disabled = selectedCount === 0;
    elements.roiApplyButton.textContent = selectedCount ? `선택 품목 ${selectedCount}개 적용` : "선택 품목 적용";
  }

  function toggleRoiCandidates() {
    if (!state.roiCandidates.length) return;
    const allSelected = state.roiCandidates.every((candidate) => candidate.selected);
    state.roiCandidates.forEach((candidate) => {
      candidate.selected = !allSelected;
    });
    renderRoiCandidates();
  }

  function applyRoiCandidates() {
    const selected = state.roiCandidates.filter((candidate) => candidate.selected).map((candidate) => candidate.name);
    if (!selected.length) return;
    state.countMode = "auto";
    mergeInvoiceCandidates(selected, { replaceExisting: true });
    const isOcrResult = state.roiCandidateSource === "ocr";
    elements.invoiceResultTitle.textContent = isOcrResult ? "OCR 영역 적용 결과" : "직접 지정 영역 적용 결과";
    elements.invoiceResultMessage.textContent = isOcrResult
      ? `이미지형 PDF의 선택 영역을 OCR해 ${selected.length}개 품목을 적용했습니다. 인식된 품목명과 순서를 최종 확인해 주세요.`
      : `PDF에서 직접 지정한 영역의 ${selected.length}개 품목을 적용했습니다. 품목명과 순서를 최종 확인해 주세요.`;
    closeRoiDialog();
    renderAll();
    showToast(`${isOcrResult ? "OCR로 인식한" : "직접 지정한"} 품목 ${selected.length}개를 적용했습니다.`);
  }

  function mergeInvoiceCandidates(candidates, options = {}) {
    const replaceExisting = Boolean(options.replaceExisting);
    state.invoiceCandidates = candidates.slice(0, MAX_ITEMS);
    if (state.countMode === "auto") {
      syncAutomaticItemCount();
    } else if (state.countMode === "manual") {
      ensureItemCount(state.manualCount);
    }

    state.items.forEach((item, index) => {
      const candidate = state.invoiceCandidates[index] || "";
      if (replaceExisting || !item.name.trim()) item.name = candidate;
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
    return 1;
  }

  function getPreviewSlotCount() {
    const usedSlots = Math.max(BASE_ITEM_SLOTS, state.items.length);
    return Math.ceil(usedSlots / ITEM_COLUMNS) * ITEM_COLUMNS;
  }

  function getItemRowCount() {
    return getPreviewSlotCount() / ITEM_COLUMNS;
  }

  function getDocumentHeightMm() {
    const extraRows = Math.max(0, getItemRowCount() - BASE_ITEM_SLOTS / ITEM_COLUMNS);
    return BASE_DOCUMENT_HEIGHT_MM + extraRows * ITEM_CELL_HEIGHT_MM;
  }

  function renderAll() {
    renderInvoiceStatus();
    renderCountControls();
    renderPhotoStrip();
    renderItemRows();
    renderReviewerEntry();
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
      elements.autoCountStatus.textContent = `수동으로 ${state.items.length}개 품목 칸을 사용합니다. 5번째부터 물품 셀 행만 아래로 추가됩니다.`;
    } else if (state.invoiceCandidates.length) {
      elements.autoCountStatus.textContent = `Invoice에서 ${state.invoiceCandidates.length}개 품목을 감지해 ${getItemRowCount()}개 셀 행으로 구성했습니다.`;
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
    elements.itemCounter.textContent = `${state.items.length}개 · ${getItemRowCount()}행`;
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

  function renderReviewerEntry() {
    if (elements.reviewerName.value !== state.reviewerName) elements.reviewerName.value = state.reviewerName;
    const reviewer = getSelectedReviewer();
    const signature = reviewer ? readStoredSignature(reviewer.id) : "";
    elements.reviewerSignatureUploadButton.disabled = !reviewer;
    elements.reviewerSignatureUploadButton.textContent = signature ? "서명 교체" : "서명 등록";
    elements.reviewerSignatureRemoveButton.hidden = !signature;
    elements.reviewerSignaturePreview.dataset.state = signature ? "registered" : reviewer ? "missing" : "empty";

    if (signature) {
      elements.reviewerSignatureImage.src = signature;
      elements.reviewerSignatureImage.alt = `${reviewer.name} 등록 서명`;
      elements.reviewerSignatureImage.hidden = false;
      elements.reviewerSignatureStatus.hidden = true;
    } else {
      elements.reviewerSignatureImage.removeAttribute("src");
      elements.reviewerSignatureImage.hidden = true;
      elements.reviewerSignatureStatus.hidden = false;
      elements.reviewerSignatureStatus.textContent = reviewer ? `${reviewer.name} 서명을 등록해 주세요` : "검수자 이름을 먼저 입력하세요";
    }
  }

  async function storeReviewerSignature(file) {
    const reviewer = getSelectedReviewer();
    if (!reviewer) {
      elements.reviewerName.focus();
      showToast("검수자 이름을 먼저 입력해 주세요.", "error");
      return;
    }
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
    renderReviewerEntry();
    renderPreview();
    updateValidation();
    showToast(`${reviewer.name} 서명을 이 브라우저에 등록했습니다.`);
  }

  function removeReviewerSignature() {
    const reviewer = getSelectedReviewer();
    if (!reviewer) return;
    try {
      localStorage.removeItem(signatureStorageKey(reviewer.id));
    } catch (error) {
      console.warn(error);
    }
    renderReviewerEntry();
    renderPreview();
    updateValidation();
    showToast(`${reviewer.name} 서명을 이 브라우저에서 삭제했습니다.`);
  }

  function renderPreview() {
    elements.previewItems.replaceChildren();
    state.previewPage = 0;
    const slotCount = getPreviewSlotCount();
    const rowCount = getItemRowCount();
    const documentHeightMm = getDocumentHeightMm();
    elements.documentPreview.style.aspectRatio = `${DOCUMENT_WIDTH_MM} / ${documentHeightMm}`;
    elements.previewItems.style.setProperty("--template-row-count", String(rowCount));
    elements.previewItems.style.setProperty(
      "--template-grid-aspect",
      `${DOCUMENT_WIDTH_MM - 25.4} / ${rowCount * ITEM_CELL_HEIGHT_MM}`,
    );

    for (let index = 0; index < slotCount; index += 1) {
      const item = state.items[index] || createItem();
      const itemElement = document.createElement("div");
      itemElement.className = "template-item";
      const label = document.createElement("div");
      label.className = "template-item__label";
      const name = document.createElement("span");
      name.textContent = `${index + 1}. 품명${item.name.trim() ? `: ${item.name.trim()}` : ""}`;
      const quantity = document.createElement("small");
      quantity.textContent = item.name.trim() ? `수량 ${clampQuantity(item.quantity)}` : "";
      label.append(name, quantity);

      const photoBox = document.createElement("div");
      photoBox.className = "template-item__photo";
      const photo = getPhoto(item.photoId);
      if (photo) {
        const image = document.createElement("img");
        image.src = photo.dataUrl;
        image.alt = `${index + 1}번 ${item.name || "물품"} 사진`;
        photoBox.append(image);
      } else {
        photoBox.textContent = "사진을 추가하세요";
      }
      itemElement.append(label, photoBox);
      elements.previewItems.append(itemElement);
    }

    elements.previewMeta.textContent = `연속 양식 1장 · ${state.items.length}개 품목 · ${rowCount}개 셀 행`;
    elements.previewPageIndicator.textContent = "1 / 1";
    elements.previewPrevButton.disabled = true;
    elements.previewNextButton.disabled = true;
    elements.documentPreview.setAttribute("aria-label", `물품검수확인서 연속 양식 미리보기, ${rowCount}개 셀 행`);
    elements.previewPageNumber.hidden = true;
    elements.previewThumbnails.hidden = true;
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

    elements.previewThumbnails.replaceChildren();
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
      elements.validationMessage.textContent = `${state.items.length}개 품목 · 연속 양식 1장 · ${getSelectedReviewer().name} 검수`;
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
      const documentHeightMm = getDocumentHeightMm();
      const pageHeightPoints = 595.28 * (documentHeightMm / DOCUMENT_WIDTH_MM);
      elements.exportLabel.textContent = "연속 양식 생성 중…";
      const canvas = await renderDocumentCanvas();
      const imageBytes = await canvasToJpegBytes(canvas, 0.97);
      const page = pdfDocument.addPage([595.28, pageHeightPoints]);
      const image = await pdfDocument.embedJpg(imageBytes);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
      canvas.width = 1;
      canvas.height = 1;

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

  async function renderDocumentCanvas() {
    const width = 2480;
    const documentHeightMm = getDocumentHeightMm();
    const height = Math.round(width * (documentHeightMm / DOCUMENT_WIDTH_MM));
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
    const slotCount = getPreviewSlotCount();
    const rowCount = getItemRowCount();
    const [logo, seal, signature, ...itemImages] = await Promise.all([
      safeLoadImage("./assets/gachon-logo.png"),
      safeLoadImage("./assets/gachon-seal.png"),
      safeLoadImage(signatureDataUrl),
      ...Array.from({ length: slotCount }, (_, index) => safeLoadImage(getPhoto(state.items[index]?.photoId)?.dataUrl || "")),
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

    const cellWidth = contentWidth / ITEM_COLUMNS;
    const labelHeight = 10.5;
    const photoHeight = 42.7;
    const blockHeight = labelHeight + photoHeight;
    const gridStartY = 65;

    for (let index = 0; index < slotCount; index += 1) {
      const column = index % ITEM_COLUMNS;
      const row = Math.floor(index / ITEM_COLUMNS);
      const x = left + column * cellWidth;
      const y = gridStartY + row * blockHeight;
      const item = state.items[index] || createItem();

      context.strokeRect(mm(x), mm(y), mm(cellWidth), mm(blockHeight));
      context.beginPath();
      context.moveTo(mm(x), mm(y + labelHeight));
      context.lineTo(mm(x + cellWidth), mm(y + labelHeight));
      context.stroke();

      const labelText = `${index + 1}. 품명${item.name.trim() ? `: ${item.name.trim()}` : ""}`;
      drawFitText(context, labelText, mm(x + 3), mm(y + labelHeight / 2), mm(cellWidth - 24), 10.5, 7, "700", "left", scale);
      if (item.name.trim()) drawText(context, `수량 ${clampQuantity(item.quantity)}`, mm(x + cellWidth - 3), mm(y + labelHeight / 2), 8.5, "400", "right", scale);

      const image = itemImages[index];
      if (image) {
        drawImageContain(context, image, mm(x + 3), mm(y + labelHeight + 2), mm(cellWidth - 6), mm(photoHeight - 4));
      }
    }

    const extraHeight = Math.max(0, rowCount - BASE_ITEM_SLOTS / ITEM_COLUMNS) * blockHeight;
    drawCenteredText(context, "상기와 같이 신청 물품이 동일함을 확인하였습니다.", mm(105), mm(195 + extraHeight), 11, "400", scale);
    drawCenteredText(context, formatKoreanDate(state.inspectionDate), mm(105), mm(215 + extraHeight), 11, "700", scale);

    drawText(context, "물품 검수자:", mm(127), mm(236 + extraHeight), 11, "700", "left", scale);
    drawText(context, reviewer?.name || "", mm(164), mm(236 + extraHeight), 11, "700", "center", scale);
    drawText(context, "(인)", mm(187), mm(236 + extraHeight), 11, "700", "center", scale);
    if (signature) drawImageContain(context, signature, mm(176), mm(230 + extraHeight), mm(22), mm(12), 0.92);

    drawText(context, "가천대학교 총장 귀하", mm(18), mm(278 + extraHeight), 19, "700", "left", scale);
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
    const name = state.reviewerName.normalize("NFKC").replace(/\s+/g, " ").trim();
    return name ? { id: reviewerStorageId(name), name } : null;
  }

  function reviewerStorageId(name) {
    let hash = 2166136261;
    for (const character of name.toLocaleLowerCase("ko-KR")) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `custom-${(hash >>> 0).toString(16).padStart(8, "0")}`;
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
