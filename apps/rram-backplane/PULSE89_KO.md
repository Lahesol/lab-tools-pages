# v89 · 영점 방향 전환 / S16 CC·방향 유지 · 2026-10-30

상태: ARM 빌드·서명 검증·소프트웨어 시험 완료한 후보. 이번 변경 후 업로드,
실물 펄스, overshoot/undershoot 제거, USB/BLE 실기 검증은 **아직 하지 않음**.
현재 설치 버전은 마지막 확인된 v88이며, v89 웹의 Pulse 실행은 VER89를 요구한다.
기존 v85–88의 DC/sweep 및 PL86/87/88 이력 읽기는 유지한다. 배포하지 않음.

## 새 스코프 자료에서 확인된 것과 미확인 사항

- 사용자 조건: DUT10, CC+ 3 mA. `1000mv50us1.png`, `100mv50us2.png`에서
  TE_I에도 약 50 µs의 직사각형 펄스가 보인다. 이전 단발성 지수감쇠 파형만으로
  DAC 펄스가 전혀 발생하지 않는다고 해석하면 안 된다.
- 사용자는 첫 overshoot 약 300 ms 후 실제 펄스가 보인다고 확인했다.
  이미지 파일만으로 각 피크의 정확한 지속시간·전류·에너지는 산출하지 않았다.
- TE_I는 MUX common의 FORCE 노드다. 실제 DUT 양단 전압도, DUT 전류도 아니다.
  S16 선택 중 TE_I 피크가 있다고 해서 DUT에 그대로 전달됐다고 단정할 수 없고,
  반대로 S16이므로 DUT에 영향이 없다고 단정할 수도 없다.

## v88 코드에서 확인된 원인 후보

| 구간 | 실제 코드 동작 | 이번 관측과의 관계 |
|---|---|---|
| 준비 시작 | 전체 SAFE: S16 / CC 최소 / PD, 이후 요청 CC 설정 | 매번 불필요한 CC·방향 전환을 반복 |
| 방향 준비 | S16에서 ±20 mV DAC 출력 후 ADC8회 scan 판정, 그 뒤 ADG884 전환 | 잠시 기존 방향과 새 bias가 불일치할 수 있음 |
| 준비 지연 | S16에서 100 ms+ADC8회, DUT 연결 후 다시 100 ms+ADC8회 | 첫 준비 피크에서 실제 pulse까지 약 300 ms인 관측과 정성적으로 일치 |
| pulse | DUT MUX 유지, LDAC 목표/복귀를 하드웨어 예약 | 새 width trigger의 직사각형 TE_I pulse와 일치 |
| 종료 | 100 ms+ADC8회 후 S16, 다시 CC 최소·PD로 전체 SAFE | pulse 후 지연된 undershoot의 후보 |

이는 **순서와 관측 간 일치에 기반한 가설**이지 피크 원인의 실측 분리 결과는 아니다.
방향 적용 함수는 DAC를 먼저 바꾸고 20 µs 대기 후 8개의 4채널 ADC scan을
완료한 다음 GPIO를 갱신한다. 이 순서를 v89 Pulse 경로에서는 사용하지 않는다.
CC0은 current-loop off가 아니라 최소 compliance라는 점도 유지한다.

별도 후보: MUX 전환 때의 charge injection, 짧은 feedback 단절 및 CV/CC
보상회로의 저장 전하/동작점 복귀. ADG726/ADG884는 break-before-make이며,
off isolation도 이상적인 무한대가 아니다. 이것만으로 현재 피크 크기나 원인을
설명했다고 주장하지 않는다.
[ADG726 공식 자료](https://www.analog.com/media/en/technical-documentation/data-sheets/ADG726_732.pdf),
[ADG884 공식 자료](https://www.analog.com/media/en/technical-documentation/data-sheets/ADG884.pdf).

## v89 전체 동작 흐름

1. 부팅 reference 초기화·14bit ADC·raw 저장 확인은 유지한다.
2. `LIMITS,plus_uA,minus_uA`는 다음 실행값만 저장한다. 현재 DAC를 바꾸지 않는다.
3. `PULSE89,dut,positive,magnitude_mV,width_us`를 한 번 전송한다.
   진입 VCMD는 정확한 SAFE code여야 한다. nonzero DC 상태는
   `ERR,PULSE89,NEUTRAL_REQUIRED`로 **변경 전 거부**한다. 사용자가 SAFE/0 mV로 복귀해야 한다.
4. 이미 정상 S16이면 재래치하지 않는다. 영점에 연결된 DUT가 있으면 S16으로 분리한다.
5. 요청 CC와 이전 CC가 다를 때만 S16에서 neutral DAC pair를 쓴다.
   VCMD ±20 mV probe 및 ±1code 중간 단계를 없앴다.
6. 100 ms 후 normal ADC 8 scan으로 영점을 확인한다.
7. 방향이 다를 때만 exact SAFE code의 S16에서 ADG884 IN·mirror를 변경한다.
   100 ms 대기하고 ADC 8 scan을 재확인한다. 같은 방향이면 쓰기와 추가 100 ms는 생략하되
   ADC 8 scan은 유지한다. 이는 펄스 준비만을 위한 명시적 영점 handover다.
8. 선택 DUT 연결 후 100 ms+ADC8 scan 확인. 목표값은 아직 출력하지 않는다.
9. DAC 입력 레지스터 preload → TIMER3/PPI LDAC target → neutral SPI DMA preload
   → 정확한 SAFE로 LDAC return. 폭은 50–1,000,000 µs 예약. 정상 edge에서는 MUX/CC/방향 불변.
10. DUT를 계속 연결한 채 100 ms+ADC8 scan으로 복귀를 확인한다. +250 ms 독립
    all-OFF watchdog은 그동안 유지한다.
11. S16으로 분리 후 ADC2 scan. **정상 종료는 CC와 PU/PD 방향을 유지**한다.
    같은 극성·CC의 다음 pulse는 CC/DAC pair·방향을 재설정하지 않는다.
12. SAFE 버튼·연결 해제·오류·취소는 기존 전체 SAFE(S16/CC최소/PD)를 사용한다.
    이 비상 경로 자체가 아날로그 무과도 복귀라고 보장하는 것은 아니다.

기존 ADC/current/zero 보호 한계는 완화하지 않았다. 추가 영점 검사는 준비시간을
늘릴 수 있으며 pulse의 50 µs 예약폭과 버튼→pulse 시작 지연은 별개다.
짧은 피크가 긴 대기 중 사라졌다고 안전성이 증명되는 것은 아니다.

## 원본·단계 기록·오류 처리

- PL89: 128-byte header, 최대80×28-byte ADC frames, 최대24×16-byte event records.
- Header의 on/return은 TIMER2의 PPI capture다. 이 또한 실제 아날로그 threshold edge는 아니다.
- Event: CPU 관측 µs, event ID, logical CC, physical DAC-A code, VCMD code,
  논리 방향, 선택 DUT, connected, 실제 GPIO read byte(EN_A/EN_B/IN/mirror).
  GPIO input은 CPU OUT latch와 구분한다. 이벤트는 아날로그 파형 표본이 아니다.
- ADC phase0=S16 전환 전,1=S16 준비 완료,2=DUT 영점,3=pulse 내부,
  4=복귀 겹침,5=DUT 연결 유지 복귀,6=S16 종료. 50 µs pulse 내부 표본은 보통 없다.
- normal frames는 채널당 16회 평균된 14bit 값이다. 내부 변환 전체나 µs 피크가 아니다.
- GUI는 RX 원본을 IndexedDB에 먼저 저장하고 CRC 검사 후 해석한다. ZIP은
  `raw_wire.jsonl`, 변경 없는 `raw_capture.bin`, `raw_pulse_frames.csv`,
  `pulse_events.csv`, metadata/result 및 SHA256 manifest를 포함한다.
- 정상 종료는 `S16 CC·방향 유지 확인`, 오류 SAFE는 별도 `전체 SAFE readback`으로 표시한다.
  parked retained 상태를 전체 SAFE로 표시하지 않는다. 불완전 raw도 보존하고 자동 재시도하지 않는다.
- timeout/USB/BLE 단절은 SAFE를 요청하되 readback을 못 받으면 확인됐다고 표시하지 않는다.

## 다음 실물 확인 (미실행)

우선 더미저항으로 첫 양펄스 → 같은 조건의 두 번째 양펄스 → 음펄스의 세 경우를 비교한다.
CC3 mA·100 mV/50 µs부터 시작하고, TE_I와 VCMD를 동시에 본다.
actual pulse trigger는 현재의 30–100 µs width 조건으로 잡고, 긴 pretrigger 기록으로
준비/종료 peak와 원본 이벤트 시각을 대조한다. peak가 남으면 실제 DUT pad TE−BE 및
V_IS−V_MID를 추가로 확인해 전달 전압·전류를 분리한다.
일반 접지형 프로브 두 개의 GND는 모두 보드 GND에 연결한다.

예상 구분: 첫 회만 발생하면 CC/방향 준비, 매번 같은 connect/park 시점이면 MUX/feedback
전환, 실제 VCMD edge와 동시라면 CV/CC pulse 과도응답을 우선 의심한다. 이 비교는
가설 분리 계획이며 아직 결과가 아니다. RRAM에 무해함은 별도 확인이 필요하다.

## 릴리스·백업

- firmware source: `calibration/v89`; application-only RRAM-key signed ZIP,
  hw52/SD0xCA, 123428 bytes. bootloader/SoftDevice는 변경하지 않는다.
- Web entry: `rram_web_gui/index.html`; 배포는 server-ops에서만 수행.
- 제외: 개인 키/인증 정보, raw 실측 로그, 포트·장비 접속 정보, node_modules,
  tools/logs, SDK Output, 임시 서버/브라우저 QA 산출물.
- 변경 메모/커밋 후보: `fix(rram): neutral-only pulse handover and retained S16 idle with raw event trace`.
- 기존 v88 source/signed ZIP/raw는 덮어쓰지 않았다. Python v83 GUI에는 새 PULSE89
  버튼을 추가하지 않았으며 새 기능은 v89 Web에서 사용한다.
