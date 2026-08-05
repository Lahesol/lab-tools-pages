const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const DFU_SERVICE_UUID = 0xfe59;
const DFU_CONTROL_UUID = "8ec90001-f315-4f60-9fb8-838830daea50";
const DFU_PACKET_UUID = "8ec90002-f315-4f60-9fb8-838830daea50";

const DFU = {
  create: 0x01,
  setPrn: 0x02,
  checksum: 0x03,
  execute: 0x04,
  select: 0x06,
  response: 0x60,
  success: 0x01,
  commandObject: 0x01,
  dataObject: 0x02,
  packetBytes: 20,
};

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
let timelineProtocolInstanceId = 1;
const timelineProtocolInstances = [];

let timelineBlockId = 1;
let selectedTimelineBlockId = null;
const timelineBlocks = [];
let blockTimelineMinimumEndMs = 1000;

let protocolBlockId = 1;
let selectedProtocolBlockId = null;
const protocolBlocks = [];

let programTimers = [];
let runningProgramLabel = "";

let device = null;
let server = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let receiveBuffer = "";
let commandQueue = Promise.resolve();
let firmwareDetail = "unknown";
let resetDetail = "";
let firmwareCapabilities = new Set();
let secureDfuSupported = false;
let expectDfuDisconnect = false;
let dfuGattQueue = Promise.resolve();
const dfuState = {
  file: null,
  pkg: null,
  device: null,
  server: null,
  control: null,
  packet: null,
  waiter: null,
  transferring: false,
  completed: false,
  progress: 0,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const el = {
  connectButton: document.querySelector("#connectButton"),
  connectionDot: document.querySelector("#connectionDot"),
  connectionText: document.querySelector("#connectionText"),
  deviceName: document.querySelector("#deviceName"),
  firmwareVersion: document.querySelector("#firmwareVersion"),
  channelGrid: document.querySelector("#channelGrid"),
  channelTemplate: document.querySelector("#channelTemplate"),
  getButton: document.querySelector("#getButton"),
  versionButton: document.querySelector("#versionButton"),
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
  importTimelineCsvButton: document.querySelector("#importTimelineCsvButton"),
  exportTimelineCsvButton: document.querySelector("#exportTimelineCsvButton"),
  timelineCsvInput: document.querySelector("#timelineCsvInput"),
  timelineProtocolSelect: document.querySelector("#timelineProtocolSelect"),
  timelineProtocolStartInput: document.querySelector("#timelineProtocolStartInput"),
  addProtocolToTimelineButton: document.querySelector("#addProtocolToTimelineButton"),
  runTimelineButton: document.querySelector("#runTimelineButton"),
  stopTimelineButton: document.querySelector("#stopTimelineButton"),
  timelineProtocolRows: document.querySelector("#timelineProtocolRows"),
  timelineRows: document.querySelector("#timelineRows"),
  timelinePlot: document.querySelector("#timelinePlot"),
  timelineDuration: document.querySelector("#timelineDuration"),
  addTimelineBlockButton: document.querySelector("#addTimelineBlockButton"),
  sortTimelineBlocksButton: document.querySelector("#sortTimelineBlocksButton"),
  clearTimelineBlocksButton: document.querySelector("#clearTimelineBlocksButton"),
  importProtocolCsvButton: document.querySelector("#importProtocolCsvButton"),
  exportProtocolCsvButton: document.querySelector("#exportProtocolCsvButton"),
  protocolCsvInput: document.querySelector("#protocolCsvInput"),
  runBlocksButton: document.querySelector("#runBlocksButton"),
  stopBlocksButton: document.querySelector("#stopBlocksButton"),
  digitalNameInput: document.querySelector("#digitalNameInput"),
  digitalChannelInput: document.querySelector("#digitalChannelInput"),
  digitalFormatInput: document.querySelector("#digitalFormatInput"),
  digitalWidthInput: document.querySelector("#digitalWidthInput"),
  digitalEncodingInput: document.querySelector("#digitalEncodingInput"),
  digitalLevelsInput: document.querySelector("#digitalLevelsInput"),
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
  protocolBlockList: document.querySelector("#protocolBlockList"),
  clipTimeline: document.querySelector("#clipTimeline"),
  blockTimelineRuler: document.querySelector("#blockTimelineRuler"),
  blockPreviewPlot: document.querySelector("#blockPreviewPlot"),
  blockTimelineDuration: document.querySelector("#blockTimelineDuration"),
  protocolParameterList: document.querySelector("#protocolParameterList"),
  protocolTermDiagram: document.querySelector("#protocolTermDiagram"),
  dfuFile: document.querySelector("#dfuFile"),
  dfuCapabilityState: document.querySelector("#dfuCapabilityState"),
  dfuPackageState: document.querySelector("#dfuPackageState"),
  enterDfuButton: document.querySelector("#enterDfuButton"),
  transferDfuButton: document.querySelector("#transferDfuButton"),
  verifyDfuButton: document.querySelector("#verifyDfuButton"),
  dfuProgressTrack: document.querySelector("#dfuProgressTrack"),
  dfuProgressBar: document.querySelector("#dfuProgressBar"),
  dfuProgressPercent: document.querySelector("#dfuProgressPercent"),
  dfuProgressText: document.querySelector("#dfuProgressText"),
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
  refreshDfuUi();
}

function appendLog(direction, text) {
  const time = new Date().toLocaleTimeString();
  el.logOutput.textContent += `[${time}] ${direction} ${text}\n`;
  el.logOutput.scrollTop = el.logOutput.scrollHeight;
}

function sanitizeFilename(value) {
  return String(value || "protocol")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    || "protocol";
}

function downloadText(filename, text, type = "text/csv") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((cell) => cell.trim() !== ""));
}

function csvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index] ?? "";
    });
    return object;
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsText(file);
  });
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

function normalizeChannelId(value) {
  const normalized = String(value || "").trim().toUpperCase();
  const channel = channels.find((candidate) => candidate.id === normalized);
  if (!channel) {
    throw new Error(`Unknown channel: ${value}`);
  }
  return channel.id;
}

function csvNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function timelineEventDurationMs() {
  return Math.max(
    1000,
    ...timelineRows.map((row) => row.timeMs),
    ...timelineProtocolInstances.map(timelineProtocolInstanceEndMs),
  );
}

function timelineEndMs(block) {
  return block.startMs + block.durationMs;
}

function timelineProtocolInstanceEndMs(instance) {
  return instance.startMs + instance.durationMs;
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

function sortTimelineProtocolInstances() {
  timelineProtocolInstances.sort((a, b) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs;
    }
    return a.name.localeCompare(b.name);
  });
}

function addTimelineRow(color = channels[0].id, timeMs = null) {
  const maxTime = timelineEventDurationMs();
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

function protocolNativeCommand(protocol) {
  const width = Number(protocol.config?.bitWidth || 0);
  if (protocol.config?.encoding === "levels" || (width !== 4 && width !== 8)) {
    return "";
  }
  if (protocol.command) {
    return protocol.command;
  }
  return buildDigitalTxCommand(protocol.config || {}, previewFromProtocol(protocol));
}

function protocolCanRunNatively(protocol) {
  return Boolean(protocolNativeCommand(protocol));
}

function nativeProtocolActiveAt(channelId, timeMs) {
  return timelineProtocolInstances.some((instance) =>
    protocolCanRunNatively(instance) &&
    (instance.config?.channelId || channels[0].id) === channelId &&
    instance.startMs <= timeMs &&
    timeMs < timelineProtocolInstanceEndMs(instance));
}

function timelineProtocolBrightnessAt(channelId, timeMs, options = {}) {
  const includeNative = options.includeNative !== false;
  let brightness = 0;
  for (const instance of timelineProtocolInstances) {
    if (!includeNative && protocolCanRunNatively(instance)) {
      continue;
    }
    const relativeMs = timeMs - instance.startMs;
    if (relativeMs < 0 || relativeMs >= instance.durationMs) {
      continue;
    }
    for (const block of instance.blocks) {
      if (
        block.color === channelId &&
        block.startMs <= relativeMs &&
        relativeMs < timelineEndMs(block)
      ) {
        brightness = Math.max(brightness, block.brightness);
      }
    }
  }
  return brightness;
}

function timelineBrightnessAt(channelId, timeMs, options = {}) {
  return Math.max(
    eventBrightnessAt(channelId, timeMs),
    timelineProtocolBrightnessAt(channelId, timeMs, options),
  );
}

function collectTimelineTimes(channelId, options = {}) {
  const times = new Set(
    timelineRows
      .filter((row) => row.color === channelId)
      .map((row) => row.timeMs),
  );

  for (const instance of timelineProtocolInstances) {
    if (options?.includeNative === false && protocolCanRunNatively(instance)) {
      continue;
    }
    for (const block of instance.blocks) {
      if (block.color !== channelId) {
        continue;
      }
      times.add(instance.startMs + block.startMs);
      times.add(instance.startMs + timelineEndMs(block));
    }
  }

  return [...times];
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

function renderTimelineProtocolTable() {
  el.timelineProtocolRows.replaceChildren();

  if (timelineProtocolInstances.length === 0) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No timeline protocols";
    el.timelineProtocolRows.appendChild(empty);
    return;
  }

  for (const instance of timelineProtocolInstances) {
    const rowNode = document.createElement("div");
    rowNode.className = "timeline-protocol-row";
    rowNode.setAttribute("role", "row");

    const timeInput = document.createElement("input");
    timeInput.type = "number";
    timeInput.min = "0";
    timeInput.step = "1";
    timeInput.value = instance.startMs;
    timeInput.setAttribute("aria-label", "Protocol start ms");
    timeInput.addEventListener("input", () => {
      instance.startMs = clampTimelineTime(timeInput.value);
      renderEventTimelinePlot();
    });

    const name = document.createElement("div");
    name.className = "timeline-protocol-name";
    const title = document.createElement("strong");
    title.textContent = instance.name;
    const meta = document.createElement("span");
    meta.textContent = instance.summary;
    name.append(title, meta);

    const duration = document.createElement("div");
    duration.className = "timeline-protocol-duration";
    duration.textContent = `${instance.durationMs} ms`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "row-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", "Delete protocol");
    deleteButton.addEventListener("click", () => {
      const index = timelineProtocolInstances.findIndex((candidate) => candidate.id === instance.id);
      if (index >= 0) {
        timelineProtocolInstances.splice(index, 1);
        renderTimeline();
      }
    });

    rowNode.append(timeInput, name, duration, deleteButton);
    el.timelineProtocolRows.appendChild(rowNode);
  }
}

function renderEventTimelinePlot() {
  const maxTime = timelineEventDurationMs();
  el.timelineDuration.textContent = `${maxTime} ms`;
  drawIntensityPlot(
    el.timelinePlot,
    maxTime,
    timelineBrightnessAt,
    collectTimelineTimes,
  );
}

function renderTimeline() {
  renderTimelineProtocolTable();
  renderTimelineTable();
  renderEventTimelinePlot();
  renderTimelineProtocolOptions();
}

function exportTimelineCsv() {
  const manualRows = [...timelineRows]
    .sort((a, b) => a.timeMs - b.timeMs || channelOrder(a.color) - channelOrder(b.color))
    .map((row) => ({
      type: "manual",
      time_ms: row.timeMs,
      color: row.color,
      brightness: row.brightness,
      protocol_id: "",
      protocol_name: "",
      protocol_summary: "",
      duration_ms: "",
      format: "",
      width: "",
      encoding: "",
      levels: "",
      data: "",
      bits: "",
      symbols: "",
      period_ms: "",
      pulse_width_ms: "",
      amplitude: "",
    }));
  const protocolRows = [...timelineProtocolInstances]
    .sort((a, b) => a.startMs - b.startMs || a.name.localeCompare(b.name))
    .map((instance) => ({
      type: "protocol",
      time_ms: instance.startMs,
      color: instance.config.channelId || "",
      brightness: "",
      protocol_id: instance.protocolId || "",
      protocol_name: instance.name,
      protocol_summary: instance.summary,
      duration_ms: instance.durationMs,
      format: instance.config.format || "",
      width: instance.config.bitWidth || "",
      encoding: instance.config.encoding || "",
      levels: instance.config.levels || "",
      data: instance.config.data || "",
      bits: instance.bits || "",
      symbols: instance.symbols || "",
      period_ms: protocolPeriodMs(instance.config),
      pulse_width_ms: protocolPulseWidthMs(instance.config),
      amplitude: instance.config.brightness || "",
    }));
  const rows = [...manualRows, ...protocolRows];
  const headers = [
    "type",
    "time_ms",
    "color",
    "brightness",
    "protocol_id",
    "protocol_name",
    "protocol_summary",
    "duration_ms",
    "format",
    "width",
    "encoding",
    "levels",
    "data",
    "bits",
    "symbols",
    "period_ms",
    "pulse_width_ms",
    "amplitude",
  ];
  downloadText("6color_timeline.csv", toCsv(headers, rows));
  appendLog("!", `Exported ${manualRows.length} manual rows and ${protocolRows.length} protocol instances`);
}

async function importTimelineCsv(file) {
  const text = await readFileAsText(file);
  const rows = csvToObjects(text);
  const parsedRows = [];
  const parsedProtocols = [];

  for (const row of rows) {
    const type = String(row.type || row.kind || "").trim().toLowerCase();
    if (type === "protocol" || row.protocol_name) {
      try {
        const protocol = protocolFromTimelineCsvRow(row);
        parsedProtocols.push(cloneProtocolForTimeline(protocol, clampTimelineTime(row.time_ms ?? row.time ?? row.ms)));
      } catch (error) {
        appendLog("!", `Timeline protocol import skipped: ${error.message || String(error)}`);
      }
      continue;
    }

    parsedRows.push({
      id: timelineRowId++,
      timeMs: clampTimelineTime(row.time_ms ?? row.time ?? row.ms),
      color: normalizeChannelId(row.color ?? row.channel),
      brightness: clampTimelineBrightness(csvNumber(row.brightness ?? row.duty, 0)),
    });
  }

  timelineRows.splice(0, timelineRows.length, ...parsedRows);
  timelineProtocolInstances.splice(0, timelineProtocolInstances.length, ...parsedProtocols);
  sortTimelineRows();
  sortTimelineProtocolInstances();
  renderTimeline();
  appendLog("!", `Imported ${parsedRows.length} manual rows and ${parsedProtocols.length} protocol instances`);
}

function renderTimelineProtocolOptions() {
  el.timelineProtocolSelect.replaceChildren();

  if (protocolBlocks.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No protocol blocks";
    el.timelineProtocolSelect.appendChild(option);
    el.timelineProtocolSelect.disabled = true;
    el.addProtocolToTimelineButton.disabled = true;
    return;
  }

  el.timelineProtocolSelect.disabled = false;
  el.addProtocolToTimelineButton.disabled = false;
  for (const protocol of protocolBlocks) {
    const option = document.createElement("option");
    option.value = protocol.id;
    option.textContent = `${protocol.name} (${protocolSummary(protocol)}, ${protocol.durationMs} ms)`;
    el.timelineProtocolSelect.appendChild(option);
  }
}

function protocolFromTimelineCsvRow(row) {
  const protocolId = String(row.protocol_id || "").trim();
  const name = sanitizeFilename(row.protocol_name || row.name || "imported_protocol");
  const existing = protocolBlocks.find((candidate) =>
    (protocolId && candidate.id === protocolId) ||
    candidate.name === name);
  if (existing) {
    return existing;
  }

  const encoding = row.encoding || (row.symbols ? "levels" : "ook");
  const format = row.format || (encoding === "levels" ? "levels" : "bin");
  const data = row.data || (format === "levels" ? row.symbols : row.bits);
  const periodMs = clampDigitalPeriodMs(row.period_ms || row.bit_ms || 1);
  const pulseWidthMs = clampDigitalPulseWidthMs(
    row.pulse_width_ms || periodMs,
    periodMs,
  );
  const defaultBitWidth = String(row.bits || "").length || 8;
  const config = {
    name,
    channelId: row.color ? normalizeChannelId(row.color) : channels[0].id,
    format,
    bitWidth: row.width ? csvNumber(row.width, defaultBitWidth) : defaultBitWidth,
    encoding,
    levels: clampProtocolLevels(row.levels),
    data,
    startMs: 0,
    bitMs: periodMs,
    periodMs,
    pulseWidthMs,
    gapMs: Math.max(0, periodMs - pulseWidthMs),
    brightness: clampTimelineBrightness(csvNumber(row.amplitude || row.protocol_brightness || row.brightness || 1000, 1000)),
  };
  const preview = createDigitalProtocolBlocks(config);
  const blocks = preview.blocks.map((block) => ({
    startMs: block.startMs,
    durationMs: block.durationMs,
    color: block.color,
    brightness: block.brightness,
    level: block.level ?? "",
  }));

  return {
    id: `imported-${protocolBlockId++}`,
    name,
    config,
    bits: row.bits || preview.bits,
    symbols: row.symbols || preview.symbolText || "",
    command: buildDigitalTxCommand(config, preview),
    durationMs: csvNumber(row.duration_ms || row.total_duration_ms, preview.totalDurationMs),
    blocks,
  };
}

function cloneProtocolForTimeline(protocol, startMs) {
  return {
    id: `timeline-protocol-${timelineProtocolInstanceId++}`,
    protocolId: protocol.id,
    name: protocol.name,
    summary: protocolSummary(protocol),
    startMs,
    durationMs: protocol.durationMs,
    config: { ...protocol.config },
    bits: protocol.bits || "",
    symbols: protocol.symbols || "",
    command: protocol.command || protocolNativeCommand(protocol),
    blocks: protocol.blocks.map((block) => ({
      startMs: block.startMs,
      durationMs: block.durationMs,
      color: block.color,
      brightness: block.brightness,
      level: block.level ?? "",
    })),
  };
}

function addSelectedProtocolToTimeline() {
  const protocol = protocolBlocks.find((candidate) => candidate.id === el.timelineProtocolSelect.value);
  if (!protocol) {
    appendLog("!", "No protocol block selected");
    return;
  }

  const baseMs = clampTimelineTime(el.timelineProtocolStartInput.value);
  timelineProtocolInstances.push(cloneProtocolForTimeline(protocol, baseMs));
  sortTimelineProtocolInstances();
  renderTimeline();
  appendLog("!", `Added protocol instance ${protocol.name} to timeline at ${baseMs} ms`);
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

function setSelectValue(select, value, fallback) {
  const normalized = String(value ?? "");
  const hasValue = [...select.options].some((option) => option.value === normalized);
  select.value = hasValue ? normalized : fallback;
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

function clampProtocolLevels(value) {
  const normalized = Number(value);
  return [8, 16, 32, 64].includes(normalized) ? normalized : 16;
}

function parseLevelSequence(input, levels) {
  const raw = String(input).trim();
  if (!raw) {
    throw new Error("Level sequence is empty");
  }

  const tokens = raw.split(/[\s,;_]+/).filter(Boolean);
  const symbols = tokens.map((token) => {
    const value = /^0x/i.test(token) ? Number.parseInt(token, 16) : Number(token);
    if (!Number.isInteger(value) || value < 0 || value >= levels) {
      throw new Error(`Level values must be integers from 0 to ${levels - 1}`);
    }
    return value;
  });

  if (symbols.length === 0) {
    throw new Error("Level sequence is empty");
  }
  return symbols;
}

function parseIntensitySymbols(input, format, bitWidth, levels) {
  if (format === "levels") {
    const symbols = parseLevelSequence(input, levels);
    return {
      bits: "",
      sourceBits: "",
      symbols,
      symbolText: symbols.join(","),
    };
  }

  const symbolBits = Math.log2(levels);
  const sourceBits = parseDigitalBits(input, format, bitWidth);
  const paddedLength = Math.ceil(sourceBits.length / symbolBits) * symbolBits;
  const bits = sourceBits.padStart(paddedLength, "0");
  const symbols = [];
  for (let index = 0; index < bits.length; index += symbolBits) {
    symbols.push(Number.parseInt(bits.slice(index, index + symbolBits), 2));
  }

  return {
    bits,
    sourceBits,
    symbols,
    symbolText: symbols.join(","),
  };
}

function clampDigitalPeriodMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 200;
  }
  return Math.max(1, Math.round(numeric));
}

function clampDigitalPulseWidthMs(value, periodMs) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return periodMs;
  }
  return Math.max(1, Math.min(periodMs, Math.round(numeric)));
}

function pulseBlockDuration(durationMs, gapMs) {
  return Math.max(1, Math.round(durationMs) - gapMs);
}

function syncProtocolModeControls() {
  const encoding = el.digitalEncodingInput.value;
  const levelMode = encoding === "levels";
  const usesConfiguredPulseWidth = encoding === "ook";
  el.digitalLevelsInput.disabled = !levelMode;
  el.digitalGapMsInput.disabled = !usesConfiguredPulseWidth;
}

function readDigitalProtocolConfig() {
  const periodMs = clampDigitalPeriodMs(el.digitalBitMsInput.value);
  const pulseWidthMs = clampDigitalPulseWidthMs(el.digitalGapMsInput.value, periodMs);
  const brightness = clampTimelineBrightness(el.digitalBrightnessInput.value);
  if (brightness <= 0) {
    throw new Error("Amplitude must be greater than 0");
  }

  return {
    name: sanitizeFilename(el.digitalNameInput.value || `${el.digitalDataInput.value}_${el.digitalEncodingInput.value}`),
    channelId: el.digitalChannelInput.value,
    format: el.digitalFormatInput.value,
    bitWidth: Number(el.digitalWidthInput.value),
    encoding: el.digitalEncodingInput.value,
    levels: clampProtocolLevels(el.digitalLevelsInput.value),
    data: el.digitalDataInput.value,
    startMs: clampTimelineTime(el.digitalStartInput.value),
    bitMs: periodMs,
    periodMs,
    pulseWidthMs,
    gapMs: periodMs - pulseWidthMs,
    brightness,
  };
}

function createDigitalProtocolBlocks(config) {
  if (config.encoding === "levels") {
    const levelData = parseIntensitySymbols(config.data, config.format, config.bitWidth, config.levels);
    const blocks = [];
    levelData.symbols.forEach((symbol, index) => {
      const brightness = Math.round((symbol / (config.levels - 1)) * config.brightness);
      if (brightness <= 0) {
        return;
      }
      blocks.push({
        startMs: config.startMs + index * config.bitMs,
        durationMs: config.bitMs,
        color: config.channelId,
        brightness,
        level: symbol,
      });
    });

    return {
      bits: levelData.bits,
      sourceBits: levelData.sourceBits,
      symbols: levelData.symbols,
      symbolText: levelData.symbolText,
      blocks,
      totalDurationMs: config.bitMs * levelData.symbols.length,
      endMs: config.startMs + config.bitMs * levelData.symbols.length,
    };
  }

  if (config.format === "levels") {
    throw new Error("Level Sequence format requires Intensity Levels encoding");
  }

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
    sourceBits: bits,
    symbols: bits.split("").map((bit) => Number(bit)),
    symbolText: bits,
    blocks,
    totalDurationMs: config.bitMs * bits.length,
    endMs: config.startMs + config.bitMs * bits.length,
  };
}

function buildDigitalTxCommand(config, preview) {
  const width = Number(config.bitWidth || 0);
  if (config.encoding === "levels" || (width !== 4 && width !== 8)) {
    return "";
  }

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

function protocolPeriodMs(config) {
  return Math.max(1, Number(config.periodMs || config.bitMs || 1));
}

function protocolPulseWidthMs(config) {
  const periodMs = protocolPeriodMs(config);
  if (Number.isFinite(Number(config.pulseWidthMs)) && Number(config.pulseWidthMs) > 0) {
    return Math.min(periodMs, Number(config.pulseWidthMs));
  }
  return Math.max(1, periodMs - Number(config.gapMs || 0));
}

function protocolFromGenerated(config, preview, generatedBlocks) {
  return {
    id: `protocol-${protocolBlockId++}`,
    name: config.name,
    config: { ...config },
    bits: preview.bits,
    symbols: preview.symbolText || "",
    command: buildDigitalTxCommand(config, preview),
    durationMs: preview.totalDurationMs,
    blocks: generatedBlocks.map((block) => ({
      startMs: Math.max(0, block.startMs - config.startMs),
      durationMs: block.durationMs,
      color: block.color,
      brightness: block.brightness,
      level: block.level ?? "",
    })),
  };
}

function upsertProtocolBlock(protocol) {
  const index = protocolBlocks.findIndex((candidate) => candidate.name === protocol.name);
  if (index >= 0) {
    protocol.id = protocolBlocks[index].id;
    protocolBlocks[index] = protocol;
  } else {
    protocolBlocks.push(protocol);
  }
  selectedProtocolBlockId = protocol.id;
  renderTimelineProtocolOptions();
  renderProtocolBlockList();
}

function protocolFromCurrentBlocks() {
  const minStart = timelineBlocks.length > 0
    ? timelineBlocks.reduce((min, block) => Math.min(min, block.startMs), timelineBlocks[0].startMs)
    : 0;
  const maxEnd = timelineBlocks.reduce((max, block) => Math.max(max, timelineEndMs(block)), blockTimelineDurationMs());
  return {
    id: `protocol-${protocolBlockId++}`,
    name: sanitizeFilename(el.digitalNameInput.value || "current_protocol"),
    config: {
      name: sanitizeFilename(el.digitalNameInput.value || "current_protocol"),
      channelId: el.digitalChannelInput.value,
      format: el.digitalFormatInput.value,
      bitWidth: Number(el.digitalWidthInput.value),
      encoding: el.digitalEncodingInput.value,
      levels: clampProtocolLevels(el.digitalLevelsInput.value),
      data: el.digitalDataInput.value,
      startMs: minStart,
      bitMs: clampDigitalPeriodMs(el.digitalBitMsInput.value),
      periodMs: clampDigitalPeriodMs(el.digitalBitMsInput.value),
      pulseWidthMs: clampDigitalPulseWidthMs(
        el.digitalGapMsInput.value,
        clampDigitalPeriodMs(el.digitalBitMsInput.value),
      ),
      gapMs: clampDigitalPeriodMs(el.digitalBitMsInput.value) -
        clampDigitalPulseWidthMs(el.digitalGapMsInput.value, clampDigitalPeriodMs(el.digitalBitMsInput.value)),
      brightness: clampTimelineBrightness(el.digitalBrightnessInput.value),
    },
    bits: "",
    symbols: "",
    command: "",
    durationMs: Math.max(0, maxEnd - minStart),
    blocks: timelineBlocks.map((block) => ({
      startMs: Math.max(0, block.startMs - minStart),
      durationMs: block.durationMs,
      color: block.color,
      brightness: block.brightness,
    })),
  };
}

function previewFromProtocol(protocol) {
  const encoding = protocol.config?.encoding || "";
  const symbols = encoding === "levels" && protocol.symbols
    ? String(protocol.symbols).split(/[\s,;_]+/).filter(Boolean).map((symbol) => Number(symbol))
    : String(protocol.bits || "").split("").map((symbol) => Number(symbol)).filter((symbol) => Number.isFinite(symbol));
  return {
    bits: protocol.bits || "",
    sourceBits: protocol.bits || "",
    symbols,
    symbolText: protocol.symbols || protocol.bits || "",
    blocks: protocol.blocks,
    totalDurationMs: protocol.durationMs,
    endMs: protocol.durationMs,
  };
}

function applyProtocolToForm(protocol) {
  const config = protocol.config || {};
  el.digitalNameInput.value = protocol.name || config.name || "";
  setSelectValue(el.digitalChannelInput, config.channelId, channels[0].id);
  setSelectValue(el.digitalFormatInput, config.format, "hex");
  setSelectValue(el.digitalWidthInput, config.bitWidth, "8");
  setSelectValue(el.digitalEncodingInput, config.encoding, "ook");
  setSelectValue(el.digitalLevelsInput, config.levels, "16");
  el.digitalDataInput.value = config.data || "";
  el.digitalStartInput.value = config.startMs || 0;
  el.digitalBitMsInput.value = protocolPeriodMs(config);
  el.digitalGapMsInput.value = protocolPulseWidthMs(config);
  el.digitalBrightnessInput.value = config.brightness || 1000;
  syncProtocolModeControls();
}

function loadProtocolPreview(protocol) {
  timelineBlocks.splice(0, timelineBlocks.length, ...protocol.blocks.map((block) => ({
    id: timelineBlockId++,
    ...block,
  })));
  selectedTimelineBlockId = timelineBlocks[0]?.id ?? null;
  blockTimelineMinimumEndMs = Math.max(1000, protocol.durationMs);
}

function selectProtocolBlock(protocolId) {
  const protocol = protocolBlocks.find((candidate) => candidate.id === protocolId);
  if (!protocol) {
    return;
  }
  selectedProtocolBlockId = protocol.id;
  applyProtocolToForm(protocol);
  loadProtocolPreview(protocol);
  renderProtocolParameterList(protocol.config, previewFromProtocol(protocol));
  renderProtocolTermDiagram(protocol.config, previewFromProtocol(protocol));
  renderBlocks();
}

function protocolSummary(protocol) {
  if (protocol.config?.encoding === "levels") {
    return `${protocol.config.levels || 16} levels | ${protocol.symbols || "levels"}`;
  }
  return `${protocol.bits || "custom"} | ${protocol.config?.encoding || "custom"}`;
}

function renderProtocolBlockList() {
  el.protocolBlockList.replaceChildren();

  if (protocolBlocks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "protocol-empty";
    empty.textContent = "No protocol blocks";
    el.protocolBlockList.appendChild(empty);
    return;
  }

  for (const protocol of protocolBlocks) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "protocol-block-item";
    button.setAttribute("aria-selected", String(protocol.id === selectedProtocolBlockId));
    button.addEventListener("click", () => selectProtocolBlock(protocol.id));

    const title = document.createElement("span");
    title.className = "protocol-block-title";
    title.textContent = protocol.name;

    const meta = document.createElement("span");
    meta.className = "protocol-block-meta";
    meta.textContent = `${protocol.config?.channelId || channels[0].id} | ${protocolSummary(protocol)} | ${protocol.durationMs} ms`;

    button.append(title, meta);
    el.protocolBlockList.appendChild(button);
  }
}

function renderProtocolParameterList(config = null, preview = null) {
  el.protocolParameterList.replaceChildren();
  const periodMs = config ? protocolPeriodMs(config) : 1;
  const pulseWidthMs = config ? protocolPulseWidthMs(config) : 1;
  let items = [["Protocol", "No valid protocol"]];

  if (config && preview) {
    if (config.encoding === "levels") {
      items = [
        ["Name", config.name],
        ["Channel", config.channelId],
        ["Format", config.format.toUpperCase()],
        ["Encoding", "Intensity levels"],
        ["Levels", config.levels],
        ["Data", config.data],
        ["Symbols", preview.symbolText || preview.symbols.join(",")],
        ["Symbol period T", `${periodMs} ms`],
        ["Max amplitude", config.brightness],
        ["Active symbols", preview.blocks.length],
        ["Duration", `${preview.totalDurationMs} ms`],
      ];
    } else if (config.encoding === "manchester") {
      items = [
        ["Name", config.name],
        ["Channel", config.channelId],
        ["Format", config.format.toUpperCase()],
        ["Width", `${config.bitWidth} bit`],
        ["Encoding", "Manchester"],
        ["Data", config.data],
        ["Bits", preview.bits],
        ["Bit period T", `${periodMs} ms`],
        ["Half-bit width", `${Math.round(periodMs / 2)} ms`],
        ["Amplitude", config.brightness],
        ["Pulses", preview.blocks.length],
        ["Duration", `${preview.totalDurationMs} ms`],
      ];
    } else if (config.encoding === "pulse-width") {
      items = [
        ["Name", config.name],
        ["Channel", config.channelId],
        ["Format", config.format.toUpperCase()],
        ["Width", `${config.bitWidth} bit`],
        ["Encoding", "PWM width"],
        ["Data", config.data],
        ["Bits", preview.bits],
        ["Bit period T", `${periodMs} ms`],
        ["0 width", `${Math.round(periodMs * 0.25)} ms`],
        ["1 width", `${Math.round(periodMs * 0.75)} ms`],
        ["Amplitude", config.brightness],
        ["Pulses", preview.blocks.length],
        ["Duration", `${preview.totalDurationMs} ms`],
      ];
    } else {
      items = [
        ["Name", config.name],
        ["Channel", config.channelId],
        ["Format", config.format.toUpperCase()],
        ["Width", `${config.bitWidth} bit`],
        ["Encoding", config.encoding],
        ["Data", config.data],
        ["Bits", preview.bits],
        ["Period T", `${periodMs} ms`],
        ["Pulse width PW", `${pulseWidthMs} ms`],
        ["Duty cycle", `${Math.round((pulseWidthMs / periodMs) * 100)}%`],
        ["Amplitude", config.brightness],
        ["Pulses", preview.blocks.length],
        ["Duration", `${preview.totalDurationMs} ms`],
      ];
    }
  }

  for (const [label, value] of items) {
    const item = document.createElement("div");
    item.className = "parameter-item";
    const key = document.createElement("span");
    key.textContent = label;
    const val = document.createElement("strong");
    val.textContent = String(value);
    item.append(key, val);
    el.protocolParameterList.appendChild(item);
  }
}

function renderProtocolTermDiagram(config = null, preview = null) {
  const svg = el.protocolTermDiagram;
  svg.replaceChildren();

  const defs = createSvgElement("defs");
  const marker = createSvgElement("marker", {
    id: "term-arrow",
    markerWidth: 8,
    markerHeight: 8,
    refX: 4,
    refY: 4,
    orient: "auto-start-reverse",
  });
  marker.appendChild(createSvgElement("path", {
    d: "M 0 0 L 8 4 L 0 8 z",
    fill: "#075c57",
  }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  const width = 820;
  const baseline = 154;
  const highY = 58;
  const left = 78;
  const right = 760;

  svg.appendChild(createSvgElement("line", {
    x1: left,
    y1: baseline,
    x2: right,
    y2: baseline,
    class: "term-axis",
  }));

  if (!config || !preview) {
    const label = createSvgElement("text", {
      x: width / 2,
      y: 110,
      class: "term-muted",
      "text-anchor": "middle",
    });
    label.textContent = "Set a valid protocol to show pulse terminology";
    svg.appendChild(label);
    return;
  }

  const periodMs = protocolPeriodMs(config);
  const startX = left + 42;
  const firstPulseX = startX + 42;
  const startDelayX = left + 10;
  const maxVisibleCells = config.encoding === "levels" ? 12 : 16;
  const sourceCellCount = config.encoding === "levels"
    ? preview.symbols.length
    : preview.bits.length;
  const visibleCellCount = Math.max(1, Math.min(sourceCellCount || 1, maxVisibleCells));
  const availablePeriodPx = Math.max(160, right - firstPulseX - 16);
  const periodPx = Math.max(28, Math.min(128, availablePeriodPx / visibleCellCount));
  const visibleBits = preview.bits.slice(0, visibleCellCount);
  const bits = visibleBits || "0";
  const pulseWidthMs = protocolPulseWidthMs(config);
  const pulsePx = Math.max(6, Math.min(periodPx, (pulseWidthMs / periodMs) * periodPx));
  const color = channelById(config.channelId).color;

  svg.appendChild(createSvgElement("line", {
    x1: firstPulseX,
    y1: baseline + 16,
    x2: firstPulseX,
    y2: highY - 18,
    class: "term-guide",
  }));

  svg.appendChild(createSvgElement("line", {
    x1: startDelayX,
    y1: baseline + 30,
    x2: firstPulseX,
    y2: baseline + 30,
    class: "term-arrow",
  }));
  let label = createSvgElement("text", {
    x: (startDelayX + firstPulseX) / 2,
    y: baseline + 48,
    class: "term-label",
    "text-anchor": "middle",
  });
  label.textContent = "Start delay";
  svg.appendChild(label);

  if (config.encoding === "levels") {
    const symbols = (preview.symbols.length > 0 ? preview.symbols : [0]).slice(0, visibleCellCount);
    for (let index = 0; index < symbols.length; index += 1) {
      const symbol = symbols[index];
      const x0 = firstPulseX + index * periodPx;
      const levelRatio = Math.max(0, Math.min(1, symbol / (config.levels - 1)));
      const levelHeight = (baseline - highY) * levelRatio;
      const slot = createSvgElement("rect", {
        x: x0,
        y: highY,
        width: periodPx,
        height: baseline - highY,
        class: "term-zero",
      });
      svg.appendChild(slot);

      if (levelHeight > 0) {
        const pulse = createSvgElement("rect", {
          x: x0,
          y: baseline - levelHeight,
          width: periodPx,
          height: levelHeight,
          class: "term-pulse",
        });
        pulse.setAttribute("fill", color);
        pulse.setAttribute("fill-opacity", "0.18");
        svg.appendChild(pulse);
      }

      const levelText = createSvgElement("text", {
        x: x0 + periodPx / 2,
        y: baseline + 18,
        class: "term-muted",
        "text-anchor": "middle",
      });
      levelText.textContent = periodPx < 44 ? String(symbol) : `L${symbol}`;
      svg.appendChild(levelText);
    }

    svg.appendChild(createSvgElement("line", {
      x1: firstPulseX,
      y1: highY - 18,
      x2: firstPulseX + periodPx,
      y2: highY - 18,
      class: "term-arrow",
    }));
    label = createSvgElement("text", {
      x: firstPulseX + periodPx / 2,
      y: highY - 28,
      class: "term-label",
      "text-anchor": "middle",
    });
    label.textContent = "Symbol period T";
    svg.appendChild(label);

    svg.appendChild(createSvgElement("line", {
      x1: firstPulseX - 28,
      y1: highY,
      x2: firstPulseX - 28,
      y2: baseline,
      class: "term-arrow",
    }));
    label = createSvgElement("text", {
      x: firstPulseX - 38,
      y: (highY + baseline) / 2,
      class: "term-label",
      "text-anchor": "end",
    });
    label.textContent = "Max amplitude";
    svg.appendChild(label);

    const footer = createSvgElement("text", {
      x: right - 4,
      y: baseline + 48,
      class: "term-muted",
      "text-anchor": "end",
    });
    const suffix = preview.symbols.length > symbols.length
      ? ` | showing first ${symbols.length}/${preview.symbols.length} symbols`
      : "";
    footer.textContent = `Amplitude = level / ${config.levels - 1} x max${suffix}`;
    svg.appendChild(footer);
    return;
  }

  let firstPulse = null;
  for (let index = 0; index < bits.length; index += 1) {
    const bit = bits[index];
    const x0 = firstPulseX + index * periodPx;
    const bitBox = createSvgElement("rect", {
      x: x0,
      y: highY,
      width: periodPx,
      height: baseline - highY,
      class: "term-zero",
    });
    svg.appendChild(bitBox);

    const pulseSegments = [];
    if (config.encoding === "ook") {
      if (bit === "1") {
        pulseSegments.push({ offsetPx: 0, widthPx: pulsePx });
      }
    } else if (config.encoding === "manchester") {
      const halfPx = periodPx / 2;
      pulseSegments.push({
        offsetPx: bit === "1" ? halfPx : 0,
        widthPx: halfPx,
      });
    } else if (config.encoding === "pulse-width") {
      pulseSegments.push({
        offsetPx: 0,
        widthPx: bit === "1" ? periodPx * 0.75 : periodPx * 0.25,
      });
    }

    for (const segment of pulseSegments) {
      if (!firstPulse) {
        firstPulse = {
          x1: x0 + segment.offsetPx,
          x2: x0 + segment.offsetPx + segment.widthPx,
        };
      }
      const pulse = createSvgElement("rect", {
        x: x0 + segment.offsetPx,
        y: highY,
        width: Math.max(6, segment.widthPx),
        height: baseline - highY,
        class: "term-pulse",
      });
      pulse.setAttribute("fill", color);
      pulse.setAttribute("fill-opacity", "0.18");
      svg.appendChild(pulse);
    }

    const bitText = createSvgElement("text", {
      x: x0 + periodPx / 2,
      y: baseline + 18,
      class: "term-muted",
      "text-anchor": "middle",
    });
    bitText.textContent = periodPx < 48 ? bit : `bit ${bit}`;
    svg.appendChild(bitText);
  }

  svg.appendChild(createSvgElement("line", {
    x1: firstPulseX,
    y1: highY - 18,
    x2: firstPulseX + periodPx,
    y2: highY - 18,
    class: "term-arrow",
  }));
  label = createSvgElement("text", {
    x: firstPulseX + periodPx / 2,
    y: highY - 28,
    class: "term-label",
    "text-anchor": "middle",
  });
  label.textContent = "Period T";
  svg.appendChild(label);

  if (firstPulse) {
    svg.appendChild(createSvgElement("line", {
      x1: firstPulse.x1,
      y1: highY + 16,
      x2: firstPulse.x2,
      y2: highY + 16,
      class: "term-arrow",
    }));
    label = createSvgElement("text", {
      x: (firstPulse.x1 + firstPulse.x2) / 2,
      y: highY + 36,
      class: "term-label",
      "text-anchor": "middle",
    });
    label.textContent = config.encoding === "pulse-width" ? "Encoded width" : "Pulse width PW";
    svg.appendChild(label);
  }

  svg.appendChild(createSvgElement("line", {
    x1: firstPulseX - 28,
    y1: highY,
    x2: firstPulseX - 28,
    y2: baseline,
    class: "term-arrow",
  }));
  label = createSvgElement("text", {
    x: firstPulseX - 38,
    y: (highY + baseline) / 2,
    class: "term-label",
    "text-anchor": "end",
  });
  label.textContent = "Amplitude";
  svg.appendChild(label);

  const footer = createSvgElement("text", {
    x: right - 4,
    y: baseline + 48,
    class: "term-muted",
    "text-anchor": "end",
  });
  const suffix = preview.bits.length > bits.length
    ? ` | showing first ${bits.length}/${preview.bits.length} bits`
    : "";
  if (config.encoding === "manchester") {
    footer.textContent = `Manchester: bit 0 = first half high, bit 1 = second half high${suffix}`;
  } else if (config.encoding === "pulse-width") {
    footer.textContent = `PWM width: bit 0 = 25% T high, bit 1 = 75% T high${suffix}`;
  } else {
    footer.textContent = `Duty cycle = PW / T = ${Math.round((pulseWidthMs / periodMs) * 100)}%${suffix}`;
  }
  svg.appendChild(footer);
}

function protocolRowsForCsv() {
  const sourceProtocols = protocolBlocks.length > 0 ? protocolBlocks : [protocolFromCurrentBlocks()];
  return sourceProtocols.map((protocol) => ({
    name: protocol.name,
    channel: protocol.config.channelId || channels[0].id,
    format: protocol.config.format || "",
    width: protocol.config.bitWidth || "",
    encoding: protocol.config.encoding || "",
    levels: protocol.config.levels || "",
    data: protocol.config.data || "",
    bits: protocol.bits || "",
    symbols: protocol.symbols || "",
    start_delay_ms: protocol.config.startMs || 0,
    period_ms: protocolPeriodMs(protocol.config),
    pulse_width_ms: protocolPulseWidthMs(protocol.config),
    duty_cycle_pct: Math.round((protocolPulseWidthMs(protocol.config) / protocolPeriodMs(protocol.config)) * 100),
    amplitude: protocol.config.brightness || "",
    total_duration_ms: protocol.durationMs,
    command: protocol.command || "",
  }));
}

function exportProtocolCsv() {
  const headers = [
    "name",
    "channel",
    "format",
    "width",
    "encoding",
    "levels",
    "data",
    "bits",
    "symbols",
    "start_delay_ms",
    "period_ms",
    "pulse_width_ms",
    "duty_cycle_pct",
    "amplitude",
    "total_duration_ms",
    "command",
  ];
  const rows = protocolRowsForCsv();
  downloadText("6color_protocol_blocks.csv", toCsv(headers, rows));
  appendLog("!", `Exported ${rows.length} protocol blocks`);
}

async function importProtocolCsv(file) {
  const text = await readFileAsText(file);
  const rows = csvToObjects(text);
  const groups = new Map();

  for (const row of rows) {
    const name = sanitizeFilename(row.name || "imported_protocol");
    if (!groups.has(name)) {
      const periodMs = csvNumber(row.period_ms || row.bit_ms, 1);
      const pulseWidthMs = csvNumber(
        row.pulse_width_ms,
        Math.max(1, periodMs - csvNumber(row.gap_ms, 0)),
      );
      groups.set(name, {
        id: `protocol-${protocolBlockId++}`,
        name,
        config: {
          name,
          channelId: row.channel ? normalizeChannelId(row.channel) : channels[0].id,
          format: row.format || "hex",
          bitWidth: csvNumber(row.width, 8),
          encoding: row.encoding || "ook",
          levels: clampProtocolLevels(row.levels),
          data: row.data || "",
          startMs: clampTimelineTime(row.start_delay_ms || 0),
          bitMs: periodMs,
          periodMs,
          pulseWidthMs,
          gapMs: Math.max(
            0,
            periodMs - pulseWidthMs,
          ),
          brightness: clampTimelineBrightness(csvNumber(row.amplitude || row.protocol_brightness || row.brightness, 1000)),
        },
        bits: row.bits || "",
        symbols: row.symbols || "",
        command: row.command || "",
        durationMs: clampTimelineTime(row.total_duration_ms),
        blocks: [],
      });
    }

    const protocol = groups.get(name);
    if (row.start_ms !== undefined && row.duration_ms !== undefined) {
      const block = {
        startMs: clampTimelineTime(row.start_ms),
        durationMs: clampTimelineDuration(row.duration_ms),
        color: normalizeChannelId(row.color || row.channel),
        brightness: clampTimelineBrightness(csvNumber(row.brightness, 0)),
        level: row.level || "",
      };
      protocol.blocks.push(block);
      protocol.durationMs = Math.max(protocol.durationMs, block.startMs + block.durationMs);
    }
  }

  for (const protocol of groups.values()) {
    if (protocol.blocks.length > 0) {
      continue;
    }
    try {
      const preview = createDigitalProtocolBlocks(protocol.config);
      protocol.bits = protocol.bits || preview.bits;
      protocol.symbols = protocol.symbols || preview.symbolText || "";
      protocol.command = protocol.command || buildDigitalTxCommand(protocol.config, preview);
      protocol.durationMs = preview.totalDurationMs;
      protocol.blocks = preview.blocks.map((block) => ({
        startMs: Math.max(0, block.startMs - protocol.config.startMs),
        durationMs: block.durationMs,
        color: block.color,
        brightness: block.brightness,
        level: block.level ?? "",
      }));
    } catch (error) {
      appendLog("!", `${protocol.name}: ${error.message || String(error)}`);
    }
  }

  protocolBlocks.splice(0, protocolBlocks.length, ...groups.values());
  const first = protocolBlocks[0];
  if (first) {
    selectedProtocolBlockId = first.id;
    applyProtocolToForm(first);
    loadProtocolPreview(first);
    renderProtocolParameterList(first.config, previewFromProtocol(first));
    renderProtocolTermDiagram(first.config, previewFromProtocol(first));
  }

  renderBlocks();
  renderTimelineProtocolOptions();
  renderProtocolBlockList();
  appendLog("!", `Imported ${protocolBlocks.length} protocol blocks`);
}

function updateDigitalPreview() {
  syncProtocolModeControls();
  try {
    const config = readDigitalProtocolConfig();
    const preview = createDigitalProtocolBlocks(config);
    if (config.encoding === "levels") {
      el.digitalPreviewOutput.textContent =
        `levels ${config.levels}: ${preview.symbolText} | T=${config.bitMs} ms | max=${config.brightness} | ${preview.blocks.length} active symbols`;
    } else if (config.encoding === "manchester") {
      el.digitalPreviewOutput.textContent =
        `${preview.bits} | Manchester | T=${config.bitMs} ms | half=${Math.round(config.bitMs / 2)} ms | ${preview.blocks.length} pulses`;
    } else if (config.encoding === "pulse-width") {
      el.digitalPreviewOutput.textContent =
        `${preview.bits} | PWM width | T=${config.bitMs} ms | W0=${Math.round(config.bitMs * 0.25)} ms | W1=${Math.round(config.bitMs * 0.75)} ms`;
    } else {
      el.digitalPreviewOutput.textContent =
        `${preview.bits} | OOK | T=${config.bitMs} ms | PW=${config.pulseWidthMs} ms | ${preview.blocks.length} pulses`;
    }
    renderProtocolParameterList(config, preview);
    renderProtocolTermDiagram(config, preview);
  } catch (error) {
    el.digitalPreviewOutput.textContent = error.message || String(error);
    renderProtocolParameterList();
    renderProtocolTermDiagram();
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

  upsertProtocolBlock(protocolFromGenerated(config, preview, generatedBlocks));
  blockTimelineMinimumEndMs = Math.max(blockTimelineMinimumEndMs, preview.endMs);
  renderBlocks();
  updateDigitalPreview();
  appendLog(
    "!",
    `Saved protocol ${config.name}: ${config.encoding} on ${config.channelId}`,
  );

  if (run) {
    const command = buildDigitalTxCommand(config, preview);
    if (command) {
      sendCommand(command);
    } else {
      appendLog("!", "This protocol uses browser-timed SET commands because firmware TXBITS supports only 4/8-bit digital protocols");
      runProgram(buildBlockProgramEvents(), config.name);
    }
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
  sortedBlocks.forEach((block, index) => {
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
    title.textContent = `Block ${index + 1} | ${block.color} | A=${block.brightness}`;
    const meta = document.createElement("span");
    meta.className = "clip-list-meta";
    meta.textContent = `start ${block.startMs} ms, width ${block.durationMs} ms`;
    main.append(title, meta);

    const duration = document.createElement("span");
    duration.className = "clip-list-meta";
    duration.textContent = `${block.durationMs} ms`;

    button.append(swatch, main, duration);
    el.clipList.appendChild(button);
  });
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

  const track = document.createElement("div");
  track.className = "timeline-track";

  const label = document.createElement("div");
  label.className = "track-label";
  label.textContent = "Pulse";

  const lane = document.createElement("div");
  lane.className = "track-lane";

  for (const block of [...timelineBlocks].sort((a, b) => a.startMs - b.startMs)) {
    const channel = channelById(block.color);
    const clip = document.createElement("button");
    clip.className = "timeline-clip";
    clip.type = "button";
    clip.style.left = `${(block.startMs / maxTime) * 100}%`;
    clip.style.width = `${Math.max(0.8, (block.durationMs / maxTime) * 100)}%`;
    clip.style.background = channel.color;
    clip.style.opacity = String(0.3 + (block.brightness / 1000) * 0.7);
    clip.setAttribute("aria-selected", String(block.id === selectedTimelineBlockId));
    clip.textContent = `${block.color} ${block.brightness}`;
    clip.title = `${block.color}: ${block.startMs}-${timelineEndMs(block)} ms, ${block.brightness}/1000`;
    clip.addEventListener("click", () => selectTimelineBlock(block.id));
    lane.appendChild(clip);
  }

  track.append(label, lane);
  el.clipTimeline.appendChild(track);
}

function blockBrightnessAt(channelId, timeMs) {
  return timelineBlocks
    .filter((block) =>
      block.color === channelId &&
      block.startMs <= timeMs &&
      timeMs < timelineEndMs(block))
    .reduce((max, block) => Math.max(max, block.brightness), 0);
}

function protocolBrightnessAt(timeMs) {
  return timelineBlocks
    .filter((block) => block.startMs <= timeMs && timeMs < timelineEndMs(block))
    .reduce((max, block) => Math.max(max, block.brightness), 0);
}

function drawSingleProtocolPlot(svg, maxTime) {
  svg.replaceChildren();

  const width = 820;
  const height = 260;
  const margin = { top: 28, right: 40, bottom: 42, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const duration = Math.max(1, maxTime);
  const color = channelById(timelineBlocks[0]?.color || el.digitalChannelInput.value || channels[0].id).color;

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

  for (const tick of [0, duration / 4, duration / 2, (duration * 3) / 4, duration]) {
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

  const timePoints = new Set([0, duration]);
  for (const block of timelineBlocks) {
    timePoints.add(block.startMs);
    timePoints.add(timelineEndMs(block));
  }

  const sortedTimes = [...timePoints].sort((a, b) => a - b);
  let pathData = `M ${x(0)} ${y(protocolBrightnessAt(0))}`;
  for (let i = 1; i < sortedTimes.length; i += 1) {
    const nextTime = sortedTimes[i];
    pathData += ` H ${x(nextTime)} V ${y(protocolBrightnessAt(nextTime))}`;
  }
  pathData += ` H ${x(duration)}`;

  svg.appendChild(createSvgElement("path", {
    d: pathData,
    class: "plot-line",
    stroke: color,
  }));
}

function renderBlockPreviewPlot() {
  const maxTime = blockTimelineDurationMs();
  drawSingleProtocolPlot(el.blockPreviewPlot, maxTime);
}

function renderBlocks() {
  if (!selectedTimelineBlock() && timelineBlocks.length > 0) {
    selectedTimelineBlockId = timelineBlocks[0].id;
  }
  syncClipEditor();
  renderClipList();
  renderProtocolBlockList();
  renderClipTimeline();
  renderBlockPreviewPlot();
}

function currentStateBrightness(channelId) {
  const current = state.get(channelId);
  if (!current?.on) {
    return 0;
  }
  return clampTimelineBrightness(current.duty);
}

function brightnessCommands(channelId, brightness) {
  const duty = clampTimelineBrightness(brightness);
  if (duty <= 0) {
    return [`SET,${channelId},0,0`];
  }
  return [`SET,${channelId},1,${duty}`];
}

function addBrightnessChangeEvent(grouped, timeMs, changes) {
  const sorted = [...changes].sort((a, b) => {
    const aOn = a.brightness > 0 ? 0 : 1;
    const bOn = b.brightness > 0 ? 0 : 1;
    if (aOn !== bOn) {
      return aOn - bOn;
    }
    return channelOrder(a.channelId) - channelOrder(b.channelId);
  });
  addProgramEvent(
    grouped,
    timeMs,
    sorted.flatMap((change) => brightnessCommands(change.channelId, change.brightness)),
    sorted,
  );
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
  const lastBrightness = new Map(channels.map((channel) => [channel.id, currentStateBrightness(channel.id)]));
  const forcedSync = new Map();

  for (const instance of timelineProtocolInstances) {
    const command = protocolNativeCommand(instance);
    if (!command) {
      continue;
    }

    const channelId = instance.config?.channelId || channels[0].id;
    addProgramEvent(
      grouped,
      instance.startMs,
      [command],
      [{ channelId, brightness: timelineProtocolBrightnessAt(channelId, instance.startMs) }],
    );

    const endMs = timelineProtocolInstanceEndMs(instance);
    if (!forcedSync.has(endMs)) {
      forcedSync.set(endMs, new Set());
    }
    forcedSync.get(endMs).add(channelId);
  }

  const times = new Set([0, timelineEventDurationMs()]);
  for (const row of timelineRows) {
    times.add(row.timeMs);
  }
  for (const instance of timelineProtocolInstances) {
    if (protocolCanRunNatively(instance)) {
      times.add(instance.startMs);
      times.add(timelineProtocolInstanceEndMs(instance));
      continue;
    }
    for (const block of instance.blocks) {
      times.add(instance.startMs + block.startMs);
      times.add(instance.startMs + timelineEndMs(block));
    }
  }
  for (const timeMs of forcedSync.keys()) {
    times.add(timeMs);
  }

  for (const timeMs of [...times].sort((a, b) => a - b)) {
    const changes = [];
    for (const channel of channels) {
      if (nativeProtocolActiveAt(channel.id, timeMs)) {
        continue;
      }
      const brightness = timelineBrightnessAt(channel.id, timeMs, { includeNative: false });
      const forced = forcedSync.get(timeMs)?.has(channel.id) || false;
      if (!forced && brightness === lastBrightness.get(channel.id)) {
        continue;
      }

      lastBrightness.set(channel.id, brightness);
      changes.push({ channelId: channel.id, brightness });
    }

    if (changes.length > 0) {
      addBrightnessChangeEvent(grouped, timeMs, changes);
    }
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

  const lastBrightness = new Map(channels.map((channel) => [channel.id, currentStateBrightness(channel.id)]));

  for (const timeMs of [...times].sort((a, b) => a - b)) {
    const changes = [];
    for (const channel of channels) {
      const brightness = blockBrightnessAt(channel.id, timeMs);
      if (brightness === lastBrightness.get(channel.id)) {
        continue;
      }
      lastBrightness.set(channel.id, brightness);
      changes.push({ channelId: channel.id, brightness });
    }

    if (changes.length > 0) {
      addBrightnessChangeEvent(grouped, timeMs, changes);
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

function applyFirmwareLine(line) {
  if (!line.startsWith("FW,")) {
    return;
  }

  const info = new Map();
  for (const part of line.slice(3).split(",")) {
    const index = part.indexOf("=");
    if (index <= 0) {
      continue;
    }
    info.set(part.slice(0, index).trim().toUpperCase(), part.slice(index + 1).trim());
  }

  const version = info.get("VERSION") || "unknown";
  const name = info.get("NAME") || "firmware";
  const sdk = info.get("SDK") || "";
  const capabilities = info.get("CAPS") || "";
  const build = info.get("BUILD") || "";
  firmwareCapabilities = new Set(capabilities.split("+").map((value) => value.trim()).filter(Boolean));
  secureDfuSupported = firmwareCapabilities.has("SECURE_DFU");
  firmwareDetail = [version, name, sdk, capabilities && `CAPS=${capabilities}`, build].filter(Boolean).join(" | ");
  renderFirmwareVersion();
  refreshDfuUi();
}

function applyResetLine(line) {
  if (!line.startsWith("RST,")) {
    return;
  }

  const info = new Map();
  for (const part of line.slice(4).split(",")) {
    const index = part.indexOf("=");
    if (index <= 0) {
      continue;
    }
    info.set(part.slice(0, index).trim().toUpperCase(), part.slice(index + 1).trim());
  }

  const reason = info.get("REASON") || "unknown";
  const raw = info.get("RAW") || "";
  resetDetail = [reason, raw].filter(Boolean).join(" ");
  renderFirmwareVersion();
}

function renderFirmwareVersion() {
  const resetText = resetDetail ? ` | Reset: ${resetDetail}` : "";
  el.firmwareVersion.textContent = `FW: ${firmwareDetail}${resetText}`;
}

function setDfuProgress(value, text) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  dfuState.progress = percent;
  el.dfuProgressBar.style.width = `${percent.toFixed(1)}%`;
  el.dfuProgressTrack.setAttribute("aria-valuenow", percent.toFixed(1));
  el.dfuProgressPercent.textContent = `${percent.toFixed(1)}%`;
  el.dfuProgressText.textContent = text;
}

function refreshDfuUi() {
  const webBluetoothReady = Boolean(window.isSecureContext && navigator.bluetooth);
  const packageReady = Boolean(dfuState.pkg) && !dfuState.transferring && !dfuState.completed;
  const connected = isConnected();
  el.dfuFile.disabled = !webBluetoothReady || dfuState.transferring;
  el.enterDfuButton.disabled = !(connected && secureDfuSupported && packageReady);
  // A recovery-window DfuTarg may be used without an application connection.
  el.transferDfuButton.disabled = !webBluetoothReady || !packageReady;
  el.verifyDfuButton.disabled = !dfuState.completed;
  if (!webBluetoothReady) {
    el.dfuCapabilityState.textContent = "Secure context (HTTPS or localhost) and Web Bluetooth are required.";
  } else if (!connected) {
    el.dfuCapabilityState.textContent = secureDfuSupported ? "Application disconnected. A selected signed ZIP can be sent to a visible DfuTarg recovery window." : "Connect to the LED application to check Secure DFU capability, or use an already-visible DfuTarg recovery window.";
  } else if (secureDfuSupported) {
    el.dfuCapabilityState.textContent = "SECURE_DFU capability detected. Entering DFU turns all LED channels off before reset.";
  } else {
    el.dfuCapabilityState.textContent = "Connected firmware does not declare SECURE_DFU. Install the initial Secure DFU image through verified SWD first.";
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipEntries(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP end-of-central-directory was not found.");
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map();
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Malformed ZIP central directory.");
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const uncompressed = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    entries.set(name, { name, method, compressed, uncompressed, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { buffer, entries };
}

async function unzipEntry(zip, entry) {
  const view = new DataView(zip.buffer);
  const source = new Uint8Array(zip.buffer);
  const offset = entry.localOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) throw new Error(`Malformed local ZIP entry: ${entry.name}`);
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + nameLength + extraLength;
  const data = source.slice(dataStart, dataStart + entry.compressed);
  if (entry.method === 0) return data;
  if (entry.method === 8 && "DecompressionStream" in window) {
    return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  }
  throw new Error(`ZIP compression method ${entry.method} is not supported by this browser.`);
}

async function inspectDfuPackage(file) {
  const archive = await file.arrayBuffer();
  const zip = zipEntries(archive);
  const manifestEntry = zip.entries.get("manifest.json");
  if (!manifestEntry) throw new Error("manifest.json is missing from the ZIP.");
  const manifest = JSON.parse(decoder.decode(await unzipEntry(zip, manifestEntry)));
  const root = manifest.manifest;
  if (!root || !root.application || Object.keys(root).length !== 1) {
    throw new Error("Only an application-only nrfutil Secure DFU ZIP is accepted.");
  }
  const application = root.application;
  if (!application.bin_file || !application.dat_file) throw new Error("Application manifest lacks bin_file or dat_file.");
  const binaryEntry = zip.entries.get(application.bin_file);
  const datEntry = zip.entries.get(application.dat_file);
  if (!binaryEntry || !datEntry) throw new Error("Manifest file reference is absent from the ZIP.");
  const binary = await unzipEntry(zip, binaryEntry);
  const dat = await unzipEntry(zip, datEntry);
  if (!binary.length || !dat.length) throw new Error("The application binary or init packet is empty.");
  const archiveSha256 = globalThis.crypto?.subtle
    ? Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", archive))).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()
    : null;
  return { binary, dat, binaryName: application.bin_file, datName: application.dat_file, archiveSha256 };
}

async function onDfuFile() {
  const file = el.dfuFile.files?.[0] || null;
  dfuState.file = file;
  dfuState.pkg = null;
  dfuState.completed = false;
  setDfuProgress(0, "Transfer not started.");
  if (!file) {
    el.dfuPackageState.textContent = "No package selected.";
    refreshDfuUi();
    return;
  }
  try {
    el.dfuPackageState.textContent = "Checking ZIP structure…";
    const pkg = await inspectDfuPackage(file);
    dfuState.pkg = pkg;
    el.dfuPackageState.textContent = `Structure valid: ${pkg.binaryName} (${pkg.binary.length.toLocaleString()} B), ${pkg.datName} (${pkg.dat.length.toLocaleString()} B).${pkg.archiveSha256 ? ` SHA-256 ${pkg.archiveSha256}.` : ""} Bootloader signature validation remains pending.`;
    setDfuProgress(0, "ZIP structure verified. Connect the LED application and enter DFU, or select an already-visible DfuTarg recovery window.");
    appendLog("!", `DFU ZIP structure checked: ${file.name}${pkg.archiveSha256 ? `; SHA-256 ${pkg.archiveSha256}` : ""}. Browser-side signature verification is intentionally not claimed.`);
  } catch (error) {
    el.dfuPackageState.textContent = `Rejected: ${error.message}`;
    setDfuProgress(0, "ZIP rejected before any device write.");
    appendLog("!", `DFU ZIP rejected: ${error.message}`);
  }
  refreshDfuUi();
}

function clearScheduledLightCommands() {
  programTimers.forEach((timer) => window.clearTimeout(timer));
  programTimers = [];
  runningProgramLabel = "";
}

async function enterDfu() {
  if (!dfuState.pkg || !isConnected() || !secureDfuSupported) return;
  if (!window.confirm("Enter the Secure DFU bootloader? All LEDs will be turned off and the application BLE connection will disconnect.")) return;
  try {
    clearScheduledLightCommands();
    expectDfuDisconnect = true;
    refreshDfuUi();
    setDfuProgress(0, "Sending DFU command. The LEDs are being turned off before the application resets.");
    await sendCommand("DFU");
    setDfuProgress(0, "DFU command sent. Wait for the application disconnect, then select DfuTarg.");
  } catch (error) {
    if (expectDfuDisconnect) {
      expectDfuDisconnect = false;
      setDfuProgress(0, "Application link ended during DFU entry. Select DfuTarg only if it is visible.");
      appendLog("!", `DFU write ended with disconnect: ${error.message}. DfuTarg selection remains the required hardware check.`);
    } else {
      setDfuProgress(0, `DFU entry request failed: ${error.message}`);
      appendLog("!", `Could not enter DFU: ${error.message}`);
    }
  }
  refreshDfuUi();
}

function queueDfuGatt(operation) {
  const next = dfuGattQueue.then(operation);
  dfuGattQueue = next.catch(() => undefined);
  return next;
}

async function writeDfuCharacteristic(characteristic, bytes, withResponse = true) {
  if (!characteristic) throw new Error("DFU GATT characteristic is unavailable.");
  if (withResponse && typeof characteristic.writeValueWithResponse === "function") {
    await characteristic.writeValueWithResponse(bytes);
  } else if (!withResponse && typeof characteristic.writeValueWithoutResponse === "function") {
    await characteristic.writeValueWithoutResponse(bytes);
  } else {
    await characteristic.writeValue(bytes);
  }
}

function waitDfuResponse(expectedOpcode, timeoutMs = 10000) {
  if (dfuState.waiter) throw new Error("A DFU control response is already pending.");
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      dfuState.waiter = null;
      reject(new Error(`Timed out waiting for DFU opcode 0x${expectedOpcode.toString(16)}.`));
    }, timeoutMs);
    dfuState.waiter = {
      expectedOpcode,
      resolve: (value) => {
        window.clearTimeout(timer);
        dfuState.waiter = null;
        resolve(value);
      },
    };
  });
}

function onDfuControlNotification(event) {
  const bytes = new Uint8Array(event.target.value.buffer.slice(0));
  const waiter = dfuState.waiter;
  if (bytes[0] === DFU.response && waiter && bytes[1] === waiter.expectedOpcode) {
    waiter.resolve(bytes);
    return;
  }
  appendLog("!", `Unmatched DFU control notification: ${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(" ")}`);
}

async function dfuControl(opcode, payload = new Uint8Array()) {
  const bytes = new Uint8Array(1 + payload.length);
  bytes[0] = opcode;
  bytes.set(payload, 1);
  return queueDfuGatt(async () => {
    const response = waitDfuResponse(opcode);
    await writeDfuCharacteristic(dfuState.control, bytes, true);
    return response;
  });
}

function assertDfuSuccess(response, opcode) {
  if (response[0] !== DFU.response || response[1] !== opcode || response[2] !== DFU.success) {
    throw new Error(`DFU opcode 0x${opcode.toString(16)} failed (result 0x${(response[2] ?? 0).toString(16)}).`);
  }
  return response;
}

async function dfuSelect(type) {
  const response = assertDfuSuccess(await dfuControl(DFU.select, Uint8Array.of(type)), DFU.select);
  if (response.length < 15) throw new Error("Short SELECT_OBJECT response.");
  const view = new DataView(response.buffer, response.byteOffset, response.byteLength);
  return { maxSize: view.getUint32(3, true), offset: view.getUint32(7, true), crc: view.getUint32(11, true) };
}

async function dfuCreate(type, size) {
  const payload = new Uint8Array(5);
  const view = new DataView(payload.buffer);
  payload[0] = type;
  view.setUint32(1, size, true);
  assertDfuSuccess(await dfuControl(DFU.create, payload), DFU.create);
}

async function dfuChecksum() {
  const response = assertDfuSuccess(await dfuControl(DFU.checksum), DFU.checksum);
  if (response.length < 11) throw new Error("Short CALCULATE_CHECKSUM response.");
  const view = new DataView(response.buffer, response.byteOffset, response.byteLength);
  return { offset: view.getUint32(3, true), crc: view.getUint32(7, true) };
}

async function dfuExecute() {
  assertDfuSuccess(await dfuControl(DFU.execute), DFU.execute);
}

async function dfuPacketWithPrn(bytes) {
  return queueDfuGatt(async () => {
    const response = waitDfuResponse(DFU.checksum);
    await writeDfuCharacteristic(dfuState.packet, bytes, false);
    return response;
  });
}

async function transferDfuObject(type, payload, startPercent, endPercent, label) {
  const selected = await dfuSelect(type);
  if (!selected.maxSize) throw new Error("Bootloader returned an invalid maximum object size.");
  if (selected.offset > payload.length) throw new Error(`${label} resume offset exceeds local file length.`);
  if (selected.offset && crc32(payload.slice(0, selected.offset)) !== selected.crc) {
    throw new Error(`${label} resume CRC does not match this ZIP. Transfer stopped.`);
  }
  let offset = selected.offset;
  appendLog("!", `${label}: resume offset ${offset}/${payload.length}.`);
  while (offset < payload.length) {
    const objectEnd = Math.min(offset + selected.maxSize, payload.length);
    await dfuCreate(type, objectEnd - offset);
    while (offset < objectEnd) {
      const packetEnd = Math.min(offset + DFU.packetBytes, objectEnd);
      const response = assertDfuSuccess(await dfuPacketWithPrn(payload.slice(offset, packetEnd)), DFU.checksum);
      if (response.length < 11) throw new Error("Short packet receipt notification.");
      const view = new DataView(response.buffer, response.byteOffset, response.byteLength);
      const remoteOffset = view.getUint32(3, true);
      const remoteCrc = view.getUint32(7, true);
      const localCrc = crc32(payload.slice(0, packetEnd));
      if (remoteOffset !== packetEnd || remoteCrc !== localCrc) {
        throw new Error(`${label} CRC/offset mismatch at ${packetEnd}. Transfer stopped.`);
      }
      offset = packetEnd;
      const progress = startPercent + (endPercent - startPercent) * (offset / payload.length);
      setDfuProgress(progress, `${label}: ${offset.toLocaleString()} / ${payload.length.toLocaleString()} bytes, CRC verified.`);
    }
    const check = await dfuChecksum();
    if (check.offset !== offset || check.crc !== crc32(payload.slice(0, offset))) {
      throw new Error(`${label} final object CRC mismatch.`);
    }
    await dfuExecute();
  }
}

async function selectDfuAndTransfer() {
  if (!dfuState.pkg || dfuState.transferring || dfuState.completed) return;
  if (!window.confirm("The browser will ask you to select DfuTarg. The selected signed ZIP will be transferred with CRC verification. Continue?")) return;
  try {
    setDfuProgress(0, "Choose the intended DfuTarg (Nordic Secure DFU service FE59) in the browser picker.");
    const target = await navigator.bluetooth.requestDevice({ filters: [{ services: [DFU_SERVICE_UUID] }] });
    dfuState.device = target;
    appendLog("!", `DfuTarg selected: ${target.name || "unnamed DFU peripheral"}.`);
    target.addEventListener("gattserverdisconnected", () => appendLog("!", "DFU peripheral disconnected (expected after final execute)."));
    dfuState.server = await target.gatt.connect();
    const service = await dfuState.server.getPrimaryService(DFU_SERVICE_UUID);
    dfuState.control = await service.getCharacteristic(DFU_CONTROL_UUID);
    dfuState.packet = await service.getCharacteristic(DFU_PACKET_UUID);
    await dfuState.control.startNotifications();
    dfuState.control.addEventListener("characteristicvaluechanged", onDfuControlNotification);
    dfuState.transferring = true;
    refreshDfuUi();
    setDfuProgress(0, "DfuTarg connected. Setting packet receipt notification interval to 1.");
    assertDfuSuccess(await dfuControl(DFU.setPrn, new Uint8Array([1, 0])), DFU.setPrn);
    await transferDfuObject(DFU.commandObject, dfuState.pkg.dat, 0, 10, "Init packet");
    await transferDfuObject(DFU.dataObject, dfuState.pkg.binary, 10, 100, "Application");
    dfuState.completed = true;
    setDfuProgress(100, "Secure DFU transfer protocol completed. Reconnect to 6COLOR_LIGHT and query VERSION to verify the application.");
    appendLog("!", "DFU protocol complete. The target bootloader decided signature acceptance and application activation; reconnect verification is still required.");
  } catch (error) {
    setDfuProgress(dfuState.progress, `DFU stopped after ${dfuState.progress.toFixed(1)}%: ${error.message}`);
    appendLog("!", `DFU failed safely: ${error.message}`);
  } finally {
    dfuState.transferring = false;
    refreshDfuUi();
  }
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
    applyFirmwareLine(trimmed);
    applyResetLine(trimmed);
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
    const dfuTransition = expectDfuDisconnect;
    expectDfuDisconnect = false;
    rxCharacteristic = null;
    txCharacteristic = null;
    server = null;
    setConnectionStatus(false);
    firmwareDetail = "unknown";
    resetDetail = "";
    firmwareCapabilities = new Set();
    secureDfuSupported = false;
    renderFirmwareVersion();
    if (dfuTransition) {
      setDfuProgress(0, "Application disconnected for DFU. Select only the intended DfuTarg (FE59) to upload.");
      appendLog("!", "DFU transition disconnect observed. Select DfuTarg now.");
    } else {
      appendLog("!", "Device disconnected");
    }
    refreshDfuUi();
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
  await sendCommand("VERSION");
}

async function disconnect() {
  if (device?.gatt?.connected) {
    device.gatt.disconnect();
  }
  rxCharacteristic = null;
  txCharacteristic = null;
  setConnectionStatus(false);
  firmwareDetail = "unknown";
  resetDetail = "";
  firmwareCapabilities = new Set();
  secureDfuSupported = false;
  renderFirmwareVersion();
  refreshDfuUi();
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
el.versionButton.addEventListener("click", () => sendCommand("VERSION"));
el.allOnButton.addEventListener("click", () => sendAll(true));
el.allOffButton.addEventListener("click", () => sendAll(false));
el.allMaxButton.addEventListener("click", () => sendAll(true, 1000));
el.manualTabButton.addEventListener("click", () => setActiveTab("manual"));
el.timelineTabButton.addEventListener("click", () => setActiveTab("timeline"));
el.blocksTabButton.addEventListener("click", () => setActiveTab("blocks"));
el.addTimelineRowButton.addEventListener("click", () => addTimelineRow());
el.sortTimelineRowsButton.addEventListener("click", () => {
  sortTimelineRows();
  sortTimelineProtocolInstances();
  renderTimeline();
});
el.clearTimelineRowsButton.addEventListener("click", () => {
  timelineRows.splice(0, timelineRows.length);
  timelineProtocolInstances.splice(0, timelineProtocolInstances.length);
  renderTimeline();
});
el.importTimelineCsvButton.addEventListener("click", () => {
  el.timelineCsvInput.click();
});
el.exportTimelineCsvButton.addEventListener("click", exportTimelineCsv);
el.timelineCsvInput.addEventListener("change", async () => {
  const [file] = el.timelineCsvInput.files;
  if (file) {
    try {
      await importTimelineCsv(file);
    } catch (error) {
      appendLog("!", error.message || String(error));
    }
  }
  el.timelineCsvInput.value = "";
});
el.addProtocolToTimelineButton.addEventListener("click", addSelectedProtocolToTimeline);
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
  protocolBlocks.splice(0, protocolBlocks.length);
  selectedProtocolBlockId = null;
  timelineBlocks.splice(0, timelineBlocks.length);
  selectedTimelineBlockId = null;
  blockTimelineMinimumEndMs = 1000;
  renderBlocks();
  renderTimelineProtocolOptions();
  updateDigitalPreview();
  appendLog("!", "Cleared protocol blocks");
});
el.importProtocolCsvButton.addEventListener("click", () => {
  el.protocolCsvInput.click();
});
el.exportProtocolCsvButton.addEventListener("click", exportProtocolCsv);
el.protocolCsvInput.addEventListener("change", async () => {
  const [file] = el.protocolCsvInput.files;
  if (file) {
    try {
      await importProtocolCsv(file);
    } catch (error) {
      appendLog("!", error.message || String(error));
    }
  }
  el.protocolCsvInput.value = "";
});
el.runBlocksButton.addEventListener("click", () => {
  runProgram(buildBlockProgramEvents(), "Protocols");
});
el.stopBlocksButton.addEventListener("click", stopProgram);
el.generateDigitalBlocksButton.addEventListener("click", () => generateDigitalBlocks({ append: false }));
el.appendDigitalBlocksButton.addEventListener("click", () => generateDigitalBlocks({ append: true }));
el.runDigitalBlocksButton.addEventListener("click", () => generateDigitalBlocks({ append: false, run: true }));
[
  el.digitalNameInput,
  el.digitalChannelInput,
  el.digitalFormatInput,
  el.digitalWidthInput,
  el.digitalEncodingInput,
  el.digitalLevelsInput,
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
el.dfuFile.addEventListener("change", () => { void onDfuFile(); });
el.enterDfuButton.addEventListener("click", () => { void enterDfu(); });
el.transferDfuButton.addEventListener("click", () => { void selectDfuAndTransfer(); });
el.verifyDfuButton.addEventListener("click", () => { void connect(); });

channels.forEach(renderChannel);
renderClipColorOptions();
renderDigitalChannelOptions();
updateDigitalPreview();
renderTimeline();
renderBlocks();
setConnectionStatus(false);
refreshDfuUi();
