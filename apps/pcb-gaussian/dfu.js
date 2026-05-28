(function () {
  const APP_START = 0x26000;
  const BOOTLOADER_START = 0x78000;
  const FLASH_END = 0x80000;
  const DFU_WRITE_CHUNK_SIZE = 64;
  const DFU_PRN = 8;
  const DFU_BOOT_DELAY_MS = 1400;
  const LATEST_DFU_MANIFEST_URL = "./firmware/latest.json";
  const DFU_FALLBACK_BAUDS = [230400, 115200, 1000000];
  const DFU_TIMEOUT_HELP = [
    "No Nordic UART DFU bootloader responded.",
    "If the MCU is blank, browser DFU cannot install the first bootloader. Flash the initial UART DFU HEX once with J-Link/nrfjprog first.",
    "If application firmware is running, use Connect -> Enter bootloader or select the bootloader COM port after reset.",
    "Check UART RX/TX are crossed to nRF pins RX=23/TX=24, GND is shared, baud is 230400, and HW flow control is off.",
  ].join("\n");

  const DFU_OP = {
    PROTOCOL_VERSION: 0x00,
    OBJECT_CREATE: 0x01,
    RECEIPT_NOTIF_SET: 0x02,
    CRC_GET: 0x03,
    OBJECT_EXECUTE: 0x04,
    OBJECT_SELECT: 0x06,
    MTU_GET: 0x07,
    OBJECT_WRITE: 0x08,
    PING: 0x09,
    RESPONSE: 0x60,
  };

  const DFU_OBJ = {
    COMMAND: 0x01,
    DATA: 0x02,
  };

  const DFU_RESULT_NAMES = {
    0x00: "invalid",
    0x01: "success",
    0x02: "op not supported",
    0x03: "invalid parameter",
    0x04: "insufficient resources",
    0x05: "invalid object",
    0x07: "unsupported type",
    0x08: "operation not permitted",
    0x0A: "operation failed",
    0x0B: "extended error",
  };

  const DFU_EXT_ERROR_NAMES = {
    0x00: "no error",
    0x02: "wrong command format",
    0x03: "unknown command",
    0x04: "init command invalid",
    0x05: "firmware version failure",
    0x06: "hardware version failure",
    0x07: "sd version failure",
    0x08: "signature missing",
    0x09: "wrong hash type",
    0x0A: "hash failed",
    0x0B: "wrong signature type",
    0x0C: "verification failed",
    0x0D: "insufficient space",
  };

  const SLIP_END = 0xC0;
  const SLIP_ESC = 0xDB;
  const SLIP_ESC_END = 0xDC;
  const SLIP_ESC_ESC = 0xDD;

  let lastDfuAnalysis = null;
  let lastDfuPackage = null;
  let dfuUploadBusy = false;

  function setDfuStatus(text, kind = "") {
    const status = $("dfuStatus");
    if (!status) return;
    status.textContent = text;
    status.title = text;
    status.className = `hint status-line ${kind}`.trim();
  }

  function setDfuProgress(value, max = 100) {
    const progress = $("dfuProgress");
    if (!progress) return;
    progress.max = max;
    progress.value = Math.max(0, Math.min(max, value));
  }

  function setDfuInfo(text) {
    const info = $("dfuInfo");
    if (info) info.textContent = text;
  }

  function dfuLog(message) {
    if (typeof logLine === "function") logLine(`[dfu] ${message}`);
  }

  function dfuSleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function hexAddress(value) {
    return `0x${Math.max(0, value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function hex32(value) {
    return `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function hexBytes(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function parseHexByte(text, offset) {
    return Number.parseInt(text.slice(offset, offset + 2), 16);
  }

  function readU16(view, offset) {
    return view.getUint16(offset, true);
  }

  function readU32(view, offset) {
    return view.getUint32(offset, true);
  }

  function u16le(value) {
    return [value & 0xFF, (value >>> 8) & 0xFF];
  }

  function u32le(value) {
    return [
      value & 0xFF,
      (value >>> 8) & 0xFF,
      (value >>> 16) & 0xFF,
      (value >>> 24) & 0xFF,
    ];
  }

  function sliceBytes(bytes, start, length) {
    return bytes.slice(start, start + length);
  }

  function parseIntelHex(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    let base = 0;
    let dataBytes = 0;
    let minAddr = Number.POSITIVE_INFINITY;
    let maxAddr = -1;
    const warnings = [];

    lines.forEach((line, index) => {
      if (!line.startsWith(":")) throw new Error(`Line ${index + 1}: missing Intel HEX ':' prefix`);
      if (!/^:[0-9A-Fa-f]+$/.test(line)) throw new Error(`Line ${index + 1}: invalid HEX character`);
      const count = parseHexByte(line, 1);
      const addr = Number.parseInt(line.slice(3, 7), 16);
      const type = parseHexByte(line, 7);
      const expectedLength = 11 + count * 2;
      if (line.length !== expectedLength) throw new Error(`Line ${index + 1}: bad record length`);

      let checksumSum = count + (addr >> 8) + (addr & 0xFF) + type;
      const data = [];
      for (let i = 0; i < count; i++) {
        const byte = parseHexByte(line, 9 + i * 2);
        data.push(byte);
        checksumSum += byte;
      }
      checksumSum += parseHexByte(line, 9 + count * 2);
      if ((checksumSum & 0xFF) !== 0) throw new Error(`Line ${index + 1}: checksum mismatch`);

      if (type === 0x00) {
        const abs = base + addr;
        if (count > 0) {
          minAddr = Math.min(minAddr, abs);
          maxAddr = Math.max(maxAddr, abs + count - 1);
          dataBytes += count;
        }
      } else if (type === 0x01) {
        return;
      } else if (type === 0x02) {
        if (count !== 2) throw new Error(`Line ${index + 1}: bad segment address record`);
        base = ((data[0] << 8) | data[1]) << 4;
      } else if (type === 0x04) {
        if (count !== 2) throw new Error(`Line ${index + 1}: bad linear address record`);
        base = ((data[0] << 8) | data[1]) << 16;
      }
    });

    if (!Number.isFinite(minAddr) || maxAddr < 0) throw new Error("No data records found");
    if (minAddr < APP_START) warnings.push(`data starts below app region (${hexAddress(APP_START)})`);
    if (maxAddr >= BOOTLOADER_START) warnings.push(`data reaches bootloader/settings region (${hexAddress(BOOTLOADER_START)}+)`);
    if (maxAddr >= FLASH_END) warnings.push(`data exceeds nRF52832 flash end (${hexAddress(FLASH_END)})`);
    return {
      type: "hex",
      dataBytes,
      minAddr,
      maxAddr,
      warnings,
      ok: minAddr >= APP_START && maxAddr < BOOTLOADER_START,
    };
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("This browser does not support ZIP deflate decompression.");
    }
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (rawError) {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch {
        throw rawError;
      }
    }
  }

  function findEndOfCentralDirectory(bytes) {
    const minOffset = Math.max(0, bytes.length - 0xFFFF - 22);
    for (let offset = bytes.length - 22; offset >= minOffset; offset--) {
      if (
        bytes[offset] === 0x50 &&
        bytes[offset + 1] === 0x4B &&
        bytes[offset + 2] === 0x05 &&
        bytes[offset + 3] === 0x06
      ) {
        return offset;
      }
    }
    throw new Error("ZIP end-of-central-directory record not found.");
  }

  async function readZipEntries(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder();
    const eocd = findEndOfCentralDirectory(bytes);
    const entryCount = readU16(view, eocd + 10);
    const centralOffset = readU32(view, eocd + 16);
    const entries = new Map();
    let ptr = centralOffset;

    for (let i = 0; i < entryCount; i++) {
      if (readU32(view, ptr) !== 0x02014B50) throw new Error("Bad ZIP central directory header.");
      const flags = readU16(view, ptr + 8);
      const method = readU16(view, ptr + 10);
      const zipCrc = readU32(view, ptr + 16);
      const compressedSize = readU32(view, ptr + 20);
      const uncompressedSize = readU32(view, ptr + 24);
      const nameLength = readU16(view, ptr + 28);
      const extraLength = readU16(view, ptr + 30);
      const commentLength = readU16(view, ptr + 32);
      const localOffset = readU32(view, ptr + 42);
      const name = decoder.decode(sliceBytes(bytes, ptr + 46, nameLength)).replace(/\\/g, "/");
      ptr += 46 + nameLength + extraLength + commentLength;

      if (!name || name.endsWith("/")) continue;
      if (flags & 0x01) throw new Error(`Encrypted ZIP entry is not supported: ${name}`);
      if (readU32(view, localOffset) !== 0x04034B50) throw new Error(`Bad ZIP local header: ${name}`);
      const localNameLength = readU16(view, localOffset + 26);
      const localExtraLength = readU16(view, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = sliceBytes(bytes, dataStart, compressedSize);
      let data;
      if (method === 0) data = compressed;
      else if (method === 8) data = await inflateRaw(compressed);
      else throw new Error(`Unsupported ZIP compression method ${method}: ${name}`);
      if (data.length !== uncompressedSize) throw new Error(`ZIP size mismatch: ${name}`);
      const actualCrc = crc32(data);
      if (actualCrc !== zipCrc) throw new Error(`ZIP CRC mismatch: ${name}`);
      entries.set(name, { name, data, crc: actualCrc, size: data.length });
    }

    return entries;
  }

  function findEntry(entries, name) {
    if (!name) return null;
    const normalized = name.replace(/\\/g, "/");
    return entries.get(normalized) || entries.get(normalized.split("/").pop()) || null;
  }

  function findFirstEntry(entries, extension) {
    const lowerExt = extension.toLowerCase();
    return [...entries.values()].find(entry => entry.name.toLowerCase().endsWith(lowerExt)) || null;
  }

  async function parseDfuZip(file) {
    const entries = await readZipEntries(file);
    const manifestEntry = findEntry(entries, "manifest.json");
    let manifest = null;
    let appManifest = null;
    if (manifestEntry) {
      manifest = JSON.parse(new TextDecoder().decode(manifestEntry.data));
      appManifest = manifest?.manifest?.application || null;
    }

    let datEntry = findEntry(entries, appManifest?.dat_file) || findFirstEntry(entries, ".dat");
    let binEntry = findEntry(entries, appManifest?.bin_file) || findFirstEntry(entries, ".bin");
    if (!datEntry || !binEntry) throw new Error("DFU ZIP must contain application .dat and .bin files.");

    return {
      type: "zip",
      fileName: file.name || "firmware.zip",
      fileSize: file.size,
      entryCount: entries.size,
      manifest,
      datName: datEntry.name,
      binName: binEntry.name,
      dat: datEntry.data,
      bin: binEntry.data,
      datCrc: datEntry.crc,
      binCrc: binEntry.crc,
      ok: true,
    };
  }

  async function sha256Hex(buffer) {
    if (!globalThis.crypto?.subtle) throw new Error("SHA-256 verification requires a secure browser context.");
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return hexBytes(new Uint8Array(digest));
  }

  function packageNameFromUrl(url) {
    return decodeURIComponent(String(url || "firmware.zip").split("/").pop() || "firmware.zip");
  }

  function candidateBaudRates(requestedBaud) {
    const requested = Math.max(9600, Math.round(Number(requestedBaud) || 230400));
    return [requested, ...DFU_FALLBACK_BAUDS].filter((baud, index, list) => list.indexOf(baud) === index);
  }

  function dfuFailureText(error) {
    const message = error?.message || String(error || "Unknown DFU error");
    if (/already open/i.test(message)) {
      return `${message}\n\nThe selected COM port is still open in this browser tab or another serial terminal. Click Disconnect, close other serial monitors, then retry Program latest firmware.`;
    }
    if (/response timeout|No Nordic UART DFU response/i.test(message)) {
      return `${message}\n\n${DFU_TIMEOUT_HELP}`;
    }
    return message;
  }

  function dfuStatusText(error) {
    return (error?.message || String(error || "DFU error")).split("\n")[0];
  }


  async function loadBundledDfuPackage() {
    setDfuStatus("Loading bundled latest DFU manifest...");
    setDfuProgress(0);
    const manifestResponse = await fetch(LATEST_DFU_MANIFEST_URL, { cache: "no-store" });
    if (!manifestResponse.ok) {
      throw new Error(`Latest DFU manifest not found (${manifestResponse.status}).`);
    }
    const release = await manifestResponse.json();
    if (!release?.package) throw new Error("Latest DFU manifest has no package field.");

    const packageUrl = new URL(release.package, manifestResponse.url).toString();
    const packageName = packageNameFromUrl(release.package);
    setDfuInfo(
`Bundled latest firmware
Version: ${release.version || "unknown"}
Protocol: ${release.protocol || "unknown"}
Package: ${packageName}
Status: downloading package...`
    );

    const packageResponse = await fetch(packageUrl, { cache: "no-store" });
    if (!packageResponse.ok) throw new Error(`Latest DFU ZIP not found (${packageResponse.status}).`);
    const buffer = await packageResponse.arrayBuffer();
    if (Number.isFinite(Number(release.size)) && buffer.byteLength !== Number(release.size)) {
      throw new Error(`Latest DFU size mismatch: ${buffer.byteLength} B, expected ${release.size} B.`);
    }
    if (release.sha256) {
      const actualSha = await sha256Hex(buffer);
      if (actualSha !== String(release.sha256).toLowerCase()) {
        throw new Error(`Latest DFU SHA-256 mismatch: ${actualSha}`);
      }
    }

    const file = typeof File === "function"
      ? new File([buffer], packageName, { type: "application/zip" })
      : Object.assign(new Blob([buffer], { type: "application/zip" }), { name: packageName });
    const pkg = await parseDfuZip(file);
    pkg.release = release;
    pkg.fileName = packageName;
    lastDfuPackage = pkg;
    lastDfuAnalysis = {
      type: "zip",
      fileName: packageName,
      fileSize: buffer.byteLength,
      ok: true,
      datSize: pkg.dat.length,
      binSize: pkg.bin.length,
      datName: pkg.datName,
      binName: pkg.binName,
      releaseVersion: release.version || "",
    };
    setDfuInfo(
`Bundled latest firmware ready
Version: ${release.version || "unknown"}
Protocol: ${release.protocol || "unknown"}
Package: ${packageName} (${formatBytes(buffer.byteLength)})
Init packet: ${pkg.datName} (${formatBytes(pkg.dat.length)})
Application: ${pkg.binName} (${formatBytes(pkg.bin.length)})
SHA-256: ${release.sha256 || "not provided"}

Ready for one-click UART DFU upload.`
    );
    setDfuStatus("Bundled latest DFU package is ready.", "ok");
    return pkg;
  }

  function selectedDfuFile() {
    return $("dfuFile")?.files?.[0] || null;
  }

  async function analyzeDfuFile() {
    const file = selectedDfuFile();
    lastDfuAnalysis = null;
    lastDfuPackage = null;
    if (!file) {
      setDfuStatus("Select a .hex or Nordic DFU .zip file first.", "warn");
      return null;
    }
    const name = file.name || "firmware";
    const lower = name.toLowerCase();
    try {
      if (lower.endsWith(".hex")) {
        const analysis = parseIntelHex(await file.text());
        lastDfuAnalysis = { ...analysis, fileName: name, fileSize: file.size };
        const warn = analysis.warnings.length ? `\nWarnings:\n- ${analysis.warnings.join("\n- ")}` : "";
        setDfuInfo(
`File: ${name}
Type: Intel HEX application image
Size: ${formatBytes(file.size)}
Data: ${formatBytes(analysis.dataBytes)}
Address: ${hexAddress(analysis.minAddr)} - ${hexAddress(analysis.maxAddr)}
Region check: ${analysis.ok ? "OK for application DFU package generation" : "check required"}

Browser upload requires a signed Nordic DFU .zip package.
Use Show command to generate the package from this HEX, then select the .zip for direct browser upload.${warn}`
        );
        setDfuStatus("HEX analyzed. Direct browser upload needs signed DFU ZIP.", analysis.ok ? "ok" : "warn");
        return lastDfuAnalysis;
      }
      if (lower.endsWith(".zip")) {
        const pkg = await parseDfuZip(file);
        lastDfuPackage = pkg;
        lastDfuAnalysis = {
          type: "zip",
          fileName: name,
          fileSize: file.size,
          ok: true,
          datSize: pkg.dat.length,
          binSize: pkg.bin.length,
          datName: pkg.datName,
          binName: pkg.binName,
        };
        setDfuInfo(
`File: ${name}
Type: Nordic secure DFU package
Size: ${formatBytes(file.size)}
Entries: ${pkg.entryCount}
Init packet: ${pkg.datName} (${formatBytes(pkg.dat.length)}, ZIP CRC ${hex32(pkg.datCrc)})
Application: ${pkg.binName} (${formatBytes(pkg.bin.length)}, ZIP CRC ${hex32(pkg.binCrc)})

Ready for browser UART DFU upload.`
        );
        setDfuStatus("DFU ZIP parsed and ready for browser upload.", "ok");
        return lastDfuAnalysis;
      }
      throw new Error("Unsupported DFU file extension");
    } catch (error) {
      lastDfuAnalysis = null;
      lastDfuPackage = null;
      setDfuStatus(error.message, "warn");
      setDfuInfo(error.message);
      return null;
    }
  }

  function slipEncode(payload) {
    const out = [];
    for (const byte of payload) {
      if (byte === SLIP_END) out.push(SLIP_ESC, SLIP_ESC_END);
      else if (byte === SLIP_ESC) out.push(SLIP_ESC, SLIP_ESC_ESC);
      else out.push(byte);
    }
    out.push(SLIP_END);
    return new Uint8Array(out);
  }

  class DfuSerialClient {
    constructor(port, baudRate) {
      this.port = port;
      this.baudRate = baudRate;
      this.reader = null;
      this.writer = null;
      this.pending = [];
    }

    async open() {
      await this.port.open({
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
        bufferSize: 65536,
      });
      if (typeof this.port.setSignals === "function") {
        await this.port.setSignals({ dataTerminalReady: true, requestToSend: false }).catch(() => {});
      }
      await dfuSleep(150);
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();
    }

    async close() {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) await this.port.close().catch(() => {});
    }

    async readByte(timeoutMs) {
      if (this.pending.length) return this.pending.shift();
      let timer = null;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("DFU response timeout")), timeoutMs);
      });
      const read = this.reader.read();
      const result = await Promise.race([read, timeout]).finally(() => clearTimeout(timer));
      if (result.done) throw new Error("DFU serial port closed");
      this.pending = Array.from(result.value || []);
      if (!this.pending.length) return this.readByte(timeoutMs);
      return this.pending.shift();
    }

    async readSlipPacket(timeoutMs = 6000) {
      const packet = [];
      let escaped = false;
      const deadline = performance.now() + timeoutMs;
      while (performance.now() < deadline) {
        const remaining = Math.max(50, deadline - performance.now());
        const byte = await this.readByte(remaining);
        if (byte === SLIP_END) {
          if (packet.length) return new Uint8Array(packet);
          escaped = false;
          continue;
        }
        if (escaped) {
          if (byte === SLIP_ESC_END) packet.push(SLIP_END);
          else if (byte === SLIP_ESC_ESC) packet.push(SLIP_ESC);
          else throw new Error("Bad SLIP escape sequence");
          escaped = false;
        } else if (byte === SLIP_ESC) {
          escaped = true;
        } else {
          packet.push(byte);
        }
      }
      throw new Error("DFU response timeout");
    }

    async writeSlip(op, payload = []) {
      const frame = new Uint8Array(1 + payload.length);
      frame[0] = op;
      frame.set(payload, 1);
      await this.writer.write(slipEncode(frame));
    }

    async response(expectedOp, timeoutMs = 8000) {
      const packet = await this.readSlipPacket(timeoutMs);
      if (packet[0] !== DFU_OP.RESPONSE) throw new Error(`Unexpected DFU packet 0x${packet[0]?.toString(16)}`);
      if (packet[1] !== expectedOp) {
        throw new Error(`Unexpected DFU response for 0x${packet[1]?.toString(16)}, expected 0x${expectedOp.toString(16)}`);
      }
      const result = packet[2];
      if (result !== 0x01) {
        const resultText = DFU_RESULT_NAMES[result] || `0x${result?.toString(16)}`;
        const ext = result === 0x0B ? ` (${DFU_EXT_ERROR_NAMES[packet[3]] || `ext 0x${packet[3]?.toString(16)}`})` : "";
        throw new Error(`DFU ${this.opName(expectedOp)} failed: ${resultText}${ext}`);
      }
      return packet;
    }

    opName(op) {
      return Object.entries(DFU_OP).find(([, value]) => value === op)?.[0] || `0x${op.toString(16)}`;
    }

    async request(op, payload = [], timeoutMs = 8000) {
      await this.writeSlip(op, payload);
      return this.response(op, timeoutMs);
    }

    async ping(timeoutMs = 3000) {
      const id = Math.floor(Math.random() * 255) + 1;
      const rsp = await this.request(DFU_OP.PING, [id], timeoutMs);
      if (rsp[3] !== id) throw new Error("DFU ping echo mismatch");
    }

    async mtuGet() {
      const rsp = await this.request(DFU_OP.MTU_GET, [], 3000);
      return readU16(new DataView(rsp.buffer, rsp.byteOffset, rsp.byteLength), 3);
    }

    async setPrn(prn) {
      await this.request(DFU_OP.RECEIPT_NOTIF_SET, u16le(prn), 3000);
    }

    async selectObject(type) {
      const rsp = await this.request(DFU_OP.OBJECT_SELECT, [type], 5000);
      const view = new DataView(rsp.buffer, rsp.byteOffset, rsp.byteLength);
      return {
        maxSize: readU32(view, 3),
        offset: readU32(view, 7),
        crc: readU32(view, 11),
      };
    }

    async createObject(type, size) {
      await this.request(DFU_OP.OBJECT_CREATE, [type, ...u32le(size)], 8000);
    }

    async writeObjectChunk(bytes) {
      await this.writeSlip(DFU_OP.OBJECT_WRITE, Array.from(bytes));
    }

    async crcGet() {
      const rsp = await this.request(DFU_OP.CRC_GET, [], 8000);
      const view = new DataView(rsp.buffer, rsp.byteOffset, rsp.byteLength);
      return {
        offset: readU32(view, 3),
        crc: readU32(view, 7),
      };
    }

    async executeObject(timeoutMs = 12000) {
      await this.request(DFU_OP.OBJECT_EXECUTE, [], timeoutMs);
    }
  }

  async function checkDfuSupport() {
    const reply = await sendCommand("DFU?", {
      waitForReply: true,
      timeoutMs: 2000,
      replyMatcher: text => text.toUpperCase().startsWith("DFU,"),
    });
    if (replyLooksBad(reply)) {
      setDfuStatus(`DFU check failed: ${replySummary(reply)}`, "warn");
    } else {
      setDfuStatus(reply || "No DFU reply.", reply ? "ok" : "warn");
    }
  }

  async function enterDfuBootloader({ silent = false } = {}) {
    if (!state.connected) {
      if (!silent) setDfuStatus("Connect to the application UART first.", "warn");
      return false;
    }
    if (!silent && !confirm("Reset the board into UART DFU bootloader mode?")) return false;
    setDfuStatus("Requesting bootloader entry...");
    const reply = await sendCommand("DFU", {
      waitForReply: true,
      timeoutMs: 2000,
      replyMatcher: text => text.toUpperCase().startsWith("DFU,ENTERING"),
    });
    if (reply) setDfuStatus("Board is resetting into UART DFU bootloader.", "ok");
    else setDfuStatus("DFU command sent; waiting for bootloader.", "warn");
    await dfuSleep(300);
    if (state.connected) await disconnectSerial().catch(() => {});
    await dfuSleep(DFU_BOOT_DELAY_MS);
    return true;
  }

  async function closeApplicationSerialForDfu(reason = "Preparing DFU upload") {
    if (!state?.port && !state?.reader && !state?.writer) return;
    setDfuStatus(`${reason}: closing application serial port...`);
    state.keepReading = false;

    const reader = state.reader;
    if (reader) {
      await reader.cancel().catch(() => {});
      try { reader.releaseLock(); } catch {}
      if (state.reader === reader) state.reader = null;
    }

    const writer = state.writer;
    if (writer) {
      try { writer.releaseLock(); } catch {}
      if (state.writer === writer) state.writer = null;
    }

    const port = state.port;
    if (port) {
      await port.close().catch(error => {
        dfuLog(`application serial close skipped: ${error.message}`);
      });
      if (state.port === port) state.port = null;
    }

    setConnected(false);
    await dfuSleep(400);
  }

  async function showDfuCommand() {
    const analysis = lastDfuAnalysis || await analyzeDfuFile();
    const file = selectedDfuFile();
    const port = ($("dfuPort")?.value || "COMx").trim() || "COMx";
    const appVersion = Math.max(1, Math.round(Number($("dfuAppVersion")?.value) || 1));
    const baud = Math.max(9600, Math.round(Number($("dfuBaud")?.value) || 230400));
    const fileName = file?.name || analysis?.fileName || "Neuro_MS2.hex";
    const switchPart = analysis?.type === "zip" ? "-PackagePath" : "-HexPath";
    const note = analysis?.type === "zip" ? "Use this for an already generated Nordic DFU package." : "Replace the path with the full local HEX path; the script generates the signed DFU package first.";
    const command =
`# ${note}
# Close Web Serial first. If the board is already in bootloader mode, remove -TriggerAppDfu.
.\\tools\\dfu\\uart_dfu_from_hex.ps1 ${switchPart} "C:\\path\\to\\${fileName}" -Port ${port} -Baud ${baud} -AppVersion ${appVersion} -TriggerAppDfu`;
    setDfuInfo(command);
    setDfuStatus("DFU command prepared.", "ok");
  }

  async function ensureDfuZipPackage() {
    const file = selectedDfuFile();
    if (!file) throw new Error("Select a signed Nordic DFU .zip file first.");
    if (!file.name.toLowerCase().endsWith(".zip")) {
      throw new Error("Browser upload requires a signed Nordic DFU .zip package, not raw HEX.");
    }
    if (!lastDfuPackage || lastDfuPackage.fileName !== file.name || lastDfuPackage.fileSize !== file.size) {
      await analyzeDfuFile();
    }
    if (!lastDfuPackage) throw new Error("DFU ZIP package is not ready.");
    return lastDfuPackage;
  }

  async function writeDfuObject(client, type, bytes, label, expectedBaseOffset, onProgress) {
    await client.createObject(type, bytes.length);
    let packetsSinceReceipt = 0;
    for (let offset = 0; offset < bytes.length; offset += DFU_WRITE_CHUNK_SIZE) {
      const chunk = bytes.slice(offset, Math.min(bytes.length, offset + DFU_WRITE_CHUNK_SIZE));
      await client.writeObjectChunk(chunk);
      packetsSinceReceipt += 1;
      const expectedOffset = expectedBaseOffset + offset + chunk.length;
      if (packetsSinceReceipt >= DFU_PRN) {
        const receipt = await client.response(DFU_OP.CRC_GET, 8000);
        const view = new DataView(receipt.buffer, receipt.byteOffset, receipt.byteLength);
        const bootOffset = readU32(view, 3);
        if (bootOffset !== expectedOffset) {
          throw new Error(`${label} offset mismatch: bootloader ${bootOffset}, expected ${expectedOffset}`);
        }
        packetsSinceReceipt = 0;
      }
      onProgress?.(expectedOffset);
      await dfuSleep(1);
    }
    const crc = await client.crcGet();
    const expectedEnd = expectedBaseOffset + bytes.length;
    if (crc.offset !== expectedEnd) {
      throw new Error(`${label} CRC offset mismatch: bootloader ${crc.offset}, expected ${expectedEnd}`);
    }
    await client.executeObject(type === DFU_OBJ.DATA ? 15000 : 12000);
    return crc;
  }

  async function uploadDfuZipWithClient(pkg, client) {
    setDfuProgress(0);
    setDfuStatus("Opening DFU protocol...");
    await client.ping();
    let mtu = null;
    try {
      mtu = await client.mtuGet();
    } catch (error) {
      dfuLog(`MTU query skipped: ${error.message}`);
    }
    await client.setPrn(DFU_PRN);

    const commandSelect = await client.selectObject(DFU_OBJ.COMMAND);
    dfuLog(`command object max=${commandSelect.maxSize} offset=${commandSelect.offset}`);
    if (pkg.dat.length > commandSelect.maxSize) {
      throw new Error(`Init packet too large: ${pkg.dat.length} > ${commandSelect.maxSize}`);
    }

    setDfuStatus(`Uploading init packet (${formatBytes(pkg.dat.length)})...`);
    const commandCrc = await writeDfuObject(client, DFU_OBJ.COMMAND, pkg.dat, "init packet", 0);
    dfuLog(`init packet CRC ${hex32(commandCrc.crc)}`);

    const dataSelect = await client.selectObject(DFU_OBJ.DATA);
    const objectMax = dataSelect.maxSize || 4096;
    let sent = 0;
    const total = pkg.bin.length;
    const startTime = performance.now();
    dfuLog(`data object max=${objectMax} offset=${dataSelect.offset}, mtu=${mtu || "unknown"}`);

    while (sent < total) {
      const objectSize = Math.min(objectMax, total - sent);
      const objectBytes = pkg.bin.slice(sent, sent + objectSize);
      setDfuStatus(`Uploading application ${formatBytes(sent)} / ${formatBytes(total)}...`);
      await writeDfuObject(client, DFU_OBJ.DATA, objectBytes, "application", sent, offset => {
        setDfuProgress(offset, total);
      });
      sent += objectSize;
      setDfuProgress(sent, total);
    }

    const elapsed = Math.max(0.001, (performance.now() - startTime) / 1000);
    const rate = total / elapsed;
    setDfuInfo(
`Browser DFU upload complete.
Package: ${pkg.fileName}
Init: ${pkg.datName} (${formatBytes(pkg.dat.length)})
Application: ${pkg.binName} (${formatBytes(pkg.bin.length)})
UART rate: ${Math.round(rate)} B/s effective
Protocol: Nordic secure serial DFU, PRN=${DFU_PRN}, chunk=${DFU_WRITE_CHUNK_SIZE} byte(s)

The bootloader should reset into the updated application. Reconnect Web Serial and run VER?.`
    );
  }

  async function openDfuClientWithBaudProbe(port, requestedBaud) {
    const bauds = candidateBaudRates(requestedBaud);
    const failures = [];
    for (const baud of bauds) {
      const client = new DfuSerialClient(port, baud);
      try {
        setDfuStatus(`Probing UART DFU bootloader @ ${baud}...`);
        await client.open();
        await client.ping(2500);
        if ($("dfuBaud")) $("dfuBaud").value = String(baud);
        dfuLog(`DFU bootloader responded @ ${baud}`);
        return client;
      } catch (error) {
        failures.push(`${baud}: ${error.message}`);
        dfuLog(`DFU probe @ ${baud} failed: ${error.message}`);
        await client.close().catch(() => {});
      }
    }
    throw new Error(`No Nordic UART DFU response at ${bauds.join(", ")} baud.\n${failures.join("\n")}`);
  }

  async function uploadDfuPackageWithBrowser(pkg, sourceLabel) {
    if (!("serial" in navigator)) throw new Error("Web Serial is not available in this browser.");
    if (!window.isSecureContext) throw new Error("Web Serial requires HTTPS or localhost.");
    const baud = Math.max(9600, Math.round(Number($("dfuBaud")?.value) || 230400));
    const connectedApp = !!state.connected && !!state.firmwareVersion;
    const connectedSilent = !!state.connected && !state.firmwareVersion;
    const releaseText = pkg.release?.version ? `\nFirmware: ${pkg.release.version}` : "";
    const prompt = connectedApp
      ? `This will reset the current app into UART DFU mode, close Web Serial, then ask you to select the bootloader COM port.\n\nPackage: ${pkg.fileName}${releaseText}`
      : connectedSilent
        ? `This looks like a silent bootloader/blank firmware serial connection. The GUI will close the current port, then ask you to select the bootloader COM port for ${sourceLabel}.\n\nPackage: ${pkg.fileName}${releaseText}`
        : `This will ask you to select the board's UART bootloader COM port and upload ${sourceLabel}.\n\nPackage: ${pkg.fileName}${releaseText}`;
    if (!confirm(prompt)) return false;

    let bootPort = null;
    let client = null;
    try {
      if (connectedApp) await enterDfuBootloader({ silent: true });
      else if (connectedSilent) {
        await closeApplicationSerialForDfu("Silent serial connection detected");
      } else if (state.port || state.reader || state.writer) {
        await closeApplicationSerialForDfu("Stale serial connection detected");
      }
      if (state.port || state.reader || state.writer) {
        await closeApplicationSerialForDfu("Releasing previous serial handle");
      }
      setDfuStatus("Select the UART bootloader serial port...");
      bootPort = await navigator.serial.requestPort();
      client = await openDfuClientWithBaudProbe(bootPort, baud);
      dfuLog(`browser DFU opened @ ${client.baudRate}`);
      await uploadDfuZipWithClient(pkg, client);
      setDfuStatus("Browser DFU upload complete. Reconnect to the app.", "ok");
      return true;
    } finally {
      if (client) await client.close().catch(() => {});
      else if (bootPort) await bootPort.close().catch(() => {});
    }
  }

  function setDfuBusy(disabled) {
    $("dfuUploadButton")?.toggleAttribute("disabled", disabled);
    $("dfuLatestButton")?.toggleAttribute("disabled", disabled);
  }

  async function uploadDfuZipFromBrowser() {
    if (dfuUploadBusy) return;
    dfuUploadBusy = true;
    setDfuBusy(true);
    try {
      const pkg = await ensureDfuZipPackage();
      await uploadDfuPackageWithBrowser(pkg, "the selected DFU ZIP");
    } catch (error) {
      const detail = dfuFailureText(error);
      setDfuStatus(dfuStatusText(error), "warn");
      setDfuInfo(`Browser DFU upload failed:\n${detail}`);
      dfuLog(`upload failed: ${error.message}`);
    } finally {
      setDfuBusy(false);
      dfuUploadBusy = false;
    }
  }

  async function uploadLatestDfuFromBrowser() {
    if (dfuUploadBusy) return;
    dfuUploadBusy = true;
    setDfuBusy(true);
    try {
      const pkg = await loadBundledDfuPackage();
      await uploadDfuPackageWithBrowser(pkg, "the bundled latest firmware");
    } catch (error) {
      const detail = dfuFailureText(error);
      setDfuStatus(dfuStatusText(error), "warn");
      setDfuInfo(`Bundled latest DFU failed:\n${detail}`);
      dfuLog(`latest upload failed: ${error.message}`);
    } finally {
      setDfuBusy(false);
      dfuUploadBusy = false;
    }
  }

  function bindDfuEvents() {
    $("dfuFile")?.addEventListener("change", analyzeDfuFile);
    $("dfuAnalyzeButton")?.addEventListener("click", analyzeDfuFile);
    $("dfuCheckButton")?.addEventListener("click", checkDfuSupport);
    $("dfuEnterButton")?.addEventListener("click", () => enterDfuBootloader());
    $("dfuCommandButton")?.addEventListener("click", showDfuCommand);
    $("dfuUploadButton")?.addEventListener("click", uploadDfuZipFromBrowser);
    $("dfuLatestButton")?.addEventListener("click", uploadLatestDfuFromBrowser);
  }

  window.addEventListener("DOMContentLoaded", bindDfuEvents);
})();
