(function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function key(layerIndex, deviceIndex) {
    return `L${layerIndex}D${deviceIndex}`;
  }

  function parse(deviceKey) {
    const match = /^L(\d+)D(\d+)$/.exec(deviceKey || "");
    if (!match) return null;
    return { layerIndex: Number(match[1]), deviceIndex: Number(match[2]) };
  }

  function layerKeys(state, layerIndex, maxPerLayer) {
    const layer = state.layers[layerIndex];
    const count = Math.min(layer?.devices || 0, maxPerLayer);
    return Array.from({ length: count }, (_, deviceIndex) => key(layerIndex, deviceIndex));
  }

  function allKeys(state, maxPerLayer) {
    return state.layers.flatMap((_, layerIndex) => layerKeys(state, layerIndex, maxPerLayer));
  }

  function zeroTrace(length) {
    return new Array(length).fill(0);
  }

  function normalizeTrace(trace) {
    const peak = Math.max(...trace.map((value) => Math.abs(value)), 1);
    return trace.map((value) => clamp(value / peak, 0, 1.8));
  }

  function meanTrace(devices, length) {
    if (!devices.length) return zeroTrace(length);
    const out = zeroTrace(length);
    devices.forEach((device) => {
      device.trace.forEach((value, index) => {
        out[index] += value;
      });
    });
    return out.map((value) => value / devices.length);
  }

  function combineDrives(drives, length) {
    if (!drives.length) return zeroTrace(length);
    const norm = Math.max(1, Math.sqrt(drives.length));
    const out = zeroTrace(length);
    for (let index = 0; index < length; index += 1) {
      let sum = 0;
      drives.forEach((drive) => {
        sum += drive[index] || 0;
      });
      out[index] = clamp(sum / norm, 0, 1.8);
    }
    return out;
  }

  function delaySteps(edge, timeline) {
    const delayMs = Number(edge.delayMs || 0);
    if (!delayMs || timeline.length < 2) return 0;
    const totalTime = timeline[timeline.length - 1].t - timeline[0].t;
    const dt = totalTime / Math.max(1, timeline.length - 1);
    return Math.max(0, Math.round((delayMs / 1000) / Math.max(dt, 1e-6)));
  }

  function delayedSignal(values, steps) {
    if (!steps) return values;
    return values.map((_, index) => (index >= steps ? values[index - steps] : 0));
  }

  function edgeDrive(sourceNode, edge, timeline, baseDrive) {
    const weight = Number.isFinite(Number(edge.weight)) ? Number(edge.weight) : 1;
    const coupling = Number.isFinite(Number(edge.coupling)) ? Number(edge.coupling) : 0.86;
    const opticalResidual = Number.isFinite(Number(edge.opticalResidual)) ? Number(edge.opticalResidual) : 0.12;
    const shifted = delayedSignal(sourceNode.signal, delaySteps(edge, timeline));
    return shifted.map((value, index) => clamp(value * weight * coupling + (baseDrive[index] || 0) * opticalResidual, 0, 1.8));
  }

  function buildEdgeMaps(connections, validKeys) {
    const incoming = new Map();
    const outgoing = new Map();
    const clean = [];
    connections.forEach((edge) => {
      if (!validKeys.has(edge.from) || !validKeys.has(edge.to)) return;
      clean.push(edge);
      if (!incoming.has(edge.to)) incoming.set(edge.to, []);
      if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
      incoming.get(edge.to).push(edge);
      outgoing.get(edge.from).push(edge);
    });
    return { incoming, outgoing, clean };
  }

  function layerEdgeCount(edges, layerIndex, direction) {
    return edges.filter((edge) => {
      const parsed = parse(direction === "in" ? edge.to : edge.from);
      return parsed?.layerIndex === layerIndex;
    }).length;
  }

  function sigmoidActivation(mean) {
    const peak = Math.max(...mean, 1);
    return mean.map((value) => {
      const normalized = clamp(value / peak, 0, 1.8);
      return 1 / (1 + Math.exp(-6 * (normalized - 0.48)));
    });
  }

  function simulate(options) {
    const {
      state,
      timeline,
      kind,
      maxPerLayer = 32,
      inputDriveForDevice,
      simulateDeviceTrace,
      tiaGain,
      tiaEnabled,
    } = options;
    const validKeys = new Set(allKeys(state, maxPerLayer));
    const { incoming, outgoing, clean } = buildEdgeMaps(state.connections || [], validKeys);
    const length = timeline.length;
    const nodeMap = {};
    const layers = [];
    let usedEdges = 0;
    let unresolvedEdges = 0;
    let directInputNodes = 0;

    state.layers.forEach((layer, layerIndex) => {
      const devices = [];
      const keys = layerKeys(state, layerIndex, maxPerLayer);

      keys.forEach((deviceKey) => {
        const parsed = parse(deviceKey);
        const incomingEdges = incoming.get(deviceKey) || [];
        const baseDrive = inputDriveForDevice(layerIndex, parsed.deviceIndex);
        const drives = [];

        if (layer.role === "input" || incomingEdges.length === 0) {
          drives.push(baseDrive);
          directInputNodes += 1;
        }

        incomingEdges.forEach((edge) => {
          const sourceNode = nodeMap[edge.from];
          if (!sourceNode) {
            unresolvedEdges += 1;
            return;
          }
          drives.push(edgeDrive(sourceNode, edge, timeline, baseDrive));
          usedEdges += 1;
        });

        const drive = combineDrives(drives, length);
        const device = simulateDeviceTrace(timeline, drive, layer, layerIndex, parsed.deviceIndex, kind);
        const rawSignal = normalizeTrace(device.trace);
        const signal = rawSignal.map((value) => 1 / (1 + Math.exp(-5.4 * (value - 0.38))));
        const node = {
          ...device,
          layerIndex,
          deviceIndex: parsed.deviceIndex,
          drive,
          signal,
          incomingEdges: incomingEdges.length,
          outgoingEdges: outgoing.get(deviceKey)?.length || 0,
        };
        nodeMap[deviceKey] = node;
        devices.push(node);
      });

      const mean = meanTrace(devices, length);
      const peak = Math.max(...mean, 1);
      const residual = mean[mean.length - 1] / peak;
      const tiaEnabledForLayer = devices.some((device) => device.tia) && tiaEnabled;
      const voltage = tiaEnabledForLayer
        ? mean.map((current) => -current * tiaGain * 1e-6)
        : mean.map((current) => current);
      const activation = sigmoidActivation(mean);

      layers.push({
        config: layer,
        layerIndex,
        devices,
        mean,
        voltage,
        activation,
        peak,
        residual,
        displayedDevices: devices.length,
        tiaEnabledForLayer,
        incomingEdges: layerEdgeCount(clean, layerIndex, "in"),
        outgoingEdges: layerEdgeCount(clean, layerIndex, "out"),
      });
    });

    const outputIndex = Math.max(0, state.layers.map((layer) => layer.role).lastIndexOf("output"));
    const selectedIndex = clamp(Number(state.traceLayer) || 0, 0, Math.max(0, layers.length - 1));
    return {
      kind,
      timeline,
      layers,
      selected: layers[selectedIndex] || layers[0],
      output: layers[outputIndex] || layers[layers.length - 1],
      nodeMap,
      graph: {
        mode: "Device graph propagation",
        nodeCount: validKeys.size,
        edgeCount: clean.length,
        usedEdges,
        unresolvedEdges,
        directInputNodes,
        maxPerLayer,
      },
    };
  }

  window.SYNAPTIC_GRAPH_SIM = { simulate };
})();
