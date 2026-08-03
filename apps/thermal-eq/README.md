# Thermal_eq Web GUI

Static Web Serial dashboard for the native USB CDC **ThermalEq Control** port.
It is intended for HTTPS deployment as:

- entry point: `web_gui/index.html`
- styles: `web_gui/styles.css`
- browser logic: `web_gui/app.js`

## Operating boundary

1. In a Chromium-family browser, select **ThermalEq Control** (not
   **ThermalEq DFU**) when prompted.
2. Use `ADC 스캔` to send the read-only `ADC?` command. The table and chart show
   only the firmware's raw ADC codes and nominal SAADC pin millivolts.
3. Export **수신 원문** before doing any external analysis. Export the separate
   metadata file with it.
4. `ARM` and manual `HEAT` are the firmware's pre-existing, explicit command
   path; the firmware still enforces the 10% cap. The GUI does not enable
   closed-loop current or temperature control.

The UI intentionally shows no current or temperature numbers until the ADC
channel identities, transfer functions, and thermal/TSEP reference data have
been measured and committed in a later signed firmware release.

## Guided host calibration

`보정 세션` lets the operator select a quantity/channel, enter an independent
reference value, and save it only with a fresh `ADC?` response. It supports
linear and quadratic least-squares review, residual metrics, session JSON/CSV
export, and JSON import for later review. The browser fit is explicitly a
host-side preview; it is not sent to the firmware or heater control path.

Use [CALIBRATION_GUIDE.md](./CALIBRATION_GUIDE.md) for the required reference
measurement, raw-data preservation, and temperature interpretation boundary.

## Static verification

No local server is required or started for this project. Run:

```powershell
node --check .\web_gui\app.js
node .\web_gui\tests\calibration-core.test.js
```

The Web Serial interaction itself needs an HTTPS Chromium runtime and a user
gesture for port selection. It has to be validated separately from static
syntax checks.

For eventual static deployment, include this directory only; exclude firmware
build trees, `dfu/keys/`, `artifacts/`, logs, and any device-specific captures.
