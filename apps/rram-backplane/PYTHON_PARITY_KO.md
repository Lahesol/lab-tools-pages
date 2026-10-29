# Python / Web GUI 비교 · v85-web2 · 2026-10-29

이 문서는 v85-web2 동기화 시점의 비교입니다. 현재 v86-web1의 추가 단일 Pulse와
중첩 sweep는 [PULSE86_KO.md](PULSE86_KO.md)를 참고하세요. Python 원본은 변경하지 않았습니다.

## 기준과 범위

Python: `calibration/v83/START_GUI.cmd` → `tools/rram_simple_gui.py`,
revision `v83-potential-fit1`. v84/v85에는 더 최신의 Python GUI 진입점이 없습니다.
웹: `rram_web_gui/index.html`, revision `v85-web2`, package `85.2.0`.
Python 원본·펌웨어·서명 ZIP은 이번 변경 대상이 아닙니다.

|기능|최종 Python|웹 동기화 결과|
|---|---|---|
|USB/BLE|pyserial/bleak|Web Serial/Web Bluetooth, 브라우저 장비 선택|
|ADC|8숫자, 14bit/mean16, 갱신 50–5000 ms|동일 환산/갱신 범위, 수신 ADC CSV 추가|
|DUT/VCMD|선택·중립 연결·VCMD 적용 분리|동일, 중복 연결은 VCMD/CC 유지|
|CC|+0.2–3 / −0.2–12 mA|동일, 아날로그 compliance/보호 변경 없음|
|Sweep|±20 mV→+1/+3/−1 V→±20 mV|동일 401점/180초 제한, MCU 타이밍|
|plot|측정 CMD/I, 감지 potential, 감지 I/V 및 회귀|동일, CRC 전에는 잠정 표시|
|점별 표|V_FB−MID/FORCE/I/R/CC|동기화, 표준편차 열 추가|
|최근 기록|로컬 최근 sweep 원본 읽기|브라우저 기록 최근 읽기 + native ZIP/3파일 가져오기|
|진단|GPIO + agent DIR/DIRRAW|GPIO 탭 버튼으로 고정 24개 조회 및 원본 저장|
|DFU|외부 nrfutil USB 전송|직접 USB/BLE DFU 구현, **웹 DFU 실물 E2E 미검증**|
|Agent|OS folder-watch, session/expiry 검사|DOM 버튼으로 제어, OS 감시/임의 명령 API 없음|
|전원 초기화|VER83 고정 profile|웹은 v85 RI85 CRC/epoch 필수; 의도적으로 더 최신|
|SET/RESET/READ pulse|간소화 GUI에는 없음|없음; 과거 testing GUI와 혼동하지 말 것|

브라우저는 native Python 로그 폴더를 임의 탐색할 수 없습니다. 같은 컴퓨터여도
IndexedDB 기록과 Python 측정 폴더가 실시간 자동 공유되는 것은 아닙니다.
기존 native 기록은 raw_capture.bin + metadata.json + result.json 또는 ZIP을 선택해 가져옵니다.

## 동작 흐름

1. IndexedDB strict transaction을 준비한 뒤 연결 버튼에서 사용자가 장비를 선택합니다.
   Python GUI가 소유한 포트를 빼앗거나 자동 연결하지 않습니다.
2. 기존 v85 handshake/ADC14/HW/RI85 CRC·epoch 검사를 유지합니다.
   미확인/저장 실패 상태에서는 구동을 열지 않습니다.
3. DUT dropdown 편집은 명령을 보내지 않습니다. `DUT 연결`은 중립 연결이며,
   `VCMD 적용`은 **실제 readback DUT**에만 적용합니다. CC 저장은 다음 구동부터 적용합니다.
4. Sweep는 ADC_RATE 전송 정지 → LIMITS → SWP 한 번입니다. MCU가 각 전압점의
   guard + dwell 후 settled 3scan을 획득하고 SP 잠정 summary를 보냅니다.
   웹 렌더링은 추가 ADC/DAC/GPIO 명령을 만들지 않습니다.
5. plot/표는 SP로 갱신됩니다. 표의 R/표준편차는 개별 scan을 복원할 수 없는
   SP만으로 확정하지 않습니다. SC 원본 CRC/preview 정수 합 검증 뒤 Python과 같은
   `derived_points` 계산을 적용합니다. 표 갱신은 자동 스크롤하지 않습니다.
6. R은 |mean(V_FB−MID)/mean(I)|입니다. |I|가 max(21.97265625 µA,
   3×population SD) 이하이면 null입니다. 선형 회귀는 별도의 non-CC 구간 근사입니다.
   CC점은 표/원본/plot/CSV에 보존합니다. 원시 코드와 분압/전류 환산은 분리합니다.
7. S16/SAFE readback 확인 후 ADC monitor만 복원합니다. 오류/timeout/CRC/저장 실패 시
   구동을 차단하고 SAFE를 요청하며 **자동 물리 재시도는 없습니다**.
8. `DIR / DIRRAW 읽기`는 DIR,0..3과 DIRRAW,0..1,0..9만 보냅니다. ADC 새 획득,
   DAC/극성 전환, 보호 해제는 없습니다. raw-first 저장 후 응답 원문과 ZIP을 제공합니다.
   여러 페이지의 조회 중 보드 상태는 시간에 따라 바뀔 수 있으므로 안전 통과 증거로 쓰지 않습니다.
9. ADC CSV/점별 CSV/최근 sweep 읽기/회귀 재분석은 저장된 자료를 읽기만 합니다.
   원시 파일을 덮어쓰거나 평활화하지 않습니다. 폴더 선택 권한이 있다면 측정/진단 종료 시
   추가 파일을 저장하며, 수신 중에는 IndexedDB가 우선입니다.
10. 정상 종료는 SAFE 완료 응답 → STAT/MUX/GPIO 확인 → transport 해제입니다.
    탭 강제 종료나 전원 분리 시 async SAFE를 보장할 수 없으므로 먼저 SAFE/연결 해제를 사용합니다.

## 자동 비교와 백업

`npm run check`, `npm test`, `npm run parity`.
Python 비교시험은 v83의 실제 Python 함수를 subprocess로 호출합니다. ADC12/14,
신호/GPIO/에러, CC/VCMD/타이밍 반올림, 요청 명령과 실제 보관 D11 원시 sweep의
99개 점별 R/SD/CC·검출 하한을 대조합니다. SOFTWARE unit 입력과 보관 실측 재해석을
구분하며 장비 접근은 없습니다. Python 모듈이 없으면 직접 비교시험은 실패합니다.
보관 실측이 없는 배포용 사본에서는 해당 replay만 skip됩니다.

2026-10-29 사용자 승인 브라우저 검증: Chrome155/Playwright, 1440×1000 및
390×844. 12개 항목 통과. 기존 D11 99점 가져오기/plot/표/재분석/CSV/ZIP/기록 복원,
잘못된 CRC 거부, 원본 SHA256 보존을 확인했습니다. 앱 오류·경고, 외부 요청,
장비 API 호출은 0건입니다. 테스트의 USB/BLE API는 차단했습니다.
임시 서버·격리 브라우저는 종료했으며 실제 장비 연결/DFU/구동을 검증한 것은 아닙니다.

백업: 이 폴더의 JS/HTML/CSS, docs, tests/scripts, source_manifest.json.
제외: node_modules, design 이미지, raw/logs/브라우저 export, 장비 식별정보,
비밀키, 캐시, native build 산출물. 서명된 application ZIP은 기존 그대로입니다.
배포는 server-ops에서만 수행하며 이번 기능 변경은 Pages/포털/스케줄러를 수정하지 않습니다.
Commit 후보: `feat(rram-web): sync Python v83 tables, exports and read-only diagnostics`.
