# Route Overlay Draft

This draft is a block-level guide for drawing the real schematic overlay.

## Suggested route layers

- `uart`: PC Web GUI -> USB-UART -> nRF52832
- `dac`: nRF52832 SPI -> AD5322 -> DAC amplifier -> G1 / Vhigh path
- `program`: nRF52832 SPI/GPIO -> MAX4581 address/enable -> selected MAX5488 CS -> A/mu wiper -> amplifier output
- `adc`: device array / jumper-selected current sum -> TIA -> nRF52832 SAADC -> UART response

## Example command mappings

- `D1,2048`: highlight `uart` + `dac`
- `D2,2048`: highlight `uart` + `dac`
- `A5,128`: highlight `uart` + `program`, with selected device 5 and A amplifier output
- `M5,128`: highlight `uart` + `program`, with selected device 5 and mu amplifier output
- `ADC`: highlight `adc` + return `uart`
- `INIT`: repeat `program` route across devices 1..16

## Source preference for exact overlay

Best: SVG schematic export with stable component positions.

Good: high-resolution PNG export of the full control circuit.

Useful detail exports:

- AD5322 / REF194 / DAC amplifier region
- MAX4581 / MAX5488 programming region
- A and mu amplifier region
- TIA / SAADC input region
