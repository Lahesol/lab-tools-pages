# Two-bank Route Diagram Notes

File: `bank_route_diagram.svg`

This diagram represents the control circuit as two symmetric 8-device Gaussian banks.

## Structure

- Left bank: devices `D1-D8`
  - `DAC1` drives shared `VG1_L`
  - each device has individually programmed `A_i` and `mu_i`
  - manual jumper array selects current into `TIA_L1` and `TIA_L2`

- Right bank: devices `D9-D16`
  - `DAC2` drives shared `VG1_R`
  - each device has individually programmed `A_i` and `mu_i`
  - manual jumper array selects current into `TIA_R1` and `TIA_R2`

## Route colors

- Blue: Web GUI / UART command path
- Orange: DAC / shared VG1 route
- Red: MAX4581 / MAX5488 A-mu programming route
- Green: Jumper / TIA / ADC read route

## Suggested command overlays

- `D1,<code>`: highlight orange route to `VG1_L`
- `D2,<code>`: highlight orange route to `VG1_R`
- `A5,<code>` or `M5,<code>`: highlight red route to left bank device 5
- `A12,<code>` or `M12,<code>`: highlight red route to right bank device 12
- `ADC`: highlight green routes from enabled TIA channels to `nRF SAADC`
