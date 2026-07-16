(() => {
  "use strict";

  const BASE_ITEM_SLOTS = 4;
  const ITEM_COLUMNS = 2;
  const ITEM_CELL_HEIGHT_MM = 53.2;
  const DOCUMENT_WIDTH_MM = 210;
  const BASE_DOCUMENT_HEIGHT_MM = 297;
  const MAX_ITEMS = 40;
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
  const MAX_CROP_OUTPUT_DIMENSION = 4096;
  const PHOTO_CROP_ASPECT = 2.23;
  const SIGNATURE_STORAGE_PREFIX = "goods-inspection.signature.v2.";

  const state = {
    invoiceFile: null,
    invoiceText: "",
    invoiceCandidates: [],
    invoicePdf: null,
    invoiceLines: [],
    invoiceSourceType: "",
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
    roiRects: [],
    roiCandidates: [],
    roiDrawing: null,
    roiMatchedTextCount: 0,
    roiCandidateSource: "",
    ocrRunning: false,
    ocrCancelRequested: false,
    ocrProgress: 0,
    ocrStatus: "",
    ocrRawText: "",
    cropPhotoId: null,
    cropRect: null,
    cropRotation: 0,
    cropAspect: "document",
    cropZoom: 1,
    cropDrag: null,
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
    roiSelections: document.querySelector("#roiSelections"),
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
    cropDialog: document.querySelector("#cropDialog"),
    cropCloseButton: document.querySelector("#cropCloseButton"),
    cropPhotoName: document.querySelector("#cropPhotoName"),
    cropStage: document.querySelector("#cropStage"),
    cropSurface: document.querySelector("#cropSurface"),
    cropCanvas: document.querySelector("#cropCanvas"),
    cropSelection: document.querySelector("#cropSelection"),
    cropAspectInputs: [...document.querySelectorAll('input[name="cropAspect"]')],
    cropZoom: document.querySelector("#cropZoom"),
    cropZoomValue: document.querySelector("#cropZoomValue"),
    cropRotateLeftButton: document.querySelector("#cropRotateLeftButton"),
    cropRotateRightButton: document.querySelector("#cropRotateRightButton"),
    cropSummaryTitle: document.querySelector("#cropSummaryTitle"),
    cropSummaryDetail: document.querySelector("#cropSummaryDetail"),
    cropSelectionResetButton: document.querySelector("#cropSelectionResetButton"),
    cropRestoreOriginalButton: document.querySelector("#cropRestoreOriginalButton"),
    cropCancelButton: document.querySelector("#cropCancelButton"),
    cropApplyButton: document.querySelector("#cropApplyButton"),
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
  let ocrVariantIndex = 0;
  let ocrVariantTotal = 1;
  let cropImage = null;
  let cropRenderToken = 0;
  let cropResizeTimer = null;

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
      const file = files.find((entry) => isPdfFile(entry) || isInvoiceImageFile(entry));
      if (!file) {
        showToast("PDF, JPG, PNG 또는 WEBP 파일을 선택해 주세요.", "error");
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
      if (!window.confirm("현재 문서의 거래명세서/구매내역, 사진, 품목 입력을 초기화할까요? 검수자 이름과 등록 서명은 유지됩니다.")) return;
      state.invoiceFile = null;
      state.invoiceText = "";
      state.invoiceCandidates = [];
      state.invoicePdf?.destroy?.();
      state.invoicePdf = null;
      state.invoiceLines = [];
      state.invoiceSourceType = "";
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
      renderRoiSelection();
      if (state.roiRects.length) extractRoiText();
    });
    elements.roiCanvasSurface.addEventListener("pointerdown", startRoiSelection);
    elements.roiCanvasSurface.addEventListener("pointermove", updateRoiSelection);
    elements.roiCanvasSurface.addEventListener("pointerup", finishRoiSelection);
    elements.roiCanvasSurface.addEventListener("pointercancel", cancelRoiDrawing);
    elements.roiSelections.addEventListener("contextmenu", removeRoiFromContextMenu);
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

    elements.cropCloseButton.addEventListener("click", closeCropDialog);
    elements.cropCancelButton.addEventListener("click", closeCropDialog);
    elements.cropDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeCropDialog();
    });
    elements.cropDialog.addEventListener("click", (event) => {
      if (event.target === elements.cropDialog) closeCropDialog();
    });
    elements.cropAspectInputs.forEach((input) => input.addEventListener("change", handleCropAspectChange));
    elements.cropZoom.addEventListener("input", handleCropZoomChange);
    elements.cropRotateLeftButton.addEventListener("click", () => rotateCropPhoto(-90));
    elements.cropRotateRightButton.addEventListener("click", () => rotateCropPhoto(90));
    elements.cropSelectionResetButton.addEventListener("click", resetCropSelection);
    elements.cropRestoreOriginalButton.addEventListener("click", restoreOriginalPhoto);
    elements.cropApplyButton.addEventListener("click", applyPhotoCrop);
    elements.cropSelection.addEventListener("pointerdown", startCropInteraction);
    elements.cropSelection.addEventListener("pointermove", updateCropInteraction);
    elements.cropSelection.addEventListener("pointerup", finishCropInteraction);
    elements.cropSelection.addEventListener("pointercancel", finishCropInteraction);
    window.addEventListener("resize", () => {
      if (!elements.cropDialog.open) return;
      window.clearTimeout(cropResizeTimer);
      cropResizeTimer = window.setTimeout(renderCropCanvas, 120);
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

  function isPdfFile(file) {
    return file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
  }

  function isInvoiceImageFile(file) {
    const name = file?.name?.toLowerCase() || "";
    return ["image/jpeg", "image/png", "image/webp"].includes(file?.type)
      || /\.(jpe?g|png|webp)$/.test(name);
  }

  async function handleInvoiceFile(file) {
    const imageSource = isInvoiceImageFile(file);
    if (!imageSource && !isPdfFile(file)) {
      showToast("PDF, JPG, PNG 또는 WEBP 파일을 선택해 주세요.", "error");
      return;
    }
    if (imageSource && file.size > MAX_IMAGE_BYTES) {
      showToast("구매내역 이미지는 20MB 이하 파일을 사용해 주세요.", "error");
      return;
    }

    state.invoicePdf?.destroy?.();
    state.invoiceFile = file;
    state.invoiceText = "";
    state.invoiceCandidates = [];
    state.invoicePdf = null;
    state.invoiceLines = [];
    state.invoiceSourceType = imageSource ? "image" : "pdf";
    resetRoiState();
    elements.roiOpenButton.disabled = true;
    elements.invoiceResult.hidden = false;
    elements.invoiceResultTitle.textContent = imageSource ? "구매내역 이미지 준비 중" : "Invoice 분석 중";
    elements.invoiceResultMessage.textContent = imageSource
      ? "이미지를 브라우저에서 열고 ROI 영역 OCR을 준비하고 있습니다."
      : "PDF의 텍스트를 브라우저에서 읽고 있습니다.";
    elements.invoiceRawText.textContent = "";
    renderInvoiceStatus("processing");

    try {
      if (imageSource) {
        state.invoicePdf = await createImageInvoiceDocument(file);
        mergeInvoiceCandidates([]);
        elements.invoiceResultTitle.textContent = "구매내역 이미지 준비 완료";
        elements.invoiceResultMessage.textContent = "영역 직접 지정에서 품목명이 있는 부분을 여러 번 드래그한 뒤 모든 영역 OCR을 실행해 주세요.";
        elements.invoiceRawText.textContent = "이미지 파일에는 내장 텍스트가 없습니다. 선택한 ROI 영역을 OCR해 품목명을 읽습니다.";
        elements.roiOpenButton.disabled = false;
        renderInvoiceStatus("complete");
        renderAll();
        return;
      }

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
      elements.invoiceResultTitle.textContent = imageSource ? "구매내역 이미지를 열지 못했습니다" : "Invoice 자동 분석을 완료하지 못했습니다";
      elements.invoiceResultMessage.textContent = imageSource
        ? "브라우저에서 표시할 수 있는 JPG, PNG 또는 WEBP 파일인지 확인해 주세요."
        : "PDF를 열지 못했습니다. 암호화 여부를 확인하거나 품목명을 직접 입력해 주세요. 열 수 있는 이미지형 PDF는 영역 직접 지정 OCR을 사용할 수 있습니다.";
      elements.invoiceRawText.textContent = error instanceof Error ? error.message : String(error);
      elements.roiOpenButton.disabled = true;
      renderInvoiceStatus("error");
      renderAll();
      showToast(imageSource ? "구매내역 이미지를 열지 못했습니다." : "Invoice 텍스트를 읽지 못했습니다. 품목명을 직접 입력해 주세요.", "error");
    }
  }

  async function createImageInvoiceDocument(file) {
    const dataUrl = await fileToDataUrl(file);
    const image = await safeLoadImage(dataUrl);
    if (!image?.naturalWidth || !image?.naturalHeight) throw new Error("이미지 크기를 확인하지 못했습니다.");
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    return {
      numPages: 1,
      sourceType: "image",
      async getPage(pageNumber) {
        if (pageNumber !== 1) throw new Error("구매내역 이미지는 한 페이지로 처리됩니다.");
        return {
          getViewport({ scale = 1 } = {}) {
            return { width: sourceWidth * scale, height: sourceHeight * scale };
          },
          render({ canvasContext, viewport }) {
            const promise = Promise.resolve().then(() => {
              canvasContext.save();
              canvasContext.fillStyle = "#ffffff";
              canvasContext.fillRect(0, 0, viewport.width, viewport.height);
              canvasContext.imageSmoothingEnabled = true;
              canvasContext.imageSmoothingQuality = "high";
              canvasContext.drawImage(image, 0, 0, viewport.width, viewport.height);
              canvasContext.restore();
            });
            return { promise, cancel() {} };
          },
        };
      },
      destroy() {
        image.removeAttribute("src");
      },
    };
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
    state.roiRects = [];
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
      showToast("먼저 거래명세서 PDF 또는 구매내역 이미지를 올려 주세요.", "error");
      return;
    }
    const pageCount = state.invoicePdf.numPages || 1;
    state.roiPageNumber = Math.min(Math.max(1, state.roiPageNumber), pageCount);
    elements.roiApplyAllPages.disabled = pageCount === 1;
    elements.roiApplyAllPages.closest("label").hidden = pageCount === 1;
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
    renderRoiPage();
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
      elements.roiCanvasHint.textContent = "문서를 표시하지 못했습니다. 창을 닫고 다시 시도해 주세요.";
      showToast("영역 지정 화면을 표시하지 못했습니다.", "error");
    }
  }

  function startRoiSelection(event) {
    if (!state.invoicePdf || event.button !== 0) return;
    if (state.ocrRunning) cancelRoiOcr(true);
    const point = getRoiPoint(event);
    if (!point) return;
    event.preventDefault();
    state.roiDrawing = {
      pointerId: event.pointerId,
      pageNumber: state.roiPageNumber,
      startX: point.x,
      startY: point.y,
      rect: { x: point.x, y: point.y, width: 0, height: 0 },
    };
    elements.roiCanvasSurface.setPointerCapture?.(event.pointerId);
    renderRoiSelection();
  }

  function updateRoiSelection(event) {
    if (!state.roiDrawing || state.roiDrawing.pointerId !== event.pointerId) return;
    const point = getRoiPoint(event);
    if (!point) return;
    event.preventDefault();
    state.roiDrawing.rect = normalizedRoiRect(state.roiDrawing.startX, state.roiDrawing.startY, point.x, point.y);
    renderRoiSelection();
  }

  function finishRoiSelection(event) {
    if (!state.roiDrawing || state.roiDrawing.pointerId !== event.pointerId) return;
    updateRoiSelection(event);
    if (elements.roiCanvasSurface.hasPointerCapture?.(event.pointerId)) {
      elements.roiCanvasSurface.releasePointerCapture(event.pointerId);
    }
    const completed = state.roiDrawing.rect;
    const pageNumber = state.roiDrawing.pageNumber;
    state.roiDrawing = null;
    if (!completed || completed.width < 0.012 || completed.height < 0.012) {
      renderRoiSelection();
      showToast("품목 영역을 조금 더 크게 드래그해 주세요.", "error");
      return;
    }
    state.roiRects.push({ id: cryptoRandomId(), pageNumber, ...completed });
    invalidateRoiResults();
    renderRoiSelection();
    extractRoiText();
  }

  function cancelRoiDrawing(event) {
    if (!state.roiDrawing || state.roiDrawing.pointerId !== event.pointerId) return;
    state.roiDrawing = null;
    renderRoiSelection();
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
    elements.roiSelections.replaceChildren();
    const showEveryRect = elements.roiApplyAllPages.checked && (state.invoicePdf?.numPages || 1) > 1;
    const visibleRects = state.roiRects.filter((rect) => showEveryRect || rect.pageNumber === state.roiPageNumber);
    visibleRects.forEach((rect) => {
      const selection = document.createElement("div");
      const index = state.roiRects.findIndex((entry) => entry.id === rect.id) + 1;
      selection.className = "roi-selection";
      selection.dataset.roiId = rect.id;
      selection.dataset.roiLabel = `영역 ${index}`;
      selection.style.left = `${rect.x * 100}%`;
      selection.style.top = `${rect.y * 100}%`;
      selection.style.width = `${rect.width * 100}%`;
      selection.style.height = `${rect.height * 100}%`;
      selection.title = `영역 ${index} · 우클릭하여 삭제`;
      selection.setAttribute("aria-label", `선택 영역 ${index}, 우클릭하여 삭제`);
      elements.roiSelections.append(selection);
    });

    const draft = state.roiDrawing?.rect;
    if (draft?.width > 0 && draft?.height > 0 && state.roiDrawing.pageNumber === state.roiPageNumber) {
      const selection = document.createElement("div");
      selection.className = "roi-selection is-draft";
      selection.dataset.roiLabel = "추가 중";
      selection.style.left = `${draft.x * 100}%`;
      selection.style.top = `${draft.y * 100}%`;
      selection.style.width = `${draft.width * 100}%`;
      selection.style.height = `${draft.height * 100}%`;
      elements.roiSelections.append(selection);
    }

    const count = state.roiRects.length;
    elements.roiCanvasHint.textContent = count
      ? `${count}개 영역이 선택되었습니다. 드래그로 추가하고, 영역을 우클릭하면 삭제됩니다.`
      : "품목 영역을 드래그해 추가하세요. 선택 영역을 우클릭하면 삭제됩니다.";
  }

  function resetRoiSelection() {
    if (state.ocrRunning) cancelRoiOcr(true);
    state.roiRects = [];
    state.roiDrawing = null;
    invalidateRoiResults();
    renderRoiSelection();
  }

  function removeRoiFromContextMenu(event) {
    const selection = event.target.closest("[data-roi-id]");
    if (!selection) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.ocrRunning) cancelRoiOcr(true);
    const index = state.roiRects.findIndex((rect) => rect.id === selection.dataset.roiId);
    if (index < 0) return;
    state.roiRects.splice(index, 1);
    invalidateRoiResults();
    renderRoiSelection();
    if (state.roiRects.length) extractRoiText();
    showToast(`선택 영역 ${index + 1}을 삭제했습니다.`);
  }

  function invalidateRoiResults() {
    state.roiCandidates = [];
    state.roiMatchedTextCount = 0;
    state.roiCandidateSource = "";
    resetOcrResult();
    renderRoiCandidates();
  }

  function getRoiTasks() {
    if (!state.invoicePdf || !state.roiRects.length) return [];
    const pageCount = state.invoicePdf.numPages || 1;
    const applyAllPages = elements.roiApplyAllPages.checked && pageCount > 1;
    if (!applyAllPages) {
      return state.roiRects.map((rect, roiIndex) => ({ pageNumber: rect.pageNumber, rect, roiIndex }));
    }
    return state.roiRects.flatMap((rect, roiIndex) => (
      Array.from({ length: pageCount }, (_, pageIndex) => ({ pageNumber: pageIndex + 1, rect, roiIndex }))
    ));
  }

  function extractRoiText() {
    if (!state.roiRects.length || !state.invoicePdf) return;
    const tasks = getRoiTasks();
    const roiLines = [];
    const seenLines = new Set();

    tasks.forEach(({ pageNumber, rect }) => {
      state.invoiceLines
        .filter((line) => line.pageNumber === pageNumber)
        .forEach((line) => {
          const selectedParts = (line.parts || [])
            .filter((part) => partIntersectsRoi(line, part, rect))
            .sort((a, b) => a.x - b.x);
          if (!selectedParts.length) return;
          const text = selectedParts.map((part) => part.text).join(" ").replace(/\s+/g, " ").trim();
          const key = `${pageNumber}:${Math.round(line.y * 10)}:${text}`;
          if (text && !seenLines.has(key)) {
            seenLines.add(key);
            roiLines.push({ ...line, text });
          }
        });
    });

    const analysis = window.InvoiceParser.extractRoiCandidates(roiLines, { maxItems: MAX_ITEMS });
    state.roiMatchedTextCount = roiLines.length;
    state.roiCandidateSource = state.invoiceSourceType === "image" ? "image" : "pdf-text";
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
    elements.roiOcrButton.disabled = !state.roiRects.length || state.ocrRunning || !runtimeReady;
    elements.roiOcrButton.textContent = state.ocrRunning ? "OCR 분석 중…" : "모든 영역 OCR";
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
    const variantProgress = (ocrVariantIndex + progress) / Math.max(1, ocrVariantTotal);
    state.ocrProgress = recognizing
      ? Math.min(1, (ocrPageIndex + variantProgress) / Math.max(1, ocrPageTotal))
      : Math.max(state.ocrProgress, progress * 0.16);
    const pageLabel = recognizing
      ? ` · 영역 ${ocrPageIndex + 1}/${ocrPageTotal} · 판독 ${ocrVariantIndex + 1}/${ocrVariantTotal}`
      : "";
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
          tessedit_char_whitelist: "",
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

  async function renderRoiOcrCanvas(pageNumber, roi) {
    const page = await state.invoicePdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = state.invoiceSourceType === "image"
      ? Math.min(2, Math.max(1, 2400 / Math.max(1, baseViewport.width)))
      : Math.min(4, Math.max(2.4, 2400 / Math.max(1, baseViewport.width)));
    const viewport = page.getViewport({ scale: renderScale });
    const source = document.createElement("canvas");
    source.width = Math.ceil(viewport.width);
    source.height = Math.ceil(viewport.height);
    const sourceContext = source.getContext("2d", { alpha: false, willReadFrequently: false });
    sourceContext.fillStyle = "#ffffff";
    sourceContext.fillRect(0, 0, source.width, source.height);
    await page.render({ canvasContext: sourceContext, viewport }).promise;

    const sourceX = Math.max(0, Math.floor(roi.x * source.width));
    const sourceY = Math.max(0, Math.floor(roi.y * source.height));
    const sourceWidth = Math.max(1, Math.min(source.width - sourceX, Math.ceil(roi.width * source.width)));
    const sourceHeight = Math.max(1, Math.min(source.height - sourceY, Math.ceil(roi.height * source.height)));
    const padding = 28;
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

    // 품번처럼 ROI 안의 글자가 작은 경우에는 OCR 입력 자체를 확대합니다.
    // 지나친 확대는 메모리를 키우므로 가로 3,200px을 상한으로 둡니다.
    const minimumTextCanvasHeight = 240;
    const enlargeScale = Math.min(
      4,
      Math.max(1, minimumTextCanvasHeight / Math.max(1, crop.height)),
      3200 / Math.max(1, crop.width),
    );
    if (enlargeScale > 1.01) {
      const enlarged = document.createElement("canvas");
      enlarged.width = Math.max(1, Math.round(crop.width * enlargeScale));
      enlarged.height = Math.max(1, Math.round(crop.height * enlargeScale));
      const enlargedContext = enlarged.getContext("2d", { alpha: false });
      enlargedContext.fillStyle = "#ffffff";
      enlargedContext.fillRect(0, 0, enlarged.width, enlarged.height);
      enlargedContext.imageSmoothingEnabled = true;
      enlargedContext.imageSmoothingQuality = "high";
      enlargedContext.drawImage(crop, 0, 0, enlarged.width, enlarged.height);
      crop.width = 1;
      crop.height = 1;
      return enlarged;
    }
    return crop;
  }

  function createBinaryOcrCanvas(sourceCanvas) {
    const binary = document.createElement("canvas");
    binary.width = sourceCanvas.width;
    binary.height = sourceCanvas.height;
    const context = binary.getContext("2d", { alpha: false, willReadFrequently: true });
    context.drawImage(sourceCanvas, 0, 0);
    const image = context.getImageData(0, 0, binary.width, binary.height);
    const histogram = new Uint32Array(256);
    const grayValues = new Uint8Array(binary.width * binary.height);
    let total = 0;
    for (let offset = 0; offset < image.data.length; offset += 4) {
      const gray = Math.max(0, Math.min(255, Math.round(
        image.data[offset] * 0.299 + image.data[offset + 1] * 0.587 + image.data[offset + 2] * 0.114,
      )));
      grayValues[offset / 4] = gray;
      histogram[gray] += 1;
      total += gray;
    }
    let sumBackground = 0;
    let weightBackground = 0;
    let bestThreshold = 160;
    let bestVariance = -1;
    for (let threshold = 0; threshold < 256; threshold += 1) {
      weightBackground += histogram[threshold];
      if (!weightBackground) continue;
      const weightForeground = grayValues.length - weightBackground;
      if (!weightForeground) break;
      sumBackground += threshold * histogram[threshold];
      const meanBackground = sumBackground / weightBackground;
      const meanForeground = (total - sumBackground) / weightForeground;
      const variance = weightBackground * weightForeground
        * (meanBackground - meanForeground) * (meanBackground - meanForeground);
      if (variance > bestVariance) {
        bestVariance = variance;
        bestThreshold = threshold;
      }
    }
    // 회색 배경이 많은 캡처에서는 Otsu 값이 너무 낮아질 수 있어 안전 범위를 둡니다.
    const threshold = Math.max(100, Math.min(220, bestThreshold));
    for (let pixel = 0; pixel < grayValues.length; pixel += 1) {
      const value = grayValues[pixel] < threshold ? 0 : 255;
      const offset = pixel * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return binary;
  }

  function normalizeOcrText(text) {
    return String(text || "")
      .normalize("NFKC")
      .replace(/[‐‑‒–—―−]/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  function looksLikeOcrCode(text) {
    const compact = String(text || "").replace(/\s+/g, "");
    return compact.length >= 5
      && compact.length <= 80
      && /^[A-Za-z0-9._\/-]+$/.test(compact)
      && /\d/.test(compact)
      && (/[._\/-]/.test(compact) || /^[A-Za-z]*\d{5,}$/.test(compact));
  }

  function scoreOcrResult(result, method) {
    const text = normalizeOcrText(result.text);
    if (!text) return { ...result, text, score: -Infinity, code: false };
    const compact = text.replace(/\s+/g, "");
    const allowed = compact.match(/[A-Za-z0-9._\/-]/g)?.length || 0;
    const confidence = Math.max(0, Math.min(100, Number(result.confidence) || 0));
    const code = looksLikeOcrCode(text);
    let score = confidence + (allowed / Math.max(1, compact.length)) * 8;
    if (code) score += 28;
    if (method === "code") score += code ? 22 : -18;
    if (method === "binary") score += 3;
    if (method === "code" && /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text)) score -= 35;
    if ((text.match(/\s/g) || []).length > 3) score -= 4;
    return { ...result, text: code ? compact : text, score, code };
  }

  function selectBestOcrResult(results) {
    return results
      .map((result) => scoreOcrResult(result, result.method))
      .sort((left, right) => right.score - left.score)[0] || { text: "", method: "", confidence: 0 };
  }

  function buildOcrVariants(crop) {
    const lineLike = crop.width / Math.max(1, crop.height) >= 2.1;
    const variants = [
      { label: "명암 보정", method: "enhanced", canvas: crop },
      { label: "이진화", method: "binary", canvas: createBinaryOcrCanvas(crop) },
    ];
    if (lineLike) {
      variants.push({ label: "품번 문자 보정", method: "code", canvas: createBinaryOcrCanvas(crop) });
    }
    return variants.map((variant) => ({ ...variant, lineLike }));
  }

  async function runRoiOcr() {
    if (!state.roiRects.length || !state.invoicePdf || state.ocrRunning) return;
    if (!window.Tesseract?.createWorker) {
      showToast("OCR 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.", "error");
      return;
    }

    const tasks = getRoiTasks();
    if (!tasks.length) return;
    const runToken = ++ocrRunToken;
    ocrPageIndex = 0;
    ocrPageTotal = tasks.length;
    ocrVariantIndex = 0;
    ocrVariantTotal = 1;
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

    const taskTexts = [];
    try {
      const worker = await getOcrWorker();
      if (runToken !== ocrRunToken) return;
      for (let index = 0; index < tasks.length; index += 1) {
        if (runToken !== ocrRunToken) return;
        ocrPageIndex = index;
        state.ocrStatus = `선택 영역 이미지 준비 중 · ${index + 1}/${tasks.length}영역`;
        renderOcrControls();
        const task = tasks[index];
        const crop = await renderRoiOcrCanvas(task.pageNumber, task.rect);
        if (runToken !== ocrRunToken) {
          crop.width = 1;
          crop.height = 1;
          return;
        }
        const variants = buildOcrVariants(crop);
        ocrVariantTotal = variants.length;
        const results = [];
        for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
          if (runToken !== ocrRunToken) {
            crop.width = 1;
            crop.height = 1;
            return;
          }
          const variant = variants[variantIndex];
          ocrVariantIndex = variantIndex;
          await worker.setParameters({
            tessedit_pageseg_mode: variant.lineLike
              ? (window.Tesseract.PSM?.SINGLE_LINE || "7")
              : (window.Tesseract.PSM?.SINGLE_BLOCK || "6"),
            preserve_interword_spaces: "1",
            tessedit_char_whitelist: variant.method === "code"
              ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._/"
              : "",
          });
          const result = await worker.recognize(variant.canvas);
          results.push({
            method: variant.method,
            label: variant.label,
            text: result.data?.text || "",
            confidence: result.data?.confidence,
          });
          if (variant.canvas !== crop) {
            variant.canvas.width = 1;
            variant.canvas.height = 1;
          }
        }
        const selected = selectBestOcrResult(results);
        crop.width = 1;
        crop.height = 1;
        taskTexts.push({ ...task, ...selected });
      }

      if (runToken !== ocrRunToken) return;
      state.ocrRawText = taskTexts
        .map((task) => {
          const label = state.invoiceSourceType === "image"
            ? `영역 ${task.roiIndex + 1}`
            : `${task.pageNumber}페이지 · 영역 ${task.roiIndex + 1}`;
          const confidence = Number.isFinite(Number(task.confidence))
            ? ` · ${Math.round(Number(task.confidence))}%`
            : "";
          return `[${label} · ${task.label || "선택 결과"}${confidence}]\n${task.text}`;
        })
        .filter(Boolean)
        .join("\n\n");
      const ocrLines = taskTexts
        .flatMap((task) => task.text.split(/\r?\n/))
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
        ? `${tasks.length}개 OCR 영역에서 품목 후보 ${state.roiCandidates.length}개를 찾았습니다.`
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
    const hasRois = state.roiRects.length > 0;

    if (!candidates.length) {
      const empty = document.createElement("p");
      empty.className = "roi-candidate-empty";
      if (state.ocrRunning) {
        elements.roiCandidateTitle.textContent = "선택 영역을 OCR로 분석 중입니다";
        elements.roiCandidateMessage.textContent = state.ocrStatus || "한글·영문 OCR 엔진을 준비하고 있습니다.";
        empty.textContent = "분석이 끝나면 품목 후보가 여기에 표시됩니다.";
      } else if (state.roiCandidateSource === "ocr" && hasRois && state.roiMatchedTextCount === 0) {
        elements.roiCandidateTitle.textContent = "OCR로 글자를 읽지 못했습니다";
        elements.roiCandidateMessage.textContent = "글자가 선명하게 보이도록 ROI를 다시 추가하거나 불필요한 영역을 우클릭해 삭제해 주세요.";
        empty.textContent = "OCR 원문에 인식된 텍스트가 없습니다.";
      } else if (state.roiCandidateSource === "ocr" && hasRois) {
        elements.roiCandidateTitle.textContent = "OCR 품목 후보를 찾지 못했습니다";
        elements.roiCandidateMessage.textContent = "글자는 인식했지만 머리글·주소·금액 정보로 판단했습니다. OCR 원문을 확인해 주세요.";
        empty.textContent = "품목명이 있는 부분만 ROI로 남겨 다시 실행해 보세요.";
      } else if (state.roiCandidateSource === "image" && hasRois) {
        elements.roiCandidateTitle.textContent = `${state.roiRects.length}개 이미지 영역을 선택했습니다`;
        elements.roiCandidateMessage.textContent = "구매내역 이미지에는 PDF 텍스트가 없으므로 모든 영역 OCR을 실행해 주세요.";
        empty.textContent = "선택한 모든 ROI를 순서대로 OCR할 준비가 되었습니다.";
      } else if (hasRois && state.roiMatchedTextCount === 0) {
        elements.roiCandidateTitle.textContent = "선택 영역에 PDF 텍스트가 없습니다";
        elements.roiCandidateMessage.textContent = "스캔 PDF라면 위의 모든 영역 OCR을 실행하세요.";
        empty.textContent = "PDF 텍스트 객체를 찾지 못했습니다. 선택한 ROI를 OCR할 수 있습니다.";
      } else if (hasRois) {
        elements.roiCandidateTitle.textContent = "품목 후보를 찾지 못했습니다";
        elements.roiCandidateMessage.textContent = "선택 영역에 글자는 있지만 품목명이 아닌 머리글·주소·금액 정보로 판단했습니다.";
        empty.textContent = "품목명 부분을 추가하거나 불필요한 ROI를 우클릭해 삭제해 보세요.";
      } else {
        elements.roiCandidateTitle.textContent = "영역을 선택해 주세요";
        elements.roiCandidateMessage.textContent = "드래그할 때마다 ROI가 추가되며 이미지 파일과 스캔 PDF는 모든 영역을 OCR합니다.";
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
      ? `${state.roiRects.length}개 ROI 위치를 전체 PDF 페이지에 적용했습니다.`
      : `${state.roiRects.length}개 ROI를 적용했습니다.`;
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
      ? `${state.invoiceSourceType === "image" ? "구매내역 이미지" : "이미지형 PDF"}의 ${state.roiRects.length}개 영역을 OCR해 ${selected.length}개 품목을 적용했습니다. 인식된 품목명과 순서를 최종 확인해 주세요.`
      : `PDF에서 직접 지정한 ${state.roiRects.length}개 영역의 ${selected.length}개 품목을 적용했습니다. 품목명과 순서를 최종 확인해 주세요.`;
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
      state.photos.push({
        id: cryptoRandomId(),
        name: file.name,
        type: file.type,
        originalDataUrl: dataUrl,
        dataUrl,
        crop: null,
      });
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
    elements.invoiceFileName.textContent = state.invoiceFile?.name || "PDF 또는 이미지를 선택하거나 놓으세요";
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
      container.className = `photo-order-item${photo.crop ? " is-cropped" : ""}`;
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
      if (photo.crop) {
        const cropBadge = document.createElement("span");
        cropBadge.className = "photo-order-item__crop-badge";
        cropBadge.textContent = "크롭";
        thumbnail.append(cropBadge);
      }

      const name = document.createElement("span");
      name.className = "photo-order-item__name";
      name.textContent = photo.name;
      name.title = photo.name;

      const actions = document.createElement("div");
      actions.className = "photo-order-item__actions";
      const moveUpButton = createPhotoOrderButton("up", `${photo.name}을 앞 순서로 이동`, index === 0);
      const moveDownButton = createPhotoOrderButton("down", `${photo.name}을 뒤 순서로 이동`, index === state.photos.length - 1);
      const cropButton = document.createElement("button");
      cropButton.type = "button";
      cropButton.dataset.action = "crop";
      cropButton.title = photo.crop ? "크롭 다시 편집" : "사진 크롭";
      cropButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v13a2 2 0 0 0 2 2h11M3 8h13a2 2 0 0 1 2 2v11" /><path d="M3 3h5M3 3v5M21 21h-5M21 21v-5" /></svg>';
      cropButton.setAttribute("aria-label", `${photo.name} ${photo.crop ? "크롭 다시 편집" : "사진 크롭"}`);
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.dataset.action = "remove";
      removeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>';
      removeButton.setAttribute("aria-label", `${photo.name} 사진 삭제`);
      moveUpButton.addEventListener("click", () => movePhoto(photo.id, -1));
      moveDownButton.addEventListener("click", () => movePhoto(photo.id, 1));
      cropButton.addEventListener("pointerdown", (event) => event.stopPropagation());
      cropButton.addEventListener("click", () => openCropDialog(photo.id));
      removeButton.addEventListener("click", () => removePhoto(photo.id));
      actions.append(moveUpButton, moveDownButton, cropButton, removeButton);
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
    if (state.cropPhotoId === photoId) closeCropDialog();
    state.photos = state.photos.filter((photo) => photo.id !== photoId);
    state.items.forEach((item) => {
      if (item.photoId === photoId) item.photoId = "";
    });
    if (state.countMode === "auto" && !state.invoiceCandidates.length) syncAutomaticItemCount();
    else syncItemsToPhotoOrder();
    renderAll();
  }

  async function openCropDialog(photoId) {
    const photo = getPhoto(photoId);
    if (!photo) return;

    const token = ++cropRenderToken;
    state.cropPhotoId = photoId;
    state.cropRect = photo.crop?.rect ? { ...photo.crop.rect } : null;
    state.cropRotation = normalizeCropRotation(photo.crop?.rotation || 0);
    state.cropAspect = photo.crop?.aspect === "free" ? "free" : "document";
    state.cropZoom = clampCropZoom(photo.crop?.zoom || 1);
    state.cropDrag = null;
    elements.cropPhotoName.textContent = photo.name;
    elements.cropApplyButton.disabled = true;
    elements.cropRestoreOriginalButton.disabled = !photo.crop;
    elements.cropSummaryTitle.textContent = "사진을 준비하고 있습니다";
    elements.cropSummaryDetail.textContent = "원본 이미지를 불러오는 중입니다.";

    if (!elements.cropDialog.open) elements.cropDialog.showModal();
    cropImage = await safeLoadImage(photo.originalDataUrl || photo.dataUrl);
    if (token !== cropRenderToken || state.cropPhotoId !== photoId) return;
    if (!cropImage) {
      closeCropDialog();
      showToast("사진을 불러오지 못했습니다.", "error");
      return;
    }

    await renderCropCanvas();
    elements.cropApplyButton.disabled = false;
  }

  function closeCropDialog() {
    cropRenderToken += 1;
    state.cropPhotoId = null;
    state.cropRect = null;
    state.cropRotation = 0;
    state.cropAspect = "document";
    state.cropZoom = 1;
    state.cropDrag = null;
    cropImage = null;
    elements.cropSelection.hidden = true;
    elements.cropApplyButton.disabled = false;
    elements.cropApplyButton.textContent = "크롭 적용";
    if (elements.cropDialog.open) elements.cropDialog.close();
  }

  function normalizeCropRotation(rotation) {
    return ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
  }

  function clampCropZoom(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    return Math.min(4, Math.max(1, numeric));
  }

  function getRotatedCropDimensions() {
    if (!cropImage) return { width: 1, height: 1 };
    return state.cropRotation % 180 === 0
      ? { width: cropImage.naturalWidth, height: cropImage.naturalHeight }
      : { width: cropImage.naturalHeight, height: cropImage.naturalWidth };
  }

  function getDocumentCropAspect() {
    const dimensions = getRotatedCropDimensions();
    return PHOTO_CROP_ASPECT * dimensions.height / dimensions.width;
  }

  function createDefaultCropRect() {
    const coverage = 0.92 / clampCropZoom(state.cropZoom);
    if (state.cropAspect === "free") {
      return { x: (1 - coverage) / 2, y: (1 - coverage) / 2, width: coverage, height: coverage };
    }

    const aspect = getDocumentCropAspect();
    let width = coverage;
    let height = coverage;
    if (width / height > aspect) width = height * aspect;
    else height = width / aspect;
    return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
  }

  function clampCropRect(rect) {
    const minimum = 0.035;
    let width = Math.min(1, Math.max(minimum, Number(rect?.width) || minimum));
    let height = Math.min(1, Math.max(minimum, Number(rect?.height) || minimum));
    const x = Math.min(1 - width, Math.max(0, Number(rect?.x) || 0));
    const y = Math.min(1 - height, Math.max(0, Number(rect?.y) || 0));
    if (x + width > 1) width = 1 - x;
    if (y + height > 1) height = 1 - y;
    return { x, y, width, height };
  }

  async function renderCropCanvas() {
    if (!elements.cropDialog.open || !cropImage) return;
    const token = cropRenderToken;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (token !== cropRenderToken || !cropImage) return;

    const dimensions = getRotatedCropDimensions();
    const stageRect = elements.cropStage.getBoundingClientRect();
    const availableWidth = Math.max(220, stageRect.width - 36);
    const availableHeight = Math.max(260, Math.min(stageRect.height - 36, window.innerHeight - 220));
    const cssScale = Math.min(1, availableWidth / dimensions.width, availableHeight / dimensions.height);
    const cssWidth = Math.max(1, Math.round(dimensions.width * cssScale));
    const cssHeight = Math.max(1, Math.round(dimensions.height * cssScale));
    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const canvasWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
    const canvasHeight = Math.max(1, Math.round(cssHeight * pixelRatio));
    const canvas = elements.cropCanvas;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    elements.cropSurface.style.width = `${cssWidth}px`;
    elements.cropSurface.style.height = `${cssHeight}px`;

    const context = canvas.getContext("2d", { alpha: false });
    context.save();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.translate(canvasWidth / 2, canvasHeight / 2);
    context.rotate(state.cropRotation * Math.PI / 180);
    const drawScale = cssScale * pixelRatio;
    context.drawImage(
      cropImage,
      -cropImage.naturalWidth * drawScale / 2,
      -cropImage.naturalHeight * drawScale / 2,
      cropImage.naturalWidth * drawScale,
      cropImage.naturalHeight * drawScale,
    );
    context.restore();

    state.cropRect = state.cropRect ? clampCropRect(state.cropRect) : createDefaultCropRect();
    renderCropSelection();
  }

  function renderCropSelection() {
    if (!state.cropRect || !cropImage) {
      elements.cropSelection.hidden = true;
      return;
    }

    const rect = clampCropRect(state.cropRect);
    state.cropRect = rect;
    elements.cropSelection.hidden = false;
    elements.cropSelection.style.left = `${rect.x * 100}%`;
    elements.cropSelection.style.top = `${rect.y * 100}%`;
    elements.cropSelection.style.width = `${rect.width * 100}%`;
    elements.cropSelection.style.height = `${rect.height * 100}%`;
    elements.cropAspectInputs.forEach((input) => {
      input.checked = input.value === state.cropAspect;
    });
    elements.cropZoom.value = String(state.cropZoom);
    elements.cropZoomValue.value = `${state.cropZoom.toFixed(1)}×`;
    elements.cropZoomValue.textContent = `${state.cropZoom.toFixed(1)}×`;

    const dimensions = getRotatedCropDimensions();
    const outputWidth = Math.max(1, Math.round(rect.width * dimensions.width));
    const outputHeight = Math.max(1, Math.round(rect.height * dimensions.height));
    elements.cropSummaryTitle.textContent = state.cropAspect === "document" ? "문서 사진 칸 비율 고정" : "자유 비율 선택";
    elements.cropSummaryDetail.textContent = `${outputWidth} × ${outputHeight}px · ${state.cropRotation}° 회전`;
  }

  function resetCropSelection() {
    if (!cropImage) return;
    state.cropZoom = 1;
    state.cropRect = createDefaultCropRect();
    renderCropSelection();
  }

  function handleCropAspectChange(event) {
    if (!cropImage || !event.target.checked) return;
    state.cropAspect = event.target.value === "free" ? "free" : "document";
    if (state.cropAspect === "document") {
      const centerX = (state.cropRect?.x || 0) + (state.cropRect?.width || 1) / 2;
      const centerY = (state.cropRect?.y || 0) + (state.cropRect?.height || 1) / 2;
      const next = createDefaultCropRect();
      next.x = centerX - next.width / 2;
      next.y = centerY - next.height / 2;
      state.cropRect = clampCropRect(next);
    }
    renderCropSelection();
  }

  function handleCropZoomChange(event) {
    if (!state.cropRect) return;
    const nextZoom = clampCropZoom(event.target.value);
    const scale = state.cropZoom / nextZoom;
    const centerX = state.cropRect.x + state.cropRect.width / 2;
    const centerY = state.cropRect.y + state.cropRect.height / 2;
    state.cropZoom = nextZoom;
    state.cropRect = clampCropRect({
      x: centerX - state.cropRect.width * scale / 2,
      y: centerY - state.cropRect.height * scale / 2,
      width: state.cropRect.width * scale,
      height: state.cropRect.height * scale,
    });
    renderCropSelection();
  }

  function rotateCropPhoto(delta) {
    if (!cropImage) return;
    state.cropRotation = normalizeCropRotation(state.cropRotation + delta);
    state.cropZoom = 1;
    state.cropRect = null;
    renderCropCanvas();
  }

  function startCropInteraction(event) {
    if (event.button !== 0 || !state.cropRect) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.target.closest("[data-crop-handle]")?.dataset.cropHandle || "move";
    const point = cropPointerPosition(event);
    state.cropDrag = {
      pointerId: event.pointerId,
      handle,
      startPoint: point,
      startRect: { ...state.cropRect },
    };
    elements.cropSelection.setPointerCapture(event.pointerId);
    elements.cropSelection.classList.add("is-dragging");
  }

  function cropPointerPosition(event) {
    const bounds = elements.cropCanvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(1, bounds.width))),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(1, bounds.height))),
    };
  }

  function updateCropInteraction(event) {
    const drag = state.cropDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = cropPointerPosition(event);
    if (drag.handle === "move") {
      const dx = point.x - drag.startPoint.x;
      const dy = point.y - drag.startPoint.y;
      state.cropRect = clampCropRect({
        ...drag.startRect,
        x: Math.min(1 - drag.startRect.width, Math.max(0, drag.startRect.x + dx)),
        y: Math.min(1 - drag.startRect.height, Math.max(0, drag.startRect.y + dy)),
      });
    } else {
      state.cropRect = resizeCropRect(drag, point);
    }
    renderCropSelection();
  }

  function resizeCropRect(drag, point) {
    const start = drag.startRect;
    const east = drag.handle.includes("e");
    const south = drag.handle.includes("s");
    const anchorX = east ? start.x : start.x + start.width;
    const anchorY = south ? start.y : start.y + start.height;
    const directionX = east ? 1 : -1;
    const directionY = south ? 1 : -1;
    const minimum = 0.035;
    const maxWidth = east ? 1 - anchorX : anchorX;
    const maxHeight = south ? 1 - anchorY : anchorY;
    let width = Math.min(maxWidth, Math.max(minimum, Math.abs(point.x - anchorX)));
    let height = Math.min(maxHeight, Math.max(minimum, Math.abs(point.y - anchorY)));

    if (state.cropAspect === "document") {
      const aspect = getDocumentCropAspect();
      const widthFromHeight = height * aspect;
      const heightFromWidth = width / aspect;
      if (widthFromHeight <= maxWidth && Math.abs(widthFromHeight - width) < Math.abs(heightFromWidth - height) * aspect) {
        width = widthFromHeight;
      } else {
        height = heightFromWidth;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspect;
      }
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspect;
      }
    }

    width = Math.max(minimum, width);
    height = Math.max(minimum, height);
    return clampCropRect({
      x: anchorX + (directionX < 0 ? -width : 0),
      y: anchorY + (directionY < 0 ? -height : 0),
      width,
      height,
    });
  }

  function finishCropInteraction(event) {
    if (!state.cropDrag || state.cropDrag.pointerId !== event.pointerId) return;
    if (elements.cropSelection.hasPointerCapture(event.pointerId)) elements.cropSelection.releasePointerCapture(event.pointerId);
    state.cropDrag = null;
    elements.cropSelection.classList.remove("is-dragging");
  }

  function createRotatedPhotoCanvas() {
    const dimensions = getRotatedCropDimensions();
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(state.cropRotation * Math.PI / 180);
    context.drawImage(cropImage, -cropImage.naturalWidth / 2, -cropImage.naturalHeight / 2);
    return canvas;
  }

  async function applyPhotoCrop() {
    const photo = getPhoto(state.cropPhotoId);
    if (!photo || !cropImage || !state.cropRect) return;
    const applyButton = elements.cropApplyButton;
    applyButton.disabled = true;
    applyButton.textContent = "적용 중…";

    try {
      const source = createRotatedPhotoCanvas();
      const rect = clampCropRect(state.cropRect);
      const sourceX = Math.max(0, Math.round(rect.x * source.width));
      const sourceY = Math.max(0, Math.round(rect.y * source.height));
      const sourceWidth = Math.max(1, Math.min(source.width - sourceX, Math.round(rect.width * source.width)));
      const sourceHeight = Math.max(1, Math.min(source.height - sourceY, Math.round(rect.height * source.height)));
      const outputScale = Math.min(1, MAX_CROP_OUTPUT_DIMENSION / Math.max(sourceWidth, sourceHeight));
      const output = document.createElement("canvas");
      output.width = Math.max(1, Math.round(sourceWidth * outputScale));
      output.height = Math.max(1, Math.round(sourceHeight * outputScale));
      const context = output.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, output.width, output.height);
      const blob = await canvasToBlob(output, "image/jpeg", 0.94);
      photo.dataUrl = await fileToDataUrl(blob);
      photo.crop = {
        rect: { ...rect },
        rotation: state.cropRotation,
        aspect: state.cropAspect,
        zoom: state.cropZoom,
      };
      source.width = source.height = output.width = output.height = 1;
      closeCropDialog();
      renderAll();
      showToast(`${photo.name}에 크롭을 적용했습니다.`);
    } catch (error) {
      console.error(error);
      applyButton.disabled = false;
      applyButton.textContent = "크롭 적용";
      showToast("사진 크롭을 적용하지 못했습니다.", "error");
    }
  }

  function restoreOriginalPhoto() {
    const photo = getPhoto(state.cropPhotoId);
    if (!photo || !photo.originalDataUrl) return;
    photo.dataUrl = photo.originalDataUrl;
    photo.crop = null;
    closeCropDialog();
    renderAll();
    showToast(`${photo.name}을 원본으로 복원했습니다.`);
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas conversion returned no data."));
      }, type, quality);
    });
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
