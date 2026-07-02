# SMKang Light Web GUI

This web GUI controls the `Neuro -KHKim_multipurpose` firmware through UART.
It keeps the original commands and adds support for ADC input/rate firmware
commands plus PC-controlled multi-channel DAC sweeps.

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

## Control Flow

1. The browser loads static files from `web_gui/index.html`, `web_gui/app.js`,
   and `web_gui/styles.css`.
2. The browser calls local API routes on `web_gui_server.py`.
3. The backend opens the selected serial port with pyserial.
4. UART commands are sent with the same carriage-return protocol as the Tkinter
   GUI: `ADC`, `D{channel}{mV}`, `F{channel}{mV}`, `Z{channel}{code}`,
   `SA{mV}`, `SZ{mV}`, `SF`, `SR`, `SC`, `SD`, `C{n}`, and `T{ms}`. New
   firmware commands are `AD{0..7}` for SAADC AIN selection and `AR{Hz}` for
   ADC auto-sampling rate.
5. Per-channel sweep in the web GUI is PC-controlled: the backend sends
   timestamped `D{channel}{mV}` commands for A/B/C/D at each sweep point.
6. The serial reader preserves raw RX/TX lines in a run folder and separately
   parses numeric 14-bit ADC samples for plotting.
7. Every parsed ADC sample is saved with the current DAC A/B/C/D command values.
   The same records can be plotted against time or against one selected DAC
   voltage axis.
8. A blank RX line during firmware `SC` stores the current samples as one `SC_cycleN`
   curve, matching the original GUI behavior.
9. CSV exports are available for current parsed ADC data, stored curves, and the raw
   UART log.
10. Disconnect stops ADC if the GUI believes ADC is running, then closes the
   serial port and the raw log file.

## Data Outputs

Each serial connection creates:

```text
measurements/web_gui_runs/<YYYYMMDD_HHMMSS>/
  metadata.json
  raw_uart_log.csv
```

The raw UART log is written before any plotting/export analysis. Parsed CSV
downloads should be treated as processed data.

## Firmware Change Summary

`Neuro -KHKim_multipurpose/main.c` was minimally extended:

- `AD{0..7}` selects SAADC AIN0..AIN7. Default remains AIN1.
- `AR{Hz}` sets ADC auto-sampling rate, clamped to 1..1000 Hz.
- UART receive buffer was increased from 8 to 24 bytes with a bounds check.
- `AD{0..7}` now changes the SAADC PSEL directly to avoid resetting the board
  during ADC input switching.
- Existing `ADC`, `D`, `F`, `Z`, `T`, `C`, `S*` commands remain in place.

The connected programmer/debugger path is DAPLink/CMSIS-DAP. Use
`scripts/flash_daplink.ps1` for firmware upload after building `Neuro_MS2.hex`.
