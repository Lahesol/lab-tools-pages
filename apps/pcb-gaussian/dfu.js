(function () {
  const APP_START = 0x26000;
  const BOOTLOADER_START = 0x78000;
  const FLASH_END = 0x80000;
  let lastDfuAnalysis = null;

  function setDfuStatus(text, kind = "") {
    const status = $("dfuStatus");
    if (!status) return;
    status.textContent = text;
    status.title = text;
    status.className = `hint status-line ${kind}`.trim();
  }

  function setDfuInfo(text) {
    const info = $("dfuInfo");
    if (info) info.textContent = text;
  }

  function hexAddress(value) {
    return `0x${Math.max(0, value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function parseHexByte(text, offset) {
    return Number.parseInt(text.slice(offset, offset + 2), 16);
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

  function selectedDfuFile() {
    return $("dfuFile")?.files?.[0] || null;
  }

  async function analyzeDfuFile() {
    const file = selectedDfuFile();
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
Size: ${file.size} byte(s)
Data: ${analysis.dataBytes} byte(s)
Address: ${hexAddress(analysis.minAddr)} - ${hexAddress(analysis.maxAddr)}
Region check: ${analysis.ok ? "OK for application DFU" : "check required"}${warn}`
        );
        setDfuStatus(analysis.ok ? "HEX looks like an application image." : "HEX address range needs review.", analysis.ok ? "ok" : "warn");
        return lastDfuAnalysis;
      }
      if (lower.endsWith(".zip")) {
        lastDfuAnalysis = { type: "zip", fileName: name, fileSize: file.size, ok: true };
        setDfuInfo(
`File: ${name}
Type: Nordic DFU package
Size: ${file.size} byte(s)
Region check: package contents are validated by the bootloader during DFU.`
        );
        setDfuStatus("Nordic DFU package selected.", "ok");
        return lastDfuAnalysis;
      }
      throw new Error("Unsupported DFU file extension");
    } catch (error) {
      lastDfuAnalysis = null;
      setDfuStatus(error.message, "warn");
      setDfuInfo(error.message);
      return null;
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

  async function enterDfuBootloader() {
    if (!state.connected) {
      setDfuStatus("Connect to the application UART first.", "warn");
      return;
    }
    const ok = confirm("Reset the board into UART DFU bootloader mode?");
    if (!ok) return;
    setDfuStatus("Requesting bootloader entry...");
    const reply = await sendCommand("DFU", {
      waitForReply: true,
      timeoutMs: 2000,
      replyMatcher: text => text.toUpperCase().startsWith("DFU,ENTERING"),
    });
    if (reply) setDfuStatus("Board is resetting into UART DFU bootloader.", "ok");
    else setDfuStatus("DFU command sent; waiting for port reset.", "warn");
    setTimeout(() => {
      if (state.connected) disconnectSerial().catch(() => {});
    }, 500);
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

  function bindDfuEvents() {
    $("dfuFile")?.addEventListener("change", analyzeDfuFile);
    $("dfuAnalyzeButton")?.addEventListener("click", analyzeDfuFile);
    $("dfuCheckButton")?.addEventListener("click", checkDfuSupport);
    $("dfuEnterButton")?.addEventListener("click", enterDfuBootloader);
    $("dfuCommandButton")?.addEventListener("click", showDfuCommand);
  }

  window.addEventListener("DOMContentLoaded", bindDfuEvents);
})();
