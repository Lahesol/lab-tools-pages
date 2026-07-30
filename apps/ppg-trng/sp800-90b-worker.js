/* global importScripts, self, YmPpg90b */

importScripts("./sp800-90b.js");

self.onmessage = (event) => {
  try {
    const payload = event.data || {};
    const bits = payload.bits instanceof Uint8Array ? payload.bits : new Uint8Array(payload.bits || []);
    const result = YmPpg90b.run(bits, payload.options || {});
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({ type: "error", message: error?.message || String(error) });
  }
};
