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

let timelineBlockId = 1;
let selectedTimelineBlockId = 1;
const timelineBlocks = [
  { id: timelineBlockId++, startMs: 0, durationMs: 220, color: "R", brightness: 1000 },
  { id: timelineBlockId++, startMs: 260, durationMs: 180, color: "G", brightness: 650 },
  { id: timelineBlockId++, startMs: 520, durationMs: 140, color: "B", brightness: 850 },
  { id: timelineBlockId++, startMs: 740, durationMs: 260, color: "IR", brightness: 500 },
];

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
  manualPanel: document.querySelector("#manualPanel"),
  timelinePanel: document.querySelector("#timelinePanel"),
  addTimelineBlockButton: document.querySelector("#addTimelineBlockButton"),
  sortTimelineButton: document.querySelector("#sortTimelineButton"),
  clearTimelineButton: document.querySelector("#clearTimelineButton"),
  deleteTimelineBlockButton: document.querySelector("#deleteTimelineBlockButton"),
  clipColorInput: document.querySelector("#clipColorInput"),
  clipStartInput: document.querySelector("#clipStartInput"),
  clipDurationInput: document.querySelector("#clipDurationInput"),
  clipBrightnessInput: document.querySelector("#clipBrightnessInput"),
  clipList: document.querySelector("#clipList"),
  clipTimeline: document.querySelector("#clipTimeline"),
  timelineRuler: document.querySelector("#timelineRuler"),
  timelinePlot: document.querySelector("#timelinePlot"),
  timelineDuration: document.querySelector("#timelineDuration"),
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
  const timelineActive = tabName === "timeline";
  el.manualTabButton.setAttribute("aria-selected", String(!timelineActive));
  el.timelineTabButton.setAttribute("aria-selected", String(timelineActive));
  el.manualPanel.hidden = timelineActive;
  el.timelinePanel.hidden = !timelineActive;
  el.manualPanel.classList.toggle("is-active", !timelineActive);
  el.timelinePanel.classList.toggle("is-active", timelineActive);
  if (timelineActive) {
    renderTimeline();
  }
}

function timelineEndMs(block) {
  return block.startMs + block.durationMs;
}

function timelineDurationMs() {
  return Math.max(1000, ...timelineBlocks.map(timelineEndMs));
}

function channelById(channelId) {
  return channels.find((channel) => channel.id === channelId) || channels[0];
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
  selectedTimelineBlockId = block.id;
  renderTimeline();
}

function sortTimelineRows() {
  timelineBlocks.sort((a, b) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs;
    }
    const channelDelta = channels.findIndex((channel) => channel.id === a.color) -
      channels.findIndex((channel) => channel.id === b.color);
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

function createSvgElement(name, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function selectTimelineBlock(blockId) {
  selectedTimelineBlockId = blockId;
  renderTimeline();
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
  el.timelineRuler.replaceChildren();
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i += 1) {
    const tick = document.createElement("div");
    tick.className = "ruler-tick";
    tick.style.left = `${(i / tickCount) * 100}%`;
    const label = document.createElement("span");
    label.textContent = `${Math.round((maxTime * i) / tickCount)} ms`;
    tick.appendChild(label);
    el.timelineRuler.appendChild(tick);
  }
}

function renderClipTimeline() {
  const maxTime = timelineDurationMs();
  el.timelineDuration.textContent = `${maxTime} ms`;
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

function brightnessAt(channelId, timeMs) {
  return timelineBlocks
    .filter((block) =>
      block.color === channelId &&
      block.startMs <= timeMs &&
      timeMs < timelineEndMs(block))
    .reduce((max, block) => Math.max(max, block.brightness), 0);
}

function renderTimelinePlot() {
  const svg = el.timelinePlot;
  svg.replaceChildren();

  const width = 820;
  const height = 260;
  const margin = { top: 28, right: 98, bottom: 42, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxTime = timelineDurationMs();

  const x = (timeMs) => margin.left + (timeMs / maxTime) * plotWidth;
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

  const timeTicks = [0, maxTime / 4, maxTime / 2, (maxTime * 3) / 4, maxTime];
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
    const timePoints = new Set([0, maxTime]);
    for (const block of timelineBlocks.filter((candidate) => candidate.color === channel.id)) {
      timePoints.add(block.startMs);
      timePoints.add(timelineEndMs(block));
    }

    const sortedTimes = [...timePoints].sort((a, b) => a - b);
    let pathData = `M ${x(0)} ${y(brightnessAt(channel.id, 0))}`;

    for (let i = 1; i < sortedTimes.length; i += 1) {
      const previousTime = sortedTimes[i - 1];
      const nextTime = sortedTimes[i];
      const previousBrightness = brightnessAt(channel.id, previousTime);
      const nextBrightness = brightnessAt(channel.id, nextTime);
      pathData += ` H ${x(nextTime)} V ${y(nextBrightness)}`;
      if (i === sortedTimes.length - 1 && previousBrightness !== nextBrightness) {
        pathData += ` H ${x(maxTime)}`;
      }
    }

    pathData += ` H ${x(maxTime)}`;

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

function renderTimeline() {
  if (!selectedTimelineBlock() && timelineBlocks.length > 0) {
    selectedTimelineBlockId = timelineBlocks[0].id;
  }
  syncClipEditor();
  renderClipList();
  renderClipTimeline();
  renderTimelinePlot();
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
el.addTimelineBlockButton.addEventListener("click", () => addTimelineBlock());
el.sortTimelineButton.addEventListener("click", () => {
  sortTimelineRows();
  renderTimeline();
});
el.clearTimelineButton.addEventListener("click", () => {
  timelineBlocks.splice(0, timelineBlocks.length);
  selectedTimelineBlockId = null;
  renderTimeline();
});
el.deleteTimelineBlockButton.addEventListener("click", () => {
  const index = timelineBlocks.findIndex((block) => block.id === selectedTimelineBlockId);
  if (index >= 0) {
    timelineBlocks.splice(index, 1);
    selectedTimelineBlockId = timelineBlocks[0]?.id ?? null;
    renderTimeline();
  }
});
el.clipColorInput.addEventListener("change", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.color = el.clipColorInput.value;
  renderTimeline();
});
el.clipStartInput.addEventListener("input", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.startMs = clampTimelineTime(el.clipStartInput.value);
  renderTimeline();
});
el.clipDurationInput.addEventListener("input", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.durationMs = clampTimelineDuration(el.clipDurationInput.value);
  renderTimeline();
});
el.clipBrightnessInput.addEventListener("input", () => {
  const block = selectedTimelineBlock();
  if (!block) {
    return;
  }
  block.brightness = clampTimelineBrightness(el.clipBrightnessInput.value);
  renderTimeline();
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
renderTimeline();
setConnectionStatus(false);
