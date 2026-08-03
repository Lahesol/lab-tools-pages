# Thermal_eq calibration procedure

The v0.1.3 firmware reports seven raw, single-ended SAADC channels. The
netlist identifies their electrical sources but does **not** by itself prove
which one is the desired current or temperature observable:

| ADC channel | nRF52840 pin | netlist source |
| --- | --- | --- |
| AIN0 | P0.02 | IC4 OUT_D |
| AIN1 | P0.03 | IC2 OUT_D |
| AIN3 | P0.05 | IC3 OUT_C |
| AIN4 | P0.28 | IC4 OUT_C |
| AIN5 | P0.29 | IC2 OUT_C |
| AIN6 | P0.30 | IC4 OUT_B |
| AIN7 | P0.31 | IC3 OUT_D |

Choose a channel only after perturbing one known physical condition while
holding the others stable and confirming the corresponding raw-code response.

## Data preservation

1. Export **수신 원문 내보내기** before fitting or interpreting a session.
2. Export the paired **메타데이터** file.
3. In the calibration panel, each point stores the device's raw `ADC?` line,
   raw code, nominal SAADC millivolts, your reference value, and optional
   condition note. Deleting a point removes it from the browser session only;
   it does not rewrite the separately exported device raw text.

## Current transfer calibration

1. Select `전류 (mA)` and a channel that has been experimentally identified as
   the current observable.
2. Set a stable, safe operating condition. Keep the firmware's existing 10%
   manual PWM limit and do not use a fitted result to raise that limit.
3. Measure current with a suitable independent reference. A series DMM can
   change the circuit burden voltage; use a method whose burden, bandwidth,
   and connection point are understood for the selected current range.
4. Enter the reference value and click **원시 ADC 캡처 후 점 추가**. The GUI
   sends `ADC?` and saves the reference only with that new ADC response.
5. Cover the intended range with at least five stabilized points, preferably
   including repeat points near low, middle, and high current. The GUI accepts
   two points for a linear fit, but two points do not assess nonlinearity or
   repeatability.

## Temperature transfer calibration

1. Select `온도 (°C)` and a channel that has been experimentally identified as
   the temperature observable.
2. For a surface-temperature result, record emissivity, target location,
   field of view, mounting, ambient condition, and settling criterion with the
   independent reference instrument.
3. For a junction-temperature result, use a validated TSEP or a separately
   established junction-to-sensor correlation. A surface pyrometer or camera
   alone does not establish junction temperature.
4. Capture at least five thermally stabilized points across the intended
   temperature span. Record heating/cooling direction in the optional note to
   expose hysteresis instead of averaging it away.

## Fit review and use boundary

- **선형** requires two or more distinct raw codes. **2차** requires three or
  more. Select the simpler model unless residuals demonstrate that a more
  complex model is justified by the reference uncertainty and repeat data.
- Review maximum residual, MAE, and RMSE in the same user-selected unit.
  The GUI never invents an acceptance threshold.
- **보정 JSON 내보내기** preserves the points, model, coefficients, metrics,
  and raw protocol line per point. **CSV** is a flat point table.
- A fit enables only a clearly labelled browser-side **호스트 미리보기**.
  It does not write coefficients to MCUboot, flash, RAM, or the TPS922053
  control path. Firmware current/temperature closed-loop enablement remains a
  separate release after transfer, safety, and thermal validation.
