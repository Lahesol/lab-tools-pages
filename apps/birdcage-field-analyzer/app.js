(function initializeBirdcageAnalyzer() {
  "use strict";

  const Core = window.BirdcageCore;
  const LEG_COLORS = [
    "#ed1c24",
    "#00ff00",
    "#00b5ff",
    "#f7931e",
    "#00ffff",
    "#009245",
    "#ff00ff",
    "#0000ff",
  ];

  const state = {
    image: null,
    imageName: "",
    sourceCanvas: document.createElement("canvas"),
    sourceImageData: null,
    plotRect: null,
    previewTransform: null,
    calibrationMode: false,
    calibrationClicks: [],
    activeColorPick: null,
    colors: LEG_COLORS.slice(),
    enabled: Array(Core.LEG_COUNT).fill(true),
    polarity: Array(Core.LEG_COUNT).fill(1),
    data: Core.generateDemoData("circular"),
    fields: null,
    metrics: null,
    selectedIndex: 0,
    playing: false,
    playbackSpeed: 1,
    animationFrame: null,
    lastAnimationTime: 0,
    animationPosition: 0,
    toastTimer: null,
  };

  const elements = Object.fromEntries([
    "imageInput", "dataStatus", "resetButton", "previewWrap", "imageCanvas", "imageEmpty", "fileMeta",
    "setPlotAreaButton", "xMin", "xMax", "yMin", "yMax", "timeUnit", "currentUnit", "calibrationHint",
    "colorTolerance", "traceControls", "extractButton", "circularDemoButton", "xStrongDemoButton",
    "fieldGridToggle", "fieldCanvas", "selectedTimeLabel", "probeLabel", "axisDominance", "bxRms", "byRms", "rmsRatio", "xyRatio",
    "polarCanvas", "phaseDifference", "axialRatio", "frequencyEstimate", "bxInstant", "byInstant", "bInstant",
    "instantRatio", "coilRadius", "legLength", "probeX", "probeY", "centerPointButton", "extractionSummary",
    "exportCsvButton", "currentCanvas", "playButton", "timeSlider", "timeOutput", "playbackSpeed", "toast",
  ].map((id) => [id, document.getElementById(id)]));

  function formatNumber(value, digits = 3) {
    if (!Number.isFinite(value)) return "∞";
    return value.toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function fieldUnit(valueTesla) {
    const absolute = Math.abs(valueTesla);
    if (absolute >= 1e-3) return `${formatNumber(valueTesla * 1e3, 3)} mT`;
    if (absolute >= 1e-6) return `${formatNumber(valueTesla * 1e6, 3)} µT`;
    return `${formatNumber(valueTesla * 1e9, 3)} nT`;
  }

  function showToast(message, error = false) {
    clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle("error", error);
    elements.toast.classList.add("visible");
    state.toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 3400);
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    const context = canvas.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height, pixelRatio };
  }

  function drawArrow(context, startX, startY, endX, endY, color, width = 1.6, alpha = 1, head = 6) {
    const angle = Math.atan2(endY - startY, endX - startX);
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    context.beginPath();
    context.moveTo(endX, endY);
    context.lineTo(endX - head * Math.cos(angle - Math.PI / 6), endY - head * Math.sin(angle - Math.PI / 6));
    context.lineTo(endX - head * Math.cos(angle + Math.PI / 6), endY - head * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
    context.restore();
  }

  function renderTraceControls() {
    elements.traceControls.innerHTML = state.colors.map((color, index) => `
      <div class="trace-row" data-trace="${index}">
        <input type="checkbox" data-enabled="${index}" ${state.enabled[index] ? "checked" : ""} aria-label="Leg ${index + 1} 사용" />
        <input type="color" data-color="${index}" value="${color}" aria-label="Leg ${index + 1} 곡선 색" />
        <span class="trace-name">Leg ${index + 1}</span>
        <button class="polarity-button" data-polarity="${index}" type="button" title="양의 전류 기준방향 전환" aria-label="Leg ${index + 1} 기준방향 ${state.polarity[index] > 0 ? "+z" : "−z"}">${state.polarity[index] > 0 ? "+z" : "−z"}</button>
        <button class="pick-color-button ${state.activeColorPick === index ? "active" : ""}" data-pick="${index}" type="button" title="이미지에서 색 선택" aria-label="이미지에서 Leg ${index + 1} 색 선택">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M13 7l4 4-8 8H5v-4zM4 21h6" /></svg>
        </button>
      </div>
    `).join("");

    elements.traceControls.querySelectorAll("[data-enabled]").forEach((input) => {
      input.addEventListener("change", () => {
        const index = Number(input.dataset.enabled);
        state.enabled[index] = input.checked;
        renderCurrentChart();
      });
    });
    elements.traceControls.querySelectorAll("[data-color]").forEach((input) => {
      input.addEventListener("input", () => {
        const index = Number(input.dataset.color);
        state.colors[index] = input.value;
        renderCurrentChart();
        renderFieldCanvas();
      });
    });
    elements.traceControls.querySelectorAll("[data-polarity]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.polarity);
        state.polarity[index] *= -1;
        if (state.data && state.data.currents[index]) {
          state.data.currents[index] = state.data.currents[index].map((value) => -value);
        }
        renderTraceControls();
        recomputeAndRender();
        showToast(`Leg ${index + 1}의 양의 전류 방향을 ${state.polarity[index] > 0 ? "+z" : "−z"}로 설정했습니다.`);
      });
    });
    elements.traceControls.querySelectorAll("[data-pick]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.pick);
        state.activeColorPick = state.activeColorPick === index ? null : index;
        state.calibrationMode = false;
        state.calibrationClicks = [];
        elements.setPlotAreaButton.textContent = "영역 두 점 지정";
        renderTraceControls();
        renderImagePreview();
        if (state.activeColorPick !== null) showToast(`이미지의 Leg ${index + 1} 곡선을 클릭하세요.`);
      });
    });
  }

  function imagePointFromEvent(event) {
    if (!state.previewTransform) return null;
    const bounds = elements.imageCanvas.getBoundingClientRect();
    const canvasX = event.clientX - bounds.left;
    const canvasY = event.clientY - bounds.top;
    const sourceX = (canvasX - state.previewTransform.offsetX) / state.previewTransform.scale;
    const sourceY = (canvasY - state.previewTransform.offsetY) / state.previewTransform.scale;
    if (sourceX < 0 || sourceY < 0 || sourceX >= state.sourceCanvas.width || sourceY >= state.sourceCanvas.height) return null;
    return { x: sourceX, y: sourceY };
  }

  function sampleSaturatedColor(point) {
    if (!state.sourceImageData) return null;
    const { width, height, data } = state.sourceImageData;
    let best = null;
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = Core.clamp(Math.round(point.x + dx), 0, width - 1);
        const y = Core.clamp(Math.round(point.y + dy), 0, height - 1);
        const offset = (y * width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const hsv = Core.rgbToHsv(r, g, b);
        const score = hsv.s * (0.45 + 0.55 * hsv.v);
        if (!best || score > best.score) best = { r, g, b, score };
      }
    }
    if (!best || best.score < 0.22) return null;
    return Core.rgbToHex(best.r, best.g, best.b);
  }

  function renderImagePreview() {
    const { context, width, height } = setupCanvas(elements.imageCanvas);
    if (!state.image) {
      elements.imageEmpty.hidden = false;
      state.previewTransform = null;
      return;
    }
    elements.imageEmpty.hidden = true;
    const scale = Math.min(width / state.image.naturalWidth, height / state.image.naturalHeight);
    const drawWidth = state.image.naturalWidth * scale;
    const drawHeight = state.image.naturalHeight * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;
    state.previewTransform = { scale, offsetX, offsetY };
    context.fillStyle = "#eef2f6";
    context.fillRect(0, 0, width, height);
    context.drawImage(state.image, offsetX, offsetY, drawWidth, drawHeight);

    if (state.plotRect) {
      const x = offsetX + state.plotRect.left * scale;
      const y = offsetY + state.plotRect.top * scale;
      const rectWidth = (state.plotRect.right - state.plotRect.left) * scale;
      const rectHeight = (state.plotRect.bottom - state.plotRect.top) * scale;
      context.save();
      context.strokeStyle = state.calibrationMode ? "#f97316" : "#2563eb";
      context.lineWidth = 2;
      context.setLineDash([5, 3]);
      context.strokeRect(x, y, rectWidth, rectHeight);
      context.setLineDash([]);
      [[x, y], [x + rectWidth, y + rectHeight]].forEach(([handleX, handleY]) => {
        context.fillStyle = "#ffffff";
        context.strokeStyle = "#2563eb";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(handleX, handleY, 4, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });
      context.restore();
    }

    if (state.calibrationClicks.length === 1) {
      const point = state.calibrationClicks[0];
      context.fillStyle = "#f97316";
      context.beginPath();
      context.arc(offsetX + point.x * scale, offsetY + point.y * scale, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function handlePreviewClick(event) {
    if (!state.image) return;
    const point = imagePointFromEvent(event);
    if (!point) return;
    if (state.calibrationMode) {
      state.calibrationClicks.push(point);
      if (state.calibrationClicks.length === 2) {
        const [first, second] = state.calibrationClicks;
        state.plotRect = {
          left: Math.min(first.x, second.x),
          right: Math.max(first.x, second.x),
          top: Math.min(first.y, second.y),
          bottom: Math.max(first.y, second.y),
        };
        state.calibrationMode = false;
        state.calibrationClicks = [];
        elements.setPlotAreaButton.textContent = "영역 두 점 지정";
        elements.calibrationHint.textContent = "수동으로 지정한 영역입니다. 축 최소·최대값을 확인한 후 곡선을 추출하세요.";
        showToast("플롯 영역을 적용했습니다.");
      }
      renderImagePreview();
      return;
    }
    if (state.activeColorPick !== null) {
      const sampled = sampleSaturatedColor(point);
      if (!sampled) {
        showToast("곡선 색을 찾지 못했습니다. 선의 가운데를 다시 클릭하세요.", true);
        return;
      }
      const index = state.activeColorPick;
      state.colors[index] = sampled;
      state.activeColorPick = null;
      renderTraceControls();
      renderImagePreview();
      renderCurrentChart();
      renderFieldCanvas();
      showToast(`Leg ${index + 1} 색상을 ${sampled}로 설정했습니다.`);
    }
  }

  function loadImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("PNG, JPG 또는 WEBP 이미지를 선택하세요.", true);
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      state.image = image;
      state.imageName = file.name;
      state.sourceCanvas.width = image.naturalWidth;
      state.sourceCanvas.height = image.naturalHeight;
      const sourceContext = state.sourceCanvas.getContext("2d", { willReadFrequently: true });
      sourceContext.drawImage(image, 0, 0);
      state.sourceImageData = sourceContext.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
      state.plotRect = Core.autoDetectPlotRect(state.sourceImageData);
      elements.fileMeta.textContent = `${file.name} · ${image.naturalWidth} × ${image.naturalHeight}px`;
      elements.dataStatus.textContent = `${file.name} · 추출 대기`;
      elements.calibrationHint.textContent = "자동 검출된 파란 사각형을 확인하세요. 어긋나면 ‘영역 두 점 지정’을 사용합니다.";
      renderImagePreview();
      showToast("이미지를 읽었습니다. 축 범위와 곡선 색을 확인한 뒤 추출하세요.");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      showToast("이미지를 읽을 수 없습니다.", true);
    };
    image.src = url;
  }

  function extractCurves() {
    if (!state.sourceImageData || !state.plotRect) {
      showToast("먼저 ANSYS 전류 그래프 이미지를 불러오세요.", true);
      return;
    }
    const axes = {
      xMin: Number(elements.xMin.value),
      xMax: Number(elements.xMax.value),
      yMin: Number(elements.yMin.value),
      yMax: Number(elements.yMax.value),
    };
    if (![axes.xMin, axes.xMax, axes.yMin, axes.yMax].every(Number.isFinite) || axes.xMax === axes.xMin || axes.yMax === axes.yMin) {
      showToast("축 최소·최대값을 올바르게 입력하세요.", true);
      return;
    }
    const tolerance = Core.clamp(Number(elements.colorTolerance.value) || 15, 4, 45);
    const extracted = Core.extractColorTraces(state.sourceImageData, state.plotRect, state.colors, tolerance);
    state.data = Core.pixelsToEngineeringData(extracted, axes, {
      timeUnit: elements.timeUnit.value,
      currentUnit: elements.currentUnit.value,
    }, state.enabled, state.polarity);
    state.data.source = state.imageName;
    state.selectedIndex = 0;
    state.animationPosition = 0;
    const averageCoverage = state.data.coverage.reduce((sum, value) => sum + value, 0) / state.data.coverage.length;
    const fitted = state.data.fitQuality.filter((value) => Number.isFinite(value));
    const averageFit = fitted.length ? fitted.reduce((sum, value) => sum + value, 0) / fitted.length : null;
    elements.dataStatus.textContent = `${state.imageName} · ${state.data.times.length}점`;
    elements.extractionSummary.textContent = `이미지 디지타이징 · 검출률 ${(averageCoverage * 100).toFixed(1)}%${averageFit === null ? "" : ` · 주기 적합 R² ${averageFit.toFixed(3)}`} · 가림 구간 보간`;
    updateSliderBounds();
    recomputeAndRender();
    if (averageCoverage < 0.35) {
      showToast("검출률이 낮습니다. plot 영역과 각 leg 색상을 다시 지정하세요.", true);
    } else {
      showToast(`8개 곡선을 ${state.data.times.length}개 시간점으로 추출했습니다.`);
    }
  }

  function geometryFromInputs() {
    return {
      radiusM: Math.max(1e-6, Number(elements.coilRadius.value) * 1e-3),
      lengthM: Math.max(1e-6, Number(elements.legLength.value) * 1e-3),
    };
  }

  function pointFromInputs() {
    return {
      xM: (Number(elements.probeX.value) || 0) * 1e-3,
      yM: (Number(elements.probeY.value) || 0) * 1e-3,
    };
  }

  function recomputeAndRender() {
    const geometry = geometryFromInputs();
    const point = pointFromInputs();
    const probeXmm = point.xM * 1e3;
    const probeYmm = point.yM * 1e3;
    elements.probeLabel.textContent = Math.hypot(probeXmm, probeYmm) < 1e-9
      ? "평가점: 코일 중심"
      : `평가점: (${formatNumber(probeXmm, 1)}, ${formatNumber(probeYmm, 1)}) mm`;
    state.fields = Core.buildFieldSeries(state.data, geometry, point);
    state.metrics = Core.computePolarizationMetrics(state.data, state.fields);
    renderAtSelectedTime();
    renderPolarizationCanvas();
  }

  function currentValuesAtSelectedTime() {
    return state.data.currents.map((trace) => trace[state.selectedIndex] || 0);
  }

  function renderMetrics() {
    if (!state.metrics || !state.fields) return;
    const metrics = state.metrics;
    const index = state.selectedIndex;
    const bx = state.fields.bx[index] || 0;
    const by = state.fields.by[index] || 0;
    const magnitude = state.fields.magnitude[index] || 0;
    const instantRatio = Math.abs(by) > 1e-18 ? Math.abs(bx / by) : Infinity;
    const ratio = metrics.amplitudeRatio;
    elements.bxRms.textContent = fieldUnit(metrics.bxRms);
    elements.byRms.textContent = fieldUnit(metrics.byRms);
    elements.rmsRatio.textContent = formatNumber(metrics.byRms > 1e-30 ? metrics.bxRms / metrics.byRms : Infinity, 3);
    elements.xyRatio.textContent = formatNumber(ratio, 3);
    elements.phaseDifference.textContent = `${formatNumber(metrics.phaseDifferenceDeg, 2)}°`;
    elements.axialRatio.textContent = `${formatNumber(metrics.axialRatioDb, 3)} dB`;
    elements.frequencyEstimate.textContent = `${formatNumber(metrics.frequencyHz / 1e6, 3)} MHz`;
    elements.bxInstant.textContent = fieldUnit(bx);
    elements.byInstant.textContent = fieldUnit(by);
    elements.bInstant.textContent = fieldUnit(magnitude);
    elements.instantRatio.textContent = formatNumber(instantRatio, 3);

    let dominance = "균형";
    let color = "#10b981";
    if (ratio > 1.1) {
      dominance = "X축 우세";
      color = "#ef4444";
    } else if (ratio < 0.91) {
      dominance = "Y축 우세";
      color = "#f97316";
    }
    elements.axisDominance.textContent = dominance;
    elements.axisDominance.style.color = color;
  }

  function renderCurrentChart() {
    const { context, width, height } = setupCanvas(elements.currentCanvas);
    const margin = { left: 58, right: 104, top: 28, bottom: 36 };
    const plot = {
      left: margin.left,
      top: margin.top,
      right: Math.max(margin.left + 40, width - margin.right),
      bottom: Math.max(margin.top + 40, height - margin.bottom),
    };
    const times = state.data.times;
    const traces = state.data.currents;
    if (!times.length || !traces.length) return;
    const xMin = times[0];
    const xMax = times[times.length - 1];
    const allValues = traces.flat().filter(Number.isFinite);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const padding = Math.max(1e-9, (rawMax - rawMin) * 0.1);
    const yMin = rawMin - padding;
    const yMax = rawMax + padding;
    const mapX = (value) => plot.left + ((value - xMin) / Math.max(1e-12, xMax - xMin)) * (plot.right - plot.left);
    const mapY = (value) => plot.bottom - ((value - yMin) / Math.max(1e-12, yMax - yMin)) * (plot.bottom - plot.top);

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 1;
    context.font = '10px "Malgun Gothic", sans-serif';
    context.fillStyle = "#60748a";
    context.textAlign = "center";
    context.textBaseline = "top";
    for (let tick = 0; tick <= 6; tick += 1) {
      const value = xMin + ((xMax - xMin) * tick) / 6;
      const x = mapX(value);
      context.beginPath();
      context.moveTo(x, plot.top);
      context.lineTo(x, plot.bottom);
      context.stroke();
      context.fillText(formatNumber(value, Math.abs(xMax - xMin) < 10 ? 2 : 1), x, plot.bottom + 7);
    }
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (let tick = 0; tick <= 5; tick += 1) {
      const value = yMin + ((yMax - yMin) * tick) / 5;
      const y = mapY(value);
      context.beginPath();
      context.moveTo(plot.left, y);
      context.lineTo(plot.right, y);
      context.stroke();
      context.fillText(formatNumber(value, Math.abs(yMax - yMin) < 10 ? 2 : 0), plot.left - 7, y);
    }
    context.strokeStyle = "#9baabd";
    context.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
    context.save();
    context.translate(14, (plot.top + plot.bottom) / 2);
    context.rotate(-Math.PI / 2);
    context.fillStyle = "#40556d";
    context.textAlign = "center";
    context.font = '11px "Malgun Gothic", sans-serif';
    context.fillText(`전류 [${state.data.currentUnit}]`, 0, 0);
    context.restore();
    context.fillStyle = "#40556d";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText(`시간 [${state.data.timeUnit}]`, (plot.left + plot.right) / 2, height - 3);

    context.save();
    context.beginPath();
    context.rect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
    context.clip();
    traces.forEach((trace, traceIndex) => {
      if (!state.enabled[traceIndex]) return;
      context.strokeStyle = state.colors[traceIndex];
      context.lineWidth = 1.55;
      context.beginPath();
      trace.forEach((value, sampleIndex) => {
        const x = mapX(times[sampleIndex]);
        const y = mapY(value);
        if (sampleIndex === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    });
    const selectedX = mapX(times[state.selectedIndex]);
    context.strokeStyle = "#102a43";
    context.lineWidth = 1.2;
    context.setLineDash([4, 3]);
    context.beginPath();
    context.moveTo(selectedX, plot.top);
    context.lineTo(selectedX, plot.bottom);
    context.stroke();
    context.setLineDash([]);
    traces.forEach((trace, traceIndex) => {
      if (!state.enabled[traceIndex]) return;
      context.fillStyle = state.colors[traceIndex];
      context.beginPath();
      context.arc(selectedX, mapY(trace[state.selectedIndex]), 3, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();

    context.font = '10px "Malgun Gothic", sans-serif';
    context.textBaseline = "middle";
    traces.forEach((_, index) => {
      const column = index >= 4 ? 1 : 0;
      const row = index % 4;
      const x = plot.right + 16 + column * 49;
      const y = plot.top + 13 + row * 22;
      context.strokeStyle = state.enabled[index] ? state.colors[index] : "#cbd5e1";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 13, y);
      context.stroke();
      context.fillStyle = state.enabled[index] ? "#40556d" : "#9baabd";
      context.textAlign = "left";
      context.fillText(`I${index + 1}`, x + 17, y);
    });
  }

  function renderFieldCanvas() {
    const { context, width, height } = setupCanvas(elements.fieldCanvas);
    if (!state.data.times.length) return;
    const geometry = geometryFromInputs();
    const point = pointFromInputs();
    const currentValues = currentValuesAtSelectedTime();
    const currentsA = currentValues.map((value) => Core.currentUnitToAmp(value, state.data.currentUnit));
    const field = Core.finiteWireFieldAtPoint(currentsA, geometry, point);
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const coilPixels = Math.min(width * 0.34, height * 0.35);
    const metersToPixels = coilPixels / geometry.radiusM;
    const physicalToCanvas = (xM, yM) => ({ x: centerX + xM * metersToPixels, y: centerY - yM * metersToPixels });

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    if (elements.fieldGridToggle.checked) {
      const gridPoints = [];
      const limit = geometry.radiusM * 0.72;
      for (let iy = -5; iy <= 5; iy += 1) {
        for (let ix = -5; ix <= 5; ix += 1) {
          const xM = (limit * ix) / 5;
          const yM = (limit * iy) / 5;
          if (Math.hypot(xM, yM) > limit * 1.06) continue;
          const local = Core.finiteWireFieldAtPoint(currentsA, geometry, { xM, yM });
          gridPoints.push({ xM, yM, ...local });
        }
      }
      const maxMagnitude = Math.max(...gridPoints.map((item) => item.magnitude), 1e-18);
      gridPoints.forEach((item) => {
        const origin = physicalToCanvas(item.xM, item.yM);
        const length = 4 + 13 * Math.sqrt(item.magnitude / maxMagnitude);
        const angle = Math.atan2(-item.by, item.bx);
        drawArrow(
          context,
          origin.x - Math.cos(angle) * length * 0.25,
          origin.y - Math.sin(angle) * length * 0.25,
          origin.x + Math.cos(angle) * length * 0.75,
          origin.y + Math.sin(angle) * length * 0.75,
          "#8ba2b7",
          1,
          0.38,
          3.2,
        );
      });
    }

    context.strokeStyle = "#d7e0e9";
    context.lineWidth = 1;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(centerX - coilPixels - 55, centerY);
    context.lineTo(centerX + coilPixels + 55, centerY);
    context.moveTo(centerX, centerY - coilPixels - 45);
    context.lineTo(centerX, centerY + coilPixels + 45);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#60748a";
    context.font = '12px "Malgun Gothic", sans-serif';
    context.textAlign = "left";
    context.fillText("+X", centerX + coilPixels + 40, centerY - 7);
    context.textAlign = "center";
    context.fillText("+Y", centerX, centerY - coilPixels - 35);

    context.strokeStyle = "#71869c";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(centerX, centerY, coilPixels, 0, Math.PI * 2);
    context.stroke();

    for (let index = 0; index < Core.LEG_COUNT; index += 1) {
      const theta = (index * Math.PI * 2) / Core.LEG_COUNT;
      const x = centerX + coilPixels * Math.cos(theta);
      const y = centerY - coilPixels * Math.sin(theta);
      const current = currentValues[index];
      const positive = current >= 0;
      context.save();
      context.translate(x, y);
      context.strokeStyle = state.colors[index];
      context.fillStyle = "#ffffff";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, 13, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.strokeStyle = positive ? "#ef4444" : "#2563eb";
      context.fillStyle = positive ? "#ef4444" : "#2563eb";
      context.lineWidth = 1.8;
      if (positive) {
        context.beginPath();
        context.arc(0, 0, 3.2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        context.moveTo(-3.2, -3.2);
        context.lineTo(3.2, 3.2);
        context.moveTo(3.2, -3.2);
        context.lineTo(-3.2, 3.2);
        context.stroke();
      }
      context.restore();

      const labelRadius = coilPixels + 29;
      const labelX = centerX + labelRadius * Math.cos(theta);
      const labelY = centerY - labelRadius * Math.sin(theta);
      context.fillStyle = index === 0 ? "#1d4ed8" : "#40556d";
      context.font = index === 0 ? '700 11px "Malgun Gothic", sans-serif' : '11px "Malgun Gothic", sans-serif';
      context.textAlign = Math.cos(theta) > 0.35 ? "left" : Math.cos(theta) < -0.35 ? "right" : "center";
      context.textBaseline = Math.sin(theta) > 0.35 ? "bottom" : Math.sin(theta) < -0.35 ? "top" : "middle";
      context.fillText(`Leg ${index + 1}`, labelX, labelY);
      context.fillStyle = "#8091a3";
      context.font = '9px "Malgun Gothic", sans-serif';
      context.fillText(`${formatNumber(current, 1)} ${state.data.currentUnit}`, labelX, labelY + (Math.sin(theta) > 0.35 ? -13 : 13));
    }

    const probe = physicalToCanvas(point.xM, point.yM);
    context.fillStyle = "#102a43";
    context.beginPath();
    context.arc(probe.x, probe.y, 3.5, 0, Math.PI * 2);
    context.fill();

    const componentMax = Math.max(...field.contributions.map((item) => item.magnitude), 1e-18);
    const componentScale = (coilPixels * 0.36) / componentMax;
    field.contributions.forEach((item, index) => {
      drawArrow(
        context,
        probe.x,
        probe.y,
        probe.x + item.bx * componentScale,
        probe.y - item.by * componentScale,
        state.colors[index],
        1.35,
        0.56,
        5,
      );
    });
    const resultReference = Math.max(
      state.metrics ? state.metrics.bxRms : 0,
      state.metrics ? state.metrics.byRms : 0,
      field.magnitude,
      1e-18,
    );
    const resultScale = (coilPixels * 0.58) / resultReference;
    drawArrow(
      context,
      probe.x,
      probe.y,
      probe.x + field.bx * resultScale,
      probe.y - field.by * resultScale,
      "#102a43",
      3.4,
      1,
      10,
    );
    context.fillStyle = "#102a43";
    context.font = '700 11px "Malgun Gothic", sans-serif';
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.fillText("ΣB", probe.x + field.bx * resultScale + 7, probe.y - field.by * resultScale - 5);
  }

  function renderPolarizationCanvas() {
    const { context, width, height } = setupCanvas(elements.polarCanvas);
    if (!state.fields || !state.fields.bx.length) return;
    const margin = 19;
    const centerX = width / 2;
    const centerY = height / 2;
    const maximum = Math.max(...state.fields.bx.map(Math.abs), ...state.fields.by.map(Math.abs), 1e-18);
    const scale = Math.min(width, height) * 0.38 / maximum;
    context.fillStyle = "#fbfdff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#d9e2ec";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(margin, centerY);
    context.lineTo(width - margin, centerY);
    context.moveTo(centerX, margin);
    context.lineTo(centerX, height - margin);
    context.stroke();
    context.fillStyle = "#60748a";
    context.font = '9px "Malgun Gothic", sans-serif';
    context.textAlign = "right";
    context.fillText("Bx", width - 5, centerY - 4);
    context.textAlign = "left";
    context.fillText("By", centerX + 4, 10);
    context.strokeStyle = "#2563eb";
    context.lineWidth = 1.5;
    context.beginPath();
    state.fields.bx.forEach((bx, index) => {
      const x = centerX + bx * scale;
      const y = centerY - state.fields.by[index] * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    const selectedX = centerX + state.fields.bx[state.selectedIndex] * scale;
    const selectedY = centerY - state.fields.by[state.selectedIndex] * scale;
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.arc(selectedX, selectedY, 3.5, 0, Math.PI * 2);
    context.fill();
  }

  function renderAtSelectedTime() {
    const time = state.data.times[state.selectedIndex] || 0;
    const label = `${formatNumber(time, 2)} ${state.data.timeUnit}`;
    elements.timeSlider.value = String(state.selectedIndex);
    elements.timeOutput.value = label;
    elements.timeOutput.textContent = label;
    elements.selectedTimeLabel.textContent = `t = ${label}`;
    renderMetrics();
    renderCurrentChart();
    renderFieldCanvas();
    renderPolarizationCanvas();
  }

  function updateSliderBounds() {
    elements.timeSlider.max = String(Math.max(0, state.data.times.length - 1));
    elements.timeSlider.value = String(state.selectedIndex);
  }

  function loadDemo(mode) {
    state.polarity = Array(Core.LEG_COUNT).fill(1);
    state.data = Core.generateDemoData(mode);
    state.selectedIndex = 0;
    state.animationPosition = 0;
    elements.timeUnit.value = "ns";
    elements.currentUnit.value = "mA";
    const circular = mode !== "x-strong";
    elements.dataStatus.textContent = circular ? "합성 원형편파 예제" : "합성 X축 강조 예제";
    elements.extractionSummary.textContent = circular
      ? "합성 검증 데이터 · 동일 진폭과 45° 위상 진행"
      : "합성 검증 데이터 · X축 자기장 성분을 1.52배로 설정";
    renderTraceControls();
    updateSliderBounds();
    recomputeAndRender();
    showToast(circular ? "원형편파 합성 예제를 불러왔습니다." : "X축 강조 합성 예제를 불러왔습니다.");
  }

  function setPlayback(playing) {
    state.playing = playing;
    elements.playButton.classList.toggle("playing", playing);
    elements.playButton.setAttribute("aria-label", playing ? "일시정지" : "재생");
    if (playing) {
      state.lastAnimationTime = performance.now();
      state.animationPosition = state.selectedIndex;
      state.animationFrame = requestAnimationFrame(playbackFrame);
    } else if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }
  }

  function playbackFrame(timestamp) {
    if (!state.playing) return;
    const elapsed = Math.min(100, timestamp - state.lastAnimationTime);
    state.lastAnimationTime = timestamp;
    const samplesPerMs = state.data.times.length / 7000;
    state.animationPosition += elapsed * samplesPerMs * state.playbackSpeed;
    if (state.animationPosition >= state.data.times.length) state.animationPosition %= state.data.times.length;
    state.selectedIndex = Math.floor(state.animationPosition);
    renderAtSelectedTime();
    state.animationFrame = requestAnimationFrame(playbackFrame);
  }

  function exportCsv() {
    if (!state.fields) return;
    const header = [
      `time_${state.data.timeUnit}`,
      ...Array.from({ length: Core.LEG_COUNT }, (_, index) => `I${index + 1}_${state.data.currentUnit}`),
      "Bx_T", "By_T", "Bmag_T",
    ];
    const rows = state.data.times.map((time, index) => [
      time,
      ...state.data.currents.map((trace) => trace[index]),
      state.fields.bx[index],
      state.fields.by[index],
      state.fields.magnitude[index],
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => Number.isFinite(value) ? Number(value).toPrecision(12) : "").join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `birdcage_field_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("전류와 합성 자기장 데이터를 CSV로 저장했습니다.");
  }

  function resetApplication() {
    setPlayback(false);
    state.image = null;
    state.imageName = "";
    state.sourceImageData = null;
    state.plotRect = null;
    state.calibrationMode = false;
    state.calibrationClicks = [];
    state.activeColorPick = null;
    state.colors = LEG_COLORS.slice();
    state.enabled = Array(Core.LEG_COUNT).fill(true);
    state.polarity = Array(Core.LEG_COUNT).fill(1);
    elements.imageInput.value = "";
    elements.fileMeta.textContent = "이미지를 올리면 플롯 영역을 자동 제안합니다.";
    elements.calibrationHint.textContent = "검출된 파란 사각형이 실제 plot 내부 축과 일치하는지 확인하세요.";
    renderTraceControls();
    renderImagePreview();
    loadDemo("circular");
  }

  function attachEvents() {
    elements.imageInput.addEventListener("change", (event) => loadImageFile(event.target.files[0]));
    elements.previewWrap.addEventListener("dragover", (event) => {
      event.preventDefault();
      elements.previewWrap.style.borderColor = "#2563eb";
    });
    elements.previewWrap.addEventListener("dragleave", () => { elements.previewWrap.style.borderColor = ""; });
    elements.previewWrap.addEventListener("drop", (event) => {
      event.preventDefault();
      elements.previewWrap.style.borderColor = "";
      loadImageFile(event.dataTransfer.files[0]);
    });
    elements.imageCanvas.addEventListener("click", handlePreviewClick);
    elements.setPlotAreaButton.addEventListener("click", () => {
      if (!state.image) {
        showToast("먼저 이미지를 불러오세요.", true);
        return;
      }
      state.calibrationMode = !state.calibrationMode;
      state.calibrationClicks = [];
      state.activeColorPick = null;
      elements.setPlotAreaButton.textContent = state.calibrationMode ? "지정 취소" : "영역 두 점 지정";
      elements.calibrationHint.textContent = state.calibrationMode
        ? "플롯의 왼쪽 위 모서리와 오른쪽 아래 모서리를 차례로 클릭하세요."
        : "자동 검출된 파란 사각형을 확인하세요.";
      renderTraceControls();
      renderImagePreview();
    });
    elements.extractButton.addEventListener("click", extractCurves);
    elements.circularDemoButton.addEventListener("click", () => loadDemo("circular"));
    elements.xStrongDemoButton.addEventListener("click", () => loadDemo("x-strong"));
    elements.resetButton.addEventListener("click", resetApplication);
    elements.fieldGridToggle.addEventListener("change", renderFieldCanvas);
    elements.centerPointButton.addEventListener("click", () => {
      elements.probeX.value = "0";
      elements.probeY.value = "0";
      recomputeAndRender();
    });
    [elements.coilRadius, elements.legLength, elements.probeX, elements.probeY].forEach((input) => {
      input.addEventListener("change", recomputeAndRender);
    });
    elements.timeSlider.addEventListener("input", () => {
      state.selectedIndex = Number(elements.timeSlider.value);
      state.animationPosition = state.selectedIndex;
      renderAtSelectedTime();
    });
    elements.playButton.addEventListener("click", () => setPlayback(!state.playing));
    elements.playbackSpeed.addEventListener("change", () => { state.playbackSpeed = Number(elements.playbackSpeed.value); });
    elements.exportCsvButton.addEventListener("click", exportCsv);
    elements.currentCanvas.addEventListener("click", (event) => {
      const bounds = elements.currentCanvas.getBoundingClientRect();
      const marginLeft = 58;
      const marginRight = 104;
      const x = event.clientX - bounds.left;
      const amount = Core.clamp((x - marginLeft) / Math.max(1, bounds.width - marginLeft - marginRight), 0, 1);
      state.selectedIndex = Math.round(amount * (state.data.times.length - 1));
      state.animationPosition = state.selectedIndex;
      renderAtSelectedTime();
    });
    const resizeObserver = new ResizeObserver(() => {
      renderImagePreview();
      renderCurrentChart();
      renderFieldCanvas();
      renderPolarizationCanvas();
    });
    [elements.imageCanvas, elements.currentCanvas, elements.fieldCanvas, elements.polarCanvas].forEach((canvas) => resizeObserver.observe(canvas));
  }

  renderTraceControls();
  attachEvents();
  updateSliderBounds();
  recomputeAndRender();
  renderImagePreview();
})();
