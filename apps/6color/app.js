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
    { on: true, pwm: true, duty: 1000, pulse: false, pulseOnUs: 100000, pulseOffUs: 100000 },
  ]),
);

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

function channelCommand(channelId, nextState = state.get(channelId)) {
  const on = nextState.on ? 1 : 0;
  const duty = nextState.pwm ? nextState.duty : 1000;
  return `SET,${channelId},${on},${duty}`;
}

function clampPulseUs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 100000;
  }
  return Math.max(10, Math.min(60000000, Math.round(numeric)));
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
      `${current.on ? "ON" : "OFF"} | PWM ${current.pwm ? "ON" : "OFF"} | ${compactDuty(current.duty)} | ${compactPulse(current)}`;
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
    sync();
    await sendCommand(channelCommand(channel.id, current));
  });

  pwmButton.addEventListener("click", async () => {
    const current = state.get(channel.id);
    current.pwm = !current.pwm;
    sync();
    await sendCommand(channelCommand(channel.id, current));
  });

  slider.addEventListener("input", () => {
    const current = state.get(channel.id);
    current.duty = Number(slider.value);
    sync();
  });

  slider.addEventListener("change", async () => {
    const current = state.get(channel.id);
    await sendCommand(channelCommand(channel.id, current));
  });

  quickButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const current = state.get(channel.id);
      current.pwm = true;
      current.duty = Number(button.dataset.duty);
      sync();
      await sendCommand(channelCommand(channel.id, current));
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
      `${current.on ? "ON" : "OFF"} | PWM ${current.pwm ? "ON" : "OFF"} | ${compactDuty(current.duty)} | ${compactPulse(current)}`;
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
    if (duty !== null) {
      current.pwm = duty < 1000;
      current.duty = duty;
    }
  }
  syncAllCards();

  const first = state.get(channels[0].id);
  await sendCommand(`SET,ALL,${first.on ? 1 : 0},${first.duty}`);
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
setConnectionStatus(false);
