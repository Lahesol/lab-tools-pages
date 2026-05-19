# Symbol Set Notes

File: `symbol_set.svg`

This is a simplified schematic-style symbol sheet for the route overlay.

## Included symbols

- nRF52832 route controller
- AD5322 dual DAC
- REF194 4.5 V reference
- REF193 3.0 V reference
- MAX4581 8:1 analog mux / chip-select selector
- MAX5488 dual digital potentiometer
- DAC amplifier
- A/mu amplifier
- RRAM Gaussian device element
- TIA amplifier

## Design intent

The sheet is not a drop-in KiCad library. It is intended for:

- presentation figures
- web GUI route view
- schematic overlay planning
- command-route animation layers

## Route colors

- UART: `#2d5c64`
- DAC / G1 / Vhigh: `#f4a261`
- MAX4581 / MAX5488 programming: `#d1495b`
- TIA / ADC read: `#2a9d8f`

## Pin naming basis

Pin names were aligned with the local KiCad schematic/netlist where available:

- AD5322: `~SYNC`, `SCLK`, `DIN`, `VREFA/B`, `VOUTA/B`
- MAX4581: `SA`, `SB`, `SC`, `ENABLE`, `X0-X7`, `A/B`
- MAX5488: `SCLK`, `DIN`, `~CS`, `HA/WA/LA`, `HB/WB/LB`
- nRF52832: `P0.24 TX`, `P0.23 RX`, `AIN0-7`, SPI/GPIO route groups
