(function () {
  const SERIAL_IDLE_CHECK_MS = 10000;
  let watchdogTimer = null;
  let watchdogBusy = false;

  function firmwareVersionDetected() {
    return typeof state !== "undefined" && !!state.firmwareVersion;
  }

  function stampSerialActivity(kind) {
    if (typeof state === "undefined") return;
    const now = performance.now();
    state.lastSerialActivityMs = now;
    if (kind === "rx") state.lastSerialRxMs = now;
    if (kind === "tx") state.lastSerialTxMs = now;
  }

  async function checkSerialConnection() {
    if (watchdogBusy || !state.connected || !state.port || !firmwareVersionDetected()) return;
    const last = state.lastSerialRxMs || state.lastSerialTxMs || state.lastSerialActivityMs || performance.now();
    if (performance.now() - last < SERIAL_IDLE_CHECK_MS) return;

    watchdogBusy = true;
    try {
      if (!state.port.readable || !state.port.writable) throw new Error("serial stream closed");
      if (typeof state.port.getSignals === "function") await state.port.getSignals();
      stampSerialActivity("rx");
    } catch (error) {
      logLine(`[serial watchdog] ${error.message}; switching to disconnected state`);
      await disconnectSerial();
    } finally {
      watchdogBusy = false;
    }
  }

  function startSerialWatchdog() {
    if (!state.connected || !state.port || !firmwareVersionDetected() || watchdogTimer) return;
    stopSerialWatchdog();
    stampSerialActivity("rx");
    watchdogTimer = setInterval(checkSerialConnection, 1000);
    logLine(`[serial watchdog] enabled after FW ${state.firmwareVersion} detected`);
  }

  function stopSerialWatchdog() {
    if (watchdogTimer) clearInterval(watchdogTimer);
    watchdogTimer = null;
  }

  const baseSetConnected = setConnected;
  setConnected = function patchedSetConnected(connected) {
    baseSetConnected(connected);
    if (!connected) stopSerialWatchdog();
  };

  const baseHandleFirmwareVersionReply = handleFirmwareVersionReply;
  handleFirmwareVersionReply = function patchedHandleFirmwareVersionReply(text) {
    const handled = baseHandleFirmwareVersionReply(text);
    if (handled) startSerialWatchdog();
    return handled;
  };

  const baseHandleSerialText = handleSerialText;
  handleSerialText = function patchedHandleSerialText(chunk) {
    stampSerialActivity("rx");
    return baseHandleSerialText(chunk);
  };

  const baseSendCommand = sendCommand;
  sendCommand = async function patchedSendCommand(command, options = {}) {
    stampSerialActivity("tx");
    try {
      return await baseSendCommand(command, options);
    } catch (error) {
      if (state.connected && /disconnect|closed|lost|device|network/i.test(error.message || "")) {
        logLine(`[serial error] ${error.message}; switching to disconnected state`);
        await disconnectSerial();
      }
      throw error;
    }
  };
})();
