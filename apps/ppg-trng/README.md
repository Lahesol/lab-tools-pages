# PPG_TRNG Web Control Console

Static Web Serial control panel for the nRF52 `PPG_TRNG` firmware. It sends DAC values over UART and plots the ADC numeric stream from the firmware in real time.

## Run

The Web Serial API requires a secure browser context. Use a localhost static server instead of opening the file directly.

```powershell
python -m http.server 4173
```

Open `http://localhost:4173` in a Chromium-based browser, then press `Connect` and select the USB-UART port.

## Firmware Protocol

- DAC set: ASCII number followed by `\r`, for example `2056\r`
- TRNG bit mode toggle: `9999\r`
- DAC sweep/reset: `0000\r`
- LED toggle: `8888\r`
- LED blink toggle while sampling: `7777\r`
- ADC receive format: UART text numeric stream, for example `7568\n;`

The inspected firmware uses UART RX `31`, TX `30`, and `115200` baud.

## Portal Build

The app source lives in `YM-PPG/web_gui`. Running `server-ops/scripts/build-github-pages.ps1` copies it into `lab-tools-pages/apps/ppg-trng`.
