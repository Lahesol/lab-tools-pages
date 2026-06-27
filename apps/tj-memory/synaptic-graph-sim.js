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

  function currentToVoltage(trace, tiaGainKohm) {
    return trace.map((currentNa) => Math.abs(currentNa * tiaGainKohm * 1e-6));
  }

  function driverOutput(voltageTrace, edgeDefaults) {
    const threshold = Number(edgeDefaults?.driverThresholdMv ?? 2) / 1000;
    const driverGain = Number(edgeDefaults?.driverGain ?? 35);
    const driverMax = Number(edgeDefaults?.driverMax ?? 1.4);
    return voltageTrace.map((voltage) => clamp((voltage - threshold) * driverGain, 0, driverMax));
  }

  function sampleDt(timeline, index) {
    if (index <= 0 || timeline.length < 2) {
      const totalTime = timeline[timeline.length - 1]?.t - timeline[0]?.t;
      return Number.isFinite(totalTime) ? totalTime / Math.max(1, timeline.length - 1) : 0.001;
    }
    return Math.max(0.000001, timeline[index].t - timeline[index - 1].t);
  }

  function pulseSteps(timeline, pulseMs) {
    if (timeline.length < 2) return 1;
    const totalTime = timeline[timeline.length - 1].t - timeline[0].t;
    const dt = totalTime / Math.max(1, timeline.length - 1);
    return Math.max(1, Math.round((Number(pulseMs || 0) / 1000) / Math.max(dt, 0.000001)));
  }

  function integrateFireEmitter(continuousOutput, timeline, edgeDefaults) {
    const driverMax = Math.max(0.001, Number(edgeDefaults?.driverMax ?? 1.4));
    const tau = Math.max(0.001, Number(edgeDefaults?.ifTauMs ?? 85) / 1000);
    const threshold = Math.max(0.001, Number(edgeDefaults?.ifThreshold ?? 0.42));
    const gain = Math.max(0, Number(edgeDefaults?.ifGain ?? 1.7));
    const reset = clamp(Number(edgeDefaults?.ifReset ?? 0.05), 0, threshold * 0.95);
    const refractorySec = Math.max(0, Number(edgeDefaults?.ifRefractoryMs ?? 25) / 1000);
    const emitSteps = pulseSteps(timeline, Number(edgeDefaults?.emitterPulseMs ?? 18));
    const output = new Array(continuousOutput.length).fill(0);
    const membrane = new Array(continuousOutput.length).fill(0);
    const spikes = [];
    let u = 0;
    let pulseLeft = 0;
    let refractoryUntil = -Infinity;

    for (let index = 0; index < continuousOutput.length; index += 1) {
      const t = timeline[index]?.t || 0;
      const dt = sampleDt(timeline, index);
      const decay = Math.exp(-dt / tau);
      const drive = clamp((continuousOutput[index] || 0) / driverMax, 0, 1.8);

      if (t >= refractoryUntil) {
        u = u * decay + drive * gain * (1 - decay);
        if (u >= threshold) {
          spikes.push(t);
          u = reset;
          pulseLeft = emitSteps;
          refractoryUntil = t + refractorySec;
        }
      } else {
        u = reset;
      }

      if (pulseLeft > 0) {
        output[index] = driverMax;
        pulseLeft -= 1;
      }
      membrane[index] = u;
    }

    return { output, membrane, spikes, kind: "STM integrate-fire" };
  }

  function ltmLatchReadout(continuousOutput, timeline, edgeDefaults) {
    const driverMax = Math.max(0.001, Number(edgeDefaults?.driverMax ?? 1.4));
    const writeThreshold = clamp(Number(edgeDefaults?.ltmWriteThreshold ?? 0.28), 0, 1.8);
    const readoutGain = Math.max(0, Number(edgeDefaults?.ltmReadoutGain ?? 0.55));
    const tau = Math.max(0.001, Number(edgeDefaults?.ltmRetentionMs ?? 850) / 1000);
    const output = new Array(continuousOutput.length).fill(0);
    const latch = new Array(continuousOutput.length).fill(0);
    let state = 0;

    for (let index = 0; index < continuousOutput.length; index += 1) {
      const dt = sampleDt(timeline, index);
      const drive = clamp((continuousOutput[index] || 0) / driverMax, 0, 1.8);
      state *= Math.exp(-dt / tau);
      if (drive >= writeThreshold) state = Math.max(state, drive);
      latch[index] = state;
      output[index] = clamp(state * driverMax * readoutGain, 0, driverMax);
    }

    return { output, membrane: latch, spikes: [], kind: "LTM latch/readout" };
  }

  function transferOutput(device, readoutVoltage, timeline, edgeDefaults) {
    const continuous = driverOutput(readoutVoltage, edgeDefaults);
    const mode = edgeDefaults?.transferMode || "hybrid";
    const sourceMode = device.mode === "LTM" ? "LTM" : "STM";
    if (mode === "continuous") {
      return { output: continuous, membrane: continuous.map(() => 0), spikes: [], kind: "continuous analog" };
    }
    if (mode === "integrateFire" || (mode === "hybrid" && sourceMode === "STM")) {
      return integrateFireEmitter(continuous, timeline, edgeDefaults);
    }
    if (mode === "ltmLatch" || (mode === "hybrid" && sourceMode === "LTM")) {
      return ltmLatchReadout(continuous, timeline, edgeDefaults);
    }
    return { output: continuous, membrane: continuous.map(() => 0), spikes: [], kind: "continuous analog" };
  }

  function splitterScale(sourceNode, edgeDefaults) {
    const splitterLossDb = Number(edgeDefaults?.splitterLossDb ?? 1.5);
    const loss = 10 ** (-splitterLossDb / 10);
    const fanoutCount = Math.max(1, sourceNode.outgoingEdges || 1);
    return loss / Math.sqrt(fanoutCount);
  }

  function edgeDrive(sourceNode, edge, timeline, baseDrive, edgeDefaults) {
    const weight = Number.isFinite(Number(edge.weight)) ? Number(edge.weight) : 1;
    const coupling = Number.isFinite(Number(edge.coupling)) ? Number(edge.coupling) : Number(edgeDefaults?.coupling ?? 0.86);
    const opticalResidual = Number.isFinite(Number(edge.opticalResidual)) ? Number(edge.opticalResidual) : Number(edgeDefaults?.opticalResidual ?? 0.12);
    const delayEdge = Number.isFinite(Number(edge.delayMs)) ? edge : { ...edge, delayMs: edgeDefaults?.delayMs || 0 };
    const shifted = delayedSignal(sourceNode.opticalOutput || sourceNode.signal, delaySteps(delayEdge, timeline));
    const fanout = splitterScale(sourceNode, edgeDefaults);
    return shifted.map((value, index) => {
      const convertedLight = value * fanout * weight * coupling;
      const residualLight = (baseDrive[index] || 0) * opticalResidual;
      return clamp(convertedLight + residualLight, 0, 1.8);
    });
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
      edgeDefaults = {},
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
          drives.push(edgeDrive(sourceNode, edge, timeline, baseDrive, edgeDefaults));
          usedEdges += 1;
        });

        const drive = combineDrives(drives, length);
        const device = simulateDeviceTrace(timeline, drive, layer, layerIndex, parsed.deviceIndex, kind);
        const readoutVoltage = currentToVoltage(device.trace, tiaGain);
        const continuousOpticalOutput = driverOutput(readoutVoltage, edgeDefaults);
        const transfer = transferOutput(device, readoutVoltage, timeline, edgeDefaults);
        const rawSignal = normalizeTrace(device.trace);
        const signal = rawSignal.map((value) => 1 / (1 + Math.exp(-5.4 * (value - 0.38))));
        const node = {
          ...device,
          layerIndex,
          deviceIndex: parsed.deviceIndex,
          drive,
          readoutVoltage,
          continuousOpticalOutput,
          opticalOutput: transfer.output,
          transferKind: transfer.kind,
          ifMembrane: transfer.membrane,
          emitterSpikes: transfer.spikes,
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
