(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const COLORS = ["#17323a", "#2a9d8f", "#e76f51", "#457b9d", "#f4a261", "#7c4dff", "#607d3b", "#8d6e63"];

  const PRESETS = {
    nab_machine_temperature: {
      label: "NAB machine temperature",
      kind: "nab",
      scoreFile: "application\\data\\processed\\nab_machine_temperature\\series_with_scores.csv",
      gridFile: "(optional) same score CSV can be used for curve fit",
      kernelFile: "application\\data\\processed\\nab_machine_temperature\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\nab_machine_temperature\\metrics.csv",
      scoreHint: "Validation uses is_anomaly_window and anomaly_score_1_minus_normality. Curve fit uses VG_mapped vs measured_kernel_normality_score."
    },
    nab_machine_temperature_data_new_optimized: {
      label: "NAB data_new optimized mapping",
      kind: "nab",
      scoreFile: "application\\data\\processed\\nab_machine_temperature_data_new_optimized\\series_with_scores.csv",
      gridFile: "application\\data\\processed\\nab_machine_temperature_data_new_optimized\\model_curve_grid.csv",
      kernelFile: "application\\data\\processed\\nab_machine_temperature_data_new_optimized\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\nab_machine_temperature_data_new_optimized\\metrics.csv",
      scoreHint: "Validation uses an optimized value-to-VG mapping jointly fitted with data_new D09-D16 measured-kernel summation. This is the preferred NAB paper-facing preset."
    },
    seeds_ovr_classifier: {
      label: "Seeds OVR class-score",
      kind: "seeds",
      scoreFile: "application\\data\\processed\\seeds_ovr_classifier\\seeds_ovr_scores.csv",
      gridFile: "application\\data\\processed\\seeds_ovr_classifier\\class_score_grid.csv",
      kernelFile: "application\\data\\processed\\seeds_ovr_classifier\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\seeds_ovr_classifier\\metrics.csv",
      scoreHint: "Validation uses class-specific measured_score_class_1/2/3 and argmax. This is three one-vs-rest scalar score readouts, not one common 1D projection."
    },
    seeds_ovr_data_new_optimized: {
      label: "Seeds OVR data_new optimized",
      kind: "seeds",
      scoreFile: "application\\data\\processed\\seeds_ovr_data_new_optimized\\seeds_ovr_scores.csv",
      gridFile: "application\\data\\processed\\seeds_ovr_data_new_optimized\\class_score_grid.csv",
      kernelFile: "application\\data\\processed\\seeds_ovr_data_new_optimized\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\seeds_ovr_data_new_optimized\\metrics.csv",
      scoreHint: "Validation uses train-set class projections, optimized class-specific z-to-VG mappings, and disjoint 3/3/2 data_new measured-kernel groups."
    },
    seeds_shared_axis_data_new_curves: {
      label: "Seeds shared-axis distinct curves",
      kind: "seeds",
      scoreFile: "application\\data\\processed\\seeds_shared_axis_data_new_curves\\seeds_shared_axis_scores.csv",
      gridFile: "application\\data\\processed\\seeds_shared_axis_data_new_curves\\class_score_grid.csv",
      kernelFile: "application\\data\\processed\\seeds_shared_axis_data_new_curves\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\seeds_shared_axis_data_new_curves\\metrics.csv",
      scoreHint: "Validation uses one shared projected VG input evaluated by three distinct data_new measured-kernel mixture curves. This is the preferred Seeds curve-synthesis figure preset, although accuracy is lower than the OVR mapping."
    },
    seeds_2d_system_data_new: {
      label: "Seeds 2D system measured-kernel",
      kind: "seeds",
      scoreFile: "application\\data\\processed\\seeds_2d_system_data_new\\seeds_2d_system_scores.csv",
      gridFile: "application\\data\\processed\\seeds_2d_system_data_new\\class_axis_score_grid.csv",
      kernelFile: "application\\data\\processed\\seeds_2d_system_data_new\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\seeds_2d_system_data_new\\metrics.csv",
      scoreHint: "Validation uses a 2D system-level projection. The PCB device array supplies measured 1D kernel terms on two axes; GUI/MCU combines terms by sqrt(term_dim_1 x term_dim_2) and applies argmax."
    },
    seeds_2d_adc_pair_basis: {
      label: "Seeds 2D 4-ADC pair basis",
      kind: "seeds",
      scoreFile: "application\\data\\processed\\seeds_2d_adc_pair_basis\\seeds_2d_adc_pair_scores.csv",
      gridFile: "application\\data\\processed\\seeds_2d_adc_pair_basis\\adc_pair_basis_grid.csv",
      kernelFile: "application\\data\\processed\\seeds_2d_adc_pair_basis\\selected_adc_pairs.csv",
      targetFile: "application\\data\\processed\\seeds_2d_adc_pair_basis\\adc_pair_basis_fit_targets.csv",
      metricsFile: "application\\data\\processed\\seeds_2d_adc_pair_basis\\metrics.csv",
      scoreHint: "Validation uses four ADC pair-summed basis outputs. Load the curve grid to preview the four pair curves, and load the fitting-target CSV to see target A_amp/mu/sigma on the VG axis."
    },
    seeds_lda_classifier: {
      label: "Seeds LDA projection",
      kind: "seeds",
      scoreFile: "application\\data\\processed\\seeds_lda_classifier\\seeds_projection_scores.csv",
      gridFile: "application\\data\\processed\\seeds_lda_classifier\\class_score_grid.csv",
      kernelFile: "application\\data\\processed\\seeds_lda_classifier\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\seeds_lda_classifier\\metrics.csv",
      scoreHint: "Validation uses a single LDA-projected VG_mapped axis and class score curves. This is useful as a conservative baseline."
    },
    seeds_additive_1d_kernel_sum: {
      label: "Seeds additive 1D kernel sum",
      kind: "seeds",
      scoreFile: "(not exported in the current processed folder)",
      gridFile: "(not exported in the current processed folder)",
      kernelFile: "application\\data\\processed\\seeds_additive_1d_kernel_sum\\selected_kernels.csv",
      metricsFile: "application\\data\\processed\\seeds_additive_1d_kernel_sum\\metrics.csv",
      scoreHint: "Current folder mainly stores selected kernels and summary metrics. Load a compatible score CSV to validate in this tab."
    }
  };

  const SEEDS_2D_FIELDS = [
    { key: "area", id: "seeds2dArea", label: "area" },
    { key: "perimeter", id: "seeds2dPerimeter", label: "perimeter" },
    { key: "compactness", id: "seeds2dCompactness", label: "compactness" },
    { key: "kernel_length", id: "seeds2dKernelLength", label: "kernel_length" },
    { key: "kernel_width", id: "seeds2dKernelWidth", label: "kernel_width" },
    { key: "asymmetry", id: "seeds2dAsymmetry", label: "asymmetry" },
    { key: "groove_length", id: "seeds2dGrooveLength", label: "groove_length" }
  ];

  const SEEDS_2D_MODEL = {
    classNames: { 1: "Kama", 2: "Rosa", 3: "Canadian" },
    mean: [14.916190476190478, 14.583061224489796, 0.8722380952380951, 5.634659863945579, 3.2702040816326527, 3.755906122448979, 5.41847619047619],
    std: [2.911445136935974, 1.2959339004394013, 0.023359739787128932, 0.43552247785909903, 0.37543496123857784, 1.6089047034203998, 0.48025888186196614],
    ldaBasis: [
      [-0.33447761934460485, -0.7103459322976644],
      [0.8510652799365493, 0.6369420147019798],
      [0.05097427663080736, 0.10378940925138168],
      [-0.3576765857418995, 0.1979878782768562],
      [-0.00858729785788254, -0.003348257005295551],
      [-0.01894445538041027, -0.024102275082350452],
      [0.1812430978104041, -0.19786347431778373]
    ],
    ldaProjectionMean: [1.2337070140987708e-15, -2.5806076852150216e-16],
    ldaProjectionStd: [0.3651376822764534, 0.10796188446713638],
    vgScale: [-2.2, -3.5],
    vgShift: [5.0, 5.5],
    gridColumns: {
      1: ["measured_kernel_dim_1_class_1", "measured_kernel_dim_2_class_1"],
      2: ["measured_kernel_dim_1_class_2", "measured_kernel_dim_2_class_2"],
      3: ["measured_kernel_dim_1_class_3", "measured_kernel_dim_2_class_3"]
    }
  };

  const APP_MODEL_TARGET_LIBRARY = {
    seeds_2d_adc_pair_basis: {
      label: "Seeds 2D 4-ADC pair basis",
      type: "adc_pair_basis",
      xMin: -15,
      xMax: 15,
      xStep: 0.05,
      readoutWeights: {
        bias: [0.016394217089771023, 1.2315735442942801, -0.24796776138466],
        pair_1_dim_1: [0.12909878716059067, -1.163148855861455, 1.034050068702565],
        pair_2_dim_1: [0.6114455938302146, -2.894708190899799, 2.283262597066963],
        pair_3_dim_1: [-1.0524133292798667, 2.0756973895244464, -1.0232840602412485],
        pair_4_dim_1: [0.8007748202600368, 0.8615238220130389, -1.6622986422749748],
        pair_1_dim_2: [1.1961611651114465, -1.5715611759039183, 0.3754000107922128],
        pair_2_dim_2: [-4.901311750063417, 2.6661002955977002, 2.235211454465781],
        pair_3_dim_2: [3.675117172102949, -1.7632560082868978, -1.9118611638156848],
        pair_4_dim_2: [-0.20825252641802844, 0.7955419981139539, -0.5872894716960635]
      },
      pairs: [
        {
          adcPair: 1,
          basis: "adc_pair_1_basis_curve",
          target: { A: 1.0052651539043658, mu: 5.932786183127448, sigma: 4.9034745360195595, baseline: 0.005618365674446961, r2: 0.996796740213462 },
          devices: [
            { device: 14, label: "T03_M080_S126", vmuCode: 80, vstartCode: 126, A_uA: 0.0306807889538, mu: 5.27022094934, sigma: 4.75426977083, r2: 0.993383311191 },
            { device: 12, label: "T04_M119_S143", vmuCode: 119, vstartCode: 143, A_uA: 0.0390388593919, mu: 6.49927081858, sigma: 4.87931862159, r2: 0.994257851787 }
          ]
        },
        {
          adcPair: 2,
          basis: "adc_pair_2_basis_curve",
          target: { A: 0.9841382116886562, mu: 6.063733243975909, sigma: 4.914556721114924, baseline: 0.015538261922915058, r2: 0.9970288850314881 },
          devices: [
            { device: 16, label: "T04_M119_S138", vmuCode: 119, vstartCode: 138, A_uA: 0.020702314713, mu: 6.40352954123, sigma: 4.6641614414, r2: 0.993805207366 },
            { device: 15, label: "T03_M080_S126", vmuCode: 80, vstartCode: 126, A_uA: 0.0321618080136, mu: 5.64951788168, sigma: 5.01670494415, r2: 0.995431387831 }
          ]
        },
        {
          adcPair: 3,
          basis: "adc_pair_3_basis_curve",
          target: { A: 0.9919574135067005, mu: 4.703753712735058, sigma: 5.593132780025486, baseline: 0.0041305673885413865, r2: 0.9915429903555177 },
          devices: [
            { device: 11, label: "T01_M001_S099", vmuCode: 1, vstartCode: 99, A_uA: 0.0276732348674, mu: 2.22501352846, sigma: 5.89698151682, r2: 0.992281711706 },
            { device: 13, label: "T04_M121_S139", vmuCode: 121, vstartCode: 139, A_uA: 0.0374417576091, mu: 6.75731416734, sigma: 4.70122345997, r2: 0.995376863695 }
          ]
        },
        {
          adcPair: 4,
          basis: "adc_pair_4_basis_curve",
          target: { A: 0.9774557186215287, mu: 4.105316164451993, sigma: 5.3863908483029155, baseline: 0.003771421708637153, r2: 0.9959440025759161 },
          devices: [
            { device: 9, label: "T01_M000_S101", vmuCode: 0, vstartCode: 101, A_uA: 0.0196504350292, mu: 1.53592901496, sigma: 5.16745899516, r2: 0.993694087911 },
            { device: 10, label: "T04_M119_S139", vmuCode: 119, vstartCode: 139, A_uA: 0.028245081561, mu: 6.39925039442, sigma: 4.54469643374, r2: 0.996882250765 }
          ]
        }
      ]
    }
  };

  const state = {
    preset: "nab_machine_temperature",
    scoreRows: [],
    gridRows: [],
    kernelRows: [],
    targetRows: [],
    deviceCurveRows: [],
    generatedGridRows: [],
    metricsRows: [],
    fitRows: [],
    validationRows: [],
    seeds2dLastResult: null,
    fileNames: {}
  };

  function init() {
    if (!$("appModelPreset")) return;
    $("appModelPreset").addEventListener("change", () => {
      state.preset = $("appModelPreset").value;
      state.generatedGridRows = [];
      if (state.deviceCurveRows.length) buildGeneratedGridFromDeviceCurves(false);
      renderFileHint();
      renderSummary();
      renderPresetTargetPreview();
      renderAssignmentTable();
      drawPlot();
    });
    bindFile("appModelScoreFile", "scoreRows", "score");
    bindFile("appModelGridFile", "gridRows", "grid");
    bindFile("appModelKernelFile", "kernelRows", "kernels");
    bindFile("appModelTargetFile", "targetRows", "targets");
    bindFile("appModelDeviceCurveFile", "deviceCurveRows", "device curves");
    bindFile("appModelMetricsFile", "metricsRows", "metrics");
    $("appModelValidateButton").addEventListener("click", validateModel);
    $("appModelFitButton").addEventListener("click", fitModelCurves);
    $("appModelDownloadTargetButton")?.addEventListener("click", downloadPresetTargets);
    $("appModelDownloadButton").addEventListener("click", downloadReport);
    $("appModelClearButton").addEventListener("click", clearState);
    $("appModelAssignmentTable")?.addEventListener("click", event => {
      const button = event.target.closest("[data-app-target-device]");
      if (!button) return;
      copyAssignmentTargetToFitPanel(Number(button.dataset.appTargetDevice));
    });
    $("appModelScoreSource").addEventListener("change", () => {
      validateModel(false);
      fitModelCurves(false);
    });
    $("seeds2dLoadSampleButton")?.addEventListener("click", loadSeeds2dScoreRow);
    $("seeds2dRunButton")?.addEventListener("click", runSeeds2dScore);
    $("seeds2dPlanButton")?.addEventListener("click", generateSeeds2dProgramPlan);
    $("seeds2dDownloadButton")?.addEventListener("click", downloadSeeds2dResult);
    renderFileHint();
    renderSummary();
    renderEmptyTables();
    renderPresetTargetPreview();
    renderAssignmentTable();
    renderSeeds2dResult(null);
  }

  function bindFile(inputId, stateKey, nameKey) {
    const input = $(inputId);
    if (!input) return;
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        state[stateKey] = stateKey === "deviceCurveRows" ? parseDeviceCurveCsv(text) : parseCsv(text);
        state.fileNames[nameKey] = file.name;
        setStatus(`Loaded ${file.name}: ${state[stateKey].length} rows.`);
        if (stateKey === "kernelRows") renderKernelTable();
        if (stateKey === "targetRows") renderTargetTable();
        if (stateKey === "deviceCurveRows") buildGeneratedGridFromDeviceCurves(true);
        if (stateKey === "metricsRows") renderSummary();
        if (stateKey === "scoreRows" || stateKey === "gridRows" || stateKey === "targetRows" || stateKey === "deviceCurveRows") drawPlot();
        renderSummary();
        renderPresetTargetPreview();
      } catch (error) {
        setStatus(`Failed to read ${file.name}: ${error.message}`, true);
      }
    });
  }

  function clearState() {
    state.scoreRows = [];
    state.gridRows = [];
    state.kernelRows = [];
    state.targetRows = [];
    state.deviceCurveRows = [];
    state.generatedGridRows = [];
    state.metricsRows = [];
    state.fitRows = [];
    state.validationRows = [];
    state.seeds2dLastResult = null;
    state.fileNames = {};
    ["appModelScoreFile", "appModelGridFile", "appModelKernelFile", "appModelTargetFile", "appModelDeviceCurveFile", "appModelMetricsFile"].forEach(id => {
      const input = $(id);
      if (input) input.value = "";
    });
    renderSummary();
    renderKernelTable();
    renderAssignmentTable();
    renderEmptyTables();
    renderPresetTargetPreview();
    renderSeeds2dResult(null);
    setStatus("Application model inputs cleared.");
    drawPlot();
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (let i = 0; i < normalized.length; i += 1) {
      const ch = normalized[i];
      const next = normalized[i + 1];
      if (inQuotes) {
        if (ch === "\"" && next === "\"") {
          field += "\"";
          i += 1;
        } else if (ch === "\"") {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else if (ch === "\"") {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        if (row.some(value => value.trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
    row.push(field);
    if (row.some(value => value.trim() !== "")) rows.push(row);
    if (!rows.length) return [];
    const headers = rows[0].map(value => value.trim());
    return rows.slice(1).map(values => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] !== undefined ? values[index].trim() : "";
      });
      return obj;
    });
  }

  function parseDeviceCurveCsv(text) {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    const markerIndex = lines.findIndex(line => line.trim().toLowerCase().startsWith("# curve_points"));
    if (markerIndex >= 0 && markerIndex + 1 < lines.length) {
      const curveRows = parseCsv(lines.slice(markerIndex + 1).join("\n"));
      if (curveRows.length) return curveRows;
    }
    return parseCsv(text);
  }

  function targetLibrary() {
    return APP_MODEL_TARGET_LIBRARY[state.preset] || null;
  }

  function targetData() {
    return window.PCB_GAUSSIAN_APP_MODEL_TARGET_DATA?.[state.preset] || null;
  }

  function targetXGrid(library = targetLibrary()) {
    if (!library) return [];
    const xs = [];
    const step = library.xStep || 0.05;
    for (let x = library.xMin; x <= library.xMax + step / 2; x += step) {
      xs.push(Number(x.toFixed(8)));
    }
    return xs;
  }

  function targetGridRowsFromLibrary(library = targetLibrary()) {
    if (!library?.pairs?.length) return [];
    const dataRows = targetData()?.gridRows;
    if (Array.isArray(dataRows) && dataRows.length) return dataRows;
    return targetXGrid(library).map(x => {
      const row = { VG: x };
      library.pairs.forEach(pair => {
        row[pair.basis] = gaussianValue(x, pair.target.A, pair.target.mu, pair.target.sigma, pair.target.baseline);
      });
      return row;
    });
  }

  function parseDeviceNumber(value) {
    if (value === null || value === undefined) return NaN;
    const text = String(value).trim();
    const match = text.match(/D?\s*(\d+)/i);
    return match ? Number(match[1]) : numberValue(value);
  }

  function rowXValue(row) {
    const columns = ["x_V", "x", "VG", "VG_V", "gate_V", "gate_voltage", "dac_V"];
    for (const column of columns) {
      const value = numberValue(row[column]);
      if (Number.isFinite(value)) return value;
    }
    return NaN;
  }

  function rowYValue(row) {
    const columns = ["measured_y", "I_uA", "current_uA", "current", "y", "fit_y", "value"];
    for (const column of columns) {
      const value = numberValue(row[column]);
      if (Number.isFinite(value)) return value;
    }
    return NaN;
  }

  function latestDeviceCurveRows(device) {
    const rows = state.deviceCurveRows.filter(row => parseDeviceNumber(row.device) === device);
    if (!rows.length) return [];
    const iterValues = rows.map(row => numberValue(row.iter)).filter(Number.isFinite);
    if (iterValues.length) {
      const maxIter = Math.max(...iterValues);
      return rows.filter(row => numberValue(row.iter) === maxIter);
    }
    return rows;
  }

  function deviceCurvePoints(device) {
    const rows = latestDeviceCurveRows(device);
    return rows.map(row => [rowXValue(row), rowYValue(row)])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
      .sort((a, b) => a[0] - b[0]);
  }

  function normalizeArray(values) {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) return values.map(() => NaN);
    const minValue = Math.min(...finite);
    const shifted = values.map(value => Number.isFinite(value) ? Math.max(0, value - minValue) : NaN);
    const top = Math.max(...shifted.filter(Number.isFinite), 0);
    if (top <= 0) return shifted;
    return shifted.map(value => Number.isFinite(value) ? value / top : NaN);
  }

  function interpolatePoints(points, x) {
    if (!points.length) return NaN;
    if (x <= points[0][0]) return points[0][1];
    const last = points[points.length - 1];
    if (x >= last[0]) return last[1];
    for (let index = 1; index < points.length; index += 1) {
      const left = points[index - 1];
      const right = points[index];
      if (x <= right[0]) {
        const denom = right[0] - left[0];
        const t = denom ? (x - left[0]) / denom : 0;
        return left[1] + t * (right[1] - left[1]);
      }
    }
    return NaN;
  }

  function buildGeneratedGridFromDeviceCurves(updateStatus = false) {
    const library = targetLibrary();
    state.generatedGridRows = [];
    if (!library?.pairs?.length || !state.deviceCurveRows.length) return [];
    const xs = targetXGrid(library);
    const devicePoints = new Map();
    const missing = [];
    library.pairs.forEach(pair => {
      pair.devices.forEach(device => {
        if (devicePoints.has(device.device)) return;
        const points = deviceCurvePoints(device.device);
        if (points.length < 4) missing.push(`D${device.device}`);
        devicePoints.set(device.device, points);
      });
    });
    const rows = xs.map(x => ({ VG: x }));
    library.pairs.forEach(pair => {
      const summed = xs.map(x => {
        let total = 0;
        let count = 0;
        pair.devices.forEach(device => {
          const points = devicePoints.get(device.device) || [];
          const y = interpolatePoints(points, x);
          if (Number.isFinite(y)) {
            total += y;
            count += 1;
          }
        });
        return count ? total : NaN;
      });
      const normalized = normalizeArray(summed);
      rows.forEach((row, index) => {
        row[pair.basis] = normalized[index];
      });
    });
    state.generatedGridRows = rows;
    if (updateStatus) {
      const source = missing.length ? `Generated ADC-pair curves with missing/short device curves: ${missing.join(", ")}.` : "Generated ADC-pair curves from loaded device curves.";
      setStatus(source, Boolean(missing.length));
    }
    return rows;
  }

  function renderFileHint() {
    const preset = PRESETS[state.preset] || PRESETS.nab_machine_temperature;
    const hint = [
      `${preset.label}`,
      "",
      `Validation / score CSV: ${preset.scoreFile}`,
      `Curve grid CSV: ${preset.gridFile}`,
      `Selected kernels CSV: ${preset.kernelFile}`,
      `Fitting target CSV: ${preset.targetFile || "(optional; use Fit curves to estimate from loaded grid)"}`,
      `Generated device curves CSV: ${preset.deviceCurveFile || "(optional; device-cal log with # curve_points section or regular device/x/y CSV)"}`,
      `Metrics CSV: ${preset.metricsFile}`,
      "",
      preset.scoreHint
    ].join("\n");
    if ($("appModelFileHint")) $("appModelFileHint").textContent = hint;
  }

  function renderSummary() {
    const metrics = [];
    metrics.push(["Preset", (PRESETS[state.preset] || {}).label || state.preset]);
    metrics.push(["Score rows", state.scoreRows.length]);
    metrics.push(["Grid rows", state.gridRows.length]);
    metrics.push(["Kernels", state.kernelRows.length]);
    metrics.push(["Targets", state.targetRows.length]);
    metrics.push(["Device curve rows", state.deviceCurveRows.length]);
    metrics.push(["Generated grid rows", state.generatedGridRows.length]);
    metrics.push(["Metrics rows", state.metricsRows.length]);
    Object.entries(state.fileNames).forEach(([key, value]) => metrics.push([`${key} file`, value]));
    if (state.metricsRows[0]) {
      Object.entries(state.metricsRows[0]).slice(0, 8).forEach(([key, value]) => {
        metrics.push([key, formatValue(value)]);
      });
    }
    $("appModelMetricGrid").innerHTML = metrics.map(([key, value]) => (
      `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(String(value))}</strong></div>`
    )).join("");
    renderKernelTable();
    renderTargetTable();
    renderAssignmentTable();
    $("appModelDownloadButton").disabled = !(state.fitRows.length || state.validationRows.length || state.targetRows.length);
  }

  function renderKernelTable() {
    const tbody = $("appModelKernelTable");
    if (!tbody) return;
    if (!state.kernelRows.length) {
      tbody.innerHTML = `<tr><td colspan="10">No selected-kernel CSV loaded.</td></tr>`;
      return;
    }
    tbody.innerHTML = state.kernelRows.slice(0, 36).map(row => {
      const cells = [
        row.group || row.application || "",
        row.rank || "",
        row.device || "",
        row.adc || "",
        row.dac || "",
        row.vmu_code || "",
        row.vstart_code || "",
        formatNumber(numberValue(row.fit_mu_V), 3),
        formatNumber(numberValue(row.fit_sigma_V), 3),
        formatNumber(numberValue(row.fit_r2), 3)
      ];
      return `<tr>${cells.map(value => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");
  }

  function renderTargetTable() {
    const tbody = $("appModelTargetTable");
    if (!tbody) return;
    const rows = effectiveTargetRows();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8">No fitting-target CSV loaded or preset target available.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.slice(0, 36).map(row => {
      const cells = [
        row.basis || row.curve || row.group || "",
        formatNumber(numberValue(row.target_A_amp_norm || row.A_amp), 4),
        formatNumber(numberValue(row.target_mu_V || row.mu), 4),
        formatNumber(numberValue(row.target_sigma_V || row.sigma), 4),
        formatNumber(numberValue(row.target_baseline_norm || row.baseline), 4),
        formatNumber(numberValue(row.fit_r2 || row.r2), 4),
        formatNumber(numberValue(row.estimated_pair_A_uA), 4),
        row.devices || row.device_codes || ""
      ];
      return `<tr>${cells.map(value => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");
  }

  function renderAssignmentTable() {
    const tbody = $("appModelAssignmentTable");
    if (!tbody) return;
    const library = APP_MODEL_TARGET_LIBRARY[state.preset];
    if (!library?.pairs?.length) {
      tbody.innerHTML = `<tr><td colspan="10">No preset device-to-target assignment for this model.</td></tr>`;
      return;
    }
    const rows = [];
    library.pairs.forEach(pair => {
      pair.devices.forEach(device => {
        rows.push({ pair, device });
      });
    });
    tbody.innerHTML = rows.map(({ pair, device }) => (
      `<tr>` +
      `<td>ADC ${escapeHtml(String(pair.adcPair))}</td>` +
      `<td>D${escapeHtml(String(device.device))}</td>` +
      `<td>${escapeHtml(device.label || "")}</td>` +
      `<td>${formatNumber(device.A_uA, 5)}</td>` +
      `<td>${formatNumber(device.mu, 3)}</td>` +
      `<td>${formatNumber(device.sigma, 3)}</td>` +
      `<td>${escapeHtml(String(device.vmuCode))}</td>` +
      `<td>${escapeHtml(String(device.vstartCode))}</td>` +
      `<td>${escapeHtml(pair.basis)}</td>` +
      `<td><button type="button" class="mini-button" data-app-target-device="${escapeHtml(String(device.device))}">Use</button></td>` +
      `</tr>`
    )).join("");
  }

  function effectiveTargetRows() {
    if (state.targetRows.length) return state.targetRows;
    const dataRows = targetData()?.targetRows;
    if (Array.isArray(dataRows) && dataRows.length) return dataRows;
    const library = APP_MODEL_TARGET_LIBRARY[state.preset];
    if (!library?.pairs?.length) return [];
    return library.pairs.map(pair => ({
      application: state.preset,
      basis: pair.basis,
      adc_pair: pair.adcPair,
      target_A_amp_norm: pair.target.A,
      target_mu_V: pair.target.mu,
      target_sigma_V: pair.target.sigma,
      target_baseline_norm: pair.target.baseline,
      fit_r2: pair.target.r2,
      estimated_pair_A_uA: sum(pair.devices.map(device => Number(device.A_uA) || 0)),
      devices: pair.devices.map(device => `D${device.device}:${device.label}`).join(" + "),
      device_codes: pair.devices.map(device => `D${device.device}(Vmu=${device.vmuCode},Vstart=${device.vstartCode})`).join(" + "),
      target_note: "Preset target generated from the model library."
    }));
  }

  function findAssignedDevice(deviceNumber) {
    const library = targetLibrary();
    if (!library?.pairs) return null;
    for (const pair of library.pairs) {
      const device = pair.devices.find(item => Number(item.device) === Number(deviceNumber));
      if (device) return { pair, device };
    }
    return null;
  }

  function copyAssignmentTargetToFitPanel(deviceNumber) {
    const found = findAssignedDevice(deviceNumber);
    if (!found) return;
    const { pair, device } = found;
    if ($("fitDevice")) $("fitDevice").value = device.device;
    if ($("fitTargetA")) $("fitTargetA").value = Number(device.A_uA).toPrecision(8);
    if ($("fitTargetMu")) $("fitTargetMu").value = Number(device.mu).toFixed(6);
    if ($("fitTargetSigma")) $("fitTargetSigma").value = Math.abs(Number(device.sigma)).toFixed(6);
    if ($("deviceCalTargetA")) $("deviceCalTargetA").value = Number(device.A_uA).toPrecision(8);
    if ($("deviceCalTargetMu")) $("deviceCalTargetMu").value = Number(device.mu).toFixed(6);
    if ($("deviceCalTargetSigma")) $("deviceCalTargetSigma").value = Math.abs(Number(device.sigma)).toFixed(6);
    setStatus(`Copied D${device.device} target for ADC ${pair.adcPair}: A ${formatNumber(device.A_uA, 5)} uA, mu ${formatNumber(device.mu, 3)} V, sigma ${formatNumber(device.sigma, 3)} V.`);
  }

  function downloadPresetTargets() {
    const library = targetLibrary();
    if (!library?.pairs?.length) {
      setStatus("No preset targets are available for this model.", true);
      return;
    }
    const curveRows = targetGridRowsFromLibrary(library).map(row => {
      const out = { row_type: "adc_pair_target_curve", VG: row.VG };
      library.pairs.forEach(pair => {
        out[pair.basis] = row[pair.basis];
      });
      return out;
    });
    const deviceRows = [];
    library.pairs.forEach(pair => {
      deviceRows.push({
        row_type: "adc_pair_target",
        adc_pair: pair.adcPair,
        basis: pair.basis,
        target_A_norm: pair.target.A,
        target_mu_V: pair.target.mu,
        target_sigma_V: pair.target.sigma,
        target_baseline_norm: pair.target.baseline,
        target_r2: pair.target.r2
      });
      pair.devices.forEach(device => {
        deviceRows.push({
          row_type: "device_fit_target",
          adc_pair: pair.adcPair,
          device: device.device,
          label: device.label,
          target_A_uA: device.A_uA,
          target_mu_V: device.mu,
          target_sigma_V: device.sigma,
          seed_vmu_code: device.vmuCode,
          seed_vstart_code: device.vstartCode,
          target_r2: device.r2
        });
      });
    });
    const sections = [
      "# device_and_adc_targets",
      toCsv(deviceRows),
      "",
      "# adc_pair_target_curves",
      toCsv(curveRows)
    ].join("\n");
    downloadText(`application_preset_targets_${state.preset}_${Date.now()}.csv`, sections);
  }

  function renderEmptyTables() {
    $("appModelFitTable").innerHTML = `<tr><td colspan="8">No curve fit result yet.</td></tr>`;
    $("appModelValidationTable").innerHTML = `<tr><td colspan="3">No validation result yet.</td></tr>`;
    $("appModelPlotLegend").innerHTML = "";
    $("appModelPlotStatus").textContent = "No application model plotted yet.";
  }

  function renderPresetTargetPreview() {
    const canvas = $("appModelTargetCanvas");
    const status = $("appModelTargetStatus");
    const legend = $("appModelTargetLegend");
    if (!canvas) return;
    const ctx = prepareCanvas(canvas);
    clearCanvas(ctx, canvas);
    const library = targetLibrary();
    if (!library?.pairs?.length) {
      drawEmptyMessage(ctx, canvas, "This preset does not define ADC target curves.");
      if (status) status.textContent = "No preset target curves.";
      if (legend) legend.innerHTML = "";
      return;
    }
    const targetRows = targetGridRowsFromLibrary(library);
    const generatedRows = state.generatedGridRows.length ? state.generatedGridRows : [];
    const allX = targetRows.map(row => numberValue(row.VG));
    const allY = [];
    library.pairs.forEach(pair => {
      targetRows.forEach(row => allY.push(numberValue(row[pair.basis])));
      generatedRows.forEach(row => allY.push(numberValue(row[pair.basis])));
    });
    const scale = plotScale(canvas, minMax(allX), minMax(allY));
    drawAxes(ctx, canvas, scale, "VG (V)", "normalized current");
    const series = [];
    library.pairs.forEach((pair, index) => {
      const color = COLORS[index % COLORS.length];
      const targetPoints = targetRows.map(row => [numberValue(row.VG), numberValue(row[pair.basis])])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      drawLine(ctx, targetPoints, scale, color, 2.2);
      series.push({ name: `ADC ${pair.adcPair} target`, color });
      if (generatedRows.length) {
        const generatedPoints = generatedRows.map(row => [numberValue(row.VG), numberValue(row[pair.basis])])
          .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
        drawLine(ctx, generatedPoints, scale, color, 1.4, [5, 4]);
      }
    });
    if (status) {
      status.textContent = generatedRows.length
        ? `Preset target curves with generated device-curve overlay (${generatedRows.length} VG points).`
        : `Preset target curves for ${library.pairs.length} ADC pair(s). Load generated device curves to overlay validation curves.`;
    }
    if (legend) {
      legend.innerHTML = series.map(item => `<span><i style="background:${item.color}"></i>${escapeHtml(item.name)}</span>`).join("") +
        (generatedRows.length ? `<span><i style="background:#17323a"></i>dashed = generated from device curves</span>` : "");
    }
  }

  function fitModelCurves(updateStatus = true) {
    const data = state.gridRows.length ? state.gridRows : state.scoreRows;
    if (!data.length) {
      if (updateStatus) setStatus("Load a curve grid CSV or score CSV before fitting.", true);
      return;
    }
    const columns = Object.keys(data[0] || {});
    const xColumn = firstExisting(columns, ["VG", "VG_mapped", "VG_class_1", "lda_z"]);
    if (!xColumn) {
      if (updateStatus) setStatus("No VG/VG_mapped axis column found for curve fitting.", true);
      return;
    }
    const yColumns = selectCurveColumns(columns, xColumn);
    if (!yColumns.length) {
      if (updateStatus) setStatus("No target/measured score columns found for curve fitting.", true);
      return;
    }
    state.fitRows = yColumns.map(column => {
      const xy = data.map(row => [numberValue(row[xColumn]), numberValue(row[column])])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      const fit = fitGaussian(xy.map(item => item[0]), xy.map(item => item[1]));
      return {
        curve: column,
        A_amp: fit.A,
        mu: fit.mu,
        sigma: fit.sigma,
        baseline: fit.baseline,
        r2: fit.r2,
        rmse: fit.rmse,
        n: fit.n
      };
    });
    renderFitTable();
    drawPlot();
    renderSummary();
    if (updateStatus) setStatus(`Fitted ${state.fitRows.length} curve(s) with ${xColumn} as X axis.`);
  }

  function selectCurveColumns(columns, xColumn) {
    const source = $("appModelScoreSource") ? $("appModelScoreSource").value : "measured";
    const blacklist = new Set([
      xColumn, "timestamp", "value", "sample_id", "class", "split", "predicted_class",
      "is_anomaly_window", "area", "perimeter", "compactness", "kernel_length",
      "kernel_width", "asymmetry", "groove_length", "lda_z"
    ]);
    let candidates = columns.filter(column => {
      if (blacklist.has(column)) return false;
      const lower = column.toLowerCase();
      if (source === "target" && lower.includes("target")) return true;
      if (source === "measured" && (lower.includes("measured") || lower.includes("normality") || lower.includes("score") || lower.includes("basis_curve"))) return true;
      return lower.includes("target") || lower.includes("measured_kernel") || lower.includes("normality_score") || lower.includes("basis_curve");
    });
    if (source === "target") {
      const targetOnly = candidates.filter(column => column.toLowerCase().includes("target"));
      if (targetOnly.length) candidates = targetOnly;
    }
    if (source === "measured") {
      const measuredOnly = candidates.filter(column => {
        const lower = column.toLowerCase();
        return lower.includes("measured") || lower.includes("normality") || lower.includes("basis_curve");
      });
      if (measuredOnly.length) candidates = measuredOnly;
    }
    return candidates.filter(column => state.gridRows.length || column !== "anomaly_score_1_minus_normality").slice(0, 12);
  }

  function renderFitTable() {
    const tbody = $("appModelFitTable");
    if (!tbody) return;
    if (!state.fitRows.length) {
      tbody.innerHTML = `<tr><td colspan="8">No curve fit result yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = state.fitRows.map(row => (
      `<tr><td>${escapeHtml(row.curve)}</td><td>${formatNumber(row.A_amp, 4)}</td><td>${formatNumber(row.mu, 4)}</td><td>${formatNumber(row.sigma, 4)}</td><td>${formatNumber(row.baseline, 4)}</td><td>${formatNumber(row.r2, 4)}</td><td>${formatNumber(row.rmse, 4)}</td><td>${row.n}</td></tr>`
    )).join("");
  }

  function validateModel(updateStatus = true) {
    const preset = PRESETS[state.preset] || PRESETS.nab_machine_temperature;
    if (preset.kind === "nab") {
      validateNab(updateStatus);
    } else {
      validateSeeds(updateStatus);
    }
    renderSummary();
    drawPlot();
  }

  function validateNab(updateStatus) {
    if (!state.scoreRows.length) {
      if (updateStatus) setStatus("Load NAB series_with_scores.csv before validation.", true);
      return;
    }
    const rows = state.scoreRows.map(row => {
      const label = numberValue(row.is_anomaly_window);
      const normality = numberValue(row.measured_kernel_normality_score);
      let anomalyScore = numberValue(row.anomaly_score_1_minus_normality);
      if (!Number.isFinite(anomalyScore) && Number.isFinite(normality)) anomalyScore = 1 - normality;
      return { label: label > 0 ? 1 : 0, normality, anomalyScore };
    }).filter(row => Number.isFinite(row.anomalyScore));

    if (!rows.length) {
      if (updateStatus) setStatus("No usable anomaly score column found.", true);
      return;
    }
    const labels = rows.map(row => row.label);
    const scores = rows.map(row => row.anomalyScore);
    const auc = rocAuc(labels, scores);
    const threshold = bestThreshold(labels, scores);
    const normalScores = rows.filter(row => row.label === 0).map(row => row.normality).filter(Number.isFinite);
    const anomalyScoresAsNormality = rows.filter(row => row.label === 1).map(row => row.normality).filter(Number.isFinite);
    state.validationRows = [
      metricRow("Samples", rows.length, "NAB"),
      metricRow("Anomaly-window samples", sum(labels), "NAB"),
      metricRow("AUROC", auc, "score = 1 - normality"),
      metricRow("Best F1 threshold", threshold.threshold, "anomaly score"),
      metricRow("Best F1", threshold.f1, "threshold sweep"),
      metricRow("Balanced accuracy", threshold.balancedAccuracy, "threshold sweep"),
      metricRow("TP / FP / TN / FN", `${threshold.tp} / ${threshold.fp} / ${threshold.tn} / ${threshold.fn}`, "threshold sweep")
    ];
    if (normalScores.length && anomalyScoresAsNormality.length) {
      state.validationRows.push(metricRow("Mean normality, normal", mean(normalScores), "measured score"));
      state.validationRows.push(metricRow("Mean normality, anomaly", mean(anomalyScoresAsNormality), "measured score"));
    }
    renderValidationTable();
    if (updateStatus) setStatus(`NAB validation complete: AUROC ${formatNumber(auc, 4)}, best F1 ${formatNumber(threshold.f1, 4)}.`);
  }

  function validateSeeds(updateStatus) {
    if (state.preset === "seeds_2d_adc_pair_basis" && targetLibrary()?.type === "adc_pair_basis") {
      validateSeedsAdcPairBasis(updateStatus);
      return;
    }
    if (!state.scoreRows.length) {
      if (updateStatus) setStatus("Load a Seeds score CSV before validation.", true);
      return;
    }
    const classIds = findClassIds(state.scoreRows[0]);
    if (!classIds.length) {
      if (updateStatus) setStatus("No measured_score_class_* columns found.", true);
      return;
    }
    const rows = state.scoreRows.map(row => {
      const truth = Math.round(numberValue(row.class));
      const scores = classIds.map(classId => ({
        classId,
        score: numberValue(row[scoreColumnName(classId, row)])
      })).filter(item => Number.isFinite(item.score));
      const predicted = scores.length ? scores.reduce((best, item) => item.score > best.score ? item : best, scores[0]).classId : NaN;
      const provided = Math.round(numberValue(row.predicted_class));
      return {
        truth,
        predicted,
        provided: Number.isFinite(provided) ? provided : predicted,
        split: row.split || "all"
      };
    }).filter(row => Number.isFinite(row.truth) && Number.isFinite(row.predicted));

    if (!rows.length) {
      if (updateStatus) setStatus("No usable Seeds validation rows found.", true);
      return;
    }
    const allMetrics = classificationMetrics(rows, classIds);
    const testRows = rows.filter(row => String(row.split).toLowerCase() === "test");
    const testMetrics = classificationMetrics(testRows.length ? testRows : rows, classIds);
    state.validationRows = [
      metricRow("Samples", rows.length, "Seeds"),
      metricRow("Class-score columns", classIds.join(", "), "Seeds"),
      metricRow("All accuracy", allMetrics.accuracy, "argmax measured score"),
      metricRow("Test accuracy", testMetrics.accuracy, testRows.length ? "test split" : "all rows fallback"),
      metricRow("Test confusion matrix", matrixToText(testMetrics.matrix), "rows true, cols pred")
    ];
    classIds.forEach((classId, index) => {
      state.validationRows.push(metricRow(`Class ${classId} recall`, testMetrics.recall[index], "test split"));
      state.validationRows.push(metricRow(`Class ${classId} precision`, testMetrics.precision[index], "test split"));
    });
    renderValidationTable();
    if (updateStatus) setStatus(`Seeds validation complete: test accuracy ${formatNumber(testMetrics.accuracy, 4)}.`);
  }

  function validateSeedsAdcPairBasis(updateStatus) {
    const library = targetLibrary();
    if (!state.scoreRows.length) {
      if (updateStatus) setStatus("Load seeds_2d_adc_pair_scores.csv before ADC-pair validation.", true);
      return;
    }
    let curveRows = state.generatedGridRows.length ? state.generatedGridRows : [];
    let curveSource = state.generatedGridRows.length ? "generated from loaded device curves" : "";
    if (!curveRows.length && state.gridRows.length) {
      curveRows = state.gridRows;
      curveSource = "loaded curve grid CSV";
    }
    if (!curveRows.length) {
      curveRows = targetGridRowsFromLibrary(library);
      curveSource = "preset target curves";
    }
    if (!curveRows.length) {
      if (updateStatus) setStatus("No ADC-pair target or generated curve grid available.", true);
      return;
    }
    const classIds = [1, 2, 3];
    const rows = state.scoreRows.map(row => {
      const truth = Math.round(numberValue(row.class));
      const vg1 = numberValue(row.VG_dim_1);
      const vg2 = numberValue(row.VG_dim_2);
      const features = {};
      library.pairs.forEach(pair => {
        features[`pair_${pair.adcPair}_dim_1`] = interpolateGridColumn(curveRows, pair.basis, vg1);
        features[`pair_${pair.adcPair}_dim_2`] = interpolateGridColumn(curveRows, pair.basis, vg2);
      });
      const scores = adcPairReadoutScores(features, library.readoutWeights);
      const predicted = classIds.reduce((best, classId) => scores[classId] > scores[best] ? classId : best, 1);
      return {
        truth,
        predicted,
        split: row.split || "all",
        scores,
        vg1,
        vg2
      };
    }).filter(row => Number.isFinite(row.truth) && Number.isFinite(row.predicted));
    if (!rows.length) {
      if (updateStatus) setStatus("No usable ADC-pair validation rows found.", true);
      return;
    }
    const allMetrics = classificationMetrics(rows, classIds);
    const testRows = rows.filter(row => String(row.split).toLowerCase() === "test");
    const testMetrics = classificationMetrics(testRows.length ? testRows : rows, classIds);
    const targetRows = targetGridRowsFromLibrary(library);
    const similarities = library.pairs.map(pair => {
      const target = targetRows.map(row => numberValue(row[pair.basis]));
      const generated = curveRows.map(row => numberValue(row[pair.basis]));
      return { pair: pair.adcPair, similarity: cosineSimilarity(target, generated) };
    });
    state.validationRows = [
      metricRow("Samples", rows.length, "Seeds ADC-pair"),
      metricRow("Curve source", curveSource, "ADC-pair validation"),
      metricRow("All accuracy", allMetrics.accuracy, "recomputed from curve grid"),
      metricRow("Test accuracy", testMetrics.accuracy, testRows.length ? "test split" : "all rows fallback"),
      metricRow("Test confusion matrix", matrixToText(testMetrics.matrix), "rows true, cols pred"),
      metricRow("Pair target similarity", similarities.map(item => `ADC${item.pair}:${formatNumber(item.similarity, 4)}`).join(", "), curveSource)
    ];
    classIds.forEach((classId, index) => {
      state.validationRows.push(metricRow(`Class ${classId} recall`, testMetrics.recall[index], "test split"));
      state.validationRows.push(metricRow(`Class ${classId} precision`, testMetrics.precision[index], "test split"));
    });
    renderValidationTable();
    if (updateStatus) setStatus(`Seeds ADC-pair validation complete from ${curveSource}: test accuracy ${formatNumber(testMetrics.accuracy, 4)}.`);
  }

  function adcPairReadoutScores(features, weights) {
    const scores = { 1: weights.bias[0], 2: weights.bias[1], 3: weights.bias[2] };
    Object.entries(features).forEach(([feature, value]) => {
      const row = weights[feature];
      if (!row || !Number.isFinite(value)) return;
      [1, 2, 3].forEach(classId => {
        scores[classId] += value * row[classId - 1];
      });
    });
    return scores;
  }

  function cosineSimilarity(a, b) {
    const n = Math.min(a.length, b.length);
    let dot = 0;
    let aa = 0;
    let bb = 0;
    for (let index = 0; index < n; index += 1) {
      const x = numberValue(a[index]);
      const y = numberValue(b[index]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      dot += x * y;
      aa += x * x;
      bb += y * y;
    }
    if (aa <= 0 || bb <= 0) return NaN;
    return dot / Math.sqrt(aa * bb);
  }

  function renderValidationTable() {
    const tbody = $("appModelValidationTable");
    if (!tbody) return;
    if (!state.validationRows.length) {
      tbody.innerHTML = `<tr><td colspan="3">No validation result yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = state.validationRows.map(row => (
      `<tr><td>${escapeHtml(row.metric)}</td><td>${escapeHtml(formatValue(row.value))}</td><td>${escapeHtml(row.scope)}</td></tr>`
    )).join("");
  }

  function loadSeeds2dScoreRow() {
    if (!state.scoreRows.length) {
      setSeeds2dStatus("Load seeds_2d_system_scores.csv first.", true);
      return;
    }
    const index = Math.max(0, Math.min(state.scoreRows.length - 1, Math.round(numberValue($("seeds2dSampleIndex")?.value) || 0)));
    const row = state.scoreRows[index];
    setSeeds2dFeatureInputs(row);
    setSeeds2dStatus(`Loaded score row ${index}${row.class ? `, true class ${formatValue(row.class)}` : ""}.`);
    if (state.gridRows.length) runSeeds2dScore();
  }

  function setSeeds2dFeatureInputs(row) {
    SEEDS_2D_FIELDS.forEach(field => {
      const input = $(field.id);
      if (input && row[field.key] !== undefined) input.value = row[field.key];
    });
  }

  function readSeeds2dFeatureVector() {
    const values = [];
    const missing = [];
    SEEDS_2D_FIELDS.forEach(field => {
      const value = numberValue($(field.id)?.value);
      if (!Number.isFinite(value)) missing.push(field.label);
      values.push(value);
    });
    if (missing.length) {
      throw new Error(`Invalid Seeds feature value(s): ${missing.join(", ")}`);
    }
    return values;
  }

  function computeSeeds2dProjection(features) {
    const scaled = features.map((value, index) => (value - SEEDS_2D_MODEL.mean[index]) / SEEDS_2D_MODEL.std[index]);
    const raw = [0, 1].map(dim => scaled.reduce((acc, value, index) => acc + value * SEEDS_2D_MODEL.ldaBasis[index][dim], 0));
    const z = raw.map((value, dim) => (value - SEEDS_2D_MODEL.ldaProjectionMean[dim]) / SEEDS_2D_MODEL.ldaProjectionStd[dim]);
    const vg = z.map((value, dim) => clamp(value * SEEDS_2D_MODEL.vgScale[dim] + SEEDS_2D_MODEL.vgShift[dim], -15, 15));
    return { scaled, raw, z, vg };
  }

  function runSeeds2dScore() {
    let features;
    try {
      features = readSeeds2dFeatureVector();
    } catch (error) {
      setSeeds2dStatus(error.message, true);
      return;
    }
    const projection = computeSeeds2dProjection(features);
    const result = {
      features,
      projection,
      terms: {},
      scores: {},
      predictedClass: null,
      predictedName: "",
      planText: ""
    };
    const library = targetLibrary();
    try {
      if (library?.type === "adc_pair_basis") {
        const curveRows = state.generatedGridRows.length ? state.generatedGridRows
          : state.gridRows.length ? state.gridRows
            : targetGridRowsFromLibrary(library);
        const pairResult = adcPairScoreForProjection(projection, curveRows, library);
        result.basisFeatures = pairResult.features;
        result.scores = pairResult.scores;
        result.terms = pairResult.terms;
        result.predictedClass = [1, 2, 3].reduce((best, classId) => result.scores[classId] > result.scores[best] ? classId : best, 1);
        result.predictedName = SEEDS_2D_MODEL.classNames[result.predictedClass] || "";
        state.seeds2dLastResult = result;
        renderSeeds2dResult(result);
        setSeeds2dStatus(`ADC-pair score complete: predicted class ${result.predictedClass} ${result.predictedName}.`);
        return;
      }
      if (!state.gridRows.length) {
        state.seeds2dLastResult = result;
        renderSeeds2dResult(result);
        setSeeds2dStatus("Projection complete. Load class_axis_score_grid.csv to compute measured-kernel scores.", true);
        return;
      }
      [1, 2, 3].forEach(classId => {
        const cols = SEEDS_2D_MODEL.gridColumns[classId];
        const term1 = interpolateGridColumn(state.gridRows, cols[0], projection.vg[0]);
        const term2 = interpolateGridColumn(state.gridRows, cols[1], projection.vg[1]);
        if (!Number.isFinite(term1) || !Number.isFinite(term2)) {
          throw new Error(`Missing grid term for class ${classId}. Check class_axis_score_grid.csv.`);
        }
        result.terms[classId] = [term1, term2];
        result.scores[classId] = Math.sqrt(Math.max(term1, 1e-6) * Math.max(term2, 1e-6));
      });
    } catch (error) {
      state.seeds2dLastResult = result;
      renderSeeds2dResult(result);
      setSeeds2dStatus(error.message, true);
      return;
    }
    result.predictedClass = [1, 2, 3].reduce((best, classId) => result.scores[classId] > result.scores[best] ? classId : best, 1);
    result.predictedName = SEEDS_2D_MODEL.classNames[result.predictedClass] || "";
    state.seeds2dLastResult = result;
    renderSeeds2dResult(result);
    setSeeds2dStatus(`2D score complete: predicted class ${result.predictedClass} ${result.predictedName}.`);
  }

  function adcPairScoreForProjection(projection, curveRows, library) {
    const features = {};
    const terms = {};
    library.pairs.forEach(pair => {
      const dim1 = interpolateGridColumn(curveRows, pair.basis, projection.vg[0]);
      const dim2 = interpolateGridColumn(curveRows, pair.basis, projection.vg[1]);
      features[`pair_${pair.adcPair}_dim_1`] = dim1;
      features[`pair_${pair.adcPair}_dim_2`] = dim2;
      terms[pair.adcPair] = [dim1, dim2];
    });
    const scores = adcPairReadoutScores(features, library.readoutWeights);
    return { features, terms, scores };
  }

  function interpolateGridColumn(rows, column, x) {
    const points = rows.map(row => [numberValue(row.VG), numberValue(row[column])])
      .filter(([px, py]) => Number.isFinite(px) && Number.isFinite(py))
      .sort((a, b) => a[0] - b[0]);
    if (!points.length) return NaN;
    if (x <= points[0][0]) return points[0][1];
    const last = points[points.length - 1];
    if (x >= last[0]) return last[1];
    for (let i = 1; i < points.length; i += 1) {
      const left = points[i - 1];
      const right = points[i];
      if (x <= right[0]) {
        const t = (x - left[0]) / (right[0] - left[0]);
        return left[1] + t * (right[1] - left[1]);
      }
    }
    return NaN;
  }

  function renderSeeds2dResult(result) {
    const grid = $("seeds2dResultGrid");
    const plan = $("seeds2dPlanOutput");
    if (!grid) return;
    if (!result) {
      grid.innerHTML = [
        ["z1", ""], ["z2", ""], ["VG1", ""], ["VG2", ""],
        ["score 1", ""], ["score 2", ""], ["score 3", ""], ["pred", ""]
      ].map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
      if (plan) plan.textContent = "No 2D system plan generated.";
      const button = $("seeds2dDownloadButton");
      if (button) button.disabled = true;
      return;
    }
    const items = [
      ["z1", formatNumber(result.projection.z[0], 4)],
      ["z2", formatNumber(result.projection.z[1], 4)],
      ["VG1", `${formatNumber(result.projection.vg[0], 3)} V`],
      ["VG2", `${formatNumber(result.projection.vg[1], 3)} V`],
      ["score 1", formatNumber(result.scores[1], 4)],
      ["score 2", formatNumber(result.scores[2], 4)],
      ["score 3", formatNumber(result.scores[3], 4)],
      ["pred", result.predictedClass ? `${result.predictedClass} ${result.predictedName}` : "projection only"]
    ];
    grid.innerHTML = items.map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join("");
    if (plan && !result.planText) {
      plan.textContent = "Run Generate program plan to list device programming and two-axis readout steps.";
    }
    const button = $("seeds2dDownloadButton");
    if (button) button.disabled = false;
  }

  function generateSeeds2dProgramPlan() {
    if (!state.seeds2dLastResult) runSeeds2dScore();
    const result = state.seeds2dLastResult;
    if (!result) return;
    if (!result.predictedClass) {
      setSeeds2dStatus("Run a measured-kernel 2D score first. Load class_axis_score_grid.csv if only projection is available.", true);
      return;
    }
    if (targetLibrary()?.type === "adc_pair_basis") {
      generateSeedsAdcPairProgramPlan(result);
      return;
    }
    if (!state.kernelRows.length) {
      setSeeds2dStatus("Load selected_kernels.csv to generate the program/readout plan.", true);
      return;
    }
    const uniqueProgramRows = [];
    const seen = new Set();
    state.kernelRows.forEach(row => {
      const device = Math.round(numberValue(row.device));
      const mu = Math.round(numberValue(row.vmu_code));
      const vstart = Math.round(numberValue(row.vstart_code));
      if (!Number.isFinite(device) || !Number.isFinite(mu) || !Number.isFinite(vstart)) return;
      const key = `${device}`;
      if (seen.has(key)) return;
      seen.add(key);
      uniqueProgramRows.push({ device, mu, vstart, command: `P${device},${mu},${vstart}` });
    });
    const lines = [];
    lines.push("Seeds 2D system operation plan");
    lines.push("");
    lines.push("1) Program selected device terms");
    uniqueProgramRows.sort((a, b) => a.device - b.device).forEach(row => {
      lines.push(`  ${row.command}`);
    });
    lines.push("");
    [0, 1].forEach(dim => {
      const dimNumber = dim + 1;
      const mv = Math.round(result.projection.vg[dim] * 1000);
      const rows = state.kernelRows.filter(row => Math.round(numberValue(row.dimension)) === dimNumber);
      const dacs = Array.from(new Set(rows.map(row => String(row.dac || "D1").trim()).filter(Boolean)));
      const dac = dacs[0] || "D1";
      const dacNumber = dac.replace(/[^0-9]/g, "") || "1";
      const mask = adcMaskForRows(rows);
      lines.push(`${dimNumber + 1}) Measure dimension ${dimNumber} kernel terms`);
      lines.push(`  Set gate: V${dacNumber},${mv}`);
      lines.push(`  Suggested masked stream: Y,${mask},16,256,20000`);
      [1, 2, 3].forEach(classId => {
        const groupRows = rows.filter(row => Math.round(numberValue(row.class)) === classId);
        const devices = groupRows.map(row => `D${Math.round(numberValue(row.device))}`).join("+") || "-";
        const adcs = groupRows.map(row => `ADC${Math.round(numberValue(row.adc))}`).join("+") || "-";
        lines.push(`  class ${classId}, dim ${dimNumber}: ${devices} via ${adcs}`);
      });
      lines.push("");
    });
    lines.push("4) System aggregation");
    [1, 2, 3].forEach(classId => {
      const terms = result.terms[classId] || [NaN, NaN];
      lines.push(`  score_${classId} = sqrt(${formatNumber(terms[0], 4)} x ${formatNumber(terms[1], 4)}) = ${formatNumber(result.scores[classId], 4)}`);
    });
    lines.push(`  predicted class = ${result.predictedClass || ""} ${result.predictedName || ""}`);
    lines.push("");
    lines.push("Boundary: projection, multiplication, and argmax are GUI/MCU-level operations; devices provide measured 1D kernel terms.");
    result.planText = lines.join("\n");
    const plan = $("seeds2dPlanOutput");
    if (plan) plan.textContent = result.planText;
    setSeeds2dStatus("Generated Seeds 2D device programming and readout plan.");
  }

  function generateSeedsAdcPairProgramPlan(result) {
    const library = targetLibrary();
    const lines = [];
    lines.push("Seeds 2D 4-ADC pair-basis operation plan");
    lines.push("");
    lines.push("1) Fit/program devices to their assigned target contribution curves");
    library.pairs.forEach(pair => {
      lines.push(`  ADC ${pair.adcPair} target: ${pair.basis}, A=${formatNumber(pair.target.A, 4)}, mu=${formatNumber(pair.target.mu, 3)} V, sigma=${formatNumber(pair.target.sigma, 3)} V`);
      pair.devices.forEach(device => {
        lines.push(`    D${device.device}: target A=${formatNumber(device.A_uA, 5)} uA, mu=${formatNumber(device.mu, 3)} V, sigma=${formatNumber(device.sigma, 3)} V, seed P${device.device},${device.vmuCode},${device.vstartCode}`);
      });
    });
    lines.push("");
    lines.push("2) Read four ADC pair-summed basis outputs at two projected gate values");
    [0, 1].forEach(dim => {
      const dimNumber = dim + 1;
      const mv = Math.round(result.projection.vg[dim] * 1000);
      lines.push(`  VG_dim_${dimNumber}: ${formatNumber(result.projection.vg[dim], 3)} V (${mv} mV)`);
      library.pairs.forEach(pair => {
        const term = result.terms?.[pair.adcPair]?.[dim] ?? NaN;
        const devices = pair.devices.map(device => `D${device.device}`).join("+");
        lines.push(`    ADC ${pair.adcPair}: ${devices}, activation=${formatNumber(term, 4)}`);
      });
    });
    lines.push("");
    lines.push("3) GUI/MCU readout");
    [1, 2, 3].forEach(classId => {
      lines.push(`  class ${classId} score = ${formatNumber(result.scores[classId], 4)}`);
    });
    lines.push(`  predicted class = ${result.predictedClass || ""} ${result.predictedName || ""}`);
    lines.push("");
    lines.push("Boundary: devices provide pair-summed Gaussian-like basis curves; projection, weighted readout, and argmax are system-level operations.");
    result.planText = lines.join("\n");
    const plan = $("seeds2dPlanOutput");
    if (plan) plan.textContent = result.planText;
    setSeeds2dStatus("Generated Seeds 2D ADC-pair target fitting and readout plan.");
  }

  function adcMaskForRows(rows) {
    const mask = rows.reduce((acc, row) => {
      const adc = Math.round(numberValue(row.adc));
      if (!Number.isFinite(adc) || adc < 0 || adc > 31) return acc;
      return acc | (1 << adc);
    }, 0);
    return mask || 0;
  }

  function downloadSeeds2dResult() {
    const result = state.seeds2dLastResult;
    if (!result) return;
    const row = {};
    SEEDS_2D_FIELDS.forEach((field, index) => {
      row[field.key] = result.features[index];
    });
    row.z_dim_1 = result.projection.z[0];
    row.z_dim_2 = result.projection.z[1];
    row.VG_dim_1 = result.projection.vg[0];
    row.VG_dim_2 = result.projection.vg[1];
    if (targetLibrary()?.type === "adc_pair_basis") {
      (targetLibrary().pairs || []).forEach(pair => {
        const terms = result.terms[pair.adcPair] || [NaN, NaN];
        row[`pair_${pair.adcPair}_dim_1`] = terms[0];
        row[`pair_${pair.adcPair}_dim_2`] = terms[1];
      });
      [1, 2, 3].forEach(classId => {
        row[`measured_score_class_${classId}`] = result.scores[classId];
      });
    } else {
      [1, 2, 3].forEach(classId => {
        const terms = result.terms[classId] || [NaN, NaN];
        row[`measured_term_dim_1_class_${classId}`] = terms[0];
        row[`measured_term_dim_2_class_${classId}`] = terms[1];
        row[`measured_score_class_${classId}`] = result.scores[classId];
      });
    }
    row.predicted_class = result.predictedClass;
    row.predicted_name = result.predictedName;
    row.operation_plan = result.planText || "";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(`seeds_2d_system_result_${stamp}.csv`, toCsv([row]));
  }

  function setSeeds2dStatus(message, isError = false) {
    const status = $("seeds2dStatus");
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "var(--warn)" : "var(--muted)";
  }

  function clamp(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
  }

  function drawPlot() {
    const canvas = $("appModelPlotCanvas");
    if (!canvas) return;
    const ctx = prepareCanvas(canvas);
    clearCanvas(ctx, canvas);
    const preset = PRESETS[state.preset] || PRESETS.nab_machine_temperature;
    if (state.generatedGridRows.length) {
      drawCurveGrid(ctx, canvas, state.generatedGridRows);
    } else if (state.gridRows.length) {
      drawCurveGrid(ctx, canvas, state.gridRows);
    } else if (preset.kind === "nab" && state.scoreRows.length) {
      drawNabSeries(ctx, canvas, state.scoreRows);
    } else if (preset.kind === "seeds" && state.scoreRows.length) {
      drawSeedsSamples(ctx, canvas, state.scoreRows);
    } else {
      drawEmptyMessage(ctx, canvas, "Load score/grid CSV to preview the application response.");
      $("appModelPlotStatus").textContent = "No application model plotted yet.";
      $("appModelPlotLegend").innerHTML = "";
    }
  }

  function drawCurveGrid(ctx, canvas, rows) {
    const columns = Object.keys(rows[0] || {});
    const xColumn = firstExisting(columns, ["VG", "VG_mapped", "VG_class_1", "lda_z"]);
    const yColumns = selectCurveColumns(columns, xColumn).slice(0, 8);
    const series = yColumns.map((column, index) => ({
      name: column,
      color: COLORS[index % COLORS.length],
      points: rows.map(row => [numberValue(row[xColumn]), numberValue(row[column])])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    })).filter(item => item.points.length);
    if (!series.length) {
      drawEmptyMessage(ctx, canvas, "No plottable curve columns found.");
      return;
    }
    const allX = series.flatMap(item => item.points.map(point => point[0]));
    const allY = series.flatMap(item => item.points.map(point => point[1]));
    const scale = plotScale(canvas, minMax(allX), minMax(allY));
    drawAxes(ctx, canvas, scale, xColumn, "score");
    series.forEach(item => drawLine(ctx, item.points, scale, item.color, 2));
    drawTargetOverlays(ctx, scale, series);
    drawFitOverlays(ctx, scale, series);
    $("appModelPlotStatus").textContent = `Grid plot: ${rows.length} X points, ${series.length} curve(s).`;
    renderLegend(series);
  }

  function drawTargetOverlays(ctx, scale, series) {
    if (!state.targetRows.length) return;
    state.targetRows.forEach((targetRow, index) => {
      const curveName = targetRow.basis || targetRow.curve || targetRow.group || "";
      const matching = series.find(item => item.name === curveName);
      if (!matching || matching.points.length < 2) return;
      const A = numberValue(targetRow.target_A_amp_norm || targetRow.A_amp);
      const mu = numberValue(targetRow.target_mu_V || targetRow.mu);
      const sigma = numberValue(targetRow.target_sigma_V || targetRow.sigma);
      const baseline = numberValue(targetRow.target_baseline_norm || targetRow.baseline);
      if (![A, mu, sigma, baseline].every(Number.isFinite)) return;
      const xs = matching.points.map(point => point[0]);
      const [xMin, xMax] = minMax(xs);
      const points = [];
      for (let i = 0; i < 180; i += 1) {
        const x = xMin + (xMax - xMin) * i / 179;
        points.push([x, gaussianValue(x, A, mu, sigma, baseline)]);
      }
      drawLine(ctx, points, scale, COLORS[index % COLORS.length], 1.4, [2, 5]);
    });
  }

  function drawFitOverlays(ctx, scale, series) {
    if (!state.fitRows.length) return;
    state.fitRows.forEach((fitRow, index) => {
      const matching = series.find(item => item.name === fitRow.curve);
      if (!matching || matching.points.length < 2) return;
      const xs = matching.points.map(point => point[0]);
      const [xMin, xMax] = minMax(xs);
      const points = [];
      for (let i = 0; i < 180; i += 1) {
        const x = xMin + (xMax - xMin) * i / 179;
        const y = gaussianValue(x, fitRow.A_amp, fitRow.mu, fitRow.sigma, fitRow.baseline);
        points.push([x, y]);
      }
      drawLine(ctx, points, scale, COLORS[index % COLORS.length], 1.2, [6, 5]);
    });
  }

  function drawNabSeries(ctx, canvas, rows) {
    const points = rows.map((row, index) => {
      let score = numberValue(row.anomaly_score_1_minus_normality);
      if (!Number.isFinite(score)) {
        const normality = numberValue(row.measured_kernel_normality_score);
        if (Number.isFinite(normality)) score = 1 - normality;
      }
      return [index, score, numberValue(row.is_anomaly_window) > 0];
    }).filter(point => Number.isFinite(point[1]));
    if (!points.length) {
      drawEmptyMessage(ctx, canvas, "No anomaly score column found.");
      return;
    }
    const scale = plotScale(canvas, minMax(points.map(point => point[0])), minMax(points.map(point => point[1])));
    drawAxes(ctx, canvas, scale, "sample index", "anomaly score");
    ctx.save();
    ctx.fillStyle = "rgba(209, 73, 91, 0.12)";
    points.forEach(point => {
      if (!point[2]) return;
      const x = scale.x(point[0]);
      ctx.fillRect(x - 1, scale.top, 2, scale.height);
    });
    ctx.restore();
    drawLine(ctx, points.map(point => [point[0], point[1]]), scale, COLORS[0], 1.8);
    $("appModelPlotStatus").textContent = `NAB score trace: ${points.length} samples. Red bands mark anomaly-window samples.`;
    renderLegend([{ name: "anomaly score", color: COLORS[0] }, { name: "anomaly window", color: "#d1495b" }]);
  }

  function drawSeedsSamples(ctx, canvas, rows) {
    const classIds = findClassIds(rows[0] || {});
    const series = classIds.map((classId, index) => ({
      name: `class ${classId} score`,
      color: COLORS[index % COLORS.length],
      points: rows.map((row, rowIndex) => [rowIndex, numberValue(row[scoreColumnName(classId, row)])])
        .filter(([, y]) => Number.isFinite(y))
    })).filter(item => item.points.length);
    if (!series.length) {
      drawEmptyMessage(ctx, canvas, "No measured_score_class_* columns found.");
      return;
    }
    const allX = series.flatMap(item => item.points.map(point => point[0]));
    const allY = series.flatMap(item => item.points.map(point => point[1]));
    const scale = plotScale(canvas, minMax(allX), minMax(allY));
    drawAxes(ctx, canvas, scale, "sample index", "class score");
    series.forEach(item => drawLine(ctx, item.points, scale, item.color, 1.6));
    $("appModelPlotStatus").textContent = `Seeds sample score plot: ${rows.length} samples, ${series.length} class score(s).`;
    renderLegend(series);
  }

  function prepareCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(640, Math.floor(rect.width || canvas.clientWidth || 900));
    const height = Math.max(300, Number(canvas.getAttribute("height")) || 360);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvas._plotWidth = width;
    canvas._plotHeight = height;
    return ctx;
  }

  function clearCanvas(ctx, canvas) {
    ctx.clearRect(0, 0, canvas._plotWidth, canvas._plotHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas._plotWidth, canvas._plotHeight);
  }

  function drawEmptyMessage(ctx, canvas, message) {
    ctx.fillStyle = "#66737a";
    ctx.font = "13px Segoe UI, Arial, sans-serif";
    ctx.fillText(message, 24, 40);
  }

  function plotScale(canvas, xRange, yRange) {
    const width = canvas._plotWidth;
    const height = canvas._plotHeight;
    const left = 58;
    const right = 18;
    const top = 18;
    const bottom = 44;
    const expand = (range, padRatio) => {
      let [minValue, maxValue] = range;
      if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return [0, 1];
      if (minValue === maxValue) {
        const pad = Math.abs(minValue) * 0.1 + 1;
        return [minValue - pad, maxValue + pad];
      }
      const pad = (maxValue - minValue) * padRatio;
      return [minValue - pad, maxValue + pad];
    };
    const [xMin, xMax] = expand(xRange, 0.03);
    const [yMin, yMax] = expand(yRange, 0.08);
    return {
      left, right, top, bottom,
      width: width - left - right,
      height: height - top - bottom,
      xMin, xMax, yMin, yMax,
      x: value => left + (value - xMin) / (xMax - xMin) * (width - left - right),
      y: value => top + (yMax - value) / (yMax - yMin) * (height - top - bottom)
    };
  }

  function drawAxes(ctx, canvas, scale, xLabel, yLabel) {
    const width = canvas._plotWidth;
    const height = canvas._plotHeight;
    ctx.save();
    ctx.strokeStyle = "#d9e4e2";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#66737a";
    ctx.font = "11px Segoe UI, Arial, sans-serif";
    for (let i = 0; i <= 5; i += 1) {
      const gx = scale.left + scale.width * i / 5;
      const value = scale.xMin + (scale.xMax - scale.xMin) * i / 5;
      ctx.beginPath();
      ctx.moveTo(gx, scale.top);
      ctx.lineTo(gx, scale.top + scale.height);
      ctx.stroke();
      ctx.fillText(formatNumber(value, 2), gx - 16, height - 22);
    }
    for (let i = 0; i <= 4; i += 1) {
      const gy = scale.top + scale.height * i / 4;
      const value = scale.yMax - (scale.yMax - scale.yMin) * i / 4;
      ctx.beginPath();
      ctx.moveTo(scale.left, gy);
      ctx.lineTo(width - scale.right, gy);
      ctx.stroke();
      ctx.fillText(formatNumber(value, 2), 8, gy + 4);
    }
    ctx.strokeStyle = "#17323a";
    ctx.beginPath();
    ctx.moveTo(scale.left, scale.top);
    ctx.lineTo(scale.left, scale.top + scale.height);
    ctx.lineTo(width - scale.right, scale.top + scale.height);
    ctx.stroke();
    ctx.fillText(xLabel, scale.left + scale.width / 2 - 28, height - 6);
    ctx.save();
    ctx.translate(14, scale.top + scale.height / 2 + 28);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  function drawLine(ctx, points, scale, color, lineWidth = 2, dash = []) {
    if (!points.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = scale.x(point[0]);
      const y = scale.y(point[1]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function renderLegend(series) {
    const legend = $("appModelPlotLegend");
    if (!legend) return;
    legend.innerHTML = series.map(item => (
      `<span><i style="background:${item.color}"></i>${escapeHtml(item.name)}</span>`
    )).join("");
  }

  function fitGaussian(xs, ys) {
    const n = xs.length;
    if (n < 4) return emptyFit(n);
    const xRange = minMax(xs);
    const yRange = minMax(ys);
    let baseline = percentile(ys, 0.1);
    let peak = yRange[1];
    let A = peak - baseline;
    if (Math.abs(A) < 1e-12) A = 1e-6;
    let mu = xs[ys.indexOf(peak)] ?? mean(xs);
    let sigma = weightedSigma(xs, ys.map(y => Math.max(0, y - baseline)), mu);
    if (!Number.isFinite(sigma) || sigma <= 0) sigma = Math.max((xRange[1] - xRange[0]) / 6, 1e-3);

    let params = { A, mu, sigma: Math.abs(sigma), baseline };
    let best = gaussianSse(xs, ys, params);
    let steps = {
      A: Math.abs(params.A) * 0.25 + 0.01,
      mu: Math.max((xRange[1] - xRange[0]) * 0.08, 0.01),
      sigma: Math.max(params.sigma * 0.25, 0.01),
      baseline: Math.abs(params.A) * 0.15 + 0.01
    };
    for (let iter = 0; iter < 240; iter += 1) {
      let improved = false;
      ["A", "mu", "sigma", "baseline"].forEach(key => {
        [-1, 1].forEach(direction => {
          const candidate = { ...params };
          candidate[key] += direction * steps[key];
          if (key === "sigma") candidate[key] = Math.max(Math.abs(candidate[key]), 1e-6);
          const sse = gaussianSse(xs, ys, candidate);
          if (sse < best) {
            best = sse;
            params = candidate;
            improved = true;
          }
        });
      });
      if (!improved) {
        Object.keys(steps).forEach(key => { steps[key] *= 0.72; });
        if (Math.max(...Object.values(steps)) < 1e-7) break;
      }
    }
    const yMean = mean(ys);
    const sst = ys.reduce((acc, y) => acc + (y - yMean) ** 2, 0);
    const r2 = sst > 0 ? 1 - best / sst : 1;
    return {
      A: params.A,
      mu: params.mu,
      sigma: Math.abs(params.sigma),
      baseline: params.baseline,
      r2,
      rmse: Math.sqrt(best / n),
      n
    };
  }

  function emptyFit(n) {
    return { A: NaN, mu: NaN, sigma: NaN, baseline: NaN, r2: NaN, rmse: NaN, n };
  }

  function gaussianSse(xs, ys, params) {
    return xs.reduce((acc, x, index) => {
      const yFit = gaussianValue(x, params.A, params.mu, params.sigma, params.baseline);
      return acc + (ys[index] - yFit) ** 2;
    }, 0);
  }

  function gaussianValue(x, A, mu, sigma, baseline) {
    const safeSigma = Math.max(Math.abs(sigma), 1e-9);
    return baseline + A * Math.exp(-0.5 * ((x - mu) / safeSigma) ** 2);
  }

  function weightedSigma(xs, weights, mu) {
    const wSum = sum(weights);
    if (wSum <= 0) return NaN;
    const variance = xs.reduce((acc, x, index) => acc + weights[index] * (x - mu) ** 2, 0) / wSum;
    return Math.sqrt(Math.max(variance, 0));
  }

  function rocAuc(labels, scores) {
    const pairs = labels.map((label, index) => ({ label, score: scores[index] }))
      .filter(item => Number.isFinite(item.score));
    const positives = pairs.filter(item => item.label === 1).length;
    const negatives = pairs.length - positives;
    if (!positives || !negatives) return NaN;
    pairs.sort((a, b) => a.score - b.score);
    let rankSum = 0;
    let rank = 1;
    for (let i = 0; i < pairs.length;) {
      let j = i + 1;
      while (j < pairs.length && pairs[j].score === pairs[i].score) j += 1;
      const avgRank = (rank + rank + (j - i) - 1) / 2;
      for (let k = i; k < j; k += 1) {
        if (pairs[k].label === 1) rankSum += avgRank;
      }
      rank += j - i;
      i = j;
    }
    return (rankSum - positives * (positives + 1) / 2) / (positives * negatives);
  }

  function bestThreshold(labels, scores) {
    const unique = Array.from(new Set(scores.filter(Number.isFinite))).sort((a, b) => a - b);
    if (!unique.length) return { threshold: NaN, f1: NaN, balancedAccuracy: NaN, tp: 0, fp: 0, tn: 0, fn: 0 };
    const stride = Math.max(1, Math.floor(unique.length / 512));
    const candidates = unique.filter((_, index) => index % stride === 0);
    candidates.push(unique[unique.length - 1] + 1e-12);
    let best = null;
    candidates.forEach(threshold => {
      let tp = 0;
      let fp = 0;
      let tn = 0;
      let fn = 0;
      scores.forEach((score, index) => {
        const pred = score >= threshold ? 1 : 0;
        const truth = labels[index] ? 1 : 0;
        if (pred && truth) tp += 1;
        else if (pred && !truth) fp += 1;
        else if (!pred && truth) fn += 1;
        else tn += 1;
      });
      const precision = tp + fp ? tp / (tp + fp) : 0;
      const recall = tp + fn ? tp / (tp + fn) : 0;
      const specificity = tn + fp ? tn / (tn + fp) : 0;
      const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
      const balancedAccuracy = (recall + specificity) / 2;
      const candidate = { threshold, f1, balancedAccuracy, tp, fp, tn, fn };
      if (!best || candidate.f1 > best.f1 || (candidate.f1 === best.f1 && candidate.balancedAccuracy > best.balancedAccuracy)) {
        best = candidate;
      }
    });
    return best;
  }

  function classificationMetrics(rows, classIds) {
    const n = classIds.length;
    const indexByClass = new Map(classIds.map((classId, index) => [classId, index]));
    const matrix = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
    let correct = 0;
    rows.forEach(row => {
      const i = indexByClass.get(row.truth);
      const j = indexByClass.get(row.predicted);
      if (i === undefined || j === undefined) return;
      matrix[i][j] += 1;
      if (row.truth === row.predicted) correct += 1;
    });
    const total = matrix.flat().reduce((acc, value) => acc + value, 0);
    const recall = matrix.map((line, i) => {
      const denom = line.reduce((acc, value) => acc + value, 0);
      return denom ? matrix[i][i] / denom : NaN;
    });
    const precision = matrix.map((_, j) => {
      const denom = matrix.reduce((acc, line) => acc + line[j], 0);
      return denom ? matrix[j][j] / denom : NaN;
    });
    return { accuracy: total ? correct / total : NaN, matrix, recall, precision };
  }

  function downloadReport() {
    const rows = [];
    state.fitRows.forEach(row => {
      rows.push({
        section: "curve_fit",
        name: row.curve,
        value: "",
        scope: "",
        A_amp: row.A_amp,
        mu: row.mu,
        sigma: row.sigma,
        baseline: row.baseline,
        r2: row.r2,
        rmse: row.rmse,
        n: row.n
      });
    });
    state.validationRows.forEach(row => {
      rows.push({
        section: "validation",
        name: row.metric,
        value: row.value,
        scope: row.scope,
        A_amp: "",
        mu: "",
        sigma: "",
        baseline: "",
        r2: "",
        rmse: "",
        n: ""
      });
    });
    state.targetRows.forEach(row => {
      rows.push({
        section: "fit_target",
        name: row.basis || row.curve || row.group || "",
        value: row.devices || row.device_codes || "",
        scope: row.target_note || "VG-axis Gaussian target for curve programming",
        A_amp: row.target_A_amp_norm || row.A_amp || "",
        mu: row.target_mu_V || row.mu || "",
        sigma: row.target_sigma_V || row.sigma || "",
        baseline: row.target_baseline_norm || row.baseline || "",
        r2: row.fit_r2 || row.r2 || "",
        rmse: row.fit_rmse || row.rmse || "",
        n: row.n_points || row.n || ""
      });
    });
    if (!rows.length) return;
    const csv = toCsv(rows);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(`application_model_report_${state.preset}_${stamp}.csv`, csv);
  }

  function toCsv(rows) {
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row || {}))));
    const lines = [headers.join(",")];
    rows.forEach(row => {
      lines.push(headers.map(header => csvCell(row[header])).join(","));
    });
    return lines.join("\n");
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function findClassIds(row) {
    const columns = Object.keys(row || {});
    const ids = new Set();
    columns.forEach(column => {
      const match = column.match(/^(?:measured_score|target_score|target)_class_(\d+)$/);
      if (match) ids.add(Number(match[1]));
    });
    return Array.from(ids).sort((a, b) => a - b);
  }

  function scoreColumnName(classId, row = {}) {
    const source = $("appModelScoreSource") ? $("appModelScoreSource").value : "measured";
    if (source === "target" && Object.prototype.hasOwnProperty.call(row, `target_score_class_${classId}`)) {
      return `target_score_class_${classId}`;
    }
    if (source === "target" && Object.prototype.hasOwnProperty.call(row, `target_class_${classId}`)) {
      return `target_class_${classId}`;
    }
    return `measured_score_class_${classId}`;
  }

  function metricRow(metric, value, scope) {
    return { metric, value, scope };
  }

  function numberValue(value) {
    if (value === null || value === undefined || value === "") return NaN;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function formatNumber(value, digits = 4) {
    const n = numberValue(value);
    if (!Number.isFinite(n)) return "";
    const abs = Math.abs(n);
    if (abs !== 0 && (abs < 1e-3 || abs >= 1e4)) return n.toExponential(3);
    return n.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  }

  function formatValue(value) {
    const n = numberValue(value);
    if (Number.isFinite(n) && String(value).trim() !== "") return formatNumber(n, 4);
    return value === undefined || value === null ? "" : String(value);
  }

  function firstExisting(columns, candidates) {
    return candidates.find(column => columns.includes(column)) || "";
  }

  function minMax(values) {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) return [0, 1];
    return [Math.min(...finite), Math.max(...finite)];
  }

  function mean(values) {
    return values.length ? sum(values) / values.length : NaN;
  }

  function sum(values) {
    return values.reduce((acc, value) => acc + value, 0);
  }

  function percentile(values, p) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return NaN;
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
    return sorted[index];
  }

  function matrixToText(matrix) {
    return `[${matrix.map(row => `[${row.join(", ")}]`).join(", ")}]`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(message, isError = false) {
    const status = $("appModelStatus");
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "var(--warn)" : "var(--muted)";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
