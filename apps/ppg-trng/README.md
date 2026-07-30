# PPG_TRNG Web Control Console

Static Web Serial/Web Bluetooth control panel for the synchronized three-channel
YM-PPG firmware.

## Current Mapping

- ADC0 / AIN0 / P0.02: commercial PPG sensor
- ADC1: unused
- ADC2 / AIN2 / P0.04: BPTT PPG signal, selected by default
- ADC3 / AIN3 / P0.05: BPTT noise/TRNG source

The firmware always samples ADC0, ADC2, and ADC3 together. `Plot channels` can
show any combination of the three synchronized channels on the main plot. The
primary channel remains ADC2 by default and controls the statistics, filter,
CSV, and optional encryption. ADC3 continues feeding browser-side bit extraction
even when ADC0 or ADC2 is the primary display channel.

## Sampling Rate

`ADC scan Hz` sends `RATE<hz>`. The default is 100 Hz and the valid range is
1-1000 Hz. The rate controls the actual TIMER3/PPI SAADC trigger period shared by
all three channels. It is not a display throttle or UART buffer decimation.

If the GUI shows 25 Hz, the device is currently configured to 25 Hz by a
previous `RATE25` command; it is not a display-only value. Enter `50` and
press `Set` (or send `RATE50`) to use the 50 Hz PPG setting. The Android BLE
app sends `RATE50` automatically after notifications are enabled.

The GUI reads the effective value from `RATE?` and from each binary frame. Sixteen
scans are grouped per frame, so a 1000 Hz stream normally arrives as 62.5 frames/s.

The GUI also decodes the firmware's CRC-checked `ENCF v1` frames. `Start concurrent
ENCF` sends `ENC1` for simultaneous ADC2 PPG and ADC3 MV+VN processing. `Start
switching ENCF` sends `SWENC1`; `Stop FW ENCF` sends the matching stop command.
The firmware remains the source of
the key and cipher. The GUI does not run a second key extractor after an ENCF
record arrives. For switching records, the GUI reconstructs only the transmitted
PPG low-byte field as `cipher XOR key` and keeps the received ADC signal field for
the high bits. The same ENCF stream can be observed by this USB-connected GUI
while a mobile app is connected to the firmware over BLE.

## Stream Decoder

`protocol.js` decodes `ADCF v2` frames containing synchronized ADC0/2/3 uint16
values and `ENCF v1` firmware encryption records, all with CRC-16/CCITT-FALSE.
The decoder supports arbitrary serial/BLE chunk boundaries and text command
responses mixed with binary frames. CRC failures are counted in the encryption
status line as frame errors.

The 16-scan binary batch uses about 6.8 kB/s at 1000 Hz, which fits 115200-baud
USB UART. BLE uses the same frames split to the negotiated NUS MTU; practical BLE
throughput depends on the browser, OS, and connection and may require a lower
scan rate if frame errors or stale status appear.

## Commands

- `RATE<hz>`, `RATE?`: set/query the common ADC0/2/3 rate
- `GAINSET<g0><g2><g3>`, `GAIN0<g>`, `GAIN2<g>`, `GAIN3<g>`, `GAIN?`: set/query ADC gains
- `ADC?`: query the fixed synchronized mapping
- `GPIO?`: query LED GPIO state
- `A0` to `A4095`, `B0` to `B4095`: set DAC A/B
- `8880`: all LEDs off
- `8881`, `8882`, `8883`: toggle Green, IR, Red
- `8888`: toggle all LEDs
- `8889`: all LEDs on
- `VER?`, `PING`: firmware/counter queries
- `DFU?`, `DFU`: UART DFU capability and bootloader entry

The previous `776x` pulse modes, `0000` sweep/reset, per-channel ADC rate controls,
and firmware-side bit mode are intentionally absent from the simplified firmware.

`ADC gain` is independently selectable for ADC0, ADC2, and ADC3. The available
values are 1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, and 4. The GUI sends one `GAINSET`
command so a multi-channel change briefly pauses the hardware-triggered scan only
once. The scan rate and ADC channel mapping are preserved. After the new gains are
confirmed, the GUI clears buffered ADC, key, bitmap, and cipher data so samples
from different scales are not mixed. The GUI checks `VER?`/`PROTO` before sending
`GAINSET`; old firmware is limited to the legacy common gain command and cannot
apply different gains per channel.

## Plot, Bits, and Encryption

The main plot supports raw ADC, moving average, low-pass, high-pass, and band-pass
display filters. `Plot channels` overlays selected ADC series using a shared Y
axis. `Window` controls the retained samples per ADC channel, plus CSV and cipher
history.
`Clear` resets the plot, cipher, pending samples, key queue, bit bitmap, and batch
error counters together.

The retained samples and CSV rows are not decimated. For large windows, only the
canvas drawing path is reduced to ordered per-bucket minima/maxima so the browser
does not attempt to draw hundreds of thousands of line segments every frame. Plot
and statistics refresh intervals also adapt above 50,000 retained samples. Live
bit/encryption counters are refreshed at 10 Hz while acquisition, raw retention,
and key generation continue at the full ADC scan rate.

ADC3 browser-side bit extraction remains available. The bit-count-first throughput
mix, moving-average threshold variants, residual/delta variants, and LSB variants
feed the bitmap and encryption key queue. This is a GUI operation; the firmware
streams raw ADC3 samples.

When firmware ENCF records are present, the encryption panel reports `Firmware
ENCF`, uses the received key/cipher fields, and the bitmap shows the completed
firmware key bytes. This prevents browser-side encryption from being mistaken for
the data transmitted by the device.

Encryption can be enabled for whichever ADC input is selected. The selected
signal is filtered by a channel-specific 22-sample moving average before its low
8/10/12/14-bit field is XORed with ADC3-derived key bits. Raw plotting and the raw
CSV field remain unchanged.

## NIST Test Tab

The `NIST tests` tab runs the 15 NIST SP 800-22 Rev.1a test families on the
retained browser bit buffer. `Current extracted bits` is the default source and
uses the bits currently produced by the selected web extraction method; it does
not generate a second bit stream. ADC0/ADC2/ADC3 selections filter the retained
entries by ADC source, while `Firmware ENCF key bits` selects only key bits
received in firmware encryption records. The tab also accepts an uploaded TXT,
CSV, DAT, or BIN bit file. Text/CSV files may contain a contiguous 0/1 stream,
one bit per line, or a column named `bit`; binary files can be auto-detected,
interpreted as one byte per bit, or interpreted as packed MSB-first bits.
Multiple files can be selected at once. They are parsed in natural filename
order (for example, chunk2 comes before chunk10), concatenated in browser
memory, and kept separate from the live buffer. The calculation is performed
in `nist-worker.js` so the live serial reader and plot remain responsive.

The tab shows the available and actually tested bit counts and explains every
parameter in the expandable help area. The default `500k diagnostic` profile
targets 500,000 bits and uses a Block Frequency size of 8192 so the block count
stays below 100. `NIST STS 1M comparison` targets 1,000,000 bits and uses the
official-software-style Block Frequency size of 128. `Bits to test` selects the
newest N retained bits. `Block size` is the Block Frequency M,
`Non-overlap template` is the binary pattern for the Non-overlapping Template
test, `Approx entropy m` and `Serial m` are pattern lengths, and `Linear block
M` is the Linear Complexity block length.

The implemented families are Frequency, Block Frequency, Cumulative Sums,
Runs, Longest Run of Ones, Binary Matrix Rank, DFT, Non-overlapping Template,
Overlapping Template, Maurer's Universal, Approximate Entropy, Random
Excursions, Random Excursions Variant, Serial, and Linear Complexity. Results
use alpha 0.01. `PASS` means the test ran and p-value >= 0.01. `CHECK` means the
test ran and p-value < 0.01. `N/A` means a required length or precondition was
not met, so no p-value was calculated. The CSV export stores one row per test
family and includes component p-values in the detail column.

The browser tab is a screening tool and does not replace the official NIST STS
software, repeated-sequence proportion checks, p-value uniformity checks, or
cryptographic analysis. For the 500,000-bit profile, Random Excursions may
remain `N/A` if fewer than 500 complete zero-crossing cycles are present.

## Bluetooth LE

- Service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- RX write: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- TX notify: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

## Static Deployment

Entry point: `web_gui/index.html`

Deploy these files together:

- `index.html`
- `styles.css`
- `protocol.js`
- `nist.js`
- `nist-worker.js`
- `app.js`
- `dfu.js`
- `firmware/` only when publishing an updated DFU package

No local server or Pages deployment is started from this project task. Publishing
is handled separately through `server-ops`.

## Static Checks

```powershell
node --check .\web_gui\protocol.js
node --check .\web_gui\app.js
node .\tools\test_web_protocol.js
node .\tools\test_web_static.js
node .\tools\test_firmware_web_contract.js
```
