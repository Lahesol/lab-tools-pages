# v85 전원 기준 초기화 후보 · 2026-10-08

현재 상태: 소스/빌드/서명/소프트웨어 시험 완료. **미업로드·브라우저 렌더 미검증·실기 미검증**.
기존 v84의 실측 성공은 v85 또는 4.7 V/5 V 전원 비교 검증을 대신하지 않습니다.

## 원인과 기준 노드

v84는 DAC-B VrefB가 VDD에 고정 연결된 상태에서 4782 mV/SAFE code1066을 고정 사용했습니다.
이상적인 DAC 계산은 `V_CMD=VrefB*code/4096`입니다. 같은1066에서 기준4.782 V이면1.2445 V,
5 V이면1.3013 V이므로 약56.7 mV 차이가 납니다. 이는 계산값이며 새 측정값이 아닙니다.
USB 단자 전압과 DAC VrefB 핀 전압은 배선·부하에 따라 다를 수 있으므로 동일하다고 확정하지 않습니다.

SAADC는 이미 내부 기준/gain1/6을 사용합니다. VDD 기준 ADC로 바꾸거나 raw에 전원 보정 계수를 곱하지 않습니다.
AIN6은 V_CMD의20k/20k 분압, AIN7은 V_MID입니다. AIN0/4/6의×2는 전압 표시/분석에만 적용합니다.
TE_I/BE_I는 FORCE, V_FB−V_MID는 수정된 IA의 sense 출력 전제입니다.
부하·CV/CC 응답·MUX 상태에 영향을 받는 TE/FORCE/FB는 기준 추정 입력으로 쓰지 않습니다.

## 펌웨어 흐름

1. 초기 DAC/스위치 설정은 기존 SAFE seed4782 mV/code1066, PD, bank A의S16입니다. 실제 DUT를 연결하지 않습니다.
2. USB/SoftDevice 초기화 후, BLE 광고 시작 전에 한 번 실행합니다. 외부32kHz crystal은 사용하지 않고 LF RC 설정을 유지합니다. 측정용 HF clock을 일시 요청합니다.
3. 200 ms 안정화 후14bit/내부 기준/mean16/acquisition40µs의8채널 raw scan을8frame 저장합니다. 한 scan 내 채널은 순차 측정입니다.
4. 알려진 DAC code와 AIN6으로 실효 기준을 추정합니다. `Vref_eff = mean(V_CMD)*4096/code`. AIN7과 AIN6의 비로 중립 code를 구합니다. 기준4.5–5.5 V, 중립1.15–1.35 V/code900–1250 범위만 허용합니다.
5. S16에서만 후보 SAFE code를 적용합니다. 30 ms 후8frame 확인하며, 안정적인 오차가 남으면 최대5회 ratio 보정합니다. 각 후보는 mean 차이≤5 mV, 모든 frame차이≤20 mV를 만족해야 합니다. CMD span≤40 mV, MID span≤20 mV, AIN6/7 rail/range 조건도 검사합니다.
6. 후보 확인 뒤 같은 code에서30 ms 후 두 번째8frame을 검사합니다. 실제 SAFE 함수로 복귀/재기록한 뒤30 ms 후 세 번째8frame을 검사합니다. 세 window가 모두 통과해야 ready가 됩니다.
7. 전체 초기화는2초 deadline이며 최대64frame을 SRAM에 남깁니다. 실패·SAFE 취소·generation/route 변화에는 이전 기준과 SAFE code로 되돌린 뒤 S16에 복귀하고 CTRL/SWP를 차단합니다. 자동 재시도하지 않습니다.
8. 초기화 성공 프로파일은 RAM에만 유지합니다. Flash wear나 이전 전원의 영구 보정값을 피하며, 재부팅마다 다시 측정합니다. 주기적인 DAC 쓰기나 sweep 중 자동 보정은 하지 않습니다.

S16에서의 CC code0은 기존 SAFE의 **최소 물리 제한 상태**이지 CC loop OFF가 아닙니다.
이를 DUT 영점/측정용으로 사용하지 않습니다. 정상 DUT CTRL/SWP의 저장된 CC+/CC− 설정과 아날로그 compliance는 기존 경로를 유지합니다.
이번 초기화는 CC 정확도, INA gain, shunt4Ω 또는 CV loop 성능을 교정하지 않습니다.

## 명령과 웹 흐름

- `INITSTAT`: `I,85,status,vref_mV,safe_code,frame_count,epoch` (총7필드).
- `INIT85_LAST`: 마지막 초기화 원본을 읽는 수동/read-only 명령. DAC/스위치 쓰기 없음.
- `INIT85`: 명시적 재초기화. 이미 SAFE/S16, ADC streaming OFF, 진행 중인 작업 없음, PD이어야 합니다. DUT 연결 상태를 알아서 바꾸는 명령이 아닙니다.
- 원본 전송: `RI,H,85` → `RI,D,offset,base64` (최대12 bytes) → `RI,E,total_bytes,crc32`.
- 웹 연결은 먼저 ADC_RATE0/VER/HW/ADCINFO/LIMITSTAT/STAT/MUXSTAT/GPIO를 조회하고 INITSTAT/INIT85_LAST를 읽습니다. 미초기화라면 raw 조회를 생략하고 read-only로 연결합니다. 연결 자체가 INIT85를 보내지 않습니다.
- 웹은 raw를 저장한 뒤 CRC/메타데이터/기준 추정 근거/최종3window의 전압을 검증합니다. HW·status·code·frame_count·epoch가 현재 INITSTAT과 일치해야 구동을 허용합니다.
- MCU가 재부팅되지 않은 채 전원 조건이 바뀌었다면 먼저 SAFE 버튼, 이어 `S16 전원 기준 재초기화`를 사용합니다. 측정 도중 전원을 바꾸지 않습니다.
- v83/v84는 조회/SAFE/DFU만 허용합니다. 이전 버전의 구동은 별도 보존된 v84 웹 ZIP을 사용해야 합니다. v85 native Python GUI는 이번에 제작하지 않았습니다.

## 원본과 오류

64byte header + frame당28byte: start/end µs, DACcode, phase, PU/PD, 부호 있는 AIN0–7 raw.
phase0=seed 측정,1–5=후보 iteration,6=후보 유지 확인,7=실제 SAFE 복귀 후 확인.
원시값은 평활화/수정하지 않습니다. 웹에서 초기화 record를 IndexedDB에 저장하며 실패/부분 원본도 보존합니다.
폴더를 지정한 경우 수신 종료 시 폴더에도 저장합니다. 브라우저 데이터 삭제에 대비해 ZIP을 별도 보관하세요.

초기화 ZIP: metadata.json, raw_wire.jsonl, raw_capture.bin, raw_reference_frames.csv, result.json, manifest.json(SHA256).
초기화 ZIP은 보관/진단용이며 sweep 가져오기 버튼의 입력이 아닙니다. 기록 탭에서도 초기화 ZIP을 저장할 수 있습니다.

|status|의미|
|---:|---|
|0|미초기화|
|1|완료|
|2|S16/정지 상태 변화 또는 불일치|
|3|ADC/HF clock 실패|
|4|실효 기준/SAFE 후보 범위 밖|
|5|AIN6/7 범위·rail·안정성 실패|
|6|V_CMD−V_MID 수렴 실패|
|7|SAFE 취소 또는 generation 변화|
|8|DAC/방향/실제 SAFE 확인 실패|
|9|2초 deadline 초과|

위 초기화가 통과해도 DUT 부하에서 CV/CC가 정상이라고 판정하지 않습니다.
기존 영점/전류/rail/안정화 보호는 그대로 별도 적용됩니다. TE/FORCE/VFB가 이상한 경우 추가 측정이 필요합니다.

## 검증과 다음 실측

- production 초기화 C 코드를 가상 clock/ADC/GPIO로 실행한 **SYNTHETIC 시험**:4.5/4.7/4.782/5/5.5 V 입력, 오프셋, ADC 오류/rail/불안정/취소/deadline/비수렴, live-state 거부/복원. 경계값의 반올림으로 범위를 벗어나면 실패가 정상입니다.
- 웹 software/controller-stub 시험: C encoder의 SYNTHETIC RI85 재생, CRC/offset/metadata 조작 검출, raw-first, 읽기 전용 handshake, epoch 불일치, DUT 연결 중 재초기화 거부, 실패 기록/저장 실패 구동 차단.
- 이전 D11 원본의 sweep decoder/fit 재생 회귀는 새 물리 측정이 아닙니다.
- 컴파일·SDK 원본 복원·application-only 서명/공개키/binaryhash 검증. 패키지118580 bytes, SHA256 `3ee9f008f6c48d434755159ca279edbf90ea74ba2f83c8d89d75bb592f907034`.
- 미수행: v85 업로드, 실제 boot 초기화, 브라우저 렌더/USB/BLE end-to-end, 4.7 V/5 V 전원 비교, DUT sweep, forming.

다음 실측은 두 전원에서 **각각 완전 재부팅**하고 S16 상태의 INIT85_LAST·HW·ADC 원본을 저장한 뒤,
V_CMD−V_MID와 DMM의 DAC VrefB/VMID를 비교합니다. 성공 후 승인된 동일 DUT/CC/저전압 조건을 비교합니다.
5 V라는 USB 명목값만 보고 실제 VrefB라고 입력하지 않습니다. 분압/ADC 오차가 섞인 실효 추정은 정밀 교정값이 아닙니다.

## 배포/백업

원본 `C:\Users\mecha\GPT_home\Neuromorphic Vision System\rram_web_gui`, 진입점 index.html.
펌웨어 원본/후보/서명 ZIP은 프로젝트의calibration/v85에 있습니다. 개인 키는 기존 로컬 보관소에만 두었습니다.
정적 배포에는 루트HTML/CSS/JS와 v85 signed firmware ZIP, 이 문서/README만 필요합니다.
제외: tests/scripts/design/logs/raw/node_modules/certs, 이전v83/v84 firmware, 개인키, 장비 접속 metadata.
실물 검증과 사용자 승인 후 server-ops에서 `./scripts/publish-github-pages.ps1`을 수행합니다. 이 채팅에서 배포/포털 변경은 하지 않았습니다.
