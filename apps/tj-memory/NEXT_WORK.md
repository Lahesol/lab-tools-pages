# UV STM/LTM Architecture Simulator - Next Work

## Corrected Simulation Scope

This project should simulate an architecture built from UV-driven STM/LTM transistor-synapse blocks, not a single-device response only.

Core assumptions:
- Optical input: UV single wavelength, default 365 nm.
- UV timing: PWM train or programmable on/off timing table.
- Device output: photocurrent.
- Optional readout: TIA converts current to voltage.
- Device memory mode can be assigned per block or per layer.
- STM/LTM switching routes:
  - Route A: gate fixed at 0 V, switch VDS between +30 V and -30 V.
  - Route B: VDS fixed at +30 V, switch gate between 10 V and 40 V.
- Architecture simulations should be separated into tabs:
  - UV Input
  - Device Blocks
  - ANN Transient
  - SNN Spiking
  - Terms / References

## Current Prototype Status

Implemented in `web_gui/`:
- UV PWM and UV on/off timing table preview.
- Layer/block style device array canvas.
- Per-layer device count, role, STM/LTM/adaptive mode, switching method, and TIA toggle.
- Dataset metadata module in `datasets.js`:
  - Dataset source links.
  - Raw input form.
  - Required input channel count.
  - Required output class count.
  - Loader status.
  - Recommended encoding path into UV pulses.
  - Fetch command and local cache path for real dataset acquisition.
- Dataset fetch script in `scripts/fetch_dataset.py`:
  - Direct download support for MNIST, Fashion-MNIST, and MIT-BIH sample records.
  - Local synthesis for UV toy event data.
  - Tonic-based fetch path for N-MNIST, DVS Gesture, and SHD.
- Dataset-to-device architecture contract:
  - Compares dataset-required input/output sizes with the user-placed input/output device layers.
  - Shows whether direct physical mapping is possible.
  - Flags when a virtual encoder, compression stage, time-multiplexing, or output decoder is being assumed.
- Front-end compact transient model:
  - UV waveform is applied over time.
  - Each displayed device produces a photocurrent trace.
  - STM/LTM mode changes decay and residual retention behavior.
  - Switching route changes gain/persistence assumptions.
  - Optional TIA converts current to voltage.
- ANN Transient tab:
  - Architecture schematic.
  - Time-domain UV/current/TIA or activation plot.
  - Device-current heatmap for the selected layer.
  - Analog activation/readout plot.
- SNN Spiking tab:
  - Architecture schematic.
  - Synaptic current and membrane trace.
  - Spike raster for the selected layer.
  - Binned layer spike-count readout.
- Reference tab with paper/library links.
- CSV export for UV, selected ANN current/readout, selected SNN current, and membrane trace.
- Device Network Editor in the Block tab:
  - Per-device STM/LTM/adaptive override.
  - Per-device switching route override.
  - 1-to-many and many-to-1 device connections.
  - Device-level connection graph.
  - Connected source/target photocurrent response plot under the selected UV pulse program.
  - Layer device count and role edits are deferred until `Update selected layer` or Enter, preventing global redraw from resetting typed values.
- Shared ANN/SNN graph simulation backend:
  - ANN and SNN tabs now consume the Block-tab device graph.
  - Device-to-device connections are used for current/activation propagation.
  - Many-to-one input connections are summed with normalization.
  - One-to-many fan-out connections drive multiple target devices.
  - Runtime summary shows simulated node count, configured edge count, active edge count, and dataset-to-device adapter status.
- Device Block transfer inspection:
  - Signal transfer is now explicit as an O/E/O interface: source photocurrent -> TIA voltage -> UV driver/emitter -> splitter/fan-out -> target optical drive.
  - The O/E/O panel includes an inline explanatory signal-path diagram showing Optical input -> Electrical current/TIA/state -> Optical UV fan-out to target devices.
  - Driver threshold, driver gain, emitted-UV saturation, splitter loss, optical coupling, direct UV residual, and delay are adjustable from the Block tab.
  - Device current traces can be selected with per-cell checkboxes and overlaid in the Block tab.
- STM integrate-fire / LTM latch O/E/O transfer:
  - The Block tab now supports a hybrid transfer mode where STM source devices integrate TIA-driven emitter input and fire UV output pulses only after threshold crossing.
  - LTM source devices can be modeled as persistent latch/readout outputs with write threshold, readout gain, and retention time controls.
  - An explanatory IF/O/E/O guide now contrasts STM integrate-fire, LTM latch/readout, and LTM routed through integrate-fire mode with a timing diagram and compact equations.
  - A standalone 16:9 report figure was generated in `report_assets/` as SVG and PNG for explaining STM/LTM-resolved O/E/O coupling and IF generation.
  - An editable PowerPoint figure, `report_assets/stm_ltm_if_oeo_editable.pptx`, was generated from the shared technical template using native editable shapes, lines, arrows, and text.
  - The connection response plot overlays external UV, emitted UV, IF/latch state, source photocurrent, and connected target photocurrent.
  - The O/E/O transfer tuning plot visualizes the selected source device's input current, TIA voltage, IF/latch state, emitter UV output, delivered edge UV, and static voltage-to-UV driver curve while O/E/O parameters are adjusted.
  - Inline contextual term notes now cover UV input, device blocks, device parameter fitting, O/E/O transfer, ANN simulation, SNN simulation, and dataset/architecture mapping terms.
  - The References tab now includes a simulator-wide glossary rather than an O/E/O-only glossary.
- Device Parameters tab:
  - STM/LTM compact model parameters are editable with sliders.
  - VDS/Gate route gain and persistence multipliers are editable.
  - Two-column measured transient CSV can be pasted as `time_s,current_nA`.
  - STM.xlsx and LTM.xlsx transient curves can be loaded as dark-offset-corrected baseline measurement data and fitted compact parameters.
  - Model and measurement traces are overlaid under the current UV pulse program.
  - A browser-side first-pass auto-fit adjusts gain, dark current, rise tau, decay tau, and retention.
  - Device parameter packages can be exported/imported as JSON, including STM/LTM compact parameters, route multipliers, fit target mode/route, current UV program, and pasted measured transient text.
- Neuron Model tab:
  - Adds a single-device adaptive-threshold optoelectronic IF primitive.
  - STM compact photocurrent is used as the fast membrane/TIA path.
  - LTM state is written by spike events and shifts comparator threshold as either adaptation, sensitization, or fixed-threshold control.
  - The plot shows UV input, STM current, post-reset effective TIA voltage, dynamic Vth, LTM state, emitted spike pulse, and reset suppression.
  - Reset is now modeled as post-fire suppression of `V_TIA,eff`, with independent reset strength and reset-recovery time so it affects subsequent spike timing/count rather than only the visual trace.
  - CSV export now includes the neuron STM current, V_TIA, Vth, LTM state, and spike columns.
- Architecture Optimizer tab:
  - Browser-side heuristic search generates candidate block architectures under the current device and O/E/O parameters.
  - Candidate variables include hidden device count, STM/LTM mode mix, switching route, fan-out connection topology, and optional O/E/O soft parameters.
  - Proxy objectives include output separation, spike sparsity/balance, latency, low UV/energy proxy, and saturation/adapter robustness.
  - Results include a score-vs-energy trade-off plot, best-candidate summary, top-candidate table, and an apply-to-blocks action.

Current limitation:
- The ANN/SNN front-end is a deterministic compact simulation, not a trained model accuracy benchmark.
- The compact model parameters are engineering placeholders until fit from measured current-time traces.
- Dataset selectors use metadata plus compact encoded previews. Real downloaded dataset files are not decoded or trained in-browser yet.
- Real dataset acquisition is now scripted, but fetch commands are not automatically run by the static GUI.
- If the dataset requires more input/output channels than the current device layout, the GUI currently simulates the user's placed blocks with a virtual encoder/readout adapter.
- ANN/SNN graph propagation currently uses a browser-side forward graph pass. Backward/recurrent edges need a delayed iterative solver or Python backend.
- Device parameters can be manually tuned, roughly auto-fitted, and saved/loaded in-browser, but this is still a first-pass compact fit and not a statistically robust extraction workflow.
- The LTM.xlsx baseline importer subtracts the late dark/negative offset before fitting; the abrupt late erase/drop segment is not yet represented by the compact retention model.
- The Architecture Optimizer is a compact proxy optimizer. It screens structures quickly but does not replace trained ANN/SNN accuracy evaluation.
- The integrate-fire emitter and LTM latch are compact system-level transfer models. Their parameters still need extraction from measured TIA/emitter circuit behavior or a circuit-level SPICE/Python backend.
- The Neuron Model tab is a compact hardware primitive model, not a measured closed-loop circuit yet. The next validation target is measured `I_STM -> V_TIA -> comparator fire -> LTM Vth shift -> reset` timing.
- Public dataset download commands exist, but decoded real samples are not yet streamed into the browser-side simulation.
- No Python training/inference backend is connected yet.

## Recommended Next Implementation Steps

1. Device compact model fitting
   - Replace the first-pass browser auto-fit with a Python fitting backend for both switching routes.
   - Extract STM decay, LTM retention, photocurrent gain, noise, and saturation parameters.
   - Store fitted parameters in `web_gui/device_params.json`.
   - Include confidence intervals, residual plots, and fit report export.

2. Python simulation backend
   - Add a Python backend for real ANN/SNN runs rather than replacing the web GUI with a Python GUI.
   - Recommended UI split: keep the browser GUI for architecture editing and use Python as a compute backend or CLI exporter.
   - Recommended first backend: PyTorch + snnTorch + Tonic.
   - Keep the web GUI as a front-end that writes architecture JSON and reads result JSON.
   - First backend task: make dataset loader and architecture contract explicit:
     - dataset-native input shape
     - physical input devices
     - encoder/compression mapping
     - physical output devices
     - readout decoder mapping

3. Architecture export/import
   - Export block arrays as JSON:
     - layers
     - devices per layer
     - mode per layer/device
     - switching route
     - explicit device-to-device connections
     - TIA gain
     - UV timing program
     - dataset, encoding, ANN/SNN preset
   - Import saved architecture JSON for reproducible experiments.

4. ANN baseline
   - Start with current-mode MLP or reservoir + linear readout.
   - Use MNIST/Fashion-MNIST only as a baseline sanity check.
   - Add synthetic UV event dataset to show device-specific novelty.
   - Do not report MNIST/Fashion-MNIST accuracy unless the input encoder and output class readout are fully specified.

5. SNN baseline
   - Start with feedforward LIF and rate-coded UV pulses.
   - Then add time-to-first-spike and PWM phase coding.
   - Use N-MNIST and SHD to test whether timing information matters.
   - For N-MNIST/DVS Gesture, define how event channels are pooled or multiplexed into the available optical input devices.

6. TIA and circuit model
   - Add configurable TIA gain, bandwidth, saturation voltage, input-referred current noise.
   - Show both current-domain and voltage-domain output.
   - Estimate SNR and clipping after each layer.

7. Better application targets
   - Synthetic UV event classification: weak transient, repeated event, sustained event, high-importance event.
   - Fire/UV sensor pipeline: UV event -> camera confirmation -> LTM storage.
   - ECG/anomaly proxy: transient noise -> STM, repeated anomaly -> LTM.
   - Event-based gesture or SHD only after SNN backend is connected.

## Candidate Libraries

- snnTorch: PyTorch-based SNN training and surrogate gradients.
  - https://snntorch.readthedocs.io/en/latest/
- SpikingJelly: PyTorch SNN framework with datasets, ANN-to-SNN conversion, STDP, and energy/operator counting.
  - https://spikingjelly.readthedocs.io/
- Tonic: neuromorphic dataset loading and event transformations.
  - https://tonic.readthedocs.io/en/latest/
- Brian2: equation-first SNN simulator for validating custom device-current-to-neuron equations.
  - https://briansimulator.org/

## Candidate Papers / References

- Eshraghian et al., "Training Spiking Neural Networks Using Lessons From Deep Learning", Proceedings of the IEEE, 2023.
  - https://arxiv.org/abs/2109.12894
- Xiang et al., "Photonic Integrated Neuro-Synaptic Core for Convolutional Spiking Neural Network", 2023.
  - https://arxiv.org/abs/2306.02724
- Cramer et al., "The Heidelberg Spiking Datasets for the Systematic Evaluation of Spiking Neural Networks", 2019.
  - https://arxiv.org/abs/1910.07407
- He et al., "Comparing SNNs and RNNs on Neuromorphic Vision Datasets", 2020.
  - https://arxiv.org/abs/2005.02183
- Fang et al., "SpikingJelly: An open-source machine learning infrastructure platform for spike-based intelligence", Science Advances, 2023.
  - https://www.science.org/doi/abs/10.1126/sciadv.adi1480

## Dataset Recommendation

Use in this order:

1. Synthetic UV event dataset
   - Best for proving device-specific STM/LTM novelty.
   - Classes can be generated from PWM/on-off patterns:
     - transient noise
     - repeated anomaly
     - sustained event
     - sparse high-importance event

2. MNIST / Fashion-MNIST
   - ANN baseline only.
   - Useful for reviewer familiarity, but weak novelty for this device.

3. N-MNIST
   - Useful starter for event-driven SNN.
   - Needs caution: some analyses question whether N-MNIST strongly demonstrates timing advantage.

4. DVS Gesture
   - Better for event-driven temporal classification.
   - More relevant once CSNN/RSNN backend exists.

5. SHD / SSC
   - Good for temporal spike classification.
   - Strong candidate if the claim is that STM/LTM timescale improves temporal memory.

## Proposed Backend File Contract

Input JSON:

```json
{
  "uv": {
    "wavelength_nm": 365,
    "program": "pwm",
    "frequency_hz": 8,
    "duty_cycle": 0.35,
    "pulse_count": 40
  },
  "device_blocks": [
    {
      "name": "Hidden A",
      "devices": 32,
      "mode": "adaptive",
      "switch_method": "vds",
      "tia_enabled": true,
      "tia_gain_ohm": 100000
    }
  ],
  "simulation": {
    "type": "snn",
    "architecture": "lif",
    "dataset": "nmnist",
    "encoding": "rate"
  }
}
```

Output JSON:

```json
{
  "metrics": {
    "accuracy": 0.91,
    "latency_ms": 24.0,
    "energy_index": 38.5,
    "spike_sparsity": 0.72
  },
  "traces": {
    "uv": [],
    "device_current": [],
    "tia_voltage": [],
    "spikes": []
  }
}
```
