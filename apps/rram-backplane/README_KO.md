# RRAM Backplane Web GUI · v84-web1

최신 BLE 전달 규약과 기본 v84 서명 ZIP은 [BLE_v84_KO.md](BLE_v84_KO.md)를
참고하세요. BLE 구동에는 VER84가 필요하며, VER83은 USB 구동과 기존 이력
조회에만 호환됩니다. 아래 v83-web2 검증 항목은 당시의 기록입니다.

현재 native `calibration/v83` 간소화 GUI의 기능을 옮긴 정적 웹 앱입니다.
기존 `web_gui` Vision 시뮬레이터와 native GUI/실측 원본은 변경하지 않았습니다.
BLE 명령 수신만 보완한 새 펌웨어는 `calibration/v84`에 별도로 준비하고 업로드했습니다.

## 제공 기능

- USB CDC / BLE NUS 연결: 브라우저 장비 선택창에서 정확한 보드를 선택.
- AIN0–7 숫자 갱신: TE_I, BE_I, V_FB, V_CMD, V_MID는 V; V_CC+, V_CC−, V_IS는 mA와 기준전압 병기.
- DUT1–30 선택과 실제 연결 분리. VCMD 입력/적용도 별도. 선택만으로 EN/GPIO/DAC 명령을 보내지 않음.
- VCMD 상대 mV / DAC-B 절대 mV 입력. 실제 연결 DUT 확인 뒤 적용.
- CC+ 0.2–3 mA, CC− 0.2–12 mA 각각 저장. 설정 저장은 다음 연결/VCMD/sweep부터 적용.
- +1 V, +3 V, −1 V 왕복 sweep: step 1–500 mV, dwell 1–1000 ms, 401점/180초 제한.
- sweep 중 SP84 실시간 plot 3개: command I–V, TE–BE potential 응답, sense I–V + 진행/복귀 선형 저항 근사.
- X축 tick 0.2 V. plot 갱신 때 스크롤 위치를 변경하지 않음.
- GPIO 별도 탭: 현재 IN과 CPU OUT 래치, ADG884 PU/PD 표시. 임의 GPIO 쓰기는 없음.
- Firmware: application-only signed ZIP 선택/기본 v84 ZIP, USB/BLE bootloader 선택, object별 CRC·EXECUTE 확인 진행률.
- 기록: 자동 raw 저장, CRC 확인된 기록 불러오기, ZIP export, SC81–84 기록 가져오기, 근사 재분석 별도 저장.

이 앱은 **현재 v83 간소화 GUI**를 이식합니다. 과거 testing GUI의 모든 burst/SET·RESET·READ pulse/agent folder-watch 기능을 추가한 것은 아닙니다.
버튼/탭은 일반 DOM 컨트롤이므로 브라우저 agent가 같은 승인된 UI 경로를 사용할 수 있습니다. 임의 serial-command 실행 API는 노출하지 않습니다.

## 실행 조건

진입점: `rram_web_gui/index.html`. 빌드/외부 CDN/npm 설치 없이 HTTPS 정적 호스팅에 게시할 수 있습니다.
ES modules를 사용하므로 **파일을 더블클릭하는 file:// 실행은 지원하지 않습니다.**
USB/BLE 장비 접근은 secure context 및 해당 API를 지원하는 브라우저가 필요합니다. 데스크톱 Chrome/Edge에서 실제 API 존재 여부를 화면에 검사합니다.
USB/BLE 선택창은 사용자의 버튼 클릭으로 열리며 자동으로 COM31이나 근처 장비를 선택하지 않습니다.
동일 보드는 native Python GUI에서 먼저 연결 해제해야 합니다. native GUI를 이 작업에서 닫거나 보드 포트를 빼앗지 않았습니다.

API 참고: [Chrome Web Serial](https://developer.chrome.com/docs/capabilities/serial), [Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth).

## 전체 제어 흐름

1. IndexedDB raw journal을 먼저 초기화합니다. 실패하면 구동을 활성화하지 않습니다. 페이지 시작만으로 연결/출력 명령을 보내지 않습니다.
2. 사용자가 USB 또는 BLE 보드를 고릅니다. USB 115200, DTR/RTS asserted; BLE NUS UUID `6e400001…` 알림/수신을 사용합니다. 한 경로만 소유합니다.
3. `ADC_RATE,0 → VER → HW → ADCINFO → LIMITSTAT → STAT → MUXSTAT → GPIO`를 응답별로 직렬 처리합니다. USB VER83/84, BLE VER84 및 ADC14/mean16/acquisition40/HW oversampling OFF, divider mask81, VrefB/SAFE 허용 범위를 확인한 뒤 구동 버튼을 엽니다.
4. `DUT 연결`: 실제 STAT/MUXSTAT을 다시 읽고 같은 DUT면 VCMD/CC를 유지합니다. 다른 DUT면 `ADC_RATE,0 → LIMITS → CTRL,<DUT>,<기존방향 또는 PD>,0 → STAT/MUXSTAT/GPIO → ADC_RATE 복원`. MCU의 S16 parking·neutral·보호 경로를 사용합니다.
5. `VCMD 적용`: 실제 연결 DUT를 재조회하며 dropdown의 다른 선택에 라우팅하지 않습니다. `CTRL,<실제DUT>,<부호>,<절대mV>` 한 번 요청. MCU가 DAC ramp·PU/PD·CC와 아날로그 보호를 처리합니다.
6. `CC 설정 저장`: `LIMITS,<plus_uA>,<minus_uA>`. CC0를 영점검사용으로 넣지 않습니다. 아날로그 compliance는 MCU/웹 응답시간에 의존하지 않습니다.
7. Sweep: 입력/fit 범위를 먼저 검증하고 run metadata 생성. `ADC_RATE,0 → LIMITS → SWP,<DUT>,<부호>,<endpoint_mV>,<step_mV>,<dwell_us>`. host가 전압점마다 타이밍 명령을 보내지 않습니다.
8. 측정 범위는 **signed 20 mV → endpoint → signed 20 mV**. −20~+20 mV 내부 구간은 측정하지 않습니다. 시작/복귀는 S16 neutral로, DUT에 연결된 0 V 표본과 구분합니다.
9. 수신 bytes/base64 및 line을 IndexedDB에 먼저 commit한 후 해석합니다. SP83/84의 원시 6채널 정수 합으로 잠정 곡선을 그립니다. CRC 확인 전 문구를 유지합니다. 페이지 갱신 때문에 새로운 ADC scan을 추가하지 않습니다.
10. MCU가 S16 parking/neutral/compliance-held 복귀 후 SC83/84 원시 capture를 전송합니다. 웹은 offset·CRC·메타데이터·timestamp·DAC/polarity·settled frame 수를 검사하고 SP 원시합과 SC raw를 정수 단위로 대조합니다. BLE raw 전송 시간은 MCU dwell과 별도이며 화면 완료가 늦을 수 있습니다.
11. `STAT/MUXSTAT/GPIO`를 새로 읽어 SAFE code/S16 확인 후 ADC monitor만 복원합니다. partial/guard-stop/CRC/SAFE 미확인을 구분하여 저장합니다. CC점은 plot에 남으며 정상 compliance 도달 자체를 host가 새 중단 조건으로 추가하지 않습니다. 펌웨어 보호는 그대로입니다.
12. 사용자 SAFE는 대기 명령을 취소하고 저장 실패와 무관하게 `SAFE`를 우선 요청합니다. **`OK,SAFE` 완료 응답을 기다린 뒤** STAT/MUXSTAT/GPIO를 조회합니다. SAFE barrier 중 다음 명령을 보내 발생하는 RX_PAUSED를 방지합니다. 오류/timeout/연결 종료 때 자동 sweep 재시도는 없습니다. readback 없이 SAFE 완료라고 표시하지 않습니다.
13. 장비의 ERR/해석 오류는 구동을 차단하지만 수신 루프는 유지하여 이후 SAFE 응답을 받을 수 있게 합니다. 연결 해제는 SAFE readback을 시도한 뒤, 실패해도 포트를 닫고 **SAFE 미확인**을 명시합니다. 탭을 강제로 닫거나 USB를 뽑으면 웹은 async SAFE 전달을 보장할 수 없습니다. 먼저 SAFE/연결 해제를 사용하세요. 실제 회로 보호는 펌웨어/아날로그 회로에 남아 있습니다.

## 전압·전류 / 저항

ADC14: 3.6/16384 V/code. AIN0/4/6의 20 kΩ/20 kΩ 분압 ×2는 **표시/분석에만** 적용합니다.
VrefB는 VDD 고정. `HW` 응답의 실제 ref/neutral code를 사용하며 2048/2.5 V를 가정하지 않습니다.
I[mA] = (V_IS−V_MID)/0.08, INA gain20 × R26 4.0 Ω 기준의 교정 전 추정입니다.
TE–BE sense = V_FB−V_MID: 사용자 보고에 따라 수정된 unity-gain sense IA 전제입니다.
TE_I−BE_I는 FORCE(MUX/배선 전압강하 포함)이며 DUT pad 전압으로 재명명하지 않습니다.
8채널 ADC는 순차 scan으로 동시 스코프 파형이 아닙니다.

근사: I[mA] = a×sense[V]+b, R[Ω] = 1000/a. 진행/복귀 별도, 절편 포함, 기본 |sense|≤0.3 V.
CC·불완전/포화 point는 근사만 제외하고 raw/plot에서 지우지 않습니다. 최소 5점/50 mV span, 양의 slope>3×SE, slope×span>명목21.97µA floor 조건을 적용합니다.
R²<0.9는 비선형 참고 근사로 표시합니다. 회귀 ±는 1σ이며 ADC/INA/저항 교정 정확도가 아닙니다. 원시값 평활화나 저항별 보정은 없습니다.

## 저장 / 이전 기록

브라우저 origin별 IndexedDB에 session, 수신 bytes/base64, raw line, sweep request/SC binary/derived/fit/outcome을 자동 저장합니다.
저장 오류는 구동을 차단합니다. persistent storage 요청은 브라우저가 거부할 수도 있습니다.
자동 저장 폴더 지정은 사용자의 디렉터리 선택 권한이 필요합니다. 해당 권한이 있으면 **측정 종료 시** 아래 파일을 저장합니다. 측정 도중 원시값은 먼저 IndexedDB에 보존됩니다.

- metadata.json / raw_wire.jsonl / raw_capture.bin / raw_point_frames.csv
- electrical_points.json / linear_fit.json / result.json / manifest.json (SHA256)

Browser 데이터 삭제, disk full, 전원 차단 등은 저장 기록 손실의 원인이 될 수 있으므로 ZIP을 별도 보관하세요. IndexedDB는 native 로그 폴더를 자동으로 읽지 않습니다.
기록 탭에서 native **raw_capture.bin + metadata.json + result.json** 세 파일(또는 해당 파일을 묶은 ZIP)을 선택하세요.
저장된 CRC와 실제 raw가 일치하는 SC81/82/83/84 기록을 재해석합니다. SC wire/preview JSONL이 ZIP에 있으면 함께 보존합니다. 가져오기는 새 실측이 아닙니다.
미완료/CRC 미확인 결과도 ZIP으로 보관되지만 검증된 값으로 가져오지는 않습니다.
근사 갱신은 화면 분석만 변경하고 별도 analysis 레코드/파일을 추가합니다. 이전 raw/result는 덮어쓰지 않습니다.

## DFU

기본 패키지는 signed v84 application-only ZIP입니다.
SHA256 `510f61b374a82f462ac1bb05c57c11af6bd73eede2d21299490860227b0e3523`.
private key, nrfutil.exe, bootloader/SoftDevice를 포함하지 않습니다. v83 보드에 이미 설치된 RRAM-key bootloader를 사용합니다.
DFU 진입은 SAFE readback 후 앱 transport에서 `DFU`를 요청합니다. 이어 사용자가 **USB bootloader 1915:521f** 또는 **BLE DfuTarg/FE59**를 따로 선택합니다.
브라우저에서 nrfutil을 실행하는 것이 아니라 Nordic Secure DFU object protocol을 JS로 전송합니다.
USB: SLIP/PING/PRN0/MTU/SELECT/CREATE/WRITE/CRC/EXECUTE. BLE: CP/packet, 20-byte packet, PRN1, packet마다 CRC/offset 확인.
기존 object를 이어받을 때 동일 ZIP의 offset/CRC가 맞는 경우만 허용하며 불일치 시 멈춥니다. 임의 자동 재시도/다른 타깃 선택은 없습니다.
진행률은 장비 응답으로 확인된 object bytes 기준입니다. 최종 EXECUTE 응답 뒤 '전송 완료'를 표시하지만, 재연결 VER/HW 확인은 별도입니다.
DFU 취소/중단 후 bootloader에 남아 있을 수 있습니다. 같은 대상과 서명 ZIP을 확인한 뒤 수동 재시도하세요.
Nordic protocol 참고: [공식 pc-nrfutil source](https://github.com/NordicSemiconductor/pc-nrfutil/blob/master/nordicsemi/dfu/dfu_transport_serial.py).
**브라우저 DFU는 실물 보드에서 아직 검증하지 않았습니다. 기존 native DFU는 계속 보존했습니다.**

## v84-web1 실제 BLE 검증 (2026-10-06)

- 펌웨어 build/signature 검증 후 기존 USB bootloader에 v84를 업로드했습니다. nrfutil exit0, 재연결 VER84/HW84/ADC14/S16 확인은 별도 deployment 기록으로 보존했습니다. 웹 DFU 버튼을 통한 업로드가 아닙니다.
- 실제 Chrome Web Bluetooth에서 RRAM-Backplane을 선택하고 8채널 ADC 자동 갱신, D7 연결, −100 mV 수동 적용, CC+·CC− 1 mA 설정, GPIO 조회, SAFE 및 연결 해제를 확인했습니다.
- D7 +1 V 왕복: +20→+1000→+20 mV, step20 mV, dwell20 ms, CC1 mA, 99/99점 status0. SC84 원본 10600 bytes CRC `e3986b63`, SP84의 코드/시각/6채널 정수합과 모두 일치. S16/SAFE readback 통과.
- 원본 metadata의 dwell은 정확히 20000 µs입니다. host 완료까지 약81.97초, 그중 raw capture 전송 약68.55초였습니다. BLE 전송 지연과 MCU의 실제 전압 dwell은 다른 시간입니다.
- 자동 저장 이력에 완료/CRC/SAFE가 표시되고 실제 ZIP export의 7개 파일 SHA256과 raw wire/binary/derived/fit 일치를 오프라인 재검사했습니다. 원본은 변경하지 않았습니다.
- |sense|≤0.3 V 선형 근사: 진행907±35 Ω, 복귀878±52 Ω (회귀1σ). 고유 CC flag24점은 raw/plot에 남고 근사에서만 제외됩니다. 이 수치는 정밀 저항 교정이나 스코프 과도전류 검증이 아닙니다.
- 19개 software/replay/regression 시험 및 정적 검사, production BLE framer의 별도 SYNTHETIC native 시험 통과. 앱 자체 console error는 관찰하지 않았습니다. Chrome의 MetaMask extension warning은 별도 출처였습니다.
- 이전 수동 +100 mV `ERR,CTRL,11` 아날로그/제어 문제를 이 수정으로 해결했다고 주장하지 않습니다. 이번 +1 V SWP 경로의 완료와 구분합니다. +3 V/−1 V/전체 DUT/BLE DFU/브라우저 USB DFU/Web Serial은 이번 검증 대상이 아닙니다.
- 종료 전 SAFE/S16 확인, ADC 자동 갱신 OFF, BLE disconnect 완료. 검증용 임시 서버와 탭은 종료했습니다. Pages 배포/포털 변경/commit/push는 수행하지 않았습니다.

상세 증거는 로컬 `calibration/web_qa/QA_BLE_v84_20261006_KO.md` 및
`20261006_ble_browser/PASS_v84_analysis.json`에 보존합니다. raw와 장비 metadata는 배포하지 않습니다.
원본 ZIP replay: `node scripts/analyze-browser-export.mjs <압축해제한 측정폴더> [새 분석JSON경로]`.
새 분석 파일은 원본 폴더 밖에만 생성하며 기존 파일은 덮어쓰지 않습니다.

## v83-web2 당시 검증 경계 (2026-10-06 · 이전 기록)

- Node22 syntax 검사, 정적 asset/import/ID/binding/CSP/responsive 검사 통과.
- software-only protocol/replay/regression tests 15개 통과: CRC, ZIP, signed ZIP parsing, SLIP, 명령범위/단위/route, raw-first, 조회 전 ADC 보존, SAFE barrier, 오류 후 수신 유지 및 포트 해제.
- 기존 D11 +1 V 99점 raw를 읽기만 하여 SC/SP exact 합계, CRC, native Python 수식/fit 판정과 일치 확인.
- 해당 replay는 새로운 측정/브라우저 전송/더미 교정이 아닙니다. 실측 원본을 변경하지 않았습니다.
- 사용자 요청에 따라 임시 loopback 서버에서 Chrome 화면/탭/IndexedDB 초기화/기본 firmware ZIP 파싱·SHA를 확인했습니다. 앱 자체 console error는 관찰하지 않았습니다. 파일 가져오기는 extension 파일 권한에 막혔고, Web Serial 선택창은 선택 취소로 반환되어 **브라우저를 통한 보드 연결은 아직 미검증**입니다. BLE/웹 DFU 전송도 미검증입니다.
- 실제 보드 **Python serial 진단 경로**로 VER83·ADC14/mean16/acquisition40/HW oversample OFF, ADC 8채널, D7 중립 연결, −100 mV 적용, +1 V/CC 1 mA 99점 왕복·CRC·SAFE 복귀를 확인했습니다. 수동 +100 mV 적용은 firmware `ERR,CTRL,11`로 중단됐습니다. 이 결과는 Web Serial/IndexedDB end-to-end 실물 검증으로 대체하지 않습니다.
- 이번 D7 +1 V 수신 원본을 웹 decoder로 다시 해석하여 SC CRC 및 SP83 정수 합계가 일치함을 확인했습니다. 재해석은 별도 실측이 아닙니다.
- GitHub Pages 배포/포털 등록/commit/push/펌웨어 수정/DFU 업로드는 하지 않았습니다. 상세 원본은 프로젝트의 `calibration/web_qa`에만 보존되며 배포에 포함하지 않습니다.

오프라인 재검증: 이 폴더에서 `node --test tests/*.test.js`, `node scripts/check-static.js`.
`scripts/validate_hardware.py`는 별도 실제 USB 진단 도구입니다. Python 3.11/pyserial이 필요하며 native/web GUI의 포트를 먼저 해제해야 합니다. 기본은 조회/ADC/SAFE이고 `--control`은 지정 DUT의 0/+100/−100 mV, `--sweep`은 +1 V/1 mA를 실제 인가하므로 의도 없이 실행하지 마세요. 원시 bytes는 base64로 먼저 fsync한 후 해석하며 metadata/result/manifest를 `calibration/web_qa/<run>`에 저장합니다. 오류 시 자동 구동 재시도 없이 SAFE 확인 후 포트를 닫습니다. 이 도구는 브라우저 연결 검증을 대신하지 않습니다.
로컬의 기존 v83 raw가 없으면 archive replay 시험은 skip되며 실제 데이터는 배포에 포함하지 않습니다.

## 배포 / 백업 준비

원본: 이 `rram_web_gui` 폴더. 진입점 `index.html`.
배포 대상: index.html, styles.css, 루트 JS modules 8개, firmware signed ZIP, README_KO.md.
배포 제외: design/, tests/, scripts/, package.json, source_manifest.json, CHANGELOG.md, 이전 v83 firmware ZIP, 로컬 raw/logs/cache/node_modules.
server-ops 채팅에서 원본 경로를 등록한 뒤 해당 프로젝트의 `./scripts/publish-github-pages.ps1`을 수행할 수 있습니다. 이 프로젝트는 배포 스크립트나 포털을 수정하지 않습니다.
Git 백업 후보: source, tests/check scripts, README/CHANGELOG/design notes, signed firmware + source manifest. 실측 raw/IndexedDB export/개인키/연결 metadata는 제외.
Commit 후보: `fix(rram): reassemble BLE commands and qualify v84 browser sweeps`.
현재 프로젝트 폴더는 Git repository가 아니므로 commit/push하지 않았습니다.
