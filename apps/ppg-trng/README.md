# PPG_TRNG Web Control Console

Static Web Serial and Web Bluetooth control panel for the nRF52 `PPG_TRNG` firmware. It sends DAC values over USB-UART or Nordic UART Service BLE, then plots the ADC numeric stream from the firmware in real time.

## Run

The Web Serial and Web Bluetooth APIs require a secure browser context. Use a localhost static server instead of opening the file directly.

```powershell
python -m http.server 4173
```

Open `http://localhost:4173` in a Chromium-based browser, choose `USB Serial` or `Bluetooth LE`, then press `Connect`.

## Firmware Protocol

- DAC set: ASCII number followed by `\r`, for example `2056\r`
- TRNG bit mode toggle: `9999\r`
- DAC sweep/reset: `0000\r`
- Green LED toggle: `8881\r`
- Red LED toggle: `8882\r`
- Both LEDs off: `8880\r`
- Both LEDs on: `8883\r`
- Legacy both-LED toggle: `8888\r`
- PPG measurement toggle: `7777\r`
- ADC receive format: UART text numeric stream, for example `7568\n;`
- Random bit receive format in `9999` mode: `0` and `1` text stream

In PPG measurement mode, the firmware alternates ambient, Green-on, ambient, and Red-on samples, then streams the ambient-subtracted LED response magnitude as the same numeric ADC stream used by the plot.

The inspected firmware uses UART RX `31`, TX `30`, and `115200` baud.

## Bluetooth LE

Bluetooth uses Nordic UART Service:

- Service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- RX write: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- TX notify: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

BLE notifications are parsed as text when they contain ASCII numeric payloads. Non-text BLE notifications are parsed as little-endian 16-bit values; in `9999` bit mode, nonzero values become `1` and zero values become `0`.

## Signal Filtering

The plot can display raw ADC data or browser-side filtered data without changing the firmware stream. Available filters are moving average, one-pole low-pass, one-pole high-pass, and high-pass plus low-pass band-pass. CSV export includes both raw and filtered values when a filter is active.

## Bit Extraction

Pressing `9999` toggles the local random bit mode indicator and sends the firmware command. While bit mode is active, incoming `0` and `1` characters are stored separately from ADC samples and rendered as a bitmap.

When `9999` bit mode is not active, ADC samples still produce bitmap bits from the signal noise component. The browser estimates a slow baseline with an exponential moving average, uses the high-frequency residual sign as a raw bit source, then applies a Von Neumann pair extractor to reduce sign bias.

The bitmap is a fixed plane. After all cells in the plane are filled, the next bit clears the plane and writing restarts from the first cell. The panel tracks current-plane bits, ones, zeros, and ones ratio, and CSV export keeps the buffered bit history.

## Portal Build

The app source lives in `YM-PPG/web_gui`. Running `server-ops/scripts/build-github-pages.ps1` copies it into `lab-tools-pages/apps/ppg-trng`.
