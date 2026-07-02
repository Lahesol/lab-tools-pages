# SMKang Light Web GUI

This web GUI controls the `Neuro -KHKim_multipurpose` firmware through UART.
It supports two transports: browser Web Serial for GitHub Pages/static hosting,
and the local Python backend for localhost experiments.

## Run Locally

From `C:\Users\mecha\GPT_home\SMKang_Light`:

```powershell
C:\Python311\python.exe -m pip install -r requirements-web-gui.txt
C:\Python311\python.exe .\web_gui_server.py --host 127.0.0.1 --port 8765
```

Using plain `python` is also fine if that environment has `pyserial`.

Open:

```text
http://127.0.0.1:8765/
```

## GitHub Pages / Static Mode

When opened from GitHub Pages, the GUI uses the browser Web Serial API directly.
Use a Chromium-based browser such as Chrome or Edge over HTTPS. The browser asks
the user to select the DAPLink virtual COM port before UART commands are sent.
For this board, choose the port shown as USB Serial Device, DAPLink, or COM6.
The browser will not show unapproved serial ports in the dropdown before the
first permission approval; click `Connect` to open the browser's port chooser.
If the filtered DAPLink chooser is empty, select `Click Connect to select any
serial port...` in the Port dropdown and retry.

Static mode keeps raw TX/RX log lines in browser memory. Export `Raw Log` before
closing or refreshing the tab when a run must be archived.

## Local Backend Mode

When opened from `http://127.0.0.1:8765/` with `web_gui_server.py` running, the
GUI uses `/api/*` routes and pyserial. This mode writes timestamped raw UART log
files automatically.

## Control Flow

1. The browser loads static files from `web_gui/index.html`, `web_gui/app.js`,
   and `web_gui/styles.css`.
2. On GitHub Pages/static hosting, the browser opens UART through Web Serial.
   On localhost with `web_gui_server.py`, the browser calls local `/api/*`
   routes and the backend opens UART through pyserial.
4. UART commands are sent with the same carriage-return protocol as the Tkinter
   GUI: `ADC`, `D{channel}{mV}`, `F{channel}{mV}`, `Z{channel}{code}`,
   `SA{mV}`, `SZ{mV}`, `SF`, `SR`, `SC`, `SD`, `C{n}`, and `T{ms}`. New
   firmware commands are `AD{0..7}` for SAADC AIN selection, `AR{Hz}` for
   ADC auto-sampling rate, `AA{n}` for firmware-side averaging, and `AS{n}`
   for settling-sample discard after DAC/input/rate changes.
5. Per-channel sweep in the web GUI is PC-controlled: the active transport sends
   timestamped `D{channel}{mV}` commands for A/B/C/D at each sweep point.
   Unchanged DAC channels are skipped, so fixed channels are not rewritten on
   every point.
6. The serial reader preserves raw RX/TX lines in a run folder and separately
   parses numeric 14-bit ADC samples for plotting. In static mode the run folder
   is replaced by in-memory raw-log export.
7. Firmware ADC output uses configurable averaging before UART transmission.
   The stable default is 250 Hz trigger rate, firmware average x4, and settle
   discard 2 samples after DAC/input/rate changes.
8. Plot and processed CSV records use configurable GUI oversampling on top of
   the received UART values. The default is a 4-sample average; set GUI
   oversampling to 1 to plot every numeric RX sample.
9. Every processed ADC average is saved with the current DAC A/B/C/D command
   values plus the raw sample count/min/max used for that average. The same
   records can be plotted against time or against one selected DAC voltage axis.
10. A blank RX line during firmware `SC` stores the current samples as one `SC_cycleN`
   curve, matching the original GUI behavior.
11. CSV exports are available for current parsed ADC data, stored curves, and the raw
   UART log.
12. Disconnect stops ADC if the GUI believes ADC is running, then closes the
   serial port.

## Data Outputs

Local backend mode creates:

```text
measurements/web_gui_runs/<YYYYMMDD_HHMMSS>/
  metadata.json
  raw_uart_log.csv
```

The raw UART log is written before any plotting/export analysis in backend mode.
In static mode, raw UART lines are kept in memory and can be downloaded through
`Raw Log`. Parsed CSV downloads should be treated as processed data. Processed
ADC CSV columns use `adc_count_avg` plus `adc_raw_count`, `adc_raw_min`, and
`adc_raw_max` so the average can be traced back to the original RX samples.

## Firmware Change Summary

`Neuro -KHKim_multipurpose/main.c` was minimally extended:

- `AD{0..7}` selects SAADC AIN0..AIN7. Default remains AIN1.
- `AR{Hz}` sets ADC auto-sampling rate, clamped to 1..1000 Hz.
- `AA{n}` sets firmware averaging count, clamped to 1..256.
- `AS{n}` sets post-DAC/input/rate-change discard count, clamped to 0..1000.
- UART receive buffer was increased from 8 to 24 bytes with a bounds check.
- `AD{0..7}` now changes the SAADC PSEL directly to avoid resetting the board
  during ADC input switching.
- SAADC acquisition time is 10 us, ADC output is averaged in firmware before
  UART, and the first settling samples after DAC/input/rate changes are
  discarded.
- Existing `ADC`, `D`, `F`, `Z`, `T`, `C`, `S*` commands remain in place.

The connected programmer/debugger path is DAPLink/CMSIS-DAP. Use
`scripts/flash_daplink.ps1` for firmware upload after building `Neuro_MS2.hex`.
