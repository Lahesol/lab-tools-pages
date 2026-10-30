# v88 · 50 µs DAC pulse / DUT 연결 유지

v87은 DAC 복귀와 S16 전환이 동시에 일어났습니다. v88은 **정상 펄스의 SAFE→목표→SAFE
전 구간과 복귀 검사까지 MUX 연결을 유지**합니다. 최소 예약 폭50 µs, 최대1 s입니다.
50 µs는 LDAC 목표/복귀 event 사이 간격이며 실제 TE_I·DUT의 상승/하강·평탄부 보증이 아닙니다.
실제 파형이 비정상인 v87 실측을 소프트웨어 시험 통과로 정당화하지 않습니다.
이번 v88은 새 후보이며 업로드·DUT 구동·50 µs 실물 측정은 아직 하지 않았습니다.

## 초기화 / 명령 / 정상 동작

1. 부팅 LFRC 사용(외부 LF crystal 없음). 기존 RI85로 AIN6 V_CMD·AIN7 V_MID 기반
   실효 DAC 기준과 SAFE code를 초기화합니다. 14bit/평균16회/40 µs acquisition 유지.
2. 웹 연결은 VER/HW/ADCINFO/INITSTAT/INIT85_LAST CRC·epoch를 확인합니다.
   DUT 구동은 자동 실행하지 않습니다. 입력 preset도 전압 입력만 바꿉니다.
3. 사용자 승인 후 `ADC_RATE,0` → `LIMITS,<CC+ µA>,<CC− µA>` →
   `PULSE88,<DUT1..30>,<positive0/1>,<magnitude_mV>,<width_us>` 1회.
   범위 +20..+3000 / −20..−1000 mV, 50..1000000 µs, 정수폭. 49 µs 이하는 거부합니다.
   CC+0.2..3 mA / CC−0.2..12 mA 명목 변환과 아날로그 보호 한계는 유지합니다.
4. S16에서 고정 CC를 적용하고 ±20 mV로 ADG884 방향을 확인합니다. 방향 확인용
   SAFE±1 code 뒤에는 DAC를 **정확한 SAFE code**로 직접 되돌려 PU/PD는 유지합니다.
   100 ms·8 ADC 검사 → DUT 연결 → 100 ms·8 ADC 검사. 목표 1/3 V 사전 ramp는 없습니다.
5. LDAC HIGH에서 목표 code를 DAC-B input register에 미리 기록합니다.
   /CS·WR·주소·/EN·CC·ADG884는 pulse/SAFE 복귀 중 고정합니다.
6. TIMER3 16 MHz/PPI: on=2 µs LDAC LOW → +1 µs LDAC HIGH와 SPIM1 DMA START.
   SPI1 MHz/2 byte로 SAFE code를 input register에 미리 로드합니다(명목16 µs 전송).
   on+설정폭에 LDAC LOW로 SAFE 출력 적용 → +1 µs LDAC HIGH.
   **이 두 edge에서는 MUX를 바꾸지 않습니다.** PPI는 실제 on/off event를 TIMER2에 capture합니다.
7. CPU가 SPI END/byte 수/on·off capture를 확인합니다. DUT를 계속 연결하고
   100 ms 대기 후 ADC8회 guard/영점·route 상태를 검사합니다. 그동안 CC·방향은 유지합니다.
8. 통과 후에만 S16으로 복귀하고 SPI/GPIOTE 소유권을 반환합니다. S16 ADC2회 → 최종 SAFE.
   GUI의 저장 CC 설정은 유지하지만 최종 SAFE의 물리 CC는 기존 최소값으로 돌아갑니다.
9. raw CRC 수신 → STAT/MUXSTAT/GPIO의 SAFE readback → 기존 ADC 숫자 갱신 주기 복구.

## 오류 / watchdog / 종료

- CRC는 디지털 기록 무결성이며 실제 전압 폭의 측정이 아닙니다. 50 µs 내부 ADC는 없습니다.
- neutral DMA 불완료·잘못된 event 시각·guard/복귀 실패는 즉시 S16 격리 후 SAFE.
- 사용자 SAFE/링크 소실은 예약 취소·DUT 즉시 격리. 자동 재시도/재전송하지 않습니다.
- 정상 MUX 전환을 제거하는 대신, **복귀 예정 시각+250 ms**에 독립 TIMER/PPI watchdog을
   둡니다. CPU가 복귀 검사/정리를 못 하면 양 /EN을 HIGH로 만들어 모든 DUT를 격리합니다.
   이 비상 상태는 S16 parking이 아니라 all-OFF입니다. 정상 처리에서는 이 deadline 전에
   검사를 마치고 watchdog을 해제한 후 S16으로 갑니다.
- SPI STOPPED가1 ms 내 확인되지 않으면 SPI_LOCK/방향 fault로 새 구동을 막고 재시작 요구.
- 종료는 SAFE·ADC_RATE0 후 포트 반환. 실제 DUT 안전 전압은 별도 회로 응답 검증이 필요합니다.

## raw / 데이터 / 저장

TX/RX bytes·line을 decoder보다 먼저 IndexedDB journal에 기록합니다.
`PL,H,88` → offset/base64 `PL,D` → 길이/CRC32 `PL,E`.
112 byte header는 요청/상태/CC/기준/SAFE·target·baseline code, on/off 시각, ADC bit·frame 수,
timer/SAFE/DMA/연결유지 flag, SPI END/byte 수/주파수, timer ticks, guard 주기, HOLD marker,
복귀 대기시간·park 시각·통과 scan 수·실제 return event capture를 포함합니다.
28 byte frame은 start/end µs, phase, guard status, 변경하지 않은 raw int16×8입니다.

phase0=S16 SAFE 검사, 1=DUT SAFE 검사, 2=pulse 내부 guard, 3=복귀와 겹친 guard,
4=DUT 연결 유지 SAFE 복귀 검사8회, 5=S16 사후2회. 최대80frame.
정상 완료 flag31, 기본26frame이며 짧은 pulse의 내부 frame은0개입니다.
decoder는 정확한 SAFE code, return capture, 8회 복귀 검사와 park 시간 순서도 검사합니다.

`Pulse 원본 ZIP 저장`: metadata.json, raw_wire.jsonl, raw_capture.bin,
raw_pulse_frames.csv, result.json, SHA256 manifest. 계산/해석과 raw를 분리합니다.
구형 PL86/87은 이력 읽기만 지원하며 새 pulse는 firmware88에만 전송합니다.
DC/sweep은85..88 호환, 기존 ±1/+3 V 중첩/중복 교체/표시 초기화도 유지합니다.
이번 변경은 웹과 펌웨어이며 최종 Python GUI에 새 pulse를 추가하지 않았습니다.

## 검증 / 배포 / 백업

- production C + SYNTHETIC register/event 모델: 50 µs/1 s·양 bank/극성,
  exact SAFE·MUX/CC 유지, 100 ms+8 scan, 늦은 CPU, neutral DMA stall, STOP timeout,
  취소/guard/복귀 실패와 독립 late watchdog. 실측이 아닙니다.
- ARM Release build 및 기존 RRAM bootloader 키에 대한 ECDSA/init/hash/partition 검증.
- 웹 단위 시험/정적 검사 및 장비 API를 차단한 브라우저 QA. 새 hardware 구동 없음.
- 근거: [AD5322 double-buffer/timing](https://www.analog.com/media/en/technical-documentation/data-sheets/AD5302_5312_5322.pdf).
- 배포 원본 `rram_web_gui`, entry `index.html`; 정적 ZIP은 calibration에 준비.
  Pages 등록/배포/commit/push는 이 프로젝트에서 하지 않으며 server-ops에서만 수행합니다.
- 백업 포함: v88 C/H/INC, tests, build/package scripts, 문서, 공개 서명 ZIP.
  제외: 개인키·인증·장비 식별/포트 raw logs, SDK Output/backup, exe/obj, node_modules,
  임시 브라우저/서버. Commit 후보: `Support 50us DAC pulses with held DUT route and verified SAFE return (v88)`.
