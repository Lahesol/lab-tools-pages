window.DEVICE_NETWORK = {
  key(layerIndex, deviceIndex) {
    return `L${layerIndex}D${deviceIndex}`;
  },

  parse(key) {
    const match = /^L(\d+)D(\d+)$/.exec(key || "");
    if (!match) return null;
    return { layerIndex: Number(match[1]), deviceIndex: Number(match[2]) };
  },

  label(state, key) {
    const parsed = this.parse(key);
    if (!parsed) return key;
    const layer = state.layers[parsed.layerIndex];
    if (!layer) return key;
    return `${layer.name} D${parsed.deviceIndex + 1}`;
  },

  deviceCount(state, layerIndex) {
    return Math.max(0, state.layers[layerIndex]?.devices || 0);
  },

  allKeys(state, maxPerLayer = 32) {
    const keys = [];
    state.layers.forEach((layer, layerIndex) => {
      const count = Math.min(layer.devices, maxPerLayer);
      for (let deviceIndex = 0; deviceIndex < count; deviceIndex += 1) {
        keys.push(this.key(layerIndex, deviceIndex));
      }
    });
    return keys;
  },

  inputKeys(state, maxCount = 16) {
    const layerIndex = state.layers.findIndex((layer) => layer.role === "input");
    const index = layerIndex >= 0 ? layerIndex : 0;
    return this.layerKeys(state, index, maxCount);
  },

  outputKeys(state, maxCount = 16) {
    const reversed = [...state.layers].reverse();
    const layer = reversed.find((item) => item.role === "output");
    const layerIndex = layer ? state.layers.indexOf(layer) : state.layers.length - 1;
    return this.layerKeys(state, layerIndex, maxCount);
  },

  layerKeys(state, layerIndex, maxCount = 32) {
    const count = Math.min(this.deviceCount(state, layerIndex), maxCount);
    return Array.from({ length: count }, (_, deviceIndex) => this.key(layerIndex, deviceIndex));
  },

  nextLayerKeys(state, key, maxCount = 12) {
    const parsed = this.parse(key);
    if (!parsed) return [];
    const targetLayer = Math.min(state.layers.length - 1, parsed.layerIndex + 1);
    return this.layerKeys(state, targetLayer, maxCount);
  },

  previousLayerKeys(state, key, maxCount = 12) {
    const parsed = this.parse(key);
    if (!parsed) return [];
    const sourceLayer = Math.max(0, parsed.layerIndex - 1);
    return this.layerKeys(state, sourceLayer, maxCount);
  },

  defaultConnections(state) {
    const connections = [];
    const input = this.inputKeys(state, 4);
    const hidden = this.layerKeys(state, Math.min(1, state.layers.length - 1), 8);
    const output = this.outputKeys(state, 4);
    input.forEach((source, sourceIndex) => {
      hidden.slice(sourceIndex * 2, sourceIndex * 2 + 2).forEach((target) => {
        connections.push({ from: source, to: target, weight: 1 });
      });
    });
    hidden.slice(0, 8).forEach((source, index) => {
      if (output.length) connections.push({ from: source, to: output[index % output.length], weight: 0.75 });
    });
    return connections;
  },

  cleanConnections(state, connections) {
    const valid = new Set(this.allKeys(state, 256));
    const seen = new Set();
    return (connections || []).filter((connection) => {
      const id = `${connection.from}->${connection.to}`;
      if (!valid.has(connection.from) || !valid.has(connection.to) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  },

  fanOut(state, sourceKey, count = 8) {
    return this.nextLayerKeys(state, sourceKey, count).map((target, index) => ({
      from: sourceKey,
      to: target,
      weight: Math.max(0.35, 1 - index * 0.04),
    }));
  },

  fanIn(state, targetKey, count = 8) {
    return this.previousLayerKeys(state, targetKey, count).map((source, index) => ({
      from: source,
      to: targetKey,
      weight: Math.max(0.35, 1 - index * 0.04),
    }));
  },
};
