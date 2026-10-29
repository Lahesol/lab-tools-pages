# v87 DAC/LDAC Pulse · 2026-10-29

## 수정 이유 / 검증 경계

v86은 S16에서 목표 bias까지 천천히 올린 다음 DUT 연결 시간만 타이머로
제한했습니다. 따라서 force 공통 노드 TE_I 자체에는 긴 준비 램프가 보였습니다.
v87은 DUT를 영점 부근에 먼저 연결하고 **DAC-B 출력 전환**으로 펄스를 만듭니다.
v86 MUX pulse 송신은 새 웹에서 차단하며, 과거 PL86 파일은 읽기만 지원합니다.

이 릴리스는 소프트웨어/ARM 빌드/서명 검증 후보입니다. 새 펌웨어의 업로드,
실물 펄스, TE_I 전압 상승·하강시간, 실제 peak current는 아직 검증하지 않았습니다.
100 µs는 두 LDAC 전환의 타이머 간격입니다. 아날로그 CV/CC loop, 부하, MUX,
배선 때문에 실제 TE_I와 DUT 전압의 폭·높이는 달라질 수 있습니다.
CC가 걸리면 목표 1 V가 실제로 도달한다고 보장할 수 없습니다.

## 초기화와 실행 흐름

1. 부팅: 외부 저주파 크리스털 없이 LFRC 사용. 기존 RI85 방식으로 AIN6(V_CMD),
   AIN7(V_MID)를 측정하여 실효 VrefB와 SAFE code를 초기화합니다.
2. 웹 연결: ADC_RATE 중지 → VER/HW/ADCINFO/LIMITSTAT/STAT/MUXSTAT/GPIO →
   INITSTAT/INIT85_LAST 원본 CRC/epoch 검증. 연결만으로 펄스를 실행하지 않습니다.
3. 전압 프리셋은 입력만 바꿉니다. DUT, mV, µs, CC+·CC−를 확인하고 실행을 승인해야
   `ADC_RATE,0`, `LIMITS,<plus_uA>,<minus_uA>`,
   `PULSE87,<DUT1..30>,<positive0/1>,<magnitude_mV>,<width_us>`가 전송됩니다.
4. 펌웨어: SAFE/S16 → 설정 CC 적용 → S16에서 ±20 mV의 작은 방향 확인 →
   SAFE±1 DAC code로 복귀(선택한 ADG884 PU/PD 유지) → 100 ms 대기·8 scan 검사.
   이 준비 과정은 완전히 평평한 TE_I를 의미하지 않지만, **목표 1/3 V 준비 램프는 없습니다.**
5. DUT를 이 near-neutral bias에 연결 → 100 ms 대기·8 scan 검사.
   이 동안 CC0으로 제한하지 않고 사용자가 설정한 고정 compliance를 유지합니다.
6. LDAC HIGH인 채 DAC-B의 input register에 목표 code를 써 둡니다. 출력은 그대로입니다.
   TIMER3 16 MHz + PPI가 LDAC를 내려 목표 출력을 적용하고, 1 µs 뒤 LDAC를 올리면서
   SPIM1 EasyDMA(1 MHz, 2 byte)를 시작하여 neutral code를 input register에 미리 적습니다.
7. 요청한 폭 후 PPI가 LDAC를 내려 near-neutral 출력으로 복귀시킵니다.
   동시에 bank A는 WR latch로 S16, bank B는 /EN_B HIGH 후 /EN_A LOW로 S16에 격리됩니다.
   MUX 격리는 neutral SPI 전송 성공 여부와 무관하게 하드웨어 예약됩니다.
8. 1 µs 뒤 LDAC HIGH/타이머 정지. SPI END·TXD.AMOUNT 및 PPI 시각 기록을 검사합니다.
   100 ms 대기·2 scan 복귀 검사 → DUT 격리/S16 유지 → 최종 SAFE(CC 최소값).
   GUI 입력에 저장된 CC+·CC− 값은 유지되어 다음 동작에 다시 적용됩니다.
9. PL 원본 완료 → CRC 검사 → STAT/MUXSTAT/GPIO SAFE readback → ADC 숫자 갱신 재개.

지원 범위: DUT1–30, +20..+3000 / −20..−1000 mV, **100..1000000 µs**.
100 µs 미만은 거부합니다. 조용히 100 µs로 늘리거나 호스트 sleep으로 대신하지 않습니다.
CC+ 0.2..3 mA / CC− 0.2..12 mA는 기존 명목 변환이며 새로 정밀 교정하지 않았습니다.

## 데이터 / 파일

- TX/RX bytes·line은 decoder보다 먼저 IndexedDB raw journal에 저장합니다.
- `PL,H,87` → offset/base64 `PL,D` → total/CRC32 `PL,E`.
- 96 byte header: 요청, 상태, CC, 실효 기준, SAFE/target/baseline code, LDAC-on의
  TIMER2 PPI capture, 예약 off, frame 수/14bit, 완료·SAFE·DMA flag, SPI END 시각·byte 수,
  SPI 주파수, TIMER3 on/off tick, guard 주기, DAC mode marker.
- 28 byte scan: start/end µs, phase, guard status, ADC raw int16×8. 최대80 scan.
  phase0=S16 near-neutral, 1=DUT near-neutral, 2=pulse 내부, 3=복귀와 겹침, 4=S16 복귀.
- 짧은 펄스는 **pulse 내부 ADC가 없습니다.** 100 µs peak·전류·저항을 ADC로 측정했다고
  해석하지 않습니다. 긴 펄스만 20 ms 간격 guard scan을 수행합니다.
- `Pulse 원본 ZIP 저장`: metadata.json, raw_wire.jsonl, raw_capture.bin,
  raw_pulse_frames.csv, result.json, 해시 manifest. raw와 파생 해석은 구분합니다.
  모든 이력은 저장하며 plot 초기화는 원본 삭제가 아닙니다.

## 오류 / 취소 / 종료

기존 rail/current/FORCE/영점/PU-PD 보호를 유지합니다. guard 실패는 상태와 원본을
보존하고 SAFE로 종료하며 자동 재시도하지 않습니다. 중단/링크 소실은 타이머/PPI를
취소하고 S16 격리를 먼저 수행합니다. neutral SPI가 실패해도 예정된 MUX park가 남아
DUT를 격리합니다. SPIM STOPPED가 1 ms 이내 확인되지 않으면 SPI_LOCK으로 구동을
금지하고 재시작을 요구합니다. 실패 시 TE_I force 공통 노드가 즉시 영점이라고
보장하지 않습니다. 분리된 DUT 상태와 DAC 출력 상태는 별개입니다.

종료 시 진행 작업 취소/SAFE 후 연결을 닫습니다. 구동 재개나 펄스 재전송은 하지 않습니다.

## 근거 / 재현 / 백업

- [ADI AD5302/5312/5322 데이터시트](https://www.analog.com/media/en/technical-documentation/data-sheets/AD5302_5312_5322.pdf),
  Serial Interface / Double-Buffered Interface: LDAC HIGH에서 input register만 갱신.
- [Nordic nRF52840 Product Specification](https://docs-be.nordicsemi.com/bundle/nRF52840_PS_v1.2/raw/resource/enus/nRF52840_PS_v1.2.pdf?save_local=true), TIMER/PPI/GPIOTE/SPIM.
- `calibration/v87/tools/check_pulse87.py`: production C + SYNTHETIC register/event model.
  양 bank/극성,100 µs/1 s, target 사전 램프 없음, neutral 연결, CC 고정,
  DMA stall/STOP timeout/취소/guard/격리를 시험합니다. 실측 데이터가 아닙니다.
- 웹 `npm test`, `npm run check`; 브라우저 QA는 장비 API를 차단한 별도 임시 환경만 사용.
- 배포 원본: `rram_web_gui/index.html` 및 JS/CSS, 문서, firmware의 v87 서명 ZIP.
  Pages 배포는 server-ops에서만 수행하며 이 작업은 배포하지 않습니다.
- 백업 포함: v87 C/H/INC, tests, build/package scripts, 변경 문서, 공개 서명 패키지.
  제외: 개인키/인증정보, logs/raw, SDK 임시 backup, Output/object/exe, node_modules,
  브라우저 임시 프로필/로컬 서버 스크립트. 후보 commit: `Fix RRAM pulses with timed DAC LDAC edges (v87)`.
