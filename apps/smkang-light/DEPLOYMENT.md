# Deployment Preparation

## Deployable Static Files

For GitHub Pages or another static host, the deployable frontend is:

```text
SMKang_Light/web_gui/index.html
SMKang_Light/web_gui/app.js
SMKang_Light/web_gui/styles.css
SMKang_Light/web_gui/README.md
SMKang_Light/web_gui/DEPLOYMENT.md
```

The hardware-control API is not static. Real serial control, ADC input/rate
changes, and PC-controlled sweeps require the local backend:

```text
SMKang_Light/web_gui_server.py
SMKang_Light/requirements-web-gui.txt
```

If the static frontend is served from GitHub Pages, `/api/*` calls will not work
unless a local backend/proxy is also provided. For experiments, run
`web_gui_server.py` on the measurement PC and open `http://127.0.0.1:8765/`.

## Exclude From Pages/Git Backup

Do not deploy or commit routine runtime outputs:

```text
measurements/web_gui_runs/
__pycache__/
*.pyc
*.pid
*.log
certs/
node_modules/
```

Large raw datasets, private equipment notes, serial-port-specific local config,
credentials, and keys should remain local. Record only the local path and
reproduction procedure when needed.

## Firmware

Firmware source changed:

```text
SMKang_Light/Neuro -KHKim_multipurpose/main.c
```

Backup created:

```text
SMKang_Light/backups/firmware/
```

Build/upload copy is synchronized to:

```text
C:\Users\mecha\Desktop\nRF-AD5940\nRF5_SDK_17.0.2_d674dde\examples\Neuro\Neuro -KHKim_multipurpose
```

New UART commands:

```text
AD0..AD7   select SAADC AIN input
AR1..AR1000 set ADC auto-sampling rate in Hz
```

Firmware upload for the connected board uses DAPLink/CMSIS-DAP, not J-Link.
The verified probe is `LU_2022_8888` and the target is `nrf52832`.

```powershell
C:\Users\mecha\GPT_home\SMKang_Light\scripts\flash_daplink.ps1
```

This script calls pyOCD with sector erase only. It does not perform recover or
full chip erase.

## Server-Ops Handoff Note

Deployment should be handled from:

```text
C:\Users\mecha\GPT_home\server-ops
```

Suggested app source for static registration:

```text
C:\Users\mecha\GPT_home\SMKang_Light\web_gui
```

Suggested exclude patterns:

```text
measurements/**
__pycache__/**
*.pyc
*.pid
*.log
certs/**
node_modules/**
```
