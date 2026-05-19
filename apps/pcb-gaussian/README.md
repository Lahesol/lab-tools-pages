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
- Commands match the Python GUI protocol: `D1,<code>`, `D2,<code>`, `A<device>,<code>`, `M<device>,<code>`, `INIT`, `ADC`, `PING`.
- Calibrated DAC output model:
  - D1: code 215 = -14.8 V, 1972 = 0 V, 2710 = 14.8 V.
  - D2: code 204 = -14.8 V, 1958 = 0 V, 3710 = 14.8 V.
- Calibrated mu output model uses measured points:
  code 0 = -1.0 V, 60 = 4.92 V, 90 = 6.88 V, 180 = 12.75 V.
- MAX4581 is not controlled directly by the GUI. It is enabled only inside firmware during MAX5488 programming.
- Logs are accumulated in browser memory and can be downloaded as CSV/TXT.
