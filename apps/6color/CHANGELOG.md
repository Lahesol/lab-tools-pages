# 6 Color GUI Changelog

## 2026-07-03

- Added a digital pulse generator to the Blocks tab.
- Supports 4-bit and 8-bit binary or hexadecimal input.
- Generates timeline blocks using OOK NRZ, Manchester, or pulse-width encoding.
- Added Generate, Append, and Generate + Run controls for generated pulse blocks.
- Updated Generate + Run to send the firmware `TXBITS` command instead of browser-timed block commands.
- Preserves the existing manual block editor and timeline preview flow.

## 2026-07-04

- Renamed the user-facing Blocks tab to Protocols.
- Added CSV import/export for Timeline rows.
- Added CSV import/export for generated protocol blocks.
- Added a protocol parameter summary beside the pulse waveform preview.
- Added a Timeline dropdown to insert saved protocol blocks as timeline events.
