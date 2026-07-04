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
- Dual ADC routing query: `ADC?\r`
- Raw ADC sampling rate set/query: `RATE25\r` for 25 Hz, `RATE?\r` to read back. The firmware accepts 1-500 Hz and reports the actual integer-ms interval.
- Legacy firmware bit command: `9999\r` is not required; bit generation is selected and run in the browser from ADC3 raw samples.
- DAC sweep/reset: `0000\r`
- Green-only PPG mode toggle: `7761\r`
- IR-only PPG mode toggle: `7762\r`
- Red-only PPG mode toggle: `7763\r`
- Alternating Green/IR/Red PPG mode toggle: `7764\r`
- Raw diagnostic mode toggle: `7769\r`
- Green LED manual static toggle: `8881\r`
- IR LED manual static toggle: `8882\r`
- Red LED manual static toggle: `8883\r`
- All LEDs off: `8880\r`
- All LEDs toggle: `8888\r`
- All LEDs on: `8889\r`
- Legacy PPG measurement toggle: `7777\r`
- DFU capability query: `DFU?\r`
- Enter UART DFU bootloader: `DFU\r`
- Firmware version query: `VER?\r`
- Raw ADC receive format: tagged UART text stream from the fixed dual route, for example `ADC2,7559\n;` for PPG and `ADC3,7568\n;` for noise/TRNG
- Tagged PPG receive format: `G,7482\n;`, `I,7440\n;`, `R,7411\n;`, or diagnostic ambient `A,7340\n;`
- Browser-side bit extraction uses the streamed `ADC3,<code>\n;` samples.

In PPG measurement modes, the firmware uses a 40 ms frame: LEDs-off ambient sample, one 10 ms LEDs-off wait phase, one 10 ms selected-LED settling phase, then one selected-LED sample before turning the LEDs off. Normal PPG modes stream the selected LED-on raw ADC code with a channel tag; bias is not added, subtracted, or otherwise applied in the firmware payload. Raw diagnostic mode streams both the ambient and LED-on raw phase values.

PPG timing displayed in the GUI follows the current firmware constants: 10 ms phase tick, 40 ms frame, about 10 ms LED-on pulse, 25 Hz output for single-channel Green/IR/Red PPG, and 8.3 Hz per optical channel for alternating Green/IR/Red PPG.

The `888x` LED commands are manual static GPIO controls and do not generate a 25 Hz waveform. Use `7761`, `7762`, or `7763` to measure the 25 Hz single-color PPG LED pulse timing.

The firmware initializes two SAADC channels together: ADC2 / AIN2 / P0.04 for PPG and ADC3 / AIN3 / P0.05 for noise/TRNG. The GUI plots ADC2 PPG and uses ADC3 for bit generation.

`RATE?` includes `SAADC_OVERSAMPLE`. The 25 Hz PPG timing firmware keeps this at `0` so one 10 ms timer trigger produces one SAADC callback.

The inspected firmware uses UART RX `25`, TX `26`, and `115200` baud.

The current PCB analog mapping uses ADC2 for PPG and ADC3 for noise/TRNG. Firmware streams ADC3 raw codes; the web GUI applies the selected bit extraction method. `ADC?` returns a dual-route status with `STREAM,DUAL`.

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

BLE notifications are parsed as text when they contain ASCII numeric payloads. Non-text BLE notifications are parsed as little-endian 16-bit ADC codes; while browser-side bit extraction is enabled, those values are treated as ADC3 raw noise samples and passed through the selected bit method.

## Signal Filtering

The plot can display raw ADC data or browser-side filtered data without changing the firmware stream. Available filters are moving average, one-pole low-pass, one-pole high-pass, and high-pass plus low-pass band-pass. CSV export includes channel, raw, and filtered values when a filter is active.

The `Window` field controls how many parsed samples are retained for plotting and CSV export. It accepts direct numeric input from 100 to 1,000,000 samples; the default is 20,000 samples.

Tagged PPG firmware values are plotted as one ADC2 stream. ADC3 raw values feed the selected bit generator and are not plotted in the PPG trace. Green, IR, Red, and Ambient tags are kept in CSV/log metadata. The PPG command buttons switch the plot to a `0.5-5 Hz` band-pass preset for normal PPG modes and raw view for diagnostic mode.

The browser may deliver Web Serial data in chunks instead of one line at a time. The GUI parses complete text segments as soon as they arrive and commits samples immediately to reduce control-response latency after DAC changes. Plot redraw is still limited by the browser animation frame.

The `Value` control can show the firmware-received ADC code or a current calculation. In code mode the GUI does not add or subtract bias; normal PPG `G`/`I`/`R` samples are plotted exactly as the firmware streams them, now as selected LED-on raw ADC codes. Bias is used only by the `Current` mode. Press `Measure bias` while the selected ADC input or ambient `A` stream is at the bias condition; current displays `(adc - bias) / 8192 * 1.8`. CSV export keeps the original ADC code and bias code with the converted value.

The top-bar `UI size` control switches the console density between compact, standard, large, and touch-sized layouts. The selected size is saved in local browser storage.

## Bit Extraction

Pressing `Bit extract` toggles browser-side ADC3 bit extraction. Changing the live `Bit method` selector also enables extraction so the selected ADC3 method immediately feeds the bitmap and encryption key queue. Firmware commands are not required for bit generation in this workflow.

The live `Bit method` selector chooses which ADC3 extraction method feeds the bitmap and encryption key queue: moving-average threshold, moving-average threshold plus Von Neumann, browser residual-sign plus Von Neumann, browser delta-sign plus Von Neumann, or ADC3 LSB parity. The live moving-average rule matches the `Noise extractor` tab: `sample > moving_average(previous N samples) + offset`. Changing the live MA window or offset clears the current key queue and bitmap so bits from different threshold settings are not mixed.

The PPG encryption panel treats each Green/IR/Red PPG sample as a 14-bit ADC code. It consumes 14 generated ADC3 bits as a key and displays `cipher = adc_code XOR key`. If key bits are slower than PPG samples, PPG samples wait in a pending queue.

The bitmap is a fixed plane. After all cells in the plane are filled, the next bit clears the plane and writing restarts from the first cell. The panel tracks current-plane bits, ones, zeros, and ones ratio, and CSV export keeps the buffered bit history.

## Noise Extractor

The `Noise extractor` tab accepts CSV files exported from the live PPG/ADC view or other tools. After loading a file, choose the delimiter and data column; the first parsed rows are shown in `CSV preview` so the selected column can be checked before extraction. Then run one or more extractors:

- Moving average threshold
- Delta sign
- LSB parity
- Optional Von Neumann pair extractor as a separate post-processed variant for each selected raw extractor

`MA window`는 기준선 평균에 사용할 이전 샘플 수입니다. 값을 키우면 느린 drift에는 덜 흔들리고 작은 노이즈를 보기 쉽지만, 빠른 기준선 변화에는 늦게 반응합니다. 값을 줄이면 기준선 변화를 빠르게 따라가지만 노이즈까지 평균에 섞일 수 있습니다. `Offset`은 기준선에 더하는 임계값 보정입니다. 양수면 1이 덜 나오고, 음수면 1이 더 나옵니다. Moving-average bit rule is `sample > moving_average + offset`.

Von Neumann is not a standalone analog extractor because it needs an input bitstream; when enabled, the tab shows both the raw extractor output and the `+ VN` output as separate bitmap lanes. The test area is split into three method blocks: moving-average threshold, delta sign, and LSB parity. Each block reports generated bit count, raw count, parameters, one ratio, and browser-side randomness checks: NIST-style monobit frequency, runs, block frequency, serial m=2, plus entropy and lag-1 autocorrelation summaries.

## Portal Build

The app source lives in `YM-PPG/web_gui`. Running `server-ops/scripts/build-github-pages.ps1` copies it into `lab-tools-pages/apps/ppg-trng`.
