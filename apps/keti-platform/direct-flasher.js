(function () {
  "use strict";

  const PAGE_SIZE = 4096;
  const PAGE_BUFFER_ADDR = 0x34;
  const HEADER_SIZE = 0x34;
  const MAX_SKETCH_SIZE = 983040;
  const BOOTLOADER_BAUD = 921600;
  const WRITE_TIMEOUT_MS = 5000;
  const FLASH_PROFILES = {
    standard: {
      label: "standard",
      writeTimeoutMs: WRITE_TIMEOUT_MS,
      writeChunkSize: 128,
      writeChunkDelayMs: 2,
      memoryCommandDelayMs: 5,
      memorySettleMs: 10,
      pageWriteAttempts: 2,
      pageRetryDelayMs: 120,
      pageSettleMs: 0,
      eraseSettleMs: 1200,
      resetSettleMs: 250
    },
    compatibility: {
      label: "compatibility",
      writeTimeoutMs: 8000,
      writeChunkSize: 64,
      writeChunkDelayMs: 8,
      memoryCommandDelayMs: 12,
      memorySettleMs: 25,
      pageWriteAttempts: 3,
      pageRetryDelayMs: 500,
      pageSettleMs: 80,
      eraseSettleMs: 2500,
      resetSettleMs: 500
    }
  };
  const ARDUINO_USB_FILTERS = [
    { usbVendorId: 0x2341 },
    { usbVendorId: 0x2a03 }
  ];

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function hex8(value) {
    return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  function bytesToText(bytes) {
    return decoder.decode(bytes).replace(/\0/g, "").trim();
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function withTimeout(promise, timeoutMs, description) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${description} timed out after ${timeoutMs} ms`);
        error.bootloaderTimeout = true;
        error.timeoutDescription = description;
        error.timeoutMs = timeoutMs;
        reject(error);
      }, timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => {
      clearTimeout(timer);
    });
  }

  function resolveFlashProfile(profileOrOptions = "standard") {
    if (typeof profileOrOptions === "string") {
      return FLASH_PROFILES[profileOrOptions] || FLASH_PROFILES.standard;
    }
    const base = FLASH_PROFILES[profileOrOptions?.profile] || FLASH_PROFILES.standard;
    return {
      ...base,
      ...Object.fromEntries(
        Object.entries(profileOrOptions || {}).filter(([key]) => key !== "profile")
      )
    };
  }

  class SerialTransport {
    constructor(port, baudRate, profile) {
      this.port = port;
      this.baudRate = baudRate;
      this.profile = profile;
      this.reader = null;
      this.writer = null;
      this.rx = new Uint8Array(0);
      this.waiters = [];
      this.closed = false;
      this.readPumpTask = null;
      this.writeTimeoutMs = profile.writeTimeoutMs;
      this.writeChunkSize = profile.writeChunkSize;
      this.writeChunkDelayMs = profile.writeChunkDelayMs;
      this.stalled = false;
    }

    async open() {
      await this.port.open({ baudRate: this.baudRate, bufferSize: 65536 });
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();
      this.readPumpTask = this.readPump();
    }

    async readPump() {
      try {
        while (!this.closed) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          if (value && value.length > 0) {
            this.appendRx(value);
          }
        }
      } catch (error) {
        if (!this.closed) {
          this.rejectWaiters(error);
        }
      }
    }

    appendRx(value) {
      const combined = new Uint8Array(this.rx.length + value.length);
      combined.set(this.rx, 0);
      combined.set(value, this.rx.length);
      this.rx = combined;
      this.resolveWaiters();
    }

    resolveWaiters() {
      const waiters = this.waiters.splice(0);
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.resolve();
      }
    }

    rejectWaiters(error) {
      const waiters = this.waiters.splice(0);
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.reject(error);
      }
    }

    waitForData(timeoutMs) {
      if (this.rx.length > 0) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const waiter = {
          resolve,
          reject,
          timer: setTimeout(() => {
            this.waiters = this.waiters.filter((item) => item !== waiter);
            reject(new Error(`Timed out waiting for ${timeoutMs} ms of bootloader data`));
          }, timeoutMs)
        };
        this.waiters.push(waiter);
      });
    }

    async readBytes(count, timeoutMs = 2000) {
      while (this.rx.length < count) {
        await this.waitForData(timeoutMs);
      }
      const result = this.rx.slice(0, count);
      this.rx = this.rx.slice(count);
      return result;
    }

    async readTextUntilIdle(firstTimeoutMs = 2000, idleMs = 80, maxBytes = 512) {
      await this.waitForData(firstTimeoutMs);
      while (this.rx.length < maxBytes) {
        const before = this.rx.length;
        await sleep(idleMs);
        if (this.rx.length === before) {
          break;
        }
      }
      const count = Math.min(maxBytes, this.rx.length);
      const result = this.rx.slice(0, count);
      this.rx = this.rx.slice(count);
      return bytesToText(result);
    }

    discardRx() {
      this.rx = new Uint8Array(0);
    }

    async writeAscii(command) {
      try {
        await withTimeout(
          this.writer.ready,
          this.writeTimeoutMs,
          `Waiting bootloader writer for command ${command.slice(0, 1) || "?"}`
        );
        await withTimeout(
          this.writer.write(encoder.encode(command)),
          this.writeTimeoutMs,
          `Writing bootloader command ${command.slice(0, 1) || "?"}`
        );
      } catch (error) {
        if (error.bootloaderTimeout) {
          this.stalled = true;
          error.transportStalled = true;
        }
        throw error;
      }
    }

    async writeBytes(bytes) {
      for (let offset = 0; offset < bytes.length; offset += this.writeChunkSize) {
        const chunk = bytes.slice(offset, Math.min(offset + this.writeChunkSize, bytes.length));
        try {
          await withTimeout(
            this.writer.ready,
            this.writeTimeoutMs,
            `Waiting bootloader writer for bytes ${offset}-${offset + chunk.length} of ${bytes.length}`
          );
          await withTimeout(
            this.writer.write(chunk),
            this.writeTimeoutMs,
            `Writing bootloader bytes ${offset}-${offset + chunk.length} of ${bytes.length}`
          );
        } catch (error) {
          if (error.bootloaderTimeout) {
            this.stalled = true;
            error.transportStalled = true;
          }
          throw error;
        }
        if (this.writeChunkDelayMs > 0 && offset + chunk.length < bytes.length) {
          await sleep(this.writeChunkDelayMs);
        }
      }
    }

    async close() {
      this.closed = true;
      this.rejectWaiters(new Error("Transport closed"));

      if (this.writer) {
        try {
          if (typeof this.writer.abort === "function") {
            await Promise.race([
              this.writer.abort(new Error("Transport closed")),
              sleep(500)
            ]);
          }
        } catch (error) {
          // Ignore abort errors during teardown.
        }
        try {
          this.writer.releaseLock();
        } catch (error) {
          // Ignore release errors during teardown.
        }
      }

      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch (error) {
          // Ignore cancel errors during teardown.
        }
        try {
          await this.readPumpTask;
        } catch (error) {
          // Ignore read-pump errors during teardown.
        }
        try {
          this.reader.releaseLock();
        } catch (error) {
          // Ignore release errors during teardown.
        }
      }

      try {
        await this.port.close();
      } catch (error) {
        // The port may already be closed after reset.
      }
    }
  }

  class DirectSamBaFlasher {
    constructor(options = {}) {
      this.transport = null;
      this.baudRate = options.baudRate || BOOTLOADER_BAUD;
      this.profile = resolveFlashProfile(options.profile || "standard");
      this.onLog = options.onLog || (() => {});
      this.onProgress = options.onProgress || (() => {});
      this.bootloaderVerified = false;
      this.bootloaderTarget = null;
    }

    log(message) {
      this.onLog(message);
    }

    progress(percent, message) {
      this.onProgress({
        percent: Math.max(0, Math.min(100, percent)),
        message
      });
    }

    async openBootloaderTransport(port, message = "Opening bootloader") {
      this.bootloaderVerified = false;
      this.bootloaderTarget = null;
      this.transport = new SerialTransport(port, this.baudRate, this.profile);
      this.progress(1, message);
      await this.transport.open();
    }

    async verifyBootloaderTarget() {
      await this.initBootloader();
      const version = await this.readVersion();
      this.log(`version=${version}`);
      this.ensureArduinoExtensions(version);

      const chip = await this.identifyChip();
      this.log(`chip=${chip}`);
      if (!/nRF52840/i.test(chip)) {
        throw new Error(`Unexpected bootloader target: ${chip || "unknown"}`);
      }
      this.bootloaderVerified = true;
      this.bootloaderTarget = { version, chip };
      return this.bootloaderTarget;
    }

    ensureVerifiedBootloader() {
      if (!this.bootloaderVerified || !this.bootloaderTarget) {
        throw new Error("Refusing to write before Arduino nRF52840 bootloader verification");
      }
    }

    async probe(port) {
      await this.openBootloaderTransport(port, "Checking bootloader");

      try {
        const result = await this.verifyBootloaderTarget();
        this.progress(100, "Bootloader OK");
        return result;
      } finally {
        await this.close();
      }
    }

    async close() {
      if (!this.transport) {
        return;
      }
      const transport = this.transport;
      this.transport = null;
      await transport.close();
    }

    validateFirmwareBytes(firmwareBytes, maxSketchSize = MAX_SKETCH_SIZE) {
      if (!(firmwareBytes instanceof Uint8Array)) {
        throw new Error("Firmware must be provided as a Uint8Array");
      }
      if (firmwareBytes.length < HEADER_SIZE) {
        throw new Error("Firmware image is too small for a Nano 33 BLE application image");
      }
      if (firmwareBytes.length > maxSketchSize) {
        throw new Error(`Firmware is larger than the ${maxSketchSize} byte sketch limit`);
      }
    }

    async eraseApplication({ port, firmwareBytes, maxSketchSize = MAX_SKETCH_SIZE }) {
      this.validateFirmwareBytes(firmwareBytes, maxSketchSize);
      await this.openBootloaderTransport(port, "Opening bootloader");

      try {
        const target = await this.verifyBootloaderTarget();
        this.log(`verified=${target.chip}`);
        this.log(`profile=${this.profile.label},chunk=${this.profile.writeChunkSize},delay=${this.profile.writeChunkDelayMs}`);
        this.progress(8, "Preparing erase");
        await this.prepareVectorTable(firmwareBytes);
        await this.chipErase(0);
        this.progress(100, "Erase complete");
      } finally {
        await this.close();
      }
    }

    async flash({ port, firmwareBytes, maxSketchSize = MAX_SKETCH_SIZE, skipErase = false }) {
      this.validateFirmwareBytes(firmwareBytes, maxSketchSize);
      await this.openBootloaderTransport(port, "Opening bootloader");

      try {
        const target = await this.verifyBootloaderTarget();
        this.log(`verified=${target.chip}`);
        this.log(`profile=${this.profile.label},chunk=${this.profile.writeChunkSize},delay=${this.profile.writeChunkDelayMs}`);
        this.progress(8, "Preparing flash");
        await this.prepareVectorTable(firmwareBytes);
        if (skipErase) {
          this.log("erase=skipped");
        } else {
          await this.chipErase(0);
          this.progress(11, "Erase settle");
          await sleep(this.profile.eraseSettleMs);
        }
        await this.writeApplication(firmwareBytes);
        this.progress(98, "Resetting board");
        await this.reset();
        this.progress(100, "Flash complete");
      } finally {
        await this.close();
      }
    }

    async resetBootloader(port) {
      await this.openBootloaderTransport(port, "Opening bootloader");

      try {
        const target = await this.verifyBootloaderTarget();
        this.log(`verified=${target.chip}`);
        this.progress(90, "Exiting bootloader");
        await this.reset();
        this.progress(100, "Reset sent");
      } finally {
        await this.close();
      }
    }

    async initBootloader() {
      this.transport.discardRx();
      await this.transport.writeAscii("N#");
      const ack = await this.transport.readBytes(2, 2500);
      this.log(`binary_ack=${bytesToHex(ack)}`);
      if (ack[0] !== 0x0a || ack[1] !== 0x0d) {
        throw new Error(`Not in Arduino SAM-BA bootloader: unexpected N# ack ${bytesToHex(ack)}`);
      }
    }

    async readVersion() {
      await this.transport.writeAscii("V#");
      return this.transport.readTextUntilIdle(2500, 100, 256);
    }

    ensureArduinoExtensions(version) {
      const match = version.match(/\[Arduino:([A-Z]+)\]/i);
      if (!match) {
        throw new Error("Bootloader does not report Arduino SAM-BA extensions");
      }
      const flags = match[1].toUpperCase();
      for (const required of ["I", "K", "X", "Y"]) {
        if (!flags.includes(required)) {
          throw new Error(`Bootloader is missing Arduino extension ${required}`);
        }
      }
    }

    async identifyChip() {
      await this.transport.writeAscii("I#");
      return this.transport.readTextUntilIdle(2500, 100, 128);
    }

    async prepareVectorTable(firmwareBytes) {
      this.ensureVerifiedBootloader();
      await this.writeMemory(0, firmwareBytes.slice(0, HEADER_SIZE));
      await this.writeWord(0x30, 0x400);
      await this.writeWord(0x20, 0);
    }

    async chipErase(startAddress) {
      this.ensureVerifiedBootloader();
      this.progress(10, "Erasing flash");
      await this.transport.writeAscii(`X${hex8(startAddress)}#`);
      await this.expectAck("X", 30000);
    }

    async writeApplication(firmwareBytes) {
      this.ensureVerifiedBootloader();
      const pageCount = Math.ceil(firmwareBytes.length / PAGE_SIZE);

      for (let page = 0; page < pageCount; page++) {
        const offset = page * PAGE_SIZE;
        const source = firmwareBytes.slice(offset, Math.min(offset + PAGE_SIZE, firmwareBytes.length));
        const pageBuffer = new Uint8Array(PAGE_SIZE);
        pageBuffer.set(source);

        await this.writeApplicationPage(page, pageCount, offset, pageBuffer);
      }
    }

    async writeApplicationPage(page, pageCount, offset, pageBuffer) {
      const startPercent = 12 + Math.round((page / pageCount) * 84);
      const donePercent = 12 + Math.round(((page + 1) / pageCount) * 84);
      let lastError = null;

      for (let attempt = 1; attempt <= this.profile.pageWriteAttempts; attempt++) {
        try {
          const retryText = attempt > 1 ? ` retry ${attempt}/${this.profile.pageWriteAttempts}` : "";
          this.progress(startPercent, `Writing page ${page + 1}/${pageCount}${retryText}`);
          await this.writeMemory(PAGE_BUFFER_ADDR, pageBuffer);
          await this.copyBufferToFlash(PAGE_BUFFER_ADDR, offset, PAGE_SIZE);
          if (this.profile.pageSettleMs > 0 && page + 1 < pageCount) {
            await sleep(this.profile.pageSettleMs);
          }
          this.progress(donePercent, `Wrote page ${page + 1}/${pageCount}`);
          return;
        } catch (error) {
          lastError = error;
          this.log(`page=${page + 1},attempt=${attempt},error=${error.message}`);
          this.transport.discardRx();
          if (error.transportStalled || this.transport.stalled) {
            const stalledError = new Error(`Writing page ${page + 1}/${pageCount} failed: Web Serial transport stalled: ${error.message}`);
            stalledError.directFlashTimeout = true;
            stalledError.transportStalled = true;
            stalledError.cause = error;
            throw stalledError;
          }
          if (attempt < this.profile.pageWriteAttempts) {
            await sleep(this.profile.pageRetryDelayMs);
          }
        }
      }

      throw new Error(`Writing page ${page + 1}/${pageCount} failed: ${lastError?.message || "unknown error"}`);
    }

    async writeMemory(address, bytes) {
      await this.transport.writeAscii(`S${hex8(address)},${hex8(bytes.length)}#`);
      await sleep(this.profile.memoryCommandDelayMs);
      await this.transport.writeBytes(bytes);
      await sleep(this.profile.memorySettleMs);
    }

    async writeWord(address, value) {
      await this.transport.writeAscii(`W${hex8(address)},${hex8(value)}#`);
      await sleep(10);
    }

    async copyBufferToFlash(sourceAddress, destinationAddress, size) {
      await this.transport.writeAscii(`Y${hex8(sourceAddress)},0#`);
      await this.expectAck("Y", 5000);
      await this.transport.writeAscii(`Y${hex8(destinationAddress)},${hex8(size)}#`);
      await this.expectAck("Y", 5000);
    }

    async expectAck(expected, timeoutMs) {
      const ack = await this.transport.readBytes(3, timeoutMs);
      const text = bytesToText(ack);
      if (String.fromCharCode(ack[0]) !== expected) {
        throw new Error(`Expected ${expected} ack, received ${text || Array.from(ack).join(",")}`);
      }
    }

    async reset() {
      await this.transport.writeAscii("K#");
      await sleep(this.profile.resetSettleMs);
    }
  }

  async function touch1200BpsReset(port, holdMs = 250) {
    await port.open({ baudRate: 1200 });
    if (typeof port.setSignals === "function") {
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    }
    await sleep(holdMs);
    await port.close();
  }

  async function forceSerialReset(port, options = {}) {
    const holdMs = options.holdMs ?? 180;
    const settleMs = options.settleMs ?? 700;
    await port.open({ baudRate: options.baudRate || 115200 });
    try {
      if (typeof port.setSignals === "function") {
        await port.setSignals({ dataTerminalReady: false, requestToSend: false });
        await sleep(holdMs);
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
        await sleep(holdMs);
        await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      }
      await sleep(holdMs);
    } finally {
      await port.close();
    }
    await sleep(settleMs);
  }

  async function probeBootloaderPort(port, options = {}) {
    const flasher = new DirectSamBaFlasher(options);
    return flasher.probe(port);
  }

  const api = {
    ARDUINO_USB_FILTERS,
    BOOTLOADER_BAUD,
    FLASH_PROFILES,
    MAX_SKETCH_SIZE,
    DirectSamBaFlasher,
    forceSerialReset,
    probeBootloaderPort,
    touch1200BpsReset
  };

  if (typeof window !== "undefined") {
    window.KetiDirectFlash = api;
  }
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
