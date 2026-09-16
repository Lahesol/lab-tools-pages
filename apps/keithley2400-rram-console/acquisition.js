// Buffered acquisition: no samples are available to the UI until completion/fetch.
export async function acquireBufferedSweep(transport, timeouts, { assertActive = () => {}, onPhase = async () => {} } = {}) {
  const step = async (phase, command, timeoutMs, query = true) => {
    assertActive();
    await onPhase({ phase, command, timeoutMs });
    assertActive();
    try {
      const result = await (query ? transport.query(command, timeoutMs) : transport.writeCommand(command, timeoutMs));
      assertActive();
      return result;
    } catch (error) {
      error.phase = phase;
      error.command ??= command;
      throw error;
    }
  };
  await step("initiate", ":INIT", timeouts.queryTimeoutMs, false);
  const opc = await step("measurement", "*OPC?", timeouts.completionTimeoutMs);
  if (String(opc).trim() !== "1") {
    const error = new Error(`측정 완료 응답이 1이 아닙니다: ${opc}`);
    Object.assign(error, { name: "InstrumentCompletionError", phase: "measurement", command: "*OPC?", response: opc });
    throw error;
  }
  const traceResponse = await step("transfer", ":TRAC:DATA?", timeouts.traceTimeoutMs);
  const trippedResponse = await step("status", ":SENS:CURR:PROT:TRIP?", timeouts.queryTimeoutMs);
  const outputResponse = await step("status", ":OUTP?", timeouts.queryTimeoutMs);
  return { opc, traceResponse, trippedResponse, outputResponse };
}

export function acquisitionErrorMessage(error) {
  if (error.name !== "QueryTimeoutError") return error.message;
  if (error.command === "*OPC?") {
    return `${error.message}. 측정 완료 응답 대기 초과입니다. 장비가 측정을 마쳤는지/트리거 대기 상태인지 확인하세요. 데이터 전송 timeout과는 다릅니다.`;
  }
  if (error.command === ":TRAC:DATA?") {
    return `${error.message}. 완료 후 데이터 수신 대기 초과입니다. baud rate·흐름 제어·수신 로그를 확인하세요.`;
  }
  return error.message;
}
