(() => {
  "use strict";

  const EXPECTED_LENGTH = 152;
  const state = {
    records: [],
    activeIndex: 0,
    result: null,
    fileNotes: [],
  };

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const visible = () => $("tab-wafer")?.classList.contains("active");

  function stableUnit(index, salt = 0) {
    const value = Math.sin((index + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function selectedRecord() {
    return state.records[state.activeIndex] || null;
  }

  function normalized(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max) || Math.abs(max - min) < 1e-12) {
      return values.map(() => 0.5);
    }
    return values.map((value) => clamp((value - min) / (max - min), 0, 1));
  }

  function tokenize(line) {
    if (line.includes("\t")) return line.split("\t").map((value) => value.trim());
    if (line.includes(",")) return line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    return line.trim().split(/\s+/);
  }

  function looksLikeHeader(tokens) {
    return tokens.slice(1).some((value) => !Number.isFinite(Number(value)));
  }

  function splitForFileName(name) {
    if (/train/i.test(name)) return "train";
    if (/test/i.test(name)) return "test";
    return "unspecified";
  }

  function parseUcrWafer(text, sourceName) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const source = sourceName || "uploaded file";
    if (!lines.length) return { records: [], note: `${source}: empty file.` };

    const first = tokenize(lines[0]);
    const start = looksLikeHeader(first) ? 1 : 0;
    const records = [];
    let rejected = 0;
    for (let rowIndex = start; rowIndex < lines.length; rowIndex += 1) {
      const tokens = tokenize(lines[rowIndex]);
      if (tokens.length < 2) {
        rejected += 1;
        continue;
      }
      const values = tokens.slice(1).map(Number);
      if (values.length !== EXPECTED_LENGTH || values.some((value) => !Number.isFinite(value))) {
        rejected += 1;
        continue;
      }
      records.push({
        label: tokens[0],
        values,
        source,
        split: splitForFileName(source),
        row: rowIndex + 1,
      });
    }
    const note = `${source}: ${records.length} compatible row(s), ${rejected} rejected; expected label + ${EXPECTED_LENGTH} numeric values.`;
    return { records, note };
  }

  function controlConfig(overrides = {}) {
    return {
      encoding: $("waferEncoding").value,
      mode: $("waferNeuronMode").value,
      encoderThreshold: Number($("waferEncoderThreshold").value),
      baseThreshold: Number($("waferBaseThreshold").value),
      noise: Number($("waferNoise").value) / 100,
      jitter: Number($("waferJitter").value),
      variation: Number($("waferVariation").value) / 100,
      ltmFeedback: $("waferLtmFeedback").checked,
      ...overrides,
    };
  }

  function encode(values, config) {
    const spikes = new Array(values.length).fill(0);
    let accumulator = 0;
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (config.encoding === "rate") {
        accumulator += value * (0.75 + config.encoderThreshold);
        if (accumulator >= 1) {
          spikes[index] = 1;
          accumulator -= 1;
        }
      } else if (config.encoding === "threshold") {
        const previous = index ? values[index - 1] : 0;
        spikes[index] = value >= config.encoderThreshold && previous < config.encoderThreshold ? 1 : 0;
      } else {
        const previous = index ? values[index - 1] : values[index];
        spikes[index] = Math.abs(value - previous) >= config.encoderThreshold ? 1 : 0;
      }
    }
    if (!config.jitter) return spikes;
    const jittered = new Array(values.length).fill(0);
    spikes.forEach((spike, index) => {
      if (!spike) return;
      const width = config.jitter * 2 + 1;
      const offset = Math.floor(stableUnit(index, 2) * width) - config.jitter;
      jittered[clamp(index + offset, 0, values.length - 1)] = 1;
    });
    return jittered;
  }

  function simulate(record, config) {
    const clean = normalized(record.values);
    const input = clean.map((value, index) => clamp(value + (stableUnit(index, 3) * 2 - 1) * config.noise, 0, 1));
    const inputSpikes = encode(input, config);
    const length = input.length;
    const membrane = new Array(length).fill(0);
    const stm = new Array(length).fill(0);
    const ltm = new Array(length).fill(0);
    const threshold = new Array(length).fill(config.baseThreshold);
    const outputSpikes = new Array(length).fill(0);
    const anomalySignal = new Array(length).fill(0);
    const gain = 0.88 * (1 + (stableUnit(0, 7) * 2 - 1) * config.variation);
    const leak = 0.78;
    const reset = 0.62;
    const stmRetention = 0.62;
    const ltmRetention = 0.985;
    const etaSpike = 0.19;
    const etaError = 0.045;
    const alpha = 0.44;
    let voltage = 0;
    let stmState = 0;
    let ltmState = 0;
    let previousOutput = 0;

    for (let index = 0; index < length; index += 1) {
      const localDelta = Math.abs(input[index] - (index ? input[index - 1] : input[index]));
      anomalySignal[index] = clamp(Math.abs(input[index] - 0.5) * 0.55 + localDelta * 0.9, 0, 1);
      const adaptive = config.mode === "adaptive";
      threshold[index] = config.baseThreshold + (adaptive && config.ltmFeedback ? alpha * ltmState : 0);
      voltage = leak * voltage + gain * inputSpikes[index] - reset * previousOutput;
      stmState = stmRetention * stmState + inputSpikes[index];
      const output = voltage >= threshold[index] ? 1 : 0;
      if (adaptive) {
        ltmState = ltmRetention * ltmState + etaSpike * output + etaError * anomalySignal[index];
      } else {
        ltmState = 0;
      }
      membrane[index] = voltage;
      stm[index] = stmState;
      ltm[index] = ltmState;
      outputSpikes[index] = output;
      previousOutput = output;
    }

    const count = sum(outputSpikes);
    const firstIndex = outputSpikes.findIndex(Boolean);
    const earlyLength = Math.max(1, Math.ceil(length * 0.25));
    const early = sum(outputSpikes.slice(0, earlyLength));
    const thresholdExcess = membrane.reduce((total, value, index) => total + Math.max(0, value - threshold[index]), 0) / length;
    const score = clamp(
      0.5 * Math.min(1, (count / length) / 0.12)
      + 0.3 * Math.min(1, early / 3)
      + 0.2 * Math.min(1, thresholdExcess / 0.25),
      0,
      1,
    );
    return {
      input,
      inputSpikes,
      membrane,
      stm,
      ltm,
      threshold,
      outputSpikes,
      anomalySignal,
      count,
      firstIndex,
      thresholdExcess,
      score,
      finalThreshold: threshold[length - 1],
      config,
    };
  }

  function clearCanvas(canvas, subtitle) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#425765";
    ctx.font = "700 14px Malgun Gothic, Segoe UI, sans-serif";
    ctx.fillText("Actual UCR Wafer file required", 24, 36);
    ctx.font = "12px Malgun Gothic, Segoe UI, sans-serif";
    ctx.fillText(subtitle, 24, 61);
  }

  function grid(ctx, plot, rows = 4, cols = 6) {
    ctx.strokeStyle = "#e2ebf0";
    ctx.lineWidth = 1;
    for (let row = 0; row <= rows; row += 1) {
      const y = plot.top + ((plot.bottom - plot.top) * row) / rows;
      ctx.beginPath();
      ctx.moveTo(plot.left, y);
      ctx.lineTo(plot.right, y);
      ctx.stroke();
    }
    for (let col = 0; col <= cols; col += 1) {
      const x = plot.left + ((plot.right - plot.left) * col) / cols;
      ctx.beginPath();
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.bottom);
      ctx.stroke();
    }
  }

  function line(ctx, values, plot, min, max, color, width = 2) {
    const span = Math.max(1e-9, max - min);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = plot.left + ((plot.right - plot.left) * index) / Math.max(1, values.length - 1);
      const y = plot.bottom - ((value - min) / span) * (plot.bottom - plot.top);
      if (!index) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function label(ctx, text, x, y, color = "#425765") {
    ctx.fillStyle = color;
    ctx.font = "700 11px Malgun Gothic, Segoe UI, sans-serif";
    ctx.fillText(text, x, y);
  }

  function drawSpikes(ctx, spikes, plot, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    spikes.forEach((spike, index) => {
      if (!spike) return;
      const x = plot.left + ((plot.right - plot.left) * index) / Math.max(1, spikes.length - 1);
      ctx.beginPath();
      ctx.moveTo(x, plot.top + 2);
      ctx.lineTo(x, plot.bottom - 2);
      ctx.stroke();
    });
  }

  function drawInput() {
    const canvas = $("waferInputCanvas");
    const record = selectedRecord();
    if (!record || !state.result) {
      clearCanvas(canvas, "Upload Wafer_TRAIN.tsv and/or Wafer_TEST.tsv (label + 152 values per row)." );
      return;
    }
    const { ctx, width, height } = { ctx: canvas.getContext("2d"), width: canvas.width, height: canvas.height };
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, width, height);
    const wave = { left: 54, right: width - 20, top: 48, bottom: 205 };
    const spikes = { left: 54, right: width - 20, top: 247, bottom: height - 38 };
    label(ctx, "Normalized uploaded sensor waveform x[t]", 18, 25, "#203645");
    grid(ctx, wave);
    line(ctx, state.result.input, wave, 0, 1, "#0b61b5", 2.3);
    label(ctx, "1.0", 20, wave.top + 5);
    label(ctx, "0.0", 20, wave.bottom);
    label(ctx, `Encoded input spikes (${state.result.config.encoding})`, 18, 227, "#203645");
    grid(ctx, spikes, 1, 6);
    drawSpikes(ctx, state.result.inputSpikes, spikes, "#0f9d91");
    label(ctx, "sample 0", wave.left, height - 12);
    label(ctx, `sample ${record.values.length - 1}`, width - 92, height - 12);
    $("waferInputPlotLabel").textContent = `${record.source} · row ${record.row} · raw label ${record.label}`;
  }

  function drawState() {
    const canvas = $("waferStateCanvas");
    const record = selectedRecord();
    if (!record || !state.result) {
      clearCanvas(canvas, "No fixture is used. The plots are reserved for an uploaded real Wafer record.");
      return;
    }
    const result = state.result;
    const { ctx, width, height } = { ctx: canvas.getContext("2d"), width: canvas.width, height: canvas.height };
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, width, height);
    const rows = [
      { top: 48, bottom: 222, title: "Membrane V[t] and threshold theta[t]", values: result.membrane, compare: result.threshold, color: "#7b2ff2", compareColor: "#c34c3c" },
      { top: 272, bottom: 382, title: "STM state", values: result.stm, color: "#0f9d91" },
      { top: 432, bottom: 522, title: "LTM state m[t]", values: result.ltm, color: "#0b61b5" },
      { top: 560, bottom: height - 34, title: "Output spikes s_out[t]", spikes: result.outputSpikes, color: "#d98612" },
    ];
    rows.forEach((row) => {
      const plot = { left: 54, right: width - 20, top: row.top, bottom: row.bottom };
      label(ctx, row.title, 18, row.top - 12, "#203645");
      grid(ctx, plot, row.spikes ? 1 : 3, 6);
      if (row.spikes) {
        drawSpikes(ctx, row.spikes, plot, row.color);
        return;
      }
      const maximum = Math.max(1e-6, ...row.values, ...(row.compare || []));
      line(ctx, row.values, plot, 0, maximum * 1.05, row.color, 2.1);
      if (row.compare) line(ctx, row.compare, plot, 0, maximum * 1.05, row.compareColor, 1.7);
    });
    label(ctx, "purple: V[t]   red: theta[t]", width - 215, 37, "#627381");
    label(ctx, "sample 0", 54, height - 12);
    label(ctx, `sample ${record.values.length - 1}`, width - 92, height - 12);
    $("waferStatePlotLabel").textContent = `${result.config.mode} · LTM Vth feedback ${result.config.ltmFeedback ? "on" : "off"}`;
  }

  function updateOutputs() {
    $("waferEncoderThresholdOut").textContent = Number($("waferEncoderThreshold").value).toFixed(2);
    $("waferBaseThresholdOut").textContent = Number($("waferBaseThreshold").value).toFixed(2);
    $("waferNoiseOut").textContent = `${$("waferNoise").value}%`;
    $("waferJitterOut").textContent = `${$("waferJitter").value} steps`;
    $("waferVariationOut").textContent = `${$("waferVariation").value}%`;
  }

  function mappedLabel(record) {
    const anomalyLabel = $("waferAnomalyLabel").value;
    if (!anomalyLabel) return "unmapped";
    return record.label === anomalyLabel ? "selected anomaly label" : "other selected class";
  }

  function updateResultSummary() {
    const record = selectedRecord();
    const result = state.result;
    if (!record || !result) return;
    $("waferOutputSpikes").textContent = `${result.count}`;
    $("waferFirstSpike").textContent = result.firstIndex < 0 ? "none" : `sample ${result.firstIndex}`;
    $("waferThresholdExcess").textContent = result.thresholdExcess.toFixed(3);
    $("waferAnomalyScore").textContent = `${result.score.toFixed(3)} / 1`;
    $("waferUploadedLabel").textContent = `${record.label} (${mappedLabel(record)})`;
    $("waferInterpretation").textContent = result.score >= 0.6
      ? "higher temporal-spike activity; screening only"
      : "lower temporal-spike activity; screening only";
    $("waferReadoutStatus").textContent = "compact readout";
    $("waferModelStatus").textContent = `${result.config.mode} / ${result.config.encoding}`;
  }

  function updateRecordSummary() {
    const record = selectedRecord();
    const hasRecords = Boolean(record);
    $("waferSampleIndex").disabled = !hasRecords;
    $("waferAnomalyLabel").disabled = !hasRecords;
    $("waferPrevBtn").disabled = !hasRecords || state.activeIndex === 0;
    $("waferNextBtn").disabled = !hasRecords || state.activeIndex >= state.records.length - 1;
    if (!record) {
      $("waferSampleSummary").textContent = "upload required";
      $("waferShapeSummary").textContent = "-";
      $("waferClassSummary").textContent = "-";
      return;
    }
    $("waferSampleIndex").max = String(state.records.length);
    $("waferSampleIndex").value = String(state.activeIndex + 1);
    $("waferSampleSummary").textContent = `${state.activeIndex + 1}/${state.records.length} · ${record.split} · ${record.source} row ${record.row} · label ${record.label}`;
    $("waferShapeSummary").textContent = `${state.records.length} record(s) × ${record.values.length} samples`;
    const counts = new Map();
    state.records.forEach((item) => counts.set(item.label, (counts.get(item.label) || 0) + 1));
    $("waferClassSummary").textContent = [...counts.entries()].map(([name, count]) => `${name}: ${count}`).join(" / ");
  }

  function populateAnomalyLabels() {
    const select = $("waferAnomalyLabel");
    const prior = select.value;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Map manually";
    select.append(placeholder);
    [...new Set(state.records.map((record) => record.label))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .forEach((labelValue) => {
        const option = document.createElement("option");
        option.value = labelValue;
        option.textContent = `Treat label ${labelValue} as anomaly`;
        select.append(option);
      });
    if ([...select.options].some((option) => option.value === prior)) select.value = prior;
  }

  function runCurrent() {
    const record = selectedRecord();
    if (!record) {
      state.result = null;
      drawInput();
      drawState();
      return;
    }
    state.result = simulate(record, controlConfig());
    updateRecordSummary();
    updateResultSummary();
    drawInput();
    drawState();
  }

  function ablationRow(tbody, name, result) {
    const row = document.createElement("tr");
    [
      name,
      String(result.count),
      result.firstIndex < 0 ? "none" : `sample ${result.firstIndex}`,
      result.score.toFixed(3),
      result.finalThreshold.toFixed(3),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    tbody.append(row);
  }

  function runAblation() {
    const record = selectedRecord();
    const tbody = $("waferAblationBody");
    tbody.replaceChildren();
    if (!record) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "Upload an actual Wafer TSV/CSV and run the simulation.";
      row.append(cell);
      tbody.append(row);
      return;
    }
    const base = controlConfig();
    [
      ["Fixed threshold LIF", { mode: "fixed", ltmFeedback: false }],
      ["STM-only LIF", { mode: "stm", ltmFeedback: false }],
      ["LTM adaptive Vth", { mode: "adaptive", ltmFeedback: true }],
      ["LTM state, feedback off", { mode: "adaptive", ltmFeedback: false }],
    ].forEach(([name, overrides]) => ablationRow(tbody, name, simulate(record, { ...base, ...overrides })));
  }

  async function loadFiles(files) {
    const parsed = await Promise.all([...files].map(async (file) => parseUcrWafer(await file.text(), file.name)));
    state.records = parsed.flatMap((item) => item.records);
    state.fileNotes = parsed.map((item) => item.note);
    state.activeIndex = 0;
    state.result = null;
    populateAnomalyLabels();
    updateRecordSummary();
    $("waferDataStatus").textContent = state.records.length ? `${state.records.length} record(s) loaded` : "no compatible rows";
    $("waferDataStatus").title = state.fileNotes.join("\n");
    runCurrent();
    runAblation();
  }

  function moveSample(delta) {
    if (!state.records.length) return;
    state.activeIndex = clamp(state.activeIndex + delta, 0, state.records.length - 1);
    runCurrent();
  }

  function wireEvents() {
    $("waferFileInput").addEventListener("change", async (event) => {
      const files = event.target.files;
      if (files?.length) await loadFiles(files);
      event.target.value = "";
    });
    $("waferSampleIndex").addEventListener("change", () => {
      state.activeIndex = clamp((Number($("waferSampleIndex").value) || 1) - 1, 0, Math.max(0, state.records.length - 1));
      runCurrent();
    });
    $("waferAnomalyLabel").addEventListener("change", updateResultSummary);
    $("waferPrevBtn").addEventListener("click", () => moveSample(-1));
    $("waferNextBtn").addEventListener("click", () => moveSample(1));
    $("runWaferSnnBtn").addEventListener("click", runCurrent);
    $("runWaferAblationBtn").addEventListener("click", runAblation);
    document.querySelectorAll("[data-wafer-control=\"true\"]").forEach((control) => {
      if (control.type === "file") return;
      control.addEventListener("input", () => {
        updateOutputs();
        runCurrent();
      });
      control.addEventListener("change", () => {
        updateOutputs();
        runCurrent();
      });
    });
    document.querySelector('[data-tab="wafer"]').addEventListener("click", () => setTimeout(() => {
      if (state.records.length) runCurrent();
      else {
        drawInput();
        drawState();
      }
    }, 0));
    window.addEventListener("resize", () => {
      if (visible()) {
        drawInput();
        drawState();
      }
    });
  }

  function init() {
    updateOutputs();
    updateRecordSummary();
    wireEvents();
    drawInput();
    drawState();
  }

  window.WAFER_SNN = { parseUcrWafer, simulate, expectedLength: EXPECTED_LENGTH };
  init();
})();
