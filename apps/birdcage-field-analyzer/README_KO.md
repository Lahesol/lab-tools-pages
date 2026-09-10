# Birdcage Field Analyzer

ANSYS/Nexxim transient-current plot 이미지에서 8개 leg 전류 곡선을 디지타이징하고, 선택한 시점의 중심 자기장과 전체 시간 구간의 편파 특성을 계산하는 정적 웹 GUI다.

## 실행

`index.html`을 Chrome 또는 Edge에서 직접 연다. 외부 서버, npm 설치, 인터넷 연결이 필요하지 않다.

배포 진입점:

- `web_gui/birdcage-field-analyzer/index.html`

정적 배포 포함 파일:

- `index.html`
- `styles.css`
- `core.js`
- `app.js`

개발·검증용으로 배포에서 제외해도 되는 파일:

- `design/`
- `test-core.js`
- `test-static.js`
- `test-real-images.js`
- `README_KO.md`
- `CHANGELOG.md`
- `VALIDATION_KO.md`
- `VERSION`

## 사용 순서

1. `이미지 불러오기`로 PNG/JPG/WEBP ANSYS 전류 그래프를 불러온다.
2. 파란 추출 영역이 실제 plot 내부 축과 일치하는지 확인한다.
3. 영역이 틀리면 `영역 두 점 지정`을 누르고 plot 왼쪽 위, 오른쪽 아래를 차례로 클릭한다.
4. 이미지에 표시된 X/Y 축 최소·최대값과 단위를 입력한다.
5. 각 Leg 색상 입력을 확인한다. 자동 색과 다르면 스포이트 버튼을 누르고 이미지의 해당 곡선을 클릭한다.
6. 모든 leg에서 `+z`가 같은 물리 방향이 되도록 각 행의 `+z/−z` 버튼을 확인한다. 회로 소자의 positive 기준이 반대인 leg만 전환한다.
7. `곡선 추출`을 누른다.
8. 아래 시간 슬라이더 또는 재생 버튼으로 시간에 따른 전류·자기장 변화를 확인한다.
9. `CSV 내보내기`로 시간, I1–I8, Bx, By, |B| 데이터를 저장할 수 있다.

## 좌표계와 물리 모델

- 위에서 내려다본 xy 단면을 사용한다.
- Leg 1은 +X축에 둔다.
- Leg 2–8은 반시계 방향으로 45°씩 배치한다.
- 모든 leg는 z축과 평행한 유한 직선도체로 근사한다.
- 양의 전류는 +z 방향이다.
- `+z/−z`는 ANSYS/Nexxim 소자의 current-reference 방향을 이 공통 좌표계로 정규화하는 기능이다.
- 기본 반경은 138.805 mm, 길이는 300 mm다.

각 leg가 평가점에 만드는 자기장은 유한 직선도체 Biot–Savart 근사로 계산한다.

```text
B_infinite = μ0 I / (2πρ)
finite correction = (L/2) / sqrt(ρ² + (L/2)²)
```

8개 기여 벡터를 합산해 순간 Bx, By, |B|를 구한다. 전체 시간 구간에는 dominant-frequency phasor를 적합해 다음을 계산한다.

- |Bx|/|By| 진폭비
- `phase(By) - phase(Bx)`
- polarization ellipse axial ratio
- 추정 기본주파수

## 이미지 추출 방식

- 플롯의 검은 테두리를 이용해 축 내부 영역을 자동 제안한다.
- 각 곡선은 사용자가 지정한 대표 색상의 HSV hue를 기준으로 픽셀을 분리한다.
- 한 픽셀을 가장 가까운 단 하나의 leg 색상에만 할당해 청색/시안, 녹색 계열의 중복 검출을 줄인다.
- 각 x 열의 후보 픽셀을 연속 경로로 추적하고, ANSYS legend의 긴 수평 색상 선분은 데이터에서 제외한다.
- 검출되지 않았거나 legend에 가린 구간은 검출된 구간의 단일주파수 정현파 적합(R² 표시)을 우선 사용하고, 적합 품질이 낮으면 선형 보간한다.
- 평균 검출률을 화면에 표시한다.
- 원본 이미지 파일은 수정하지 않는다.

그래프 이미지에서 읽은 값은 원본 수치 CSV보다 정확도가 낮다. 다음 항목은 반드시 사용자가 확인해야 한다.

- plot 경계가 눈금 라벨이나 legend가 아니라 실제 축 내부를 가리키는지
- X/Y 축 최소·최대값과 단위
- I1–I8 색상 대응
- 각 회로 소자의 positive current 기준과 실제 코일 +z 방향의 대응
- 선 두께, JPEG 압축, 곡선 교차로 인한 픽셀 오차

첫 번째 제공 이미지처럼 legend가 plot 안쪽을 가리는 경우, 가려진 원래 픽셀은 복원할 수 없다. 이 GUI의 주기 적합값은 보간 추정치이며 원본 solver 수치가 아니다. 가능하면 Nexxim/HFSS에서 CSV를 직접 export한 결과와 교차 확인해야 한다.

## 해석 범위와 한계

이 GUI는 현상 설명과 빠른 비교를 위한 단면 근사 도구다. 다음 항목은 포함하지 않는다.

- end-ring 전류와 end effect
- capacitor, feed, connector, shield 및 ground return의 3D 영향
- 도체 폭·두께와 표피효과
- phantom/인체/수신체 부하
- 도체 상호결합 및 변위전류

따라서 GUI 결과는 HFSS full-wave 결과를 대체하지 않는다. 특히 중심에서 벗어난 공간장, 높은 유전율 부하, 급전부 인근 국부장은 HFSS field export와 비교 검증해야 한다.

## 검증

Bundled Node.js 또는 일반 Node.js에서 다음을 실행한다.

```powershell
node .\test-core.js
```

검증 항목:

- Leg 1 단독 +z 전류의 중심 자기장 방향
- nA 단위 변환과 leg별 +z/−z 기준방향 반전
- 이상적 45° 진행 합성 데이터의 Bx/By, 위상차, axial ratio
- X축 강조 합성 데이터의 비율 증가
- 합성 이미지 픽셀 곡선 추출률, 축 좌표 변환, legend 가림 구간 복원

제공된 두 PNG를 개발 환경의 `sharp`로 읽는 선택 검증은 다음 형식이다.

```powershell
node .\test-real-images.js <원형편파_이미지.png> <X축강조_이미지.png>
```

현재 제공 이미지에 대한 정적 검증에서는 첫 번째 이미지의 `|Bx|/|By|`가 약 1.01, 두 번째 이미지가 약 1.31로 계산돼 두 번째의 X축 우세가 재현됐다. 다만 이는 이미지 디지타이징과 유한 직선도체 근사 결과이며, full-wave 자기장 결과와 동일하다는 뜻은 아니다.
