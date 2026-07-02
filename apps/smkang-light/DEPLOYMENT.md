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

The static frontend can control UART directly through browser Web Serial when
served from GitHub Pages over HTTPS. This path requires a Chromium-based browser
and an explicit user-selected serial port.
The DAPLink request is filtered for USB VID:PID `C251:F001`; users should select
the board as USB Serial Device, DAPLink, or COM6 in the browser prompt.
The UI also exposes an unfiltered `any serial port` chooser for fallback.

The local backend remains available for localhost use and automatic raw-log file
creation:

```text
SMKang_Light/web_gui_server.py
SMKang_Light/requirements-web-gui.txt
```

When the page is opened from `http://127.0.0.1:8765/`, the frontend detects the
backend and uses `/api/*`. Otherwise it falls back to Web Serial. To force a
transport during debugging, use `?transport=backend` or `?transport=serial`.

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

For GitHub Pages runs, raw UART logs are held in browser memory and must be
downloaded with `Raw Log` before closing or refreshing the tab.

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
