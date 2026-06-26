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
- DAC A set: `A2048\r`
- DAC B set: `B2056\r`
- Discrete device path A select: `ADC3\r`
- Discrete device path B select: `ADC2\r`
- Commercial PPG sensor select: `ADC0\r`
- Active ADC input query: `ADC?\r`
- TRNG bit mode toggle: `9999\r`
- DAC sweep/reset: `0000\r`
- Green-only PPG mode toggle: `7761\r`
- IR-only PPG mode toggle: `7762\r`
- Red-only PPG mode toggle: `7763\r`
- Alternating Green/IR/Red PPG mode toggle: `7764\r`
- Raw diagnostic mode toggle: `7769\r`
- Green LED toggle: `8881\r`
- IR LED toggle: `8882\r`
- Red LED toggle: `8883\r`
- All LEDs off: `8880\r`
- All LEDs toggle: `8888\r`
- All LEDs on: `8889\r`
- Legacy PPG measurement toggle: `7777\r`
- DFU capability query: `DFU?\r`
- Enter UART DFU bootloader: `DFU\r`
- Firmware version query: `VER?\r`
- Raw ADC receive format: tagged UART text stream from the active ADC only, for example `ADC3,7568\n;`, `ADC2,7559\n;`, or `ADC0,10820\n;`
- Tagged PPG receive format: `G,-123\n;`, `I,-71\n;`, `R,85\n;`, or `A,7340\n;`
- Random bit receive format in `9999` mode: tagged ADC bit stream from the active ADC only, for example `BIT3,0\n;`, `BIT2,1\n;`, or `BIT0,0\n;`

In PPG measurement modes, the firmware samples ambient light with LEDs off, discards one LED-on settling sample, averages two LED-on samples, then streams signed `LED - ambient` values with a channel tag. Raw diagnostic mode streams the ambient and LED-on raw phase values.

PPG timing displayed in the GUI follows the current firmware constants: 5 ms phase tick, 50 Hz output for single-channel Green/IR/Red PPG, and 16.7 Hz per optical channel for alternating Green/IR/Red PPG.

The inspected firmware uses UART RX `25`, TX `26`, and `115200` baud.

The current PCB analog mapping is ADC3/ADC2 for the discrete PPG device paths and ADC0 for the commercial PPG sensor path. The GUI sends `ADC3`, `ADC2`, or `ADC0` to choose the active input. Raw mode, PPG mode, and `9999` bit mode use that one active ADC instead of scanning all ADCs together. Current firmware uses a high-pass residual and sample-delta raw bit mixer followed by Von Neumann pair extraction. `ADC?` returns `ADC,ACTIVE,<n>,ROLE,...,STREAM,SINGLE` for the active route.

## DFU

The running app accepts `DFU` and resets with GPREGRET `0xB1` for Nordic UART DFU bootloader entry. Browser DFU upload requires a signed Nordic DFU `.zip`; raw `.hex` files must be packaged first:

```powershell
.\tools\dfu\uart_dfu_from_hex.ps1 -HexPath "C:\path\to\Stimulation_2emg.hex" -SkipUpload
```

For a blank MCU, flash a merged SoftDevice + app + UART bootloader image once with a programmer:

```powershell
.\tools\dfu\build_ym_ppg_uart_bootloader.ps1
.\tools\dfu\create_initial_uart_dfu_image.ps1
.\tools\dfu\flash_initial_jlink.ps1 -Recover -ChipErase
```

The bootloader helper temporarily patches the shared SDK bootloader example for YM-PPG UART RX `25`, TX `26`, no hardware flow control, then restores the SDK config after build.

If nRF Connect Programmer creates a failing batch task for serial `123456`, use the helper above instead of forcing `--snr 123456`; it lets `nrfjprog` connect to the available probe automatically.

## Bluetooth LE

Bluetooth uses Nordic UART Service:

- Service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- RX write: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- TX notify: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

BLE notifications are parsed as text when they contain ASCII numeric payloads. Non-text BLE notifications are parsed as little-endian 16-bit values; in `9999` bit mode, nonzero values become `1` and zero values become `0`.

## Signal Filtering

The plot can display raw ADC data or browser-side filtered data without changing the firmware stream. Available filters are moving average, one-pole low-pass, one-pole high-pass, and high-pass plus low-pass band-pass. CSV export includes channel, raw, and filtered values when a filter is active.

Tagged firmware streams are plotted as separate ADC, Green, IR, Red, and Ambient channels. The PPG command buttons switch the plot to a `0.5-5 Hz` band-pass preset for normal PPG modes and raw view for diagnostic mode.

## Bit Extraction

Pressing `9999` toggles the local random bit mode indicator and sends the firmware command. While bit mode is active, incoming tagged bits from the active ADC are stored separately from ADC samples and rendered in one bitmap plane.

When `9999` bit mode is not active, ADC samples still produce bitmap bits from the signal noise component. The browser estimates a slow baseline with an exponential moving average, uses the high-frequency residual sign as a raw bit source, then applies a Von Neumann pair extractor to reduce sign bias.

The bitmap is a fixed plane. After all cells in the plane are filled, the next bit clears the plane and writing restarts from the first cell. The panel tracks current-plane bits, ones, zeros, and ones ratio, and CSV export keeps the buffered bit history.

## Portal Build

The app source lives in `YM-PPG/web_gui`. Running `server-ops/scripts/build-github-pages.ps1` copies it into `lab-tools-pages/apps/ppg-trng`.
