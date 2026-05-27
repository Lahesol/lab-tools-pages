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
