# Neuromorphic Vision Pipeline Explorer

Open `index.html` from this folder in a browser. The app is a static, local UI;
it uses no network requests and needs no build step.

- Choose one of the eight 5 × 5 glyphs or toggle individual photodiode cells.
- Adjust the sensor/event/gate/ADC sliders. Slider changes retain the current
  synthetic noise realization; **Run sample** draws the next one.
- Click any numbered layer title to inspect the numerical terms used in that
  layer.

The weights in `model-data.js` came from the current synthetic 8 → 4 → 1
RRAM-gated-ReLU simulation and were converted into raw Latin-feature space.
The interface is a numerical/circuit abstraction, not a measured hardware result.
