# Neuromorphic Vision Pipeline Explorer

Open `index.html` from this folder in a browser. The app is a static, local UI;
it uses no network requests and needs no build step.

- Choose one of the eight 5 × 5 glyphs or toggle individual photodiode cells.
- Adjust the sensor/event/gate/ADC sliders. Slider changes retain the current
  synthetic noise realization; **Run sample** draws the next one.
- Click any numbered layer title to inspect the numerical terms used in that
  layer.
- The V1–V3 / H1–H3 / D1–D2 names identify the intended vertical, horizontal,
  and diagonal readout-routing groups. The visible codebook shows the exact
  uncentered Latin allocation used by the current numerical model.
- The live projection stage repeats the current 5 × 5 RRAM event map at its
  center and places H outputs at the horizontal readout side, V outputs below,
  and D outputs on the two diagonal exits.

The weights in `model-data.js` came from the current synthetic 8 → 4 → 1
RRAM-gated-ReLU simulation and were converted into raw Latin-feature space.
The interface is a numerical/circuit abstraction, not a measured hardware result.
