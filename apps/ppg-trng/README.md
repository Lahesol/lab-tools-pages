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
- Random bit receive format in `9999` mode: `0` and `1` text stream

The inspected firmware uses UART RX `31`, TX `30`, and `115200` baud.

## Signal Filtering

The plot can display raw ADC data or browser-side filtered data without changing the firmware stream. Available filters are moving average, one-pole low-pass, one-pole high-pass, and high-pass plus low-pass band-pass. CSV export includes both raw and filtered values when a filter is active.

## Random Bit Mode

Pressing `9999` toggles the local random bit mode indicator and sends the firmware command. While bit mode is active, incoming `0` and `1` characters are stored separately from ADC samples and rendered as a bitmap. The bitmap panel tracks bit count, ones, zeros, and ones ratio, and can export the buffered bits as CSV.

## Portal Build

The app source lives in `YM-PPG/web_gui`. Running `server-ops/scripts/build-github-pages.ps1` copies it into `lab-tools-pages/apps/ppg-trng`.
