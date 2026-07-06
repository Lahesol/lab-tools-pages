(function () {
  "use strict";

  const PAGE_SIZE = 4096;
  const PAGE_BUFFER_ADDR = 0x34;
  const HEADER_SIZE = 0x34;
  const MAX_SKETCH_SIZE = 983040;
  const BOOTLOADER_BAUD = 921600;
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

  class SerialTransport {
    constructor(port, baudRate) {
      this.port = port;
      this.baudRate = baudRate;
      this.reader = null;
      this.writer = null;
      this.rx = new Uint8Array(0);
      this.waiters = [];
      this.closed = false;
      this.readPumpTask = null;
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
      await this.writer.write(encoder.encode(command));
    }

    async writeBytes(bytes) {
      await this.writer.write(bytes);
    }

    async close() {
      this.closed = true;
      this.rejectWaiters(new Error("Transport closed"));

      if (this.writer) {
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
      this.onLog = options.onLog || (() => {});
      this.onProgress = options.onProgress || (() => {});
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

    async flash({ port, firmwareBytes, maxSketchSize = MAX_SKETCH_SIZE }) {
      if (!(firmwareBytes instanceof Uint8Array)) {
        throw new Error("Firmware must be provided as a Uint8Array");
      }
      if (firmwareBytes.length < HEADER_SIZE) {
        throw new Error("Firmware image is too small for a Nano 33 BLE application image");
      }
      if (firmwareBytes.length > maxSketchSize) {
        throw new Error(`Firmware is larger than the ${maxSketchSize} byte sketch limit`);
      }

      this.transport = new SerialTransport(port, this.baudRate);
      this.progress(1, "Opening bootloader");
      await this.transport.open();

      try {
        await this.initBootloader();
        const version = await this.readVersion();
        this.log(`version=${version}`);
        this.ensureArduinoExtensions(version);

        const chip = await this.identifyChip();
        this.log(`chip=${chip}`);
        if (!/nRF52840/i.test(chip)) {
          throw new Error(`Unexpected bootloader target: ${chip || "unknown"}`);
        }

        this.progress(8, "Preparing flash");
        await this.prepareVectorTable(firmwareBytes);
        await this.chipErase(0);
        await this.writeApplication(firmwareBytes);
        this.progress(98, "Resetting board");
        await this.reset();
        this.progress(100, "Flash complete");
      } finally {
        await this.transport.close();
        this.transport = null;
      }
    }

    async initBootloader() {
      this.transport.discardRx();
      await this.transport.writeAscii("N#");
      const ack = await this.transport.readBytes(2, 2500);
      this.log(`binary_ack=${Array.from(ack).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`);
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
      await this.writeMemory(0, firmwareBytes.slice(0, HEADER_SIZE));
      await this.writeWord(0x30, 0x400);
      await this.writeWord(0x20, 0);
    }

    async chipErase(startAddress) {
      this.progress(10, "Erasing flash");
      await this.transport.writeAscii(`X${hex8(startAddress)}#`);
      await this.expectAck("X", 30000);
    }

    async writeApplication(firmwareBytes) {
      const pageCount = Math.ceil(firmwareBytes.length / PAGE_SIZE);

      for (let page = 0; page < pageCount; page++) {
        const offset = page * PAGE_SIZE;
        const source = firmwareBytes.slice(offset, Math.min(offset + PAGE_SIZE, firmwareBytes.length));
        const pageBuffer = new Uint8Array(PAGE_SIZE);
        pageBuffer.set(source);

        await this.writeMemory(PAGE_BUFFER_ADDR, pageBuffer);
        await this.copyBufferToFlash(PAGE_BUFFER_ADDR, offset, PAGE_SIZE);
        const percent = 12 + Math.round(((page + 1) / pageCount) * 84);
        this.progress(percent, `Writing page ${page + 1}/${pageCount}`);
      }
    }

    async writeMemory(address, bytes) {
      await this.transport.writeAscii(`S${hex8(address)},${hex8(bytes.length)}#`);
      await sleep(5);
      await this.transport.writeBytes(bytes);
      await sleep(10);
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
      await sleep(250);
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

  const api = {
    ARDUINO_USB_FILTERS,
    BOOTLOADER_BAUD,
    MAX_SKETCH_SIZE,
    DirectSamBaFlasher,
    touch1200BpsReset
  };

  if (typeof window !== "undefined") {
    window.KetiDirectFlash = api;
  }
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
