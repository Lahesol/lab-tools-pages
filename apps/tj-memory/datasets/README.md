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

Do not commit raw dataset files unless explicitly needed. Keep raw datasets local and document the exact source, version, and command used.
