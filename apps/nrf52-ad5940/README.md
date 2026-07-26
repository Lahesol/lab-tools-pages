# AD5940 Lab Console

정적 Web Bluetooth 계측 UI 원본이다. 배포 진입점은 `web_gui/index.html`이며 `app.js`, `styles.css` 외에 런타임 의존성이 없다.

## Firmware contract

이 GUI는 `ble_app_uart_CV(RAMP_TEST)`의 통합 애플리케이션과 Nordic UART Service(NUS)로 통신한다.

| Direction | Contract |
| --- | --- |
| GUI → board | `CFG,AMPX,<vzero_mV>,<sensor_bias_mV>,<period_ms>,<rtia_ohm>,<rf_ohm>,<pga_x10>,<sinc3_osr>,<sinc2_osr>,<fifo_words>,<rcal_ohm>,<adc_ref_mV>` |
| legacy host → board | `CFG,AMP,<vzero_mV>,<sensor_bias_mV>,<period_ms>,<rtia_ohm>` (keeps the current advanced AMP values) |
| GUI → board | `CFG,CV,<start_mV>,<vertex_mV>,<vzero_mV>,<steps>,<duration_ms>,<settle_ms>,<rtia_ohm>` |
| GUI → board | `RUN,AMP`, `RUN,CV`, `STOP`, `INFO?`, `STATUS?`, exact `DFU` |
| board → GUI | `@ACK`, `@ERR`, `@EVT`, `@STATUS` ASCII status lines |
| board → GUI | `0xA1` (AMP) / `0xC1` (CV), `uint32 LE index`, `float32 LE calculated current in uA` |

Expanded AMP control requires controller firmware **V26 or later**, which advertises `AMPX` in its `@INFO` response. The GUI leaves CV available but disables AMP apply/run on an older controller, avoiding a partial configuration silently reaching the device.

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

CSV is an export of received binary frame values. The UI does not smooth, average, interpolate, or rescale them. The CV x-axis deliberately remains **sequence sample index**, not a browser-inferred potential waveform.

## Live plot behavior

The browser decodes each received 9-byte `0xA1` (AMP) or `0xC1` (CV) frame immediately and appends its original sample index, calculated-current float, and browser receive timestamp to the in-memory received-frame list. The plot is redrawn at most once per animation frame to keep the UI responsive; no received point is modified, averaged, interpolated, or fabricated. The downloadable CSV contains the unchanged received values and timestamps.

## Secure DFU boundary

1. The UI accepts only an `nrfutil` **application-only signed ZIP** that has one `manifest.application` object with a `.dat` init packet and `.bin` file.
2. ZIP parsing is local and checks structure only. It does **not** validate a cryptographic signature; the secure bootloader does that when it receives the init packet.
3. The application is asked to enter the already-qualified NUS `DFU` command. The browser then asks the user to choose `DfuTarg` and uses Secure DFU service `0xFE59` with 20-byte packets, PRN=1, and CRC/offset checks after each packet.
4. A successful transfer protocol is not a successful deployment claim until the user reconnects the restarted application and confirms advertising/NUS.

### Web UI workflow and progress

The V1.2 UI displays the four DFU stages: ZIP structure inspection, selected NUS application's `DFU` transition, an explicit browser chooser selection of `DfuTarg`, and a post-transfer V26/`AMPX` reconnect check. The browser privacy model does not expose a physical BLE address for a Web Bluetooth chooser selection; the explicit user selection in that chooser is the available target-selection boundary.

The transfer bar reports the percentage of bytes whose CRC/offset receipt was confirmed by the bootloader (PRN=1). It keeps the last confirmed percentage if a transfer stops instead of resetting it to zero. A `100%` transfer still requires the final NUS reconnect and `@INFO` capability check before it is treated as a deployed application.

This design intentionally rejects SoftDevice, bootloader, and combined packages. Browser DFU cannot repair a board that no longer advertises or has lost debug access; use the documented SWD recovery path for that condition.

## Browser and deployment requirements

- Chromium-based browser with Web Bluetooth on a secure HTTPS origin (GitHub Pages is suitable after normal project deployment).
- `file://` and ordinary HTTP are not valid Web Bluetooth origins.
- The browser device chooser and reconnection require explicit clicks. The UI never auto-selects or silently reconnects a device.
- Do not start a measurement until the board's AFE preflight returns a valid ADIID. Current hardware evidence of `0xFFFF` must be treated as an AFE board-path issue, not a GUI/firmware success.

## Deployment handoff

- Source to deploy: `C:\Users\mecha\GPT_home\nRF52_AD5940\web_gui`
- Entrypoint: `index.html`
- Exclude: test captures, raw measurement CSV files, credentials, certificates, local logs, and any future `node_modules` directory.
- This project does not publish or alter GitHub Pages. Use the separate `server-ops` workflow when deployment is requested.
