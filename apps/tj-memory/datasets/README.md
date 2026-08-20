# Dataset Cache

This folder is the local cache for research datasets used by the UV STM/LTM simulator.

The static GUI does not bundle real dataset files. Use the fetch script from `web_gui/`:

```powershell
python .\scripts\fetch_dataset.py fetch mnist
python .\scripts\fetch_dataset.py fetch fashionmnist
python .\scripts\fetch_dataset.py fetch mitbih --records 100
python .\scripts\fetch_dataset.py synthesize uvtoy --samples 160
```

Event/spike datasets are large and are best handled through Tonic:

```powershell
python -m pip install tonic
python .\scripts\fetch_dataset.py fetch nmnist --tonic
python .\scripts\fetch_dataset.py fetch dvsgesture --tonic
python .\scripts\fetch_dataset.py fetch shd --tonic
```

The script writes `dataset_status.json` after each fetch/generation run.

## UCR/UEA Wafer temporal anomaly data

The dedicated `Wafer SNN` tab accepts locally obtained `Wafer_TRAIN.tsv` and/or
`Wafer_TEST.tsv` files directly in the browser. It expects the standard UCR
row layout:

```text
class_label<TAB>x[0]<TAB>...<TAB>x[151]
```

CSV and whitespace-delimited rows with the same `label + 152 values` contract
are also accepted. The GUI keeps uploaded rows only in the current browser
session; it does not bundle, upload, cache, or synthesize Wafer data.

The data represent inline semiconductor fabrication process-sensor time
series, with normal/abnormal classes. They are not a UV-exposure dataset.
Select the anomaly class label manually after parsing because raw UCR label
tokens do not by themselves establish the normal/abnormal semantic mapping.
The browser model produces untrained temporal-spike screening traces, not
dataset accuracy or a hardware/process-monitoring validation result.

Do not commit raw dataset files unless explicitly needed. Keep raw datasets local and document the exact source, version, and command used.
