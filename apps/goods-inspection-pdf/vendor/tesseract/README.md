# Local Tesseract.js runtime

This directory contains the browser-only OCR runtime used by the Invoice ROI tool.
All runtime files are served from the same static site; no OCR image or recognized
text is sent to an external service.

## Versions and sources

- `tesseract.js` 7.0.0: <https://github.com/naptha/tesseract.js>
- `tesseract.js-core` 7.0.0: <https://www.npmjs.com/package/tesseract.js-core/v/7.0.0>
- Korean and English trained data: <https://github.com/naptha/tessdata/tree/4.0.0>
- Runtime and trained data license: Apache License 2.0 (`LICENSE.md`, `core/LICENSE`)

The app initializes `kor+eng` and lets Tesseract.js select the compatible core
variant for the current browser. The complete vendored directory is about 43.8 MB;
a browser downloads only the selected core plus the two language files on first OCR
use and can cache the trained data.

## SHA-256 checksums

```text
000c27d9cd0def655f77b36c72a389c0ab13793aa31cb4d7aab56d09c0afbc7e  tesseract.min.js
576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d  worker.min.js
ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468  lang/eng.traineddata.gz
9d454186b4e2556854b625c43e44d93783a5be7ee89eb1dc6702dfbddced3f4f  lang/kor.traineddata.gz
0bc6ce3e5fbbd0cd89706cf2fd70960e3372f4f01ee24265b26990808aaeb286  core/tesseract-core.wasm.js
eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680  core/tesseract-core-lstm.wasm.js
843074aa5bad1cc6421b74a86201768ced9f244795e4d81435435a61a40ce535  core/tesseract-core-relaxedsimd.wasm.js
861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3  core/tesseract-core-relaxedsimd-lstm.wasm.js
6b61ef4e911b5cf57e656bbfe983d6e2b3711a02dd164154ddda064566e8e09d  core/tesseract-core-simd.wasm.js
c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38  core/tesseract-core-simd-lstm.wasm.js
```
