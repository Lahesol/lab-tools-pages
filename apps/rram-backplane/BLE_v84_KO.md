# v84 BLE 명령 전달 보완

v83의 BLE 명령 수신은 ATT write 하나를 명령 하나로 처리했다. 웹의
`SWP,7,1,1000,20,20000\n` 분할 전송은 첫 20바이트에서 2,000 µs로 실행되었고
나머지 `0`이 별도 명령이 됐다. 원본 capture에서 dwell=2000 및 status11이
확인됐다. 요청한 20,000 µs와 달라 완료/교정 자료로 사용할 수 없다.

v84는 최대 47자의 ASCII를 CR/LF까지 조립하여 한 번만 queue에 넣는다.
SAFE는 미완성 명령보다 우선하며, 길이/문자 오류·연결 종료 시 부분 명령을
폐기한다. 재접속 시 수신 버퍼를 초기화한다. CC/CV 보호 한계, ADC14,
16회 평균, 40 µs acquisition, S16 parking, 분압/전류 변환은 그대로다.

웹은 BLE 구동에 VER84를 요구한다. VER83 BLE에서는 조회/SAFE만 가능하며,
VER83 USB 및 이전 raw 이력은 계속 지원한다. SP/SC84는 기존 83과 같은
binary layout이며 firmware version만 바뀌었다. 취소되지 않은 수신에서는
offset/CRC/정수합/fragment 검사 모두 유지한다.

SAFE가 분할 ADC 알림 도중 이전 송신을 취소할 수 있다. 웹은 명시적으로
SAFE를 요청한 경우에만 OK,SAFE까지 이전 프레임의 해석/표시를 보류한다.
이 구간에서도 모든 수신 bytes는 그대로 IndexedDB raw에 먼저 저장된다.
ACK 뒤 STAT/MUX/GPIO를 읽어 S16/neutral/CCcode0을 확인해야 한다.
SAFE 실패 시 구동은 열리지 않으며 자동 재시도/자동 측정 재개는 없다.

BLE 대용량 raw 전송 시간은 측정 dwell과 별개다. 웹 timeout은 기존 측정
예산+60초에 20-byte notification/최대 75 ms connection interval의 bounded
전송 예산을 더한다. ADC 추가 획득이나 전압 유지 시간 변경이 아니다.
실시간 SP는 CRC 확인 전 잠정 자료, 최종 SC 검증 뒤 완료 자료로 구분한다.

기본 firmware: `firmware/rram_backplane_app_v84_bleline_rramkey_signed.zip`
SHA256: `510f61b374a82f462ac1bb05c57c11af6bd73eede2d21299490860227b0e3523`
Application-only; 기존 RRAM bootloader/SoftDevice를 교체하지 않는다.
개인 키는 포함하지 않는다. 옛 native v83 GUI의 VER gate는 따로 갱신되지
않았으므로 v84 제어에는 이 웹 앱을 사용한다.

최신 실제 검증 결과/원본 위치는 프로젝트 `calibration/web_qa`에 별도로
기록한다. raw/연결 metadata/SDK build output/private keys는 public backup 및
Pages 배포에서 제외한다. 배포는 server-ops 채팅에서만 수행한다.
