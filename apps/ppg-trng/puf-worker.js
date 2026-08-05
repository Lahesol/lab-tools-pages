importScripts("./puf.js?v=20260806-puf-v7");

self.onmessage = (event) => {
  try {
    const result = self.YmPpgPuf.evaluate(event.data.responses, event.data.options || {});
    result.responses = [];
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({ type: "error", message: error.message || String(error) });
  }
};
