# Neuromorphic Vision Pipeline Explorer

Open `index.html` from this folder in a browser. The app is a static, local UI;
it uses no network requests and needs no build step.

- Choose one of the eight 5 × 5 glyphs or toggle individual photodiode cells.
- Adjust the sensor/event/gate/ADC sliders. Slider changes retain the current
  synthetic noise realization; **Run sample** draws the next one.
- Click any numbered layer title to inspect the numerical values used in that
  layer.
- One fixed 5 × 5 Latin square supplies weights 1/2, 1/4, 1/8, 1/16, and 1/32.
  Every V/H/D five-cell path contains each weight once, so its full-scale output
  is 31/32 VREF. Click a feature token to see its cellwise input x weight values
  and exact sum.

The weights in `model-data.js` came from the current synthetic 8 → 4 → 1
RRAM-gated-ReLU simulation and were converted into raw Latin-feature space.
Both FC stages now use the exported signed 5-bit conductance-code quantization:
sign selects the positive/negative resistor branch and the magnitude is `0…15`
in that branch. (MAC weight follows conductance, not resistance directly.)
Biases remain continuous reference/bias values in this numerical model.

The **Input distribution and held-out classification** panel samples an
independent synthetic inference set using `A x glyph + B + N(0, sigma)`, RRAM
event thresholding, and the current gate/ADC settings. It evaluates the fixed
exported 5-bit model only; it does not retrain it. The reference protocol used
by the Python script is 800 / 250 / 400 train / validation / test samples per
class, `A ~ U(0.62, 1.18)`, `B ~ U(0, 0.16)`, `sigma = 0.075`, and event
bit-flip probability `0.018`.

The 5-bit MAC conductance map renders each 8 x 4 weight as a differential
positive/negative branch plus a `0…15` magnitude code. It visualizes normalized
conductance code rather than a physical resistor value in ohms.

The interface is a numerical/circuit abstraction, not a measured hardware result.
