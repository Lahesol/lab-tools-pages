/* USB CDC U1 transport. No measurement synthesis, conversion, or auto-connect. */
(() => {
  "use strict";
  function crc16(sequence, payload) {
    let crc = 0xffff;
    const byte = value => {
      crc ^= value << 8;
      for (let i = 0; i < 8; i++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
    };
    for (let i = 0; i < 4; i++) byte((sequence >>> (8 * i)) & 255);
    payload.forEach(byte);
    return crc;
  }
  class Decoder {
    constructor(onPacket) { this.onPacket = onPacket; this.line = ""; this.expected = null; }
    push(bytes, receivedAt) {
      for (const byte of bytes) {
        if (byte === 10) {
          const match = this.line.match(/^@U1,([0-9A-F]{8}),((?:[0-9A-F]{2}){1,20}),([0-9A-F]{4})\r$/);
          this.line = "";
          if (!match) throw Error("USB U1 framing error; raw bytes retained.");
          const sequence = parseInt(match[1], 16);
          const payload = Uint8Array.from(match[2].match(/../g), value => parseInt(value, 16));
          if (crc16(sequence, payload) !== parseInt(match[3], 16)) throw Error("USB U1 CRC mismatch; raw bytes retained.");
          if (this.expected !== null && sequence !== this.expected) throw Error("USB U1 sequence gap/replay; raw bytes retained.");
          this.expected = (sequence + 1) >>> 0;
          this.onPacket(payload, receivedAt, sequence);
        } else {
          if (this.line.length >= 63 || (byte !== 13 && (byte < 32 || byte > 126))) throw Error("USB U1 invalid/overlong line; raw bytes retained.");
          this.line += String.fromCharCode(byte);
        }
      }
    }
  }
  class SerialLink {
    constructor({ onRaw, onPacket, onError, onClose }) {
      Object.assign(this, { onRaw, onError, onClose });
      this.decoder = new Decoder(onPacket);
      this.connected = false; this.closing = false; this.closePromise = null;
      this.port = null; this.reader = null; this.writer = null; this.readDone = null;
    }
    async open() {
      this.port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x1915, usbProductId: 0x521f }] });
      await this.port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none", bufferSize: 65536 });
      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();
      this.connected = true;
      this.readDone = this.readLoop();
      // This firmware uses DTR as the CDC session boundary, not a bootloader pin.
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: false });
    }
    async readLoop() {
      try {
        while (!this.closing) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value?.length) {
            const bytes = new Uint8Array(value); // Exact chunk copy before decoding.
            const receivedAt = new Date().toISOString();
            this.onRaw(bytes, receivedAt);
            this.decoder.push(bytes, receivedAt);
          }
        }
      } catch (error) { if (!this.closing) this.onError(error); }
      finally {
        this.reader.releaseLock(); this.reader = null;
        this.connected = false;
        // Do not await close() inside the read promise that close() must join.
        if (!this.closing) void this.close();
      }
    }
    async write(command) {
      if (!this.connected || this.closing || !this.writer) throw Error("USB serial is not connected.");
      if (!/^[\x20-\x7e]{1,127}$/.test(command)) throw Error("USB command must be a single ASCII line of at most 127 bytes.");
      let timer;
      try {
        await Promise.race([
          this.writer.write(new TextEncoder().encode(`${command}\r\n`)),
          new Promise((_, reject) => { timer = setTimeout(() => reject(Error("USB write timeout.")), 5000); }),
        ]);
      } catch (error) { void this.close(); throw error; }
      finally { clearTimeout(timer); }
    }
    close() {
      if (this.closePromise) return this.closePromise;
      this.closing = true; this.connected = false;
      this.closePromise = (async () => {
        try {
          if (this.port) await this.port.setSignals({ dataTerminalReady: false, requestToSend: false }).catch(() => {});
          if (this.reader) await this.reader.cancel().catch(() => {});
          if (this.readDone) await this.readDone;
          if (this.writer) {
            try { await this.writer.abort(); } catch { /* Detached port. */ }
            this.writer.releaseLock(); this.writer = null;
          }
          if (this.port) await this.port.close().catch(() => {});
        } finally { this.onClose(); }
      })();
      return this.closePromise;
    }
  }
  globalThis.EcUsbSerial = { Decoder, SerialLink, crc16 };
})();
