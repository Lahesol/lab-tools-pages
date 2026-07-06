# PCB Gaussian Web Control

Local-only Web Serial GUI for the PCB Gaussian firmware UART protocol.

## Run

```powershell
cd web_gui
node server.js
```

Open Chrome or Edge at:

```text
http://127.0.0.1:5173
```

For LAN Web Serial access, use HTTPS:

```powershell
powershell -ExecutionPolicy Bypass -File .\create_https_cert.ps1
node server.js 5443 0.0.0.0 https
```

Open:

```text
https://192.9.88.191:5443
https://192.9.89.206:5443
```

The generated certificate is `certs\pcb-gaussian-gui.cer`. Import it into
the current user's trusted root store on each client PC before using Web Serial
from a LAN address:

```powershell
powershell -ExecutionPolicy Bypass -File .\trust_https_cert_current_user.ps1
```

## Notes

- Uses the browser Web Serial API, so Chrome or Edge is recommended.
- LAN Web Serial requires a secure context. `localhost` works over HTTP, but
  IP-address access needs HTTPS with a trusted certificate.
- The DFU tab can program the bundled latest firmware without file selection.
  The bundled package is described by `firmware/latest.json` and stored as
  `firmware/pcb_gaussian_latest_dfu.zip`.
- Current firmware/GUI ADC scaling is SAADC 14-bit with internal 0.6 V reference
  and gain 1/2, so raw ADC values are converted over a 0-1.2 V input range.
- The ADC baseline table uses per-channel defaults. ADC4 defaults to 0.000 V
  and non-inverted current for the D9-D12 zero-bias TIA/inverter path
  (`I_uA = (V_AIN - zero V) / Rf * 1e6`). Other ADCs default to the previous
  1.030 V inverted-current convention unless edited in the ADC baseline panel.
  With the current gain, V_AIN above 1.2 V clips.
- Commands match the firmware UART protocol: `D1,<code>`, `D2,<code>`, `A<device>,<code>`, `M<device>,<code>`, `INIT`, `ADC`, `PING`.
- `ADC` is expected to return 8 values: `ADC,v0,v1,v2,v3,v4,v5,v6,v7`.
- Calibrated DAC output model:
  - D1: code 187 = -15 V, 1972 = 0 V, 3750 = 15 V.
  - D2: code 177 = -15 V, 1958 = 0 V, 3740 = 15 V.
- Plot defaults:
  - DAC1 X-axis plot shows ADC4-ADC7 by default.
  - DAC2 X-axis plot shows ADC0-ADC3 by default.
- MAX4581 is not controlled directly by the GUI. It is enabled only inside firmware during MAX5488 programming.
- Logs are accumulated in browser memory and can be downloaded as CSV/TXT.

## Device Cal Median Target Fitting

- The `Device cal` tab includes `Run median target fit` for browser-only fitting.
- This mode measures one device at a time: all devices are set to `Off M/S`, the selected device is programmed, optional dummy sweeps are discarded, then the measured curve is fitted.
- `Match target = Median from current` first measures the selected batch at the `Init M/S` condition and uses the median fitted A/mu/sigma as the fixed common target.
- `Match target = Manual A/mu/sigma` uses the target fields directly.
- `Save fit package` exports Origin-ready CSV files: initial/final summaries, iteration log, curve points, initial/final XY matrices, all-step XY matrix, manifest, and target JSON. In Chrome/Edge it can save to a selected folder; otherwise files are downloaded individually.
