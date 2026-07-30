# AD5940 Lab Console

정적 Web Bluetooth 계측 UI 원본이다. 배포 진입점은 `web_gui/index.html`이며 `app.js`, `styles.css` 외에 런타임 의존성이 없다.

## Firmware contract

이 GUI는 `ble_app_uart_CV(RAMP_TEST)`의 통합 애플리케이션과 Nordic UART Service(NUS)로 통신한다.

| Direction | Contract |
| --- | --- |
| GUI → board | `CFG,AMPX,<vzero_mV>,<sensor_bias_mV>,<period_ms>,<rtia_ohm>,<rf_ohm>,<pga_x10>,<sinc3_osr>,<sinc2_osr>,<fifo_words>,<rcal_ohm>,<adc_ref_mV>` |
| legacy host → board | `CFG,AMP,<vzero_mV>,<sensor_bias_mV>,<period_ms>,<rtia_ohm>` (keeps the current advanced AMP values) |
| GUI → board | `CFG,CV,<start_mV>,<vertex_mV>,<vzero_mV>,<steps>,<duration_ms>,<settle_ms>,<rtia_ohm>` |
| GUI → board | `CFG,DPV,<start_mV>,<end_mV>,<vzero_mV>,<step_mV>,<pulse_mV>,<frequency_hz>,<sample_delay_ms>,<rtia_ohm>,<sinc3_osr>` |
| GUI → board | `CFG,SWV,<start_mV>,<end_mV>,<vzero_mV>,<step_mV>,<amplitude_mV>,<frequency_hz>,<sample_delay_ms>,<rtia_ohm>,<sinc3_osr>` |
| GUI → board | `CFG,PT3,<vds_mV>,<vgs_mV>,<period_ms>,<gate_settle_ms>,<sinc3_osr>,<sinc2_osr>,<sinc2_notch_0_or_1>` |
| GUI → board | `RUN,AMP`, `RUN,CV`, `RUN,DPV`, `RUN,SWV`, `RUN,PT3`, `STOP`, `INFO?`, `STATUS?`, exact `DFU` |
| board → GUI | `@ACK`, `@ERR`, `@EVT`, `@STATUS` ASCII status lines |
| board → GUI | `0xA1` (AMP) / `0xB1` (PT3) / `0xC1` (CV) / `0xD1` (DPV) / `0xE1` (SWV), `uint32 LE index`, `float32 LE calculated current in uA` |

Expanded AMP control requires controller firmware **V26 or later**, which advertises `AMPX` in its `@INFO` response. The GUI leaves CV available but disables AMP apply/run on an older controller, avoiding a partial configuration silently reaching the device.

## DPV and SWV paired-pulse boundary

Controller **V37 source** advertises `DPV+SWV` and uses ADI's local
`AppSWV` sequencer implementation as a guarded paired-pulse engine. Both modes
send two unmodified calculated-current frames for every staircase increment:
`0xD1` for DPV and `0xE1` for SWV. The browser labels those frames `I1` and
`I2`, preserves them in acquisition order and CSV, and only then displays the
derived `I2 - I1` pair difference. A missing raw partner is marked as a pair
gap and no difference is fabricated.

`start`, `end`, `Vzero`, staircase increment, pulse/square-wave amplitude,
frequency, sample delay, RTIA, and SINC3 are applied before `RUN`. Firmware and
GUI both require a divisible span, 2--512 raw frames, 1--100 Hz, and a sample
delay below the half-period margin; they also keep the nominal DAC endpoints in
the 0.2--2.2 V range. The waveform panel is a parameter-meaning diagram, not a
measured potential trace.

The DPV tab is deliberately identified in firmware acknowledgements as
`ENGINE=ADI_SWV_PAIRED`: it is a paired-pulse DPV workflow, not an assertion
that it has already met a laboratory-standard DPV method. Validate pulse
polarity, timing, current sign, and redox response with a known standard before
making electrochemical method or quantitative claims. V37 is source/build
validated only at this point; it is not yet a signed DFU package and therefore
is not added to `firmware/latest.json`.

PT3 time-domain DSP control requires controller firmware **V34 or later**, which advertises `PT3_DSP`. Controller **V35 or later** additionally advertises `PT3_CAL_DFT` and accepts an RTIA-calibration `dft_num` of 256, 512, 1024, 2048, or 4096 points. The PT3 panel sends guarded `VDS`, `VGS`, target output period, gate settling, SINC3 OSR, SINC2 OSR, optional SINC2-notch values, and—on V35—the calibration DFT length together as the eighth `CFG,PT3` field. Firmware reports the resulting raw rate, B1 rate, and integer decimation in `RAWmHz`, `OUTmHz`, and `DEC`; the GUI stores these configuration values beside unchanged B1 data in CSV. The 10 kOhm HSTIA RTIA and PGA ×9 remain fixed because they are tied to the validated 200 ohm RCAL calibration and 5 uA range. Controller V30 or later reports a rejected RTIA calibration as `@ERR,PT3_CAL,LIB=<error>,SPI=<status>,RTIA=<ohm>`; the GUI preserves that raw line and explains that the requested DUT DAC setpoints were not enabled.

Controller **V36 or later** advertises `PT3_LIVE_DAC`. After the firmware sends
`@EVT,RUNNING,PT3`, the GUI can send `LIVE,PT3,<vds_mV>,<vgs_mV>`. That command
writes only the LPDAC0 data register: it changes the 6-bit VBIAS0/CE0 and
12-bit VZERO0/gate codes atomically, while leaving ADC conversion, SINC state,
RTIA calibration, and BLE streaming intact. It is rejected during the initial
gate-settling interval. A live gate step deliberately creates a physical
transient; every following B1 sample is still raw and receives the new
acknowledged setpoint snapshot plus `pt3_setpoint_update=LIVE` in CSV.

## PT3 settings trace and fixture boundary

The PT3 settings panel is not a voltage measurement instrument. It plots **acknowledged configuration-derived setpoints** using the same DAC-code quantization as the firmware:

- VBIAS0 6-bit DAC / CE0 target: `1.100 V + VDS`, quantized at about 34.38 mV per code.
- VZERO0 12-bit DAC / direct gate-fixture target: `1.100 V + VGS`, quantized at about 0.537 mV per code.
- SE0 target: the fixed 1.100 V HSTIA internal reference.
- RE0/PAD4: deliberately unplotted and labelled `OPEN`; it is not a programmable gate output in PT3.

The `0xB1` current samples remain raw received current values in uA. The CSV keeps them unchanged and adds separate `pt3_*_set_mV`, SINC OSR, notch, raw-rate, decimation, and B1-rate columns only when a PT3 configuration ACK was seen. Those columns are configuration metadata, not ADC observations.

For PT3 wiring, connect VZERO0 directly to a separate DUT gate/base fixture contact. Keep PAD4/RE0 open. Do not jumper VZERO0 to PAD4 while the PT3 firmware uses the CE0 buffer path.

PT3 is a static step-control mode: it does not synthesize a continuous VBIAS/VZERO waveform while streaming. The V33 resistor-fixture test verified the CE0/HSTIA current path, but it also measured only about 15% of the ideal VZERO0 current step into a 200 kOhm load. Treat VZERO0 as a high-impedance gate/base bias source and verify the physical gate voltage before using a low-impedance or dynamic load.

### PT3 DSP boundary

SINC3/SINC2 settings control the time-domain noise-versus-bandwidth trade-off.
The V34 guard exposes only SINC3 `2/4/5`, SINC2 `533/800/1067/1333`, nominal
raw rates of 100–800 samples/s, and B1 output no higher than 100 samples/s.
The requested output period can be quantized to an integer raw-sample
decimation; use the acknowledged `OUTmHz` rate when preparing an Edge Impulse
dataset. The SINC2 notch can be enabled for comparison, but it changes the
signal path and must be treated as a separate acquisition condition.

The PT3 B1 stream never enables the AD5940 DFT engine: a DFT measurement would
produce a periodic frequency-bin result and destroy the rise/decay waveform
needed to extract tau. V35 exposes DFT number only for the pre-RUN, internal
HSTIA RTIA calibration. It changes calibration integration time and precision,
not B1 sample filtering. A periodic optical lock-in feature, if required later,
will be a separate mode and frame contract rather than a checkbox that silently
changes tau data.

The SINC2 filter itself is active in PT3; the default GUI setting **SINC2
notch: Bypass** only bypasses the optional notch branch. At the default 100
SPS B1 rate, a 60 Hz pickup aliases to 40 Hz, so a jagged trace or a raw plot
alone cannot prove that its source is mains. Retain raw B1 frames and use the
acknowledged `OUTmHz` rate for a separate spectral check.

## Amperometry variables and guardrails

All AMP parameters are applied as one `CFG,AMPX` transaction, then the firmware reinitializes and recalibrates the internal RTIA at the next `RUN,AMP`.

| GUI parameter | Firmware field | Allowed values / guard |
| --- | --- | --- |
| Vzero, sensor bias | `Vzero`, `SensorBias` | Vzero 200–2200 mV, bias −750–750 mV, and their sum 200–2200 mV |
| Acquisition period | `AmpODR` | 100–10,000 ms |
| Internal RTIA | `LptiaRtiaSel` | 1 kΩ, 4 kΩ, 10 kΩ, 20 kΩ, 40 kΩ, 100 kΩ, 160 kΩ |
| LP TIA Rf | `LpTiaRf` | 20 kΩ, 100 kΩ, 200 kΩ, 400 kΩ, 600 kΩ, 1 MΩ |
| ADC PGA | `ADCPgaGain` | ×1, ×1.5, ×2, ×4, ×9 (`pga_x10` is integer 10/15/20/40/90) |
| SINC3 / SINC2 OSR | `ADCSinc3Osr`, `ADCSinc2Osr` | SINC3 2/4/5; SINC2 22 through 1333, using the AD5940 enum values |
| FIFO threshold | `FifoThresh` | 4–512 FIFO words, multiple of four; GUI shows the nominal notification batch interval |
| RCAL resistance | `RcalVal` | 100–100,000 Ω; default 200 Ω from the board schematic |
| ADC reference | `ADCRefVolt` | 1500–2100 mV; default 1816 mV, replace with a measured board value when available |

`LPTIA RLOAD` intentionally remains fixed at **100 Ω**. ADI's `AD5940_LPRtiaCal()` calibration routine fixes its RLOAD path at 100 Ω, so exposing another RLOAD without replacing that calibration routine would report a mismatched RTIA calibration. Sequencer allocation, FIFO source (`SINC2+notch`), low-power mode, and the continuous-run policy are likewise fixed because they define transport framing or recovery-safe controller behavior rather than an experiment variable.

The original ADI example hard-coded its RTIA calibration to SINC3=4 and SINC2=22. This project updates the calibration excitation frequency to use the active OSR selections, and propagates an RTIA-calibration failure as `AMP_INIT` instead of continuing with a stale result.

CSV is an export of received binary frame values. The UI does not smooth, average, interpolate, or rescale them. The CV x-axis deliberately remains **sequence sample index**, not a browser-inferred potential waveform. PT3 configuration metadata is clearly separate from the received current value.

## Live plot behavior

The browser decodes each received 9-byte `0xA1` (AMP), `0xB1` (PT3), or `0xC1` (CV) frame immediately and appends its original sample index, calculated-current float, and browser receive timestamp to the in-memory received-frame list. The plot is redrawn at most once per animation frame to keep the UI responsive; no received point is modified, averaged, interpolated, or fabricated. The selectable plot window changes only which recent raw points are drawn. It neither limits memory/CSV capture nor performs a moving average. The downloadable CSV contains the unchanged received values and timestamps.

## Controller release and update catalogue

On every NUS connection the GUI requests `INFO?` and parses the controller
release only from the firmware-owned line
`@INFO,AD5940_CTRL,V<release>,...`. It compares that release with the static
catalogue at `web_gui/firmware/latest.json`:

- lower controller release: **Update available** with the listed controller
  release and Secure DFU application version;
- equal release: **Current**, with no newer listed package;
- higher release: **Do not downgrade**, because the connected board is newer
  than the static catalogue.

The catalogue contains no ZIP payload, signing key, or automatic-download URL.
It contains only the intended application-only ZIP filename, byte size, and
SHA-256. When a user chooses a ZIP, the browser calculates that file's
SHA-256 locally and reports whether it matches the listed release. A mismatch
is an advisory warning rather than an override of the target: the Secure DFU
bootloader remains the authority for signature, compatibility, and rollback
checks.

`V<release>` is the running controller release, not the stored Secure DFU
application version. Normal NUS firmware cannot read the bootloader's internal
version record; this project therefore does not claim that comparison as a
live bootloader query. The catalogue's `secure_dfu_application_version` is
release metadata for the selected signed package.

The catalogue is fetched from the static deployment origin, so comparison is
available on the required HTTPS GitHub Pages deployment. A local `file://`
preview can fail that fetch and falls back to manual ZIP selection without
inventing an update state.

## Secure DFU boundary

1. The UI accepts only an `nrfutil` **application-only signed ZIP** that has one `manifest.application` object with a `.dat` init packet and `.bin` file.
2. ZIP parsing is local and checks structure only. It does **not** validate a cryptographic signature; the secure bootloader does that when it receives the init packet.
3. The application is asked to enter the already-qualified NUS `DFU` command. The browser then asks the user to choose `DfuTarg` and uses Secure DFU service `0xFE59` with 20-byte packets, PRN=1, and CRC/offset checks after each packet.
4. A successful transfer protocol is not a successful deployment claim until the user reconnects the restarted application and confirms advertising/NUS.

### Web UI workflow and progress

The V1.8 UI displays the four DFU stages: ZIP structure inspection, selected NUS application's `DFU` transition, an explicit browser chooser selection of `DfuTarg`, and a post-transfer capability reconnect check. V34 must return `PT3_DSP`; V35 additionally returns `PT3_CAL_DFT`; V36 additionally returns `PT3_LIVE_DAC`; V37 source additionally advertises `DPV+SWV` but has no signed catalogue entry yet. Buttonless DFU can intentionally terminate NUS before Windows completes the command write; that transition is surfaced as a guarded `DfuTarg`-selection step rather than a false failure. The browser privacy model does not expose a physical BLE address for a Web Bluetooth chooser selection; the explicit user selection in that chooser is the available target-selection boundary.

The transfer bar reports the percentage of bytes whose CRC/offset receipt was confirmed by the bootloader (PRN=1). It keeps the last confirmed percentage if a transfer stops instead of resetting it to zero. A `100%` transfer still requires the final NUS reconnect and `@INFO` capability check before it is treated as a deployed application.

This design intentionally rejects SoftDevice, bootloader, and combined packages. Browser DFU cannot repair a board that no longer advertises or has lost debug access; use the documented SWD recovery path for that condition.

## Browser and deployment requirements

- Chromium-based browser with Web Bluetooth on a secure HTTPS origin (GitHub Pages is suitable after normal project deployment).
- `file://` and ordinary HTTP are not valid Web Bluetooth origins.
- The browser device chooser and reconnection require explicit clicks. The UI never auto-selects or silently reconnects a device.
- Do not start a measurement until the board's AFE preflight returns a valid ADIID. Current hardware evidence of `0xFFFF` must be treated as an AFE board-path issue, not a GUI/firmware success.

## Deployment handoff

- Source to deploy: `C:\Users\mecha\GPT_home\nRF52_AD5940\web_gui` (including `firmware/latest.json`)
- Entrypoint: `index.html`
- Exclude: signed DFU ZIPs, signing keys, test captures, raw measurement CSV files, credentials, certificates, local logs, and any future `node_modules` directory.
- This project does not publish or alter GitHub Pages. Use the separate `server-ops` workflow when deployment is requested.
