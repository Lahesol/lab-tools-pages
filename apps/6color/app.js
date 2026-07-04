const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

const channels = [
  { id: "R", label: "Red", color: "#d73535" },
  { id: "G", label: "Green", color: "#2fa95f" },
  { id: "B", label: "Blue", color: "#3377d6" },
  { id: "IR", label: "IR", color: "#7a2b2b" },
  { id: "UV", label: "UV", color: "#7345c7" },
  { id: "DR", label: "Deep Red", color: "#9f1425" },
];

const state = new Map(
  channels.map((channel) => [
    channel.id,
    { on: false, pwm: true, duty: 1000, pulse: false, pulseOnUs: 100000, pulseOffUs: 100000 },
  ]),
);

let timelineRowId = 1;
const timelineRows = [
  { id: timelineRowId++, timeMs: 0, color: "R", brightness: 0 },
  { id: timelineRowId++, timeMs: 100, color: "R", brightness: 1000 },
  { id: timelineRowId++, timeMs: 500, color: "R", brightness: 0 },
];

let timelineBlockId = 1;
let selectedTimelineBlockId = 1;
const timelineBlocks = [
  { id: timelineBlockId++, startMs: 0, durationMs: 220, color: "R", brightness: 1000 },
  { id: timelineBlockId++, startMs: 260, durationMs: 180, color: "G", brightness: 650 },
  { id: timelineBlockId++, startMs: 520, durationMs: 140, color: "B", brightness: 850 },
  { id: timelineBlockId++, startMs: 740, durationMs: 260, color: "IR", brightness: 500 },
];
let blockTimelineMinimumEndMs = 1000;

let programTimers = [];
let runningProgramLabel = "";

let device = null;
let server = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let receiveBuffer = "";
let commandQueue = Promise.resolve();

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const el = {
  connectButton: document.querySelector("#connectButton"),
  connectionDot: document.querySelector("#connectionDot"),
  connectionText: document.querySelector("#connectionText"),
  deviceName: document.querySelector("#deviceName"),
  channelGrid: document.querySelector("#channelGrid"),
  channelTemplate: document.querySelector("#channelTemplate"),
  getButton: document.querySelector("#getButton"),
  allOnButton: document.querySelector("#allOnButton"),
  allOffButton: document.querySelector("#allOffButton"),
  allMaxButton: document.querySelector("#allMaxButton"),
  manualInput: document.querySelector("#manualInput"),
  sendManualButton: document.querySelector("#sendManualButton"),
  clearLogButton: document.querySelector("#clearLogButton"),
  logOutput: document.querySelector("#logOutput"),
  manualTabButton: document.querySelector("#manualTabButton"),
  timelineTabButton: document.querySelector("#timelineTabButton"),
  blocksTabButton: document.querySelector("#blocksTabButton"),
  manualPanel: document.querySelector("#manualPanel"),
  timelinePanel: document.querySelector("#timelinePanel"),
  blocksPanel: document.querySelector("#blocksPanel"),
  addTimelineRowButton: document.querySelector("#addTimelineRowButton"),
  sortTimelineRowsButton: document.querySelector("#sortTimelineRowsButton"),
  clearTimelineRowsButton: document.querySelector("#clearTimelineRowsButton"),
  runTimelineButton: document.querySelector("#runTimelineButton"),
  stopTimelineButton: document.querySelector("#stopTimelineButton"),
  timelineRows: document.querySelector("#timelineRows"),
  timelinePlot: document.querySelector("#timelinePlot"),
  timelineDuration: document.querySelector("#timelineDuration"),
  addTimelineBlockButton: document.querySelector("#addTimelineBlockButton"),
  sortTimelineBlocksButton: document.querySelector("#sortTimelineBlocksButton"),
  clearTimelineBlocksButton: document.querySelector("#clearTimelineBlocksButton"),
  runBlocksButton: document.querySelector("#runBlocksButton"),
  stopBlocksButton: document.querySelector("#stopBlocksButton"),
  digitalChannelInput: document.querySelector("#digitalChannelInput"),
  digitalFormatInput: document.querySelector("#digitalFormatInput"),
  digitalWidthInput: document.querySelector("#digitalWidthInput"),
  digitalEncodingInput: document.querySelector("#digitalEncodingInput"),
  digitalDataInput: document.querySelector("#digitalDataInput"),
  digitalStartInput: document.querySelector("#digitalStartInput"),
  digitalBitMsInput: document.querySelector("#digitalBitMsInput"),
  digitalGapMsInput: document.querySelector("#digitalGapMsInput"),
  digitalBrightnessInput: document.querySelector("#digitalBrightnessInput"),
  generateDigitalBlocksButton: document.querySelector("#generateDigitalBlocksButton"),
  appendDigitalBlocksButton: document.querySelector("#appendDigitalBlocksButton"),
  runDigitalBlocksButton: document.querySelector("#runDigitalBlocksButton"),
  digitalPreviewOutput: document.querySelector("#digitalPreviewOutput"),
  deleteTimelineBlockButton: document.querySelector("#deleteTimelineBlockButton"),
  clipColorInput: document.querySelector("#clipColorInput"),
  clipStartInput: document.querySelector("#clipStartInput"),
  clipDurationInput: document.querySelector("#clipDurationInput"),
  clipBrightnessInput: document.querySelector("#clipBrightnessInput"),
  clipList: document.querySelector("#clipList"),
  clipTimeline: document.querySelector("#clipTimeline"),
  blockTimelineRuler: document.querySelector("#blockTimelineRuler"),
  blockPreviewPlot: document.querySelector("#blockPreviewPlot"),
  blockTimelineDuration: document.querySelector("#blockTimelineDuration"),
};

function isConnected() {
  return Boolean(device?.gatt?.connected && rxCharacteristic);
}

function setConnectionStatus(connected, label = "") {
  el.connectionDot.classList.toggle("connected", connected);
  el.connectionText.textContent = connected ? "Connected" : "Disconnected";
  el.connectButton.textContent = connected ? "Disconnect" : "BLE Connect";
  el.deviceName.textContent = label || "BLE NUS";
  document.body.classList.toggle("is-connected", connected);
}

function appendLog(direction, text) {
  const time = new Date().toLocaleTimeString();
  el.logOutput.textContent += `[${time}] ${direction} ${text}\n`;
  el.logOutput.scrollTop = el.logOutput.scrollHeight;
}

function compactDuty(duty) {
  return `${Math.round((duty / 1000) * 100)}%`;
}

function compactPulse(current) {
  return current.pulse ? `PULSE ${current.pulseOnUs}/${current.pulseOffUs} us` : "PULSE OFF";
}

function clampTimelineTime(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.round(numeric));
}

function clampTimelineBrightness(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1000, Math.round(numeric)));
}

function clampTimelineDuration(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 100;
  }
  return Math.max(1, Math.round(numeric));
}

function lightCommand(channelId, nextState = state.get(channelId)) {
  return `${nextState.on ? "ON" : "OFF"},${channelId}`;
}

function dimmingCommand(channelId, nextState = state.get(channelId)) {
  const duty = nextState.pwm ? nextState.duty : 1000;
  return `PWM,${channelId},${duty}`;
}

function clampPulseUs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 100000;
  }
  return Math.max(100, Math.min(60000000, Math.round(numeric)));
}

function pulseCommand(channelId, nextState = state.get(channelId)) {
  const enabled = nextState.pulse ? 1 : 0;
  const onUs = clampPulseUs(nextState.pulseOnUs);
  const offUs = clampPulseUs(nextState.pulseOffUs);
  nextState.pulseOnUs = onUs;
  nextState.pulseOffUs = offUs;
  return `PULSEU,${channelId},${enabled},${onUs},${offUs}`;
}

async function sendCommand(command) {
  const normalized = command.trim();
  if (!normalized) {
    return;
  }

  if (!isConnected()) {
    appendLog("!", "BLE is not connected");
    return;
  }

  const packet = encoder.encode(`${normalized}\n`);
  const run = commandQueue.then(async () => {
    if (rxCharacteristic.properties.write && "writeValueWithResponse" in rxCharacteristic) {
      await rxCharacteristic.writeValueWithResponse(packet);
    } else if (rxCharacteristic.properties.writeWithoutResponse && "writeValueWithoutResponse" in rxCharacteristic) {
      await rxCharacteristic.writeValueWithoutResponse(packet);
    } else {
      await rxCharacteristic.writeValue(packet);
    }
    appendLog(">", normalized);
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  commandQueue = run.catch((error) => {
    appendLog("!", error.message || String(error));
  });

  return run;
}

function setActiveTab(tabName) {
  const manualActive = tabName === "manual";
  const timelineActive = tabName === "timeline";
  const blocksActive = tabName === "blocks";

  el.manualTabButton.setAttribute("aria-selected", String(manualActive));
  el.timelineTabButton.setAttribute("aria-selected", String(timelineActive));
  el.blocksTabButton.setAttribute("aria-selected", String(blocksActive));
  el.manualPanel.hidden = !manualActive;
  el.timelinePanel.hidden = !timelineActive;
  el.blocksPanel.hidden = !blocksActive;
  el.manualPanel.classList.toggle("is-active", manualActive);
  el.timelinePanel.classList.toggle("is-active", timelineActive);
  el.blocksPanel.classList.toggle("is-active", blocksActive);

  if (timelineActive) {
    renderTimeline();
  }
  if (blocksActive) {
    renderBlocks();
  }
}

function channelById(channelId) {
  return channels.find((channel) => channel.id === channelId) || channels[0];
}

function channelOrder(channelId) {
  return channels.findIndex((channel) => channel.id === channelId);
}

function timelineEventDurationMs() {
  return Math.max(1000, ...timelineRows.map((row) => row.timeMs));
}

function timelineEndMs(block) {
  return block.startMs + block.durationMs;
}

function blockTimelineDurationMs() {
  return Math.max(blockTimelineMinimumEndMs, 1000, ...timelineBlocks.map(timelineEndMs));
}

function createSvgElement(name, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function createChannelSelect(value, onChange) {
  const select = document.createElement("select");
  for (const channel of channels) {
    const option = document.createElement("option");
    option.value = channel.id;
    option.textContent = channel.id;
    select.appendChild(option);
  }
  select.value = value;
  select.addEventListener("change", onChange);
  return select;
}

function sortTimelineRows() {
  timelineRows.sort((a, b) => {
    if (a.timeMs !== b.timeMs) {
      return a.timeMs - b.timeMs;
    }
    return channelOrder(a.color) - channelOrder(b.color);
  });
}

function addTimelineRow(color = channels[0].id, timeMs = null) {
  const maxTime = timelineRows.reduce((max, row) => Math.max(max, row.timeMs), 0);
  timelineRows.push({
    id: timelineRowId++,
    timeMs: clampTimelineTime(timeMs ?? maxTime + 100),
    color,
    brightness: 1000,
  });
  renderTimeline();
}

function eventBrightnessAt(channelId, timeMs) {
  const rows = timelineRows
    .filter((row) => row.color === channelId)
    .sort((a, b) => {
      if (a.timeMs !== b.timeMs) {
        return a.timeMs - b.timeMs;
      }
      return a.id - b.id;
    });
  let brightness = 0;
  for (const row of rows) {
    if (row.timeMs > timeMs) {
      break;
    }
    brightness = row.brightness;
  }
  return brightness;
}

function drawIntensityPlot(svg, maxTime, readBrightness, collectTimes) {
  svg.replaceChildren();

  const width = 820;
  const height = 260;
  const margin = { top: 28, right: 98, bottom: 42, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const duration = Math.max(1, maxTime);

  const x = (timeMs) => margin.left + (timeMs / duration) * plotWidth;
  const y = (brightness) => margin.top + (1 - brightness / 1000) * plotHeight;

  for (const brightness of [0, 250, 500, 750, 1000]) {
    const lineY = y(brightness);
    svg.appendChild(createSvgElement("line", {
      x1: margin.left,
      y1: lineY,
      x2: margin.left + plotWidth,
      y2: lineY,
      class: "plot-grid",
    }));
    const label = createSvgElement("text", {
      x: margin.left - 10,
      y: lineY + 4,
      class: "plot-label",
      "text-anchor": "end",
    });
    label.textContent = brightness;
    svg.appendChild(label);
  }

  const timeTicks = [0, duration / 4, duration / 2, (duration * 3) / 4, duration];
  for (const tick of timeTicks) {
    const tickX = x(tick);
    svg.appendChild(createSvgElement("line", {
      x1: tickX,
      y1: margin.top,
      x2: tickX,
      y2: margin.top + plotHeight,
      class: "plot-grid",
    }));
    const label = createSvgElement("text", {
      x: tickX,
      y: margin.top + plotHeight + 24,
      class: "plot-label",
      "text-anchor": "middle",
    });
    label.textContent = `${Math.round(tick)}`;
    svg.appendChild(label);
  }

  svg.appendChild(createSvgElement("line", {
    x1: margin.left,
    y1: margin.top + plotHeight,
    x2: margin.left + plotWidth,
    y2: margin.top + plotHeight,
    class: "plot-axis",
  }));
  svg.appendChild(createSvgElement("line", {
    x1: margin.left,
    y1: margin.top,
    x2: margin.left,
    y2: margin.top + plotHeight,
    class: "plot-axis",
  }));

  channels.forEach((channel, index) => {
    const timePoints = new Set([0, duration, ...collectTimes(channel.id)]);
    const sortedTimes = [...timePoints].sort((a, b) => a - b);
    let pathData = `M ${x(0)} ${y(readBrightness(channel.id, 0))}`;

    for (let i = 1; i < sortedTimes.length; i += 1) {
      const nextTime = sortedTimes[i];
      pathData += ` H ${x(nextTime)} V ${y(readBrightness(channel.id, nextTime))}`;
    }
    pathData += ` H ${x(duration)}`;

    svg.appendChild(createSvgElement("path", {
      d: pathData,
      class: "plot-line",
      stroke: channel.color,
    }));

    const legendY = margin.top + index * 20;
    const legendX = margin.left + plotWidth + 22;
    svg.appendChild(createSvgElement("line", {
      x1: legendX,
      y1: legendY,
      x2: legendX + 18,
      y2: legendY,
      stroke: channel.color,
      "stroke-width": 3,
      "stroke-linecap": "round",
    }));
    const legend = createSvgElement("text", {
      x: legendX + 26,
      y: legendY + 4,
      class: "plot-legend-text",
    });
    legend.textContent = channel.id;
    svg.appendChild(legend);
  });
}

function renderTimelineTable() {
  el.timelineRows.replaceChildren();

  if (timelineRows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No timeline rows";
    el.timelineRows.appendChild(empty);
    return;
  }

  for (const row of timelineRows) {
    const rowNode = document.createElement("div");
    rowNode.className = "timeline-row";
    rowNode.setAttribute("role", "row");

    const timeInput = document.createElement("input");
    timeInput.type = "number";
    timeInput.min = "0";
    timeInput.step = "1";
    timeInput.value = row.timeMs;
    timeInput.setAttribute("aria-label", "Time ms");
    timeInput.addEventListener("input", () => {
      row.timeMs = clampTimelineTime(timeInput.value);
      renderEventTimelinePlot();
    });

    const colorSelect = createChannelSelect(row.color, () => {
      row.color = colorSelect.value;
      renderEventTimelinePlot();
    });
    colorSelect.setAttribute("aria-label", "Color");

    const brightnessInput = document.createElement("input");
    brightnessInput.type = "number";
    brightnessInput.min = "0";
    brightnessInput.max = "1000";
    brightnessInput.step = "10";
    brightnessInput.value = row.brightness;
    brightnessInput.setAttribute("aria-label", "Brightness");
    brightnessInput.addEventListener("input", () => {
      row.brightness = clampTimelineBrightness(brightnessInput.value);
      renderEventTimelinePlot();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "row-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", "Delete row");
    deleteButton.addEventListener("click", () => {
      const index = timelineRows.findIndex((candidate) => candidate.id === row.id);
      if (index >= 0) {
        timelineRows.splice(index, 1);
        renderTimeline();
      }
    });

    rowNode.append(timeInput, colorSelect, brightnessInput, deleteButton);
    el.timelineRows.appendChild(rowNode);
  }
}

function renderEventTimelinePlot() {
  const maxTime = timelineEventDurationMs();
  el.timelineDuration.textContent = `${maxTime} ms`;
  drawIntensityPlot(
    el.timelinePlot,
    maxTime,
    eventBrightnessAt,
    (channelId) => timelineRows
      .filter((row) => row.color === channelId)
      .map((row) => row.timeMs),
  );
}

function renderTimeline() {
  renderTimelineTable();
  renderEventTimelinePlot();
}

function selectedTimelineBlock() {
  return timelineBlocks.find((block) => block.id === selectedTimelineBlockId) || null;
}

function addTimelineBlock(color = channels[0].id, startMs = null) {
  const maxTime = timelineBlocks.reduce((max, block) => Math.max(max, timelineEndMs(block)), 0);
  const block = {
    id: timelineBlockId++,
    startMs: clampTimelineTime(startMs ?? maxTime),
    durationMs: 100,
    color,
    brightness: 1000,
  };
  timelineBlocks.push(block);
  blockTimelineMinimumEndMs = Math.max(blockTimelineMinimumEndMs, timelineEndMs(block));
  selectedTimelineBlockId = block.id;
  renderBlocks();
}

function sortTimelineBlocks() {
  timelineBlocks.sort((a, b) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs;
    }
    const channelDelta = channelOrder(a.color) - channelOrder(b.color);
    if (channelDelta !== 0) {
      return channelDelta;
    }
    return b.brightness - a.brightness;
  });
}

function renderClipColorOptions() {
  el.clipColorInput.replaceChildren();
  for (const channel of channels) {
    const option = document.createElement("option");
    option.value = channel.id;
    option.textContent = channel.id;
    el.clipColorInput.appendChild(option);
  }
}

function renderDigitalChannelOptions() {
  el.digitalChannelInput.replaceChildren();
  for (const channel of channels) {
    const option = document.createElement("option");
    option.value = channel.id;
    option.textContent = channel.id;
    el.digitalChannelInput.appendChild(option);
  }
  el.digitalChannelInput.value = channels[0].id;
}

function parseDigitalBits(input, format, bitWidth) {
  const width = Number(bitWidth);
  const raw = String(input).trim().replace(/[\s_,]/g, "");
  if (!raw) {
    throw new Error("Digital data is empty");
  }

  if (format === "bin") {
    const normalized = raw.replace(/^0b/i, "");
    if (!/^[01]+$/.test(normalized)) {
      throw new Error("Binary data must contain only 0 or 1");
    }
    if (normalized.length > width) {
      throw new Error(`Binary data exceeds ${width} bits`);
    }
    return normalized.padStart(width, "0");
  }

  const normalizedHex = raw.replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(normalizedHex)) {
    throw new Error("Hex data must contain only 0-9 or A-F");
  }

  const value = Number.parseInt(normalizedHex, 16);
  const maxValue = (2 ** width) - 1;
  if (value > maxValue) {
    throw new Error(`Hex data exceeds ${width} bits`);
  }
  return value.toString(2).padStart(width, "0");
}

function clampDigitalBitMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 200;
  }
  return Math.max(1, Math.round(numeric));
}

function clampDigitalGapMs(value, bitMs) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(bitMs - 1, Math.round(numeric)));
}

function pulseBlockDuration(durationMs, gapMs) {
  return Math.max(1, Math.round(durationMs) - gapMs);
}

function readDigitalProtocolConfig() {
  const bitMs = clampDigitalBitMs(el.digitalBitMsInput.value);
  const gapMs = clampDigitalGapMs(el.digitalGapMsInput.value, bitMs);
  const brightness = clampTimelineBrightness(el.digitalBrightnessInput.value);
  if (brightness <= 0) {
    throw new Error("Brightness must be greater than 0");
  }

  return {
    channelId: el.digitalChannelInput.value,
    format: el.digitalFormatInput.value,
    bitWidth: Number(el.digitalWidthInput.value),
    encoding: el.digitalEncodingInput.value,
    data: el.digitalDataInput.value,
    startMs: clampTimelineTime(el.digitalStartInput.value),
    bitMs,
    gapMs,
    brightness,
  };
}

function createDigitalProtocolBlocks(config) {
  const bits = parseDigitalBits(config.data, config.format, config.bitWidth);
  const blocks = [];

  function pushBlock(startMs, durationMs) {
    blocks.push({
      startMs,
      durationMs: pulseBlockDuration(durationMs, config.gapMs),
      color: config.channelId,
      brightness: config.brightness,
    });
  }

  bits.split("").forEach((bit, index) => {
    const bitStart = config.startMs + index * config.bitMs;

    if (config.encoding === "ook") {
      if (bit === "1") {
        pushBlock(bitStart, config.bitMs);
      }
      return;
    }

    if (config.encoding === "manchester") {
      const firstHalf = Math.max(1, Math.floor(config.bitMs / 2));
      const secondHalf = Math.max(1, config.bitMs - firstHalf);
      if (bit === "0") {
        pushBlock(bitStart, firstHalf);
      } else {
        pushBlock(bitStart + firstHalf, secondHalf);
      }
      return;
    }

    const zeroWidth = Math.max(1, Math.round(config.bitMs * 0.25));
    const oneWidth = Math.max(1, Math.round(config.bitMs * 0.75));
    pushBlock(bitStart, bit === "1" ? oneWidth : zeroWidth);
  });

  return {
    bits,
    blocks,
    totalDurationMs: config.bitMs * bits.length,
    endMs: config.startMs + config.bitMs * bits.length,
  };
}

function buildDigitalTxCommand(config, preview) {
  const format = config.format === "hex" ? "HEX" : "BIN";
  const encoding = {
    ook: "OOK",
    manchester: "MAN",
    "pulse-width": "PWM",
  }[config.encoding] || "OOK";
  const bitUs = config.bitMs * 1000;
  const gapUs = config.gapMs * 1000;
  const data = format === "HEX"
    ? Number.parseInt(preview.bits, 2).toString(16).toUpperCase().padStart(config.bitWidth / 4, "0")
    : preview.bits;

  return `TXBITS,${config.channelId},${format},${config.bitWidth},${encoding},${bitUs},${gapUs},${config.brightness},${data}`;
}

function updateDigitalPreview() {
  try {
    const config = readDigitalProtocolConfig();
    const preview = createDigitalProtocolBlocks(config);
    el.digitalPreviewOutput.textContent =
      `${preview.bits} | ${config.encoding} | ${preview.blocks.length} pulses | ${preview.totalDurationMs} ms`;
  } catch (error) {
    el.digitalPreviewOutput.textContent = error.message || String(error);
  }
}

function generateDigitalBlocks({ append = false, run = false } = {}) {
  let preview;
  let config;
  try {
    config = readDigitalProtocolConfig();
    preview = createDigitalProtocolBlocks(config);
  } catch (error) {
    appendLog("!", error.message || String(error));
    updateDigitalPreview();
    return;
  }

  if (!append) {
    timelineBlocks.splice(0, timelineBlocks.length);
    selectedTimelineBlockId = null;
    blockTimelineMinimumEndMs = 1000;
  }

  const generatedBlocks = preview.blocks.map((block) => ({
    id: timelineBlockId++,
    ...block,
  }));
  timelineBlocks.push(...generatedBlocks);
  if (generatedBlocks.length > 0) {
    selectedTimelineBlockId = generatedBlocks[0].id;
  }

  blockTimelineMinimumEndMs = Math.max(blockTimelineMinimumEndMs, preview.endMs);
  renderBlocks();
  updateDigitalPreview();
  appendLog(
    "!",
    `Generated ${preview.blocks.length} ${config.encoding} pulses from ${preview.bits} on ${config.channelId}`,
  );

  if (run) {
    sendCommand(buildDigitalTxCommand(config, preview));
  }
}

function syncClipEditor() {
  const block = selectedTimelineBlock();
  const disabled = !block;
  el.clipColorInput.disabled = disabled;
  el.clipStartInput.disabled = disabled;
  el.clipDurationInput.disabled = disabled;
  el.clipBrightnessInput.disabled = disabled;
  el.deleteTimelineBlockButton.disabled = disabled;

  if (!block) {
    el.clipColorInput.value = channels[0].id;
    el.clipStartInput.value = "";
    el.clipDurationInput.value = "";
    el.clipBrightnessInput.value = "";
    return;
  }

  el.clipColorInput.value = block.color;
  el.clipStartInput.value = block.startMs;
  el.clipDurationInput.value = block.durationMs;
  el.clipBrightnessInput.value = block.brightness;
}

function selectTimelineBlock(blockId) {
  selectedTimelineBlockId = blockId;
  renderBlocks();
}

function renderClipList() {
  el.clipList.replaceChildren();

  const sortedBlocks = [...timelineBlocks].sort((a, b) => a.startMs - b.startMs);
  for (const block of sortedBlocks) {
    const channel = channelById(block.color);
    const button = document.createElement("button");
    button.className = "clip-list-item";
    button.type = "button";
    button.setAttribute("aria-selected", String(block.id === selectedTimelineBlockId));
    button.addEventListener("click", () => selectTimelineBlock(block.id));

    const swatch = document.createElement("span");
    swatch.className = "clip-list-color";
    swatch.style.background = channel.color;

    const main = document.createElement("span");
    main.className = "clip-list-main";
    const title = document.createElement("span");
    title.className = "clip-list-title";
    title.textContent = `${block.color} ${block.brightness}`;
    const meta = document.createElement("span");
    meta.className = "clip-list-meta";
    meta.textContent = `${block.startMs}-${timelineEndMs(block)} ms`;
    main.append(title, meta);

    const duration = document.createElement("span");
    duration.className = "clip-list-meta";
    duration.textContent = `${block.durationMs} ms`;

    button.append(swatch, main, duration);
    el.clipList.appendChild(button);
  }
}

function renderTimelineRuler(maxTime) {
  el.blockTimelineRuler.replaceChildren();
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i += 1) {
    const tick = document.createElement("div");
    tick.className = "ruler-tick";
    tick.style.left = `${(i / tickCount) * 100}%`;
    const label = document.createElement("span");
    label.textContent = `${Math.round((maxTime * i) / tickCount)} ms`;
    tick.appendChild(label);
    el.blockTimelineRuler.appendChild(tick);
  }
}

function renderClipTimeline() {
  const maxTime = blockTimelineDurationMs();
  el.blockTimelineDuration.textContent = `${maxTime} ms`;
  renderTimelineRuler(maxTime);
  el.clipTimeline.replaceChildren();

  for (const channel of channels) {
    const track = document.createElement("div");
    track.className = "timeline-track";

    const label = document.createElement("div");
    label.className = "track-label";
    label.textContent = channel.id;

    const lane = document.createElement("div");
    lane.className = "track-lane";
    lane.addEventListener("dblclick", (event) => {
      const rect = lane.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      addTimelineBlock(channel.id, Math.round(ratio * maxTime));
    });

    const blocks = timelineBlocks.filter((block) => block.color === channel.id);
    for (const block of blocks) {
      const clip = document.createElement("button");
      clip.className = "timeline-clip";
      clip.type = "button";
      clip.style.left = `${(block.startMs / maxTime) * 100}%`;
      clip.style.width = `${Math.max(0.8, (block.durationMs / maxTime) * 100)}%`;
      clip.style.background = channel.color;
      clip.style.opacity = String(0.3 + (block.brightness / 1000) * 0.7);
      clip.setAttribute("aria-selected", String(block.id === selectedTimelineBlockId));
      clip.textContent = `${block.brightness}`;
      clip.title = `${block.color}: ${block.startMs}-${timelineEndMs(block)} ms, ${block.brightness}/1000`;
      clip.addEventListener("click", () => selectTimelineBlock(block.id));
      lane.appendChild(clip);
    }

    track.append(label, lane);
    el.clipTimeline.appendChild(track);
  }
}

function blockBrightnessAt(channelId, timeMs) {
  return timelineBlocks
    .filter((block) =>
      block.color === channelId &&
      block.startMs <= timeMs &&
      timeMs < timelineEndMs(block))
    .reduce((max, block) => Math.max(max, block.brightness), 0);
}

function renderBlockPreviewPlot() {
  const maxTime = blockTimelineDurationMs();
  drawIntensityPlot(
    el.blockPreviewPlot,
    maxTime,
    blockBrightnessAt,
    (channelId) => timelineBlocks
      .filter((block) => block.color === channelId)
      .flatMap((block) => [block.startMs, timelineEndMs(block)]),
  );
}

function renderBlocks() {
  if (!selectedTimelineBlock() && timelineBlocks.length > 0) {
    selectedTimelineBlockId = timelineBlocks[0].id;
  }
  syncClipEditor();
  renderClipList();
  renderClipTimeline();
  renderBlockPreviewPlot();
}

function brightnessCommands(channelId, brightness) {
  const duty = clampTimelineBrightness(brightness);
  if (duty <= 0) {
    return [`OFF,${channelId}`];
  }
  return [`PWM,${channelId},${duty}`, `ON,${channelId}`];
}

function setStateBrightness(channelId, brightness) {
  const current = state.get(channelId);
  if (!current) {
    return;
  }
  const duty = clampTimelineBrightness(brightness);
  current.on = duty > 0;
  current.pulse = false;
  current.pwm = true;
  current.duty = duty;
}

function addProgramEvent(grouped, timeMs, commands, updates) {
  const time = clampTimelineTime(timeMs);
  if (!grouped.has(time)) {
    grouped.set(time, { timeMs: time, commands: [], updates: [] });
  }
  const event = grouped.get(time);
  event.commands.push(...commands);
  event.updates.push(...updates);
}

function buildTimelineProgramEvents() {
  const grouped = new Map();
  addProgramEvent(
    grouped,
    0,
    ["OFF,ALL"],
    channels.map((channel) => ({ channelId: channel.id, brightness: 0 })),
  );

  const sortedRows = [...timelineRows].sort((a, b) => {
    if (a.timeMs !== b.timeMs) {
      return a.timeMs - b.timeMs;
    }
    return a.id - b.id;
  });

  for (const row of sortedRows) {
    const brightness = clampTimelineBrightness(row.brightness);
    addProgramEvent(
      grouped,
      row.timeMs,
      brightnessCommands(row.color, brightness),
      [{ channelId: row.color, brightness }],
    );
  }

  return [...grouped.values()].sort((a, b) => a.timeMs - b.timeMs);
}

function buildBlockProgramEvents() {
  const grouped = new Map();
  const times = new Set([0, blockTimelineDurationMs()]);
  for (const block of timelineBlocks) {
    times.add(block.startMs);
    times.add(timelineEndMs(block));
  }

  const lastBrightness = new Map(channels.map((channel) => [channel.id, 0]));
  addProgramEvent(
    grouped,
    0,
    ["OFF,ALL"],
    channels.map((channel) => ({ channelId: channel.id, brightness: 0 })),
  );

  for (const timeMs of [...times].sort((a, b) => a - b)) {
    for (const channel of channels) {
      const brightness = blockBrightnessAt(channel.id, timeMs);
      if (brightness === lastBrightness.get(channel.id)) {
        continue;
      }
      lastBrightness.set(channel.id, brightness);
      addProgramEvent(
        grouped,
        timeMs,
        brightnessCommands(channel.id, brightness),
        [{ channelId: channel.id, brightness }],
      );
    }
  }

  addProgramEvent(grouped, blockTimelineDurationMs(), [], []);
  return [...grouped.values()].sort((a, b) => a.timeMs - b.timeMs);
}

function clearProgramTimers() {
  for (const timer of programTimers) {
    window.clearTimeout(timer);
  }
  programTimers = [];
  runningProgramLabel = "";
}

async function stopProgram() {
  if (programTimers.length > 0) {
    appendLog("!", `${runningProgramLabel || "Program"} stopped`);
  }
  clearProgramTimers();

  for (const channel of channels) {
    setStateBrightness(channel.id, 0);
  }
  syncAllCards();
  if (isConnected()) {
    await sendCommand("OFF,ALL");
  }
}

function runProgram(events, label) {
  if (!isConnected()) {
    appendLog("!", `${label} Run requires BLE connection`);
    return;
  }

  clearProgramTimers();
  runningProgramLabel = label;
  const maxTime = events.reduce((max, event) => Math.max(max, event.timeMs), 0);
  appendLog("!", `${label} Run started: ${events.length} steps, ${maxTime} ms`);

  for (const event of events) {
    const timer = window.setTimeout(async () => {
      for (const update of event.updates) {
        setStateBrightness(update.channelId, update.brightness);
      }
      syncAllCards();
      for (const command of event.commands) {
        await sendCommand(command);
      }
    }, event.timeMs);
    programTimers.push(timer);
  }

  const commandCount = events.reduce((sum, event) => sum + event.commands.length, 0);
  const finishTimer = window.setTimeout(() => {
    programTimers = [];
    runningProgramLabel = "";
    appendLog("!", `${label} Run finished`);
  }, maxTime + commandCount * 90 + 120);
  programTimers.push(finishTimer);
}

function renderChannel(channel) {
  const fragment = el.channelTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".channel-card");
  const chip = fragment.querySelector(".color-chip");
  const name = fragment.querySelector(".channel-name");
  const stateText = fragment.querySelector(".channel-state");
  const onOffButton = fragment.querySelector(".onoff-button");
  const pwmButton = fragment.querySelector(".pwm-button");
  const slider = fragment.querySelector(".duty-slider");
  const output = fragment.querySelector(".duty-output");
  const quickButtons = fragment.querySelectorAll(".quick-button");
  const pulseButton = fragment.querySelector(".pulse-button");
  const pulseOnInput = fragment.querySelector(".pulse-on-input");
  const pulseOffInput = fragment.querySelector(".pulse-off-input");
  const pulseApplyButton = fragment.querySelector(".pulse-apply-button");

  card.dataset.channel = channel.id;
  chip.style.background = channel.color;
  name.textContent = channel.label;

  function sync() {
    const current = state.get(channel.id);
    stateText.textContent =
      `${current.on ? "ON" : "OFF"} | ADIM PWM ${current.pwm ? "ON" : "OFF"} | ${compactDuty(current.duty)} | ${compactPulse(current)}`;
    onOffButton.textContent = current.on ? "ON" : "OFF";
    onOffButton.setAttribute("aria-pressed", String(current.on));
    pwmButton.textContent = current.pwm ? "ON" : "OFF";
    pwmButton.setAttribute("aria-pressed", String(current.pwm));
    slider.value = current.duty;
    slider.disabled = !current.pwm;
    output.textContent = `${current.duty}/1000`;
    pulseButton.textContent = current.pulse ? "ON" : "OFF";
    pulseButton.setAttribute("aria-pressed", String(current.pulse));
    pulseOnInput.value = current.pulseOnUs;
    pulseOffInput.value = current.pulseOffUs;
  }

  onOffButton.addEventListener("click", async () => {
    const current = state.get(channel.id);
    current.on = !current.on;
    current.pulse = false;
    if (current.on && current.duty === 0) {
      current.pwm = true;
      current.duty = 1000;
    }
    sync();
    await sendCommand(lightCommand(channel.id, current));
  });

  pwmButton.addEventListener("click", async () => {
    const current = state.get(channel.id);
    current.pwm = !current.pwm;
    sync();
    await sendCommand(dimmingCommand(channel.id, current));
  });

  slider.addEventListener("input", () => {
    const current = state.get(channel.id);
    current.duty = Number(slider.value);
    sync();
  });

  slider.addEventListener("change", async () => {
    const current = state.get(channel.id);
    await sendCommand(dimmingCommand(channel.id, current));
  });

  quickButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const current = state.get(channel.id);
      current.pwm = true;
      current.duty = Number(button.dataset.duty);
      sync();
      await sendCommand(dimmingCommand(channel.id, current));
    });
  });

  pulseButton.addEventListener("click", async () => {
    const current = state.get(channel.id);
    current.pulse = !current.pulse;
    if (current.pulse) {
      current.on = true;
    }
    current.pulseOnUs = clampPulseUs(pulseOnInput.value);
    current.pulseOffUs = clampPulseUs(pulseOffInput.value);
    sync();
    await sendCommand(pulseCommand(channel.id, current));
  });

  pulseOnInput.addEventListener("change", () => {
    const current = state.get(channel.id);
    current.pulseOnUs = clampPulseUs(pulseOnInput.value);
    sync();
  });

  pulseOffInput.addEventListener("change", () => {
    const current = state.get(channel.id);
    current.pulseOffUs = clampPulseUs(pulseOffInput.value);
    sync();
  });

  pulseApplyButton.addEventListener("click", async () => {
    const current = state.get(channel.id);
    current.pulseOnUs = clampPulseUs(pulseOnInput.value);
    current.pulseOffUs = clampPulseUs(pulseOffInput.value);
    if (current.pulse) {
      current.on = true;
    }
    sync();
    await sendCommand(pulseCommand(channel.id, current));
  });

  sync();
  el.channelGrid.appendChild(fragment);
}

function syncAllCards() {
  for (const card of document.querySelectorAll(".channel-card")) {
    const channelId = card.dataset.channel;
    const current = state.get(channelId);
    card.querySelector(".channel-state").textContent =
      `${current.on ? "ON" : "OFF"} | ADIM PWM ${current.pwm ? "ON" : "OFF"} | ${compactDuty(current.duty)} | ${compactPulse(current)}`;
    card.querySelector(".onoff-button").textContent = current.on ? "ON" : "OFF";
    card.querySelector(".onoff-button").setAttribute("aria-pressed", String(current.on));
    card.querySelector(".pwm-button").textContent = current.pwm ? "ON" : "OFF";
    card.querySelector(".pwm-button").setAttribute("aria-pressed", String(current.pwm));
    card.querySelector(".duty-slider").value = current.duty;
    card.querySelector(".duty-slider").disabled = !current.pwm;
    card.querySelector(".duty-output").textContent = `${current.duty}/1000`;
    card.querySelector(".pulse-button").textContent = current.pulse ? "ON" : "OFF";
    card.querySelector(".pulse-button").setAttribute("aria-pressed", String(current.pulse));
    card.querySelector(".pulse-on-input").value = current.pulseOnUs;
    card.querySelector(".pulse-off-input").value = current.pulseOffUs;
  }
}

function applyStatusLine(line) {
  if (!line.startsWith("STAT,")) {
    return;
  }

  const payload = line.slice(5);
  for (const part of payload.split(";")) {
    const match = part.match(/^([A-Z]+)=(0|1),(\d+)$/);
    if (!match) {
      continue;
    }
    const [, channelId, on, duty] = match;
    const current = state.get(channelId);
    if (!current) {
      continue;
    }
    current.on = on === "1";
    current.duty = Math.max(0, Math.min(1000, Number(duty)));
  }
  syncAllCards();
}

function handleNotification(event) {
  receiveBuffer += decoder.decode(event.target.value);
  const lines = receiveBuffer.split(/\r?\n/);
  receiveBuffer = lines.pop() ?? "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    appendLog("<", trimmed);
    applyStatusLine(trimmed);
  }
}

async function connect() {
  if (!("bluetooth" in navigator)) {
    if (!window.isSecureContext) {
      appendLog("!", "Web Bluetooth requires localhost or HTTPS. LAN http:// URLs are blocked by Chrome/Edge.");
    } else {
      appendLog("!", "Web Bluetooth is not available in this browser. Use Chrome or Edge with Bluetooth enabled.");
    }
    return;
  }

  device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: [NUS_SERVICE_UUID] },
      { namePrefix: "6COLOR" },
    ],
    optionalServices: [NUS_SERVICE_UUID],
  });

  device.addEventListener("gattserverdisconnected", () => {
    rxCharacteristic = null;
    txCharacteristic = null;
    server = null;
    setConnectionStatus(false);
    appendLog("!", "Device disconnected");
  });

  server = await device.gatt.connect();
  const service = await server.getPrimaryService(NUS_SERVICE_UUID);
  rxCharacteristic = await service.getCharacteristic(NUS_RX_UUID);
  txCharacteristic = await service.getCharacteristic(NUS_TX_UUID);
  txCharacteristic.addEventListener("characteristicvaluechanged", handleNotification);
  await txCharacteristic.startNotifications();

  setConnectionStatus(true, device.name || "6COLOR_LIGHT");
  appendLog("!", `Connected to ${device.name || "device"}`);
  await sendCommand("GET");
}

async function disconnect() {
  if (device?.gatt?.connected) {
    device.gatt.disconnect();
  }
  rxCharacteristic = null;
  txCharacteristic = null;
  setConnectionStatus(false);
}

async function sendAll(on, duty = null) {
  for (const channel of channels) {
    const current = state.get(channel.id);
    current.on = on;
    current.pulse = false;
    if (duty !== null) {
      current.pwm = duty < 1000;
      current.duty = duty;
    } else if (on && current.duty === 0) {
      current.pwm = true;
      current.duty = 1000;
    }
  }
  syncAllCards();

  const first = state.get(channels[0].id);
  if (duty !== null) {
    await sendCommand(`PWM,ALL,${first.duty}`);
  }
  await sendCommand(`${first.on ? "ON" : "OFF"},ALL`);
}

el.connectButton.addEventListener("click", async () => {
  try {
    if (isConnected()) {
      await disconnect();
    } else {
      await connect();
    }
  } catch (error) {
    appendLog("!", error.message || String(error));
    setConnectionStatus(false);
  }
});

el.getButton.addEventListener("click", () => sendCommand("GET"));
el.allOnButton.addEventListener("click", () => sendAll(true));
el.allOffButton.addEventListener("click", () => sendAll(false));
el.allMaxButton.addEventListener("click", () => sendAll(true, 1000));
el.manualTabButton.addEventListener("click", () => setActiveTab("manual"));
el.timelineTabButton.addEventListener("click", () => setActiveTab("timeline"));
el.blocksTabButton.addEventListener("click", () => setActiveTab("blocks"));
el.addTimelineRowButton.addEventListener("click", () => addTimelineRow());
el.sortTimelineRowsButton.addEventListener("click", () => {
  sortTimelineRows();
  renderTimeline();
});
el.clearTimelineRowsButton.addEventListener("click", () => {
  timelineRows.splice(0, timelineRows.length);
  renderTimeline();
});
el.runTimelineButton.addEventListener("click", () => {
  runProgram(buildTimelineProgramEvents(), "Timeline");
});
el.stopTimelineButton.addEventListener("click", stopProgram);
el.addTimelineBlockButton.addEventListener("click", () => addTimelineBlock());
el.sortTimelineBlocksButton.addEventListener("click", () => {
  sortTimelineBlocks();
  renderBlocks();
});
el.clearTimelineBlocksButton.addEventListener("click", () => {
  timelineBlocks.splice(0, timelineBlocks.length);
  selectedTimelineBlockId = null;
  blockTimelineMinimumEndMs = 1000;
  renderBlocks();
});
el.runBlocksButton.addEventListener("click", () => {
  runProgram(buildBlockProgramEvents(), "Blocks");
});
el.stopBlocksButton.addEventListener("click", stopProgram);
el.generateDigitalBlocksButton.addEventListener("click", () => generateDigitalBlocks({ append: false }));
el.appendDigitalBlocksButton.addEventListener("click", () => generateDigitalBlocks({ append: true }));
el.runDigitalBlocksButton.addEventListener("click", () => generateDigitalBlocks({ append: false, run: true }));
[
  el.digitalChannelInput,
  el.digitalFormatInput,
  el.digitalWidthInput,
  el.digitalEncodingInput,
  el.digitalDataInput,
  el.digitalStartInput,
  el.digitalBitMsInput,
  el.digitalGapMsInput,
  el.digitalBrightnessInput,
].forEach((input) => {
  input.addEventListener("input", updateDigitalPreview);
  input.addEventListener("change", updateDigitalPreview);
});
el.deleteTimelineBlockButton.addEventListener("click", () => {
  const index = timelineBlocks.findIndex((block) => block.id === selectedTimelineBlockId);
  if (index >= 0) {
    timelineBlocks.splice(index, 1);
    selectedTimelineBlockId = timelineBlocks[0]?.id ?? null;
    renderBlocks();
  }
});
el.clipColorInput.addEventListener("change", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.color = el.clipColorInput.value;
  renderBlocks();
});
el.clipStartInput.addEventListener("input", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.startMs = clampTimelineTime(el.clipStartInput.value);
  renderBlocks();
});
el.clipDurationInput.addEventListener("input", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.durationMs = clampTimelineDuration(el.clipDurationInput.value);
  renderBlocks();
});
el.clipBrightnessInput.addEventListener("input", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.brightness = clampTimelineBrightness(el.clipBrightnessInput.value);
  renderBlocks();
});
el.sendManualButton.addEventListener("click", () => sendCommand(el.manualInput.value));
el.manualInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendCommand(el.manualInput.value);
  }
});
el.clearLogButton.addEventListener("click", () => {
  el.logOutput.textContent = "";
});

channels.forEach(renderChannel);
renderClipColorOptions();
renderDigitalChannelOptions();
updateDigitalPreview();
renderTimeline();
renderBlocks();
setConnectionStatus(false);
