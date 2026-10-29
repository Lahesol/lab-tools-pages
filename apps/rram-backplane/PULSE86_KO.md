# v86 Pulse / sweep 중첩 · 2026-10-29

## 사용

- 웹 revision: `v86-web1`. Pulse에는 **app86 펌웨어 업로드가 필요**합니다.
  v85 연결에서는 기존 DC/sweep를 사용할 수 있지만 Pulse 버튼은 잠깁니다.
- DUT dropdown, CC+·CC−, Pulse 전압(mV), 폭(µs)을 설정하고
  `선택 DUT에 Pulse 1회 실행` → 조건 확인을 누릅니다.
- Pulse 범위: +20..+3000 mV 또는 −20..−1000 mV; 폭 1..1000000 µs.
  CC는 기존 +0.2..3 / −0.2..12 mA 명목 설정입니다.
- SET/RESET/READ 프리셋은 전압 **입력만** 바꿉니다. 프리셋 버튼으로 구동하지 않습니다.
  READ +20 mV도 단일 전압 pulse이며, 짧은 pulse의 저항 측정을 보장하지 않습니다.
- 단일 pulse입니다. 자동 반복/재시도/SET–READ 연속 시퀀스는 실행하지 않습니다.

## MCU / wire 동작

1. 기존 내부 SAADC 기준·ADC14 software mean16·분압 ×2·S16 초기화 및
   RI85 CRC/epoch 증거가 있어야 구동됩니다. 앱 버전은86, RI85/SC85 wire 형식은 유지합니다.
2. 웹은 원본 journal을 준비하고 ADC_RATE,0 → LIMITS →
   `PULSE86,<DUT>,<positive0/1>,<magnitude_mV>,<width_us>`를 **한 번** 전송합니다.
   브라우저 setTimeout으로 전압 ON/OFF를 만들지 않습니다.
3. MCU가 기존 연결을 S16으로 먼저 분리합니다. 극성별 compliance를 적용하고
   S16 neutral에서 100 ms 대기/8 scan hard 검사를 합니다. CC0으로 입장을 검사하지 않습니다.
4. S16에서 DAC를 ≤20 mV 간격으로 ramp하고 20 ms 대기/2 scan rail·current·FORCE 검사를 합니다.
   ADC로 확인한 ADG884 방향이 요청과 일치해야 다음 단계로 갑니다.
5. 기존 TIMER3/PPI mux 엔진이 시작+2 µs에 DUT를 연결하고 예약 폭 뒤 S16으로 복귀합니다.
   Bank A는 S16 latch↔DUT latch, bank B는 S16/A와 DUT/B 사이 EN 전환입니다.
   MUX propagation/250ns latch hold와 아날로그 CV/CC 응답은 **실제 pulse 폭과 다를 수 있습니다**.
6. 긴 pulse에서는 시간 여유가 있을 때 20 ms 이상 간격으로 normal 8채널 ADC guard를 보존합니다.
   scan이 park와 겹치면 별도 overlap phase입니다. guard는 아날로그 compliance를 대체하지 않습니다.
7. 타이머가 먼저 S16으로 복귀한 뒤 neutral DAC, CC-held 100 ms 대기/2 post scan,
   마지막 SAFE 순서입니다. host가 STAT/MUXSTAT/GPIO를 다시 확인합니다.
8. 완료/보호 중단도 `PL,H,86` → `PL,D,offset,base64` → `PL,E,length,crc32`로 남깁니다.
   64-byte header + 최대64×28-byte frames. 각 frame은 start/end µs, phase,
   guard status, 원시 int16 AIN0..7입니다. 정상 완료는 timer 완료/내부 SAFE 증거를 요구합니다.
9. 오류/SAFE/연결 종료는 timer/route를 취소하고 S16/SAFE를 요청합니다.
   host는 재시도하지 않고 partial/error를 보관합니다. readback이 없으면 SAFE 미확인입니다.

## 데이터와 해석 한계

- Pulse 원본도 해석 전에 IndexedDB에 보존합니다. 기록 탭에서 Pulse별 보기/ZIP을 제공합니다.
- ZIP: metadata.json, raw_wire.jsonl, raw_capture.bin, raw_pulse_frames.csv,
  result.json, SHA256 manifest.json. 폴더 권한을 지정하면 종료 후 해당 폴더에도 저장합니다.
- 짧은 pulse에는 내부 ADC 표본이 **0개**일 수 있습니다. pre/post scan은 S16 값이며
  DUT pulse 전류·저항·overshoot 측정으로 바꾸어 해석하지 않습니다.
- 폭은 MCU timer 예약값입니다. 실제 DUT pad 전압 pulse의 상승/하강/폭과 CC 과도응답은
  아직 물리 검증하지 않았습니다. 이 릴리스의 software tests/build/signature 검증은 실측이 아닙니다.
- 펌웨어를 업로드하거나 장비를 구동하는 것은 별도의 승인된 작업입니다.

## Sweep plot 유지 규칙

같은 DUT의 +1 V, −1 V, +3 V를 독립 슬롯으로 겹쳐 표시합니다.
예: +1 → −1이면 두 결과가 유지되고, 다시 +1이면 **+1 곡선만** 교체합니다.
CC/step/dwell이 달라도 같은 DUT·목표 범위이면 같은 슬롯입니다.
다른 DUT 곡선은 섞지 않으며, 측정점 표·회귀 텍스트·ZIP은 최근 선택 기록 기준입니다.

`plot 초기화`는 현재 표시 DUT의 곡선만 비웁니다. ADC/DAC/EN을 조작하거나 원본을 삭제하지 않습니다.
기록 보기/최근 기록 불러오기로 다시 표시할 수 있습니다. page reload는 저장된 최근 기록부터 복원하며,
이전 반대 방향 기록은 기록 탭에서 추가로 선택할 수 있습니다. 원본은 모두 이력에 남습니다.

양전압 진행/복귀는 파랑/주황, 음전압은 초록/보라, +3 V는 청록/자주이며 CC는 빨간 점입니다.
측정 전압/전류를 평활화·재정규화하지 않고 각 원본 sweep를 별도 선으로 그립니다.

## 릴리스 / 백업

Firmware: `calibration/v86/dfu_packages/rram_backplane_app_v86_pulse_rramkey_signed.zip`,
application-only, 기존 RRAM bootloader public key 서명 검증. 개인 키는 포함하지 않습니다.
기존 v85 원본과 서명 패키지는 보존합니다. SDK는 컴파일 후 v59 baseline으로 복구합니다.
생성 코드·tests·docs·source manifest는 로컬 백업 준비 대상입니다.
raw/장비 metadata/비밀키/SDK build/logs/캐시는 Git 및 정적 배포에서 제외합니다.
정적 웹 배포는 server-ops에서만 수행합니다.
Commit 후보: `feat(rram): add guarded timer pulse86 and polarity-preserving sweep overlays`.
