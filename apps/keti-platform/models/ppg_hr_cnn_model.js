(function (global) {
  "use strict";

  global.KetiPpgHrCnnModel = {
    id: "keti_ppg_peak_cnn_adc_web",
    version: "0.2.0",
    kind: "local_conv1d_peak_detector",
    targetSampleRateHz: 32,
    minWindowSec: 8,
    recommendedWindowSec: 30,
    defaultThreshold: 0.42,
    input: {
      signal: "ADC PPG window",
      preprocessing: ["linear_resample", "baseline_remove", "moving_average", "zscore"],
      shape: ["samples", 1]
    },
    layers: [
      {
        type: "conv1d",
        activation: "relu",
        name: "pulse_morphology_bank",
        filters: [
          {
            name: "wide_systolic_peak",
            weights: [-0.20, -0.35, -0.15, 0.25, 0.75, 1.00, 0.75, 0.25, -0.15, -0.35, -0.20],
            bias: 0
          },
          {
            name: "medium_systolic_peak",
            weights: [-0.40, -0.25, 0.00, 0.35, 0.80, 0.35, 0.00, -0.25, -0.40],
            bias: 0
          },
          {
            name: "narrow_systolic_peak",
            weights: [-0.50, -0.20, 0.35, 0.80, 0.35, -0.20, -0.50],
            bias: 0
          }
        ]
      },
      {
        type: "average_pool1d",
        name: "local_score_smoothing",
        radiusSec: 0.06
      },
      {
        type: "minmax",
        name: "peak_probability_score"
      }
    ],
    output: {
      signal: "peak_score",
      range: [0, 1],
      downstream: ["peak_gate", "ibi", "hr", "rmssd", "sdnn", "pnn50"]
    },
    notes: "Browser-side CNN peak score model for ADC-only PPG streaming. HRV metrics are computed from detected inter-beat intervals in app.js."
  };
})(window);
