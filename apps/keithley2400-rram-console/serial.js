function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function makeTimeoutError(command, timeoutMs) {
  const error = new Error(`응답 timeout (${timeoutMs} ms): ${command}`);
  error.name = "QueryTimeoutError";
  error.command = command;
  error.timeoutMs = timeoutMs;
  return error;
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export class Legacy2400SerialTransport {
  constructor({ onRawEvent = async () => {}, onState = () => {} } = {}) {
    this.onRawEvent = onRawEvent;
    this.onState = onState;
    this.port = null;
    this.config = null;
    this.reader = null;
    this.readLoopPromise = null;
    this.decoder = new TextDecoder();
    this.lineBuffer = "";
    this.pendingQuery = null;
    this.xoffPaused = false;
    this.closedByApp = false;
  }

  get connected() {
    return Boolean(this.port && this.port.readable && this.port.writable);
  }

  async connect(config) {
    if (!("serial" in navigator)) throw new Error("이 브라우저에서는 Web Serial API를 사용할 수 없습니다. Chrome/Edge 데스크톱의 secure context에서 열어 주세요.");
    if (this.port) await this.disconnect();
    this.config = { ...config };
    this.closedByApp = false;
    this.port = await navigator.serial.requestPort();
    await this.port.open({
      baudRate: Number(config.baudRate),
      dataBits: Number(config.dataBits),
      stopBits: Number(config.stopBits),
      parity: config.parity,
      // 2400 does not support RTS/CTS; XON/XOFF is handled in this class.
      flowControl: "none",
      bufferSize: 4096,
    });
    this.onState({ type: "connected" });
    this.readLoopPromise = this.startReadLoop();
  }

  terminator() {
    if (this.config?.terminator === "crlf") return "\r\n";
    if (this.config?.terminator === "lf") return "\n";
    return "\r";
  }

  async startReadLoop() {
    try {
      while (this.port?.readable) {
        this.reader = this.port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value) await this.consumeBytes(value);
          }
        } catch (error) {
          if (!this.closedByApp) await this.onRawEvent({ direction: "SYSTEM", text: `READ ERROR: ${error.message}`, severity: "error" });
        } finally {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    } catch (error) {
      if (!this.closedByApp) this.handleTransportFault(error);
    }
  }

  async consumeBytes(bytes) {
    const decoded = this.decoder.decode(bytes, { stream: true });
    if (!decoded) return;
    await this.onRawEvent({ direction: "RX", text: decoded, bytesHex: toHex(bytes) });
    for (const character of decoded) {
      if (character === "\u0013") { // XOFF
        this.xoffPaused = true;
        this.onState({ type: "xonxoff", paused: true });
        continue;
      }
      if (character === "\u0011") { // XON
        this.xoffPaused = false;
        this.onState({ type: "xonxoff", paused: false });
        continue;
      }
      if (character === "\r" || character === "\n") {
        if (this.lineBuffer) {
          const line = this.lineBuffer;
          this.lineBuffer = "";
          this.resolveResponse(line);
        }
        continue;
      }
      this.lineBuffer += character;
    }
  }

  resolveResponse(line) {
    if (!this.pendingQuery) {
      this.onState({ type: "unsolicited", line });
      return;
    }
    const { resolve, timer } = this.pendingQuery;
    clearTimeout(timer);
    this.pendingQuery = null;
    resolve(line);
  }

  handleTransportFault(error) {
    const pending = this.pendingQuery;
    this.pendingQuery = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.onState({ type: "fault", error });
  }

  async waitForXon(timeoutMs) {
    if (this.config?.flowControl !== "xonxoff") return;
    const started = Date.now();
    while (this.xoffPaused) {
      if (Date.now() - started > timeoutMs) throw new Error("XOFF 상태가 timeout 내 해제되지 않았습니다.");
      await sleep(10);
    }
  }

  async writeCommand(command, timeoutMs = 10000) {
    if (!this.connected) throw new Error("열린 serial 포트가 없습니다.");
    await this.waitForXon(timeoutMs);
    const text = `${command}${this.terminator()}`;
    const bytes = new TextEncoder().encode(text);
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(bytes);
      await this.onRawEvent({ direction: "TX", text: command, rawText: text, bytesHex: toHex(bytes) });
    } finally {
      writer.releaseLock();
    }
  }

  async sendControlByte(decimalValue) {
    if (!this.connected) return;
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new Uint8Array([decimalValue]));
      await this.onRawEvent({ direction: "TX", text: `CONTROL 0x${decimalValue.toString(16).padStart(2, "0").toUpperCase()}`, bytesHex: toHex([decimalValue]) });
    } finally {
      writer.releaseLock();
    }
  }

  async query(command, timeoutMs = 10000) {
    if (this.pendingQuery) throw new Error("이전 query 응답을 기다리는 중입니다. 2400에는 응답 수신 전 다음 명령을 보내지 않습니다.");
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingQuery?.command === command) this.pendingQuery = null;
        reject(makeTimeoutError(command, timeoutMs));
      }, timeoutMs);
      this.pendingQuery = { command, resolve, reject, timer };
    });
    try {
      await this.writeCommand(command, timeoutMs);
    } catch (error) {
      const pending = this.pendingQuery;
      this.pendingQuery = null;
      if (pending) clearTimeout(pending.timer);
      throw error;
    }
    return response;
  }

  async safeStop({ useBreak = true } = {}) {
    const result = { attempted: [], errors: [] };
    if (!this.connected) {
      result.errors.push("통신 포트가 이미 닫혀 있어 ABOR/OUTP OFF를 전송할 수 없습니다.");
      return result;
    }
    const attempts = [];
    if (useBreak) attempts.push(() => this.sendControlByte(3)); // Manual: ^C clears pending operation/output queue.
    attempts.push(() => this.writeCommand(":ABOR"));
    attempts.push(() => this.writeCommand(":OUTP OFF"));
    // Stop storage without clearing any readings; interrupted runs may leave NEXT active.
    attempts.push(() => this.writeCommand(":TRAC:FEED:CONT NEV"));
    for (const attempt of attempts) {
      try {
        await attempt();
        result.attempted.push("sent");
      } catch (error) {
        result.errors.push(error.message);
      }
    }
    return result;
  }

  async disconnect() {
    this.closedByApp = true;
    if (this.pendingQuery) {
      const pending = this.pendingQuery;
      this.pendingQuery = null;
      clearTimeout(pending.timer);
      pending.reject(new Error("포트가 닫혀 query가 취소되었습니다."));
    }
    try { await this.reader?.cancel(); } catch { /* close best effort */ }
    try { await this.readLoopPromise; } catch { /* reported by state */ }
    try { await this.port?.close(); } catch (error) {
      this.onState({ type: "fault", error });
    }
    this.port = null;
    this.reader = null;
    this.readLoopPromise = null;
    this.lineBuffer = "";
    this.xoffPaused = false;
    this.onState({ type: "disconnected" });
  }
}
