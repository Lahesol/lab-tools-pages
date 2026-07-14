(function (global) {
  "use strict";

  global.KetiPpgHrCnnModel = {
  "id": "keti_ppg_peak_cnn_adc_web",
  "version": "0.3.0",
  "kind": "weak_supervised_conv1d_peak_detector",
  "targetSampleRateHz": 32,
  "minWindowSec": 8,
  "recommendedWindowSec": 30,
  "defaultThreshold": 0.28,
  "training": {
    "status": "weak_supervised",
    "method": "pseudo_peak_template_learning_from_hr_labels",
    "dataset": {
      "name": "PPG-DaLiA subject 1 subset",
      "file": "ppg_dalia_subject1_acc_ppg_activity_temp.csv",
      "subject": "Subject_1",
      "rows": 298950,
      "parsedSamples": 298950,
      "sampleRateHz": 32,
      "windowSec": 30,
      "strideSec": 3,
      "windowSamples": 960,
      "strideSamples": 96,
      "windows": 3105,
      "trainWindows": 2484,
      "validationWindows": 621,
      "label": "hr column",
      "peakLabels": "pseudo peaks generated from HR period and local extrema"
    },
    "metrics": {
      "threshold": 0.28,
      "train": {
        "count": 2484,
        "valid": 2391,
        "invalid": 93,
        "validRatio": 0.9626,
        "maeBpm": 12.1668,
        "rmseBpm": 16.1946,
        "maxAbsBpm": 74.8466,
        "meanPeaks": 22.01
      },
      "validation": {
        "count": 621,
        "valid": 594,
        "invalid": 27,
        "validRatio": 0.9565,
        "maeBpm": 12.3864,
        "rmseBpm": 16.2522,
        "maxAbsBpm": 75.1218,
        "meanPeaks": 21.94
      },
      "pseudoPeaks": 90363,
      "skippedPeakWindows": 0,
      "sourceDominantPolarity": "negative",
      "deploymentPolarity": "positive_peak",
      "validationMode": "polarity_normalized_by_hr_pseudo_peaks",
      "positiveWindowCount": 1124,
      "negativeWindowCount": 1360
    },
    "note": "HR labels supervise pseudo peak templates. This is a weak-supervised browser detector, not a clinically validated beat-annotation model."
  },
  "referenceDataset": {
    "name": "PPG-DaLiA subject 1 subset",
    "file": "ppg_dalia_subject1_acc_ppg_activity_temp.csv",
    "usage": "trained web Conv1D templates and validation against the HR label",
    "rows": 298950,
    "sampleRateHz": 32,
    "windows": 3105,
    "validationMaeBpm": 12.3864,
    "validationRmseBpm": 16.2522
  },
  "input": {
    "signal": "ADC PPG window",
    "preprocessing": [
      "linear_resample",
      "baseline_remove",
      "moving_average",
      "zscore"
    ],
    "shape": [
      "samples",
      1
    ],
    "trainedWindowSec": 30,
    "expectedPulsePolarity": "positive_peak_after_preprocessing",
    "trainingPolarityNormalization": true
  },
  "layers": [
    {
      "type": "conv1d",
      "activation": "relu",
      "name": "weak_supervised_pulse_template_bank",
      "filters": [
        {
          "name": "learned_11tap_peak_template",
          "weights": [
            -0.943558,
            -0.471047,
            -0.006278,
            0.396744,
            0.674277,
            0.773179,
            0.674477,
            0.399568,
            -0.006286,
            -0.491076,
            -1
          ],
          "bias": 0
        },
        {
          "name": "learned_9tap_peak_template",
          "weights": [
            -0.971522,
            -0.314296,
            0.255664,
            0.648193,
            0.788091,
            0.64849,
            0.259671,
            -0.314291,
            -1
          ],
          "bias": 0
        },
        {
          "name": "learned_7tap_peak_template",
          "weights": [
            -1,
            -0.043627,
            0.615082,
            0.849856,
            0.615575,
            -0.036906,
            -0.99998
          ],
          "bias": 0
        }
      ]
    },
    {
      "type": "average_pool1d",
      "name": "local_score_smoothing",
      "radiusSec": 0.06
    },
    {
      "type": "minmax",
      "name": "peak_probability_score"
    }
  ],
  "output": {
    "signal": "peak_score",
    "range": [
      0,
      1
    ],
    "downstream": [
      "peak_gate",
      "ibi",
      "hr",
      "rmssd",
      "sdnn",
      "pnn50"
    ]
  },
  "notes": "Browser-side weak-supervised Conv1D peak-score model for ADC-only PPG streaming. HRV metrics are computed from detected inter-beat intervals in app.js."
};
})(window);
