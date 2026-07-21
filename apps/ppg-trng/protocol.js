(function initPpgTrngProtocol(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PpgTrngProtocol = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const MAGIC_0 = 0xA5;
  const MAGIC_1 = 0x5A;
  const VERSION = 2;
  const CHANNEL_COUNT = 3;
  const HEADER_SIZE = 10;
  const CRC_SIZE = 2;
  const ENCRYPT_MAGIC_0 = 0xC3;
  const ENCRYPT_MAGIC_1 = 0x3C;
  const ENCRYPT_VERSION = 1;
  const ENCRYPT_FRAME_SIZE = 26;

  function asBytes(value) {
    return value instanceof Uint8Array ? value : Uint8Array.from(value || []);
  }

  function crc16Ccitt(value, length = null) {
    const bytes = asBytes(value);
    const limit = length === null ? bytes.length : Math.min(bytes.length, length);
    let crc = 0xFFFF;
    for (let index = 0; index < limit; index += 1) {
      crc ^= bytes[index] << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc;
  }

  function getFrameLength(sampleCount, channelCount = CHANNEL_COUNT) {
    return HEADER_SIZE + sampleCount * channelCount * 2 + CRC_SIZE;
  }

  function decodeAdcFrame(value) {
    const bytes = asBytes(value);
    if (bytes.length < HEADER_SIZE + CRC_SIZE) throw new Error("ADC frame is too short");
    if (bytes[0] !== MAGIC_0 || bytes[1] !== MAGIC_1) throw new Error("ADC frame magic mismatch");
    if (bytes[2] !== VERSION) throw new Error(`Unsupported ADC frame version ${bytes[2]}`);
    if (bytes[3] !== CHANNEL_COUNT) throw new Error(`Unsupported ADC channel count ${bytes[3]}`);

    const sampleCount = bytes[4];
    if (sampleCount < 1 || sampleCount > 64) throw new Error(`Invalid ADC sample count ${sampleCount}`);
    const frameLength = getFrameLength(sampleCount, bytes[3]);
    if (bytes.length !== frameLength) throw new Error(`ADC frame length ${bytes.length}/${frameLength}`);

    const crcOffset = frameLength - CRC_SIZE;
    const expectedCrc = bytes[crcOffset] | (bytes[crcOffset + 1] << 8);
    const actualCrc = crc16Ccitt(bytes, crcOffset);
    if (actualCrc !== expectedCrc) {
      throw new Error(`ADC frame CRC mismatch ${actualCrc.toString(16)}/${expectedCrc.toString(16)}`);
    }

    const samples = [];
    let offset = HEADER_SIZE;
    for (let scan = 0; scan < sampleCount; scan += 1) {
      const adc0 = bytes[offset] | (bytes[offset + 1] << 8);
      const adc2 = bytes[offset + 2] | (bytes[offset + 3] << 8);
      const adc3 = bytes[offset + 4] | (bytes[offset + 5] << 8);
      samples.push({ ADC0: adc0, ADC2: adc2, ADC3: adc3 });
      offset += CHANNEL_COUNT * 2;
    }

    return {
      version: bytes[2],
      channelCount: bytes[3],
      sampleCount,
      flags: bytes[5],
      sequence: bytes[6] | (bytes[7] << 8),
      sampleRateHz: bytes[8] | (bytes[9] << 8),
      samples,
    };
  }

  function encodeAdcFrame({ sequence = 0, sampleRateHz = 1000, samples = [] } = {}) {
    if (!samples.length || samples.length > 64) throw new Error("ADC frame requires 1-64 scans");
    const frame = new Uint8Array(getFrameLength(samples.length));
    frame[0] = MAGIC_0;
    frame[1] = MAGIC_1;
    frame[2] = VERSION;
    frame[3] = CHANNEL_COUNT;
    frame[4] = samples.length;
    frame[5] = 0;
    frame[6] = sequence & 0xFF;
    frame[7] = (sequence >>> 8) & 0xFF;
    frame[8] = sampleRateHz & 0xFF;
    frame[9] = (sampleRateHz >>> 8) & 0xFF;

    let offset = HEADER_SIZE;
    samples.forEach((scan) => {
      [scan.ADC0, scan.ADC2, scan.ADC3].forEach((rawValue) => {
        const sample = Math.max(0, Math.min(16383, Math.round(Number(rawValue) || 0)));
        frame[offset] = sample & 0xFF;
        frame[offset + 1] = (sample >>> 8) & 0xFF;
        offset += 2;
      });
    });

    const crc = crc16Ccitt(frame, frame.length - CRC_SIZE);
    frame[frame.length - 2] = crc & 0xFF;
    frame[frame.length - 1] = (crc >>> 8) & 0xFF;
    return frame;
  }

  function decodeEncryptionFrame(value) {
    const bytes = asBytes(value);
    if (bytes.length !== ENCRYPT_FRAME_SIZE) throw new Error("ENCF frame length mismatch");
    if (bytes[0] !== ENCRYPT_MAGIC_0 || bytes[1] !== ENCRYPT_MAGIC_1) {
      throw new Error("ENCF frame magic mismatch");
    }
    if (bytes[2] !== ENCRYPT_VERSION) {
      throw new Error(`Unsupported ENCF frame version ${bytes[2]}`);
    }

    const crcOffset = ENCRYPT_FRAME_SIZE - CRC_SIZE;
    const expectedCrc = bytes[crcOffset] | (bytes[crcOffset + 1] << 8);
    const actualCrc = crc16Ccitt(bytes, crcOffset);
    if (actualCrc !== expectedCrc) {
      throw new Error(`ENCF frame CRC mismatch ${actualCrc.toString(16)}/${expectedCrc.toString(16)}`);
    }

    const u16 = (offset) => bytes[offset] | (bytes[offset + 1] << 8);
    const u32 = (offset) => (
      (bytes[offset])
      | (bytes[offset + 1] << 8)
      | (bytes[offset + 2] << 16)
      | (bytes[offset + 3] * 0x1000000)
    ) >>> 0;
    const flags = bytes[3];

    return {
      version: bytes[2],
      flags,
      signalChannel: bytes[4],
      keyChannel: bytes[5],
      movingAverageWindow: bytes[6],
      cipherWidthBits: bytes[7],
      sequence: u16(8),
      sampleIndex: u32(10),
      signalAdc: u16(14),
      noiseAdc: u16(16),
      noiseMovingAverage: u16(18),
      partialKeyBits: bytes[20],
      keyByte: bytes[21],
      plainByte: bytes[22],
      cipherByte: bytes[23],
      cipherValid: Boolean(flags & 0x01),
      rawBitValid: Boolean(flags & 0x02),
      keyCompleted: Boolean(flags & 0x04),
      switchPpgPhase: Boolean(flags & 0x08),
      switchBitPhase: Boolean(flags & 0x10),
      plainValid: Boolean(flags & 0x20),
    };
  }

  class StreamDecoder {
    constructor() {
      this.buffer = [];
    }

    reset() {
      this.buffer = [];
    }

    push(value) {
      this.buffer.push(...asBytes(value));
      const result = { textChunks: [], frames: [], encryptionFrames: [], errors: [] };

      while (this.buffer.length) {
        let magicIndex = -1;
        for (let index = 0; index < this.buffer.length - 1; index += 1) {
          const isAdcMagic = this.buffer[index] === MAGIC_0 && this.buffer[index + 1] === MAGIC_1;
          const isEncryptionMagic = this.buffer[index] === ENCRYPT_MAGIC_0 && this.buffer[index + 1] === ENCRYPT_MAGIC_1;
          if (isAdcMagic || isEncryptionMagic) {
            magicIndex = index;
            break;
          }
        }

        if (magicIndex < 0) {
          const keep = this.buffer.at(-1) === MAGIC_0 ? 1 : 0;
          const textLength = this.buffer.length - keep;
          if (textLength > 0) result.textChunks.push(Uint8Array.from(this.buffer.splice(0, textLength)));
          break;
        }

        if (magicIndex > 0) {
          result.textChunks.push(Uint8Array.from(this.buffer.splice(0, magicIndex)));
          continue;
        }

        if (this.buffer.length < 3) break;

        if (this.buffer[0] === ENCRYPT_MAGIC_0 && this.buffer[1] === ENCRYPT_MAGIC_1) {
          if (this.buffer.length < ENCRYPT_FRAME_SIZE) break;
          const candidate = Uint8Array.from(this.buffer.slice(0, ENCRYPT_FRAME_SIZE));
          try {
            result.encryptionFrames.push(decodeEncryptionFrame(candidate));
            this.buffer.splice(0, ENCRYPT_FRAME_SIZE);
          } catch (error) {
            result.errors.push(error.message || String(error));
            // Keep possible following ADCF/ENCF magic bytes available for
            // resynchronization after a truncated or dropped frame.
            this.buffer.splice(0, 1);
          }
          continue;
        }

        if (this.buffer.length < HEADER_SIZE) break;
        const version = this.buffer[2];
        const channelCount = this.buffer[3];
        const sampleCount = this.buffer[4];
        if (version !== VERSION || channelCount !== CHANNEL_COUNT || sampleCount < 1 || sampleCount > 64) {
          result.errors.push(`Invalid ADC frame header v${version} ch${channelCount} n${sampleCount}`);
          this.buffer.splice(0, 2);
          continue;
        }

        const frameLength = getFrameLength(sampleCount, channelCount);
        if (this.buffer.length < frameLength) break;
        const candidate = Uint8Array.from(this.buffer.slice(0, frameLength));
        try {
          result.frames.push(decodeAdcFrame(candidate));
          this.buffer.splice(0, frameLength);
        } catch (error) {
          result.errors.push(error.message || String(error));
          // Retry from the next byte so a valid frame after a partial frame
          // is not consumed as part of the failed candidate.
          this.buffer.splice(0, 1);
        }
      }

      return result;
    }
  }

  return {
    MAGIC_0,
    MAGIC_1,
    VERSION,
    CHANNEL_COUNT,
    ENCRYPT_MAGIC_0,
    ENCRYPT_MAGIC_1,
    ENCRYPT_VERSION,
    ENCRYPT_FRAME_SIZE,
    crc16Ccitt,
    decodeAdcFrame,
    encodeAdcFrame,
    decodeEncryptionFrame,
    StreamDecoder,
  };
}));
