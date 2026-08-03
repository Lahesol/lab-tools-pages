importScripts("./puf.js?v=20260803-puf-v1");

self.onmessage = (event) => {
  try {
    const result = self.YmPpgPuf.evaluate(event.data.responses, event.data.options || {});
    result.responses = [];
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({ type: "error", message: error.message || String(error) });
  }
};
