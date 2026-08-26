/*
 * 3D extension of the PA3FWM waveguide.html interaction model.
 * The original uses two diagonal waves for TE_m0. This file keeps its scene,
 * transparent guide and direct drag rotation while evaluating rectangular
 * and circular-waveguide TE/TM eigenmode field components.
 */
import * as THREE from './three.module.js';

const C0 = 299792458;
const rectangularModes = {
  TE10: { family: 'TE', m: 1, n: 0, title: 'TE₁₀', description: 'Dominant mode for the usual a > b guide. It varies once across the broad wall and not across height.' },
  TE20: { family: 'TE', m: 2, n: 0, title: 'TE₂₀', description: 'Two-lobe TE mode across the broad-wall direction. Its axial magnetic field changes sign across the centre plane.' },
  TE30: { family: 'TE', m: 3, n: 0, title: 'TE₃₀', description: 'Three-lobe TE mode across the broad-wall direction.' },
  TE01: { family: 'TE', m: 0, n: 1, title: 'TE₀₁', description: 'TE mode with one variation across the narrow-wall dimension.' },
  TE02: { family: 'TE', m: 0, n: 2, title: 'TE₀₂', description: 'Two-lobe TE mode across the narrow-wall dimension.' },
  TE11: { family: 'TE', m: 1, n: 1, title: 'TE₁₁', description: 'One transverse variation across both dimensions. Hᶻ has four alternating-sign lobes.' },
  TE12: { family: 'TE', m: 1, n: 2, title: 'TE₁₂', description: 'One variation across width and two across height, with reflections from both wall pairs.' },
  TE21: { family: 'TE', m: 2, n: 1, title: 'TE₂₁', description: 'Two variations across width and one across height, yielding six Hᶻ lobes.' },
  TE22: { family: 'TE', m: 2, n: 2, title: 'TE₂₂', description: 'Two transverse variations across both dimensions, producing a denser standing-field pattern.' },
  TM11: { family: 'TM', m: 1, n: 1, title: 'TM₁₁', description: 'Lowest TM mode. Eᶻ is nonzero inside the guide but zero at every conducting wall.' },
  TM21: { family: 'TM', m: 2, n: 1, title: 'TM₂₁', description: 'TM mode with two opposite-sign Eᶻ lobes across the broad-wall direction.' },
  TM12: { family: 'TM', m: 1, n: 2, title: 'TM₁₂', description: 'TM mode with one width variation and two height variations in its longitudinal electric field.' },
  TM22: { family: 'TM', m: 2, n: 2, title: 'TM₂₂', description: 'Higher-order TM mode with two transverse variations along both dimensions.' }
};

// x'ₘₙ is a zero of J'ₘ (TE); xₘₙ is a zero of Jₘ (TM). Values are the
// standard first radial roots used for a perfectly conducting circular guide.
const circularModes = {
  CTE11: { family: 'TE', m: 1, n: 1, root: 1.84118, rootKind: 'derivative', title: 'TE₁₁', description: 'Dominant circular-guide mode. Its transverse field has two azimuthal lobes and its Hᶻ field follows the first zero of J′₁.' },
  CTM01: { family: 'TM', m: 0, n: 1, root: 2.40483, rootKind: 'zero', title: 'TM₀₁', description: 'Lowest circular TM mode. Eᶻ is rotationally symmetric, is largest at the centre, and vanishes at the conducting wall.' },
  CTE21: { family: 'TE', m: 2, n: 1, root: 3.05424, rootKind: 'derivative', title: 'TE₂₁', description: 'Four azimuthal lobes in the first radial TE family.' },
  CTE01: { family: 'TE', m: 0, n: 1, root: 3.83171, rootKind: 'derivative', title: 'TE₀₁', description: 'Azimuthally symmetric TE mode with a radial Hᶻ variation.' },
  CTM11: { family: 'TM', m: 1, n: 1, root: 3.83171, rootKind: 'zero', title: 'TM₁₁', description: 'First non-axisymmetric circular TM mode, with a longitudinal electric-field nodal diameter.' },
  CTE31: { family: 'TE', m: 3, n: 1, root: 4.20119, rootKind: 'derivative', title: 'TE₃₁', description: 'Six azimuthal lobes in the first radial TE family.' },
  CTM21: { family: 'TM', m: 2, n: 1, root: 5.13562, rootKind: 'zero', title: 'TM₂₁', description: 'Four-lobe circular TM mode with Eᶻ equal to zero at the wall.' }
};

const ui = {
  title: document.querySelector('#pageTitle'), geometry: document.querySelector('#geometry'), mode: document.querySelector('#mode'), frequency: document.querySelector('#frequency'), width: document.querySelector('#width'), height: document.querySelector('#height'), radius: document.querySelector('#radius'),
  frequencyLabel: document.querySelector('#frequencyLabel'), widthLabel: document.querySelector('#widthLabel'), heightLabel: document.querySelector('#heightLabel'), radiusLabel: document.querySelector('#radiusLabel'),
  eScale: document.querySelector('#efieldscale'), hScale: document.querySelector('#hfieldscale'), vectorThickness: document.querySelector('#vectorThickness'), phase: document.querySelector('#phase'), slice: document.querySelector('#slice'), showE: document.querySelector('#showE'), showH: document.querySelector('#showH'), showReflection: document.querySelector('#showReflection'), reflectionStep: document.querySelector('#reflectionStep'), animatePhase: document.querySelector('#animatePhase'), reset: document.querySelector('#resetView'),
  status: document.querySelector('#status'), description: document.querySelector('#modeDescription'), equations: document.querySelector('#equations'), cutoff: document.querySelector('#cutoff'), ratio: document.querySelector('#ratio'), lambdaG: document.querySelector('#lambdaG'), axial: document.querySelector('#axial'), caveat: document.querySelector('#modeCaveat'),
  vectorThicknessLabel: document.querySelector('#vectorThicknessLabel'), phaseLabel: document.querySelector('#phaseLabel'), sliceLabel: document.querySelector('#sliceLabel'),
  widthControl: document.querySelector('#widthControl'), heightControl: document.querySelector('#heightControl'), radiusControl: document.querySelector('#radiusControl'), showDecompositionControl: document.querySelector('#showDecompositionControl'), decompositionStageControl: document.querySelector('#decompositionStageControl'), traceLegend: document.querySelector('#traceLegend'),
  container: document.querySelector('#webgldiv'), map: document.querySelector('[id="2ddiv"]')
};

let camera, scene, renderer, group, guideGroup, arrowGroup, reflectionGroup, reflectionTracerGroup, sliceGroup, container;
let fieldArrows = [];
let reflectionPaths = [];
let reflectionTracers = [];
let targetRotation = -0.6, targetRotationY = 0.55;
let targetRotationOnMouseDown = targetRotation, targetRotationOnMouseDownY = targetRotationY;
let mouseXOnMouseDown = 0, mouseYOnMouseDown = 0;
let phase = 0, previousAnimation = performance.now(), redraw = true;
let wgW = 80, wgH = 36, wgL = 560;
const arrowAxis = new THREE.Vector3(0, 1, 0);
const arrowShaftGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);

function activeModes() {
  return ui.geometry.value === 'circular' ? circularModes : rectangularModes;
}

function isCircular(s) {
  return s.geometry === 'circular';
}

function modeOptions(defaultValue) {
  const selected = defaultValue || ui.mode.value;
  ui.mode.innerHTML = '';
  Object.entries(activeModes()).forEach(([value, mode]) => {
    const option = document.createElement('option');
    option.value = value; option.textContent = mode.title;
    option.selected = value === selected;
    ui.mode.appendChild(option);
  });
  if (!ui.mode.value) ui.mode.selectedIndex = 0;
}

function applyGeometryUi() {
  const circle = ui.geometry.value === 'circular';
  ui.title.textContent = circle ? 'Circular waveguide modes' : 'Rectangular waveguide modes';
  ui.widthControl.hidden = circle; ui.heightControl.hidden = circle; ui.radiusControl.hidden = !circle;
  ui.showDecompositionControl.hidden = circle; ui.decompositionStageControl.hidden = circle; ui.traceLegend.hidden = circle;
  modeOptions(circle ? 'CTE11' : 'TE11');
}

function state() {
  return {
    geometry: ui.geometry.value,
    mode: activeModes()[ui.mode.value],
    a: Number(ui.width.value) * 1e-3,
    b: Number(ui.height.value) * 1e-3,
    radius: Number(ui.radius.value) * 1e-3,
    frequency: Number(ui.frequency.value) * 1e9
  };
}

function cutoffFrequency(s) {
  if (isCircular(s)) return C0 * s.mode.root / (2 * Math.PI * s.radius);
  return C0 / 2 * Math.hypot(s.mode.m / s.a, s.mode.n / s.b);
}

function propagation(s) {
  const fc = cutoffFrequency(s);
  const ratio = s.frequency / fc;
  return { fc, ratio, propagating: ratio > 1, betaVisual: ratio > 1 ? Math.sqrt(ratio * ratio - 1) * 0.72 : 0.16 };
}

function sliceZ() {
  return -(Number(ui.slice.value) / 100) * wgL;
}

function updateControlLabels() {
  const sliceFraction = Number(ui.slice.value) / 100;
  ui.vectorThicknessLabel.value = `${Number(ui.vectorThickness.value).toFixed(2)}×`;
  ui.sliceLabel.value = `${Math.round(sliceFraction * 100)}% · z/L = ${sliceFraction.toFixed(2)}`;
  ui.phaseLabel.value = `${Math.round(Number(ui.phase.value))}°`;
}

function syncAnimatedPhaseControl() {
  const degrees = ((phase * 180 / Math.PI) % 360 + 360) % 360;
  ui.phase.value = String(Math.round(degrees));
  ui.phaseLabel.value = `${Math.round(degrees)}°`;
}

function reflectionModel(s) {
  const singleTransverseAxis = s.mode.family === 'TE' && (s.mode.m === 0 || s.mode.n === 0);
  const transverseAxis = s.mode.m === 0 ? 'y' : 'x';
  if (singleTransverseAxis) {
    return {
      componentCount: 2,
      transverseAxis,
      wallText: transverseAxis === 'x' ? 'left/right x walls' : 'top/bottom y walls',
      boundaryText: 'The reflected component cancels tangential E at the conducting wall.',
      summary: `Two diagonal plane-wave components reflect between the ${transverseAxis === 'x' ? 'left/right' : 'top/bottom'} walls. Their sum forms a transverse standing pattern while phase still advances along −z.`
    };
  }
  return {
    componentCount: 4,
    transverseAxis: 'xy',
    wallText: 'both x- and y-wall pairs',
    boundaryText: s.mode.family === 'TM' ? 'The four components must cancel Eᶻ at every conducting wall.' : 'The four components cancel tangential E at both wall pairs.',
    summary: `${s.mode.family === 'TM' ? 'TM' : 'TE'} ${s.mode.title} uses four diagonal components: all sign combinations of transverse kx and ky. They reflect from both wall pairs, while the total mode carries average power along −z.`
  };
}

function updateReadout() {
  const s = state();
  const p = propagation(s);
  ui.frequencyLabel.value = `${Number(ui.frequency.value).toFixed(2)} GHz`;
  ui.widthLabel.value = `${Number(ui.width.value).toFixed(2)} mm`;
  ui.heightLabel.value = `${Number(ui.height.value).toFixed(2)} mm`;
  ui.radiusLabel.value = `${Number(ui.radius.value).toFixed(2)} mm`;
  updateControlLabels();
  ui.description.textContent = s.mode.description;
  ui.status.textContent = p.propagating ? 'Propagating' : 'Below cutoff';
  ui.status.classList.toggle('below', !p.propagating);
  ui.cutoff.textContent = `${(p.fc / 1e9).toFixed(3)} GHz`;
  ui.ratio.textContent = p.ratio.toFixed(3);
  ui.lambdaG.textContent = p.propagating ? `${(C0 / s.frequency / Math.sqrt(1 - 1 / (p.ratio * p.ratio)) * 1e3).toFixed(2)} mm` : 'Evanescent';
  ui.axial.textContent = s.mode.family === 'TE' ? 'Hᶻ (magnetic)' : 'Eᶻ (electric)';
  if (isCircular(s)) {
    const root = s.mode.root.toFixed(5);
    ui.equations.innerHTML = s.mode.family === 'TE'
      ? `<b>TE mode:</b> <i>E</i><sub>z</sub> = 0<br><i>H</i><sub>z</sub> ∝ J<sub>${s.mode.m}</sub>(${root}<i>r</i>/<i>a</i>) cos(${s.mode.m}φ)<br>J′<sub>${s.mode.m}</sub>(${root}) = 0`
      : `<b>TM mode:</b> <i>H</i><sub>z</sub> = 0<br><i>E</i><sub>z</sub> ∝ J<sub>${s.mode.m}</sub>(${root}<i>r</i>/<i>a</i>) cos(${s.mode.m}φ)<br>J<sub>${s.mode.m}</sub>(${root}) = 0`;
    ui.caveat.textContent = 'Circular-guide modes are Bessel-function eigenmodes. The rectangular diagonal-wave construction does not apply, so the viewer renders the analytical transverse and longitudinal field pattern directly.';
  } else {
    ui.equations.innerHTML = s.mode.family === 'TE'
      ? `<b>TE mode:</b> <i>E</i><sub>z</sub> = 0<br><i>H</i><sub>z</sub> ∝ cos(${s.mode.m}π<i>x</i>/<i>a</i>) cos(${s.mode.n}π<i>y</i>/<i>b</i>)`
      : `<b>TM mode:</b> <i>H</i><sub>z</sub> = 0<br><i>E</i><sub>z</sub> ∝ sin(${s.mode.m}π<i>x</i>/<i>a</i>) sin(${s.mode.n}π<i>y</i>/<i>b</i>)`;
    ui.caveat.innerHTML = 'The original two-diagonal-wave construction applies to the TE<sub>m0</sub> family. TE<sub>11</sub> and TM modes require reflections from both wall pairs and/or a longitudinal electric field, so this extension renders the analytical eigenmode directly.';
  }
}

function createArrow(color) {
  // Start hidden with a non-degenerate helper geometry; zero-length arrows make
  // Three.js r108 emit normal-matrix warnings during the first render.
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 5, color, 3.8, 2.1);
  arrow.visible = false;
  arrow.line.material.transparent = true;
  arrow.line.material.opacity = 0.88;
  arrow.cone.material.transparent = true;
  arrow.cone.material.opacity = 0.88;
  arrow.line.visible = false;
  const shaft = new THREE.Mesh(arrowShaftGeometry, arrow.cone.material);
  arrow.add(shaft);
  arrow.userData = {
    direction: arrowAxis.clone(),
    targetQuaternion: new THREE.Quaternion(),
    displayedLength: 4.6,
    initialised: false,
    shaft
  };
  return arrow;
}

function buildGeometry() {
  const s = state();
  wgW = 80;
  wgH = isCircular(s) ? wgW : Math.max(19, Math.min(72, wgW * s.b / s.a));
  wgL = wgW * 7;
  if (guideGroup) group.remove(guideGroup);
  if (arrowGroup) group.remove(arrowGroup);
  if (reflectionGroup) group.remove(reflectionGroup);
  if (reflectionTracerGroup) group.remove(reflectionTracerGroup);
  if (sliceGroup) group.remove(sliceGroup);
  guideGroup = new THREE.Group();
  arrowGroup = new THREE.Group();
  reflectionGroup = new THREE.Group();
  reflectionTracerGroup = new THREE.Group();
  sliceGroup = new THREE.Group();
  group.add(guideGroup);
  group.add(arrowGroup);
  group.add(reflectionGroup);
  group.add(reflectionTracerGroup);
  group.add(sliceGroup);

  const guideMaterial = new THREE.MeshPhongMaterial({ color: 0x587287, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false });
  if (isCircular(s)) {
    const cylinder = new THREE.CylinderGeometry(wgW, wgW, wgL, 64, 1, true);
    const guide = new THREE.Mesh(cylinder, guideMaterial);
    guide.rotation.x = Math.PI / 2; guide.position.z = -wgL / 2;
    guideGroup.add(guide);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cylinder), new THREE.LineBasicMaterial({ color: 0x1f3444 }));
    edges.rotation.x = Math.PI / 2; edges.position.z = -wgL / 2;
    guideGroup.add(edges);
  } else {
    const box = new THREE.BoxGeometry(wgW * 2, wgH * 2, wgL);
    const guide = new THREE.Mesh(box, guideMaterial);
    guide.position.z = -wgL / 2;
    guideGroup.add(guide);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0x1f3444 }));
    edges.position.z = -wgL / 2;
    guideGroup.add(edges);
  }

  const axisMaterial = new THREE.LineBasicMaterial({ color: 0x6b8799, transparent: true, opacity: 0.7 });
  const axisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-wgW - 18, -wgH - 14, 2), new THREE.Vector3(-wgW - 18, -wgH - 14, -wgL - 18)]);
  guideGroup.add(new THREE.Line(axisGeometry, axisMaterial));
  buildSliceMarker(s);

  fieldArrows = [];
  // Resolve the propagation direction more finely than the cross-section.
  // Each sample owns one E and one H ArrowHelper, so retain a deliberately
  // modest transverse grid while using 22 longitudinal samples.
  const xCount = 5, yCount = isCircular(s) ? 5 : 3, zCount = 22;
  for (let iz = 0; iz < zCount; iz += 1) {
    for (let iy = 0; iy < yCount; iy += 1) {
      for (let ix = 0; ix < xCount; ix += 1) {
        const x = -wgW + (ix + 0.5) / xCount * wgW * 2;
        const y = -wgH + (iy + 0.5) / yCount * wgH * 2;
        const z = -(iz + 0.35) / zCount * wgL;
        if (isCircular(s) && x * x + y * y > wgW * wgW * 0.93) continue;
        const e = createArrow(0xd73032);
        const h = createArrow(0x176fc1);
        e.position.set(x, y, z);
        h.position.set(x, y, z);
        arrowGroup.add(e, h);
        fieldArrows.push({ x, y, z, e, h });
      }
    }
  }
  buildReflectionOverlay(s);
}

function buildSliceMarker(s) {
  const planeGeometry = isCircular(s) ? new THREE.CircleGeometry(wgW, 64) : new THREE.PlaneGeometry(wgW * 2, wgH * 2);
  const plane = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ color: 0xf2a13c, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  let outline;
  if (isCircular(s)) {
    const points = [];
    for (let index = 0; index < 64; index += 1) {
      const angle = index / 64 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * wgW, Math.sin(angle) * wgW, 0));
    }
    outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xc77718, transparent: true, opacity: 0.82, depthTest: false }));
  } else {
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(planeGeometry), new THREE.LineBasicMaterial({ color: 0xc77718, transparent: true, opacity: 0.82, depthTest: false }));
  }
  sliceGroup.add(plane, outline);
  updateSliceMarker();
}

function updateSliceMarker() {
  if (sliceGroup) sliceGroup.position.z = sliceZ();
}

function triangleFold(value) {
  const wrapped = value - Math.floor(value);
  return 1 - 4 * Math.abs(wrapped - 0.5);
}

function makeReflectionLine(points, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false });
  return new THREE.Line(geometry, material);
}

function diagonalSigns(model) {
  return model.componentCount === 2 ? [[-1, 0], [1, 0]] : [[-1, -1], [-1, 1], [1, -1], [1, 1]];
}

function componentPathPoint(s, index, t, bounced) {
  const model = reflectionModel(s);
  const [signX, signY] = diagonalSigns(model)[index];
  const z = -t * wgL;
  if (model.componentCount === 2) {
    const variesX = model.transverseAxis === 'x';
    const fold = bounced ? triangleFold((variesX ? s.mode.m : s.mode.n || 1) * t) : t;
    return new THREE.Vector3(
      variesX ? signX * wgW * fold : 0,
      variesX ? 0 : signX * wgH * fold,
      z
    );
  }
  return new THREE.Vector3(
    signX * wgW * (bounced ? triangleFold(Math.max(1, s.mode.m) * t) : t),
    signY * wgH * (bounced ? triangleFold(Math.max(1, s.mode.n) * t + (index % 2) * 0.5) : t),
    z
  );
}

function createReflectionTracer(color) {
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 20, color, 5.5, 2.8);
  arrow.line.material.transparent = true;
  arrow.cone.material.transparent = true;
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 12, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true })
  );
  arrow.add(marker);
  return { arrow, marker };
}

function setTracerOpacity(tracer, opacity) {
  tracer.arrow.line.material.opacity = opacity;
  tracer.arrow.cone.material.opacity = opacity;
  tracer.marker.material.opacity = opacity;
}

function buildReflectionTracers(s) {
  reflectionTracers = [];
  const colors = [0xf2a13c, 0x16749a, 0xd85e3c, 0x459ac0];
  diagonalSigns(reflectionModel(s)).forEach((_, index) => {
    const tracer = createReflectionTracer(colors[index % colors.length]);
    reflectionTracerGroup.add(tracer.arrow);
    reflectionTracers.push(tracer);
  });
}

function updateReflectionTracers(s, step, visible) {
  if (!reflectionTracerGroup) return;
  reflectionTracerGroup.visible = visible;
  const bounced = step !== 'components';
  const baseProgress = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  reflectionTracers.forEach((tracer, index) => {
    tracer.arrow.visible = visible;
    if (!visible) return;
    const progress = (baseProgress + index * 0.19) % 1;
    const point = componentPathPoint(s, index, progress, bounced);
    const ahead = componentPathPoint(s, index, Math.min(1, progress + 0.009), bounced);
    const behind = componentPathPoint(s, index, Math.max(0, progress - 0.009), bounced);
    const direction = (progress > 0.988 ? point.clone().sub(behind) : ahead.clone().sub(point)).normalize();
    tracer.arrow.position.copy(point);
    tracer.arrow.setDirection(direction);
    tracer.arrow.setLength(20, 5.5, 2.8);
    setTracerOpacity(tracer, step === 'sum' ? 0.42 : 0.96);
  });
}

function buildReflectionOverlay(s) {
  if (isCircular(s)) {
    reflectionPaths = [];
    reflectionTracers = [];
    reflectionGroup.visible = false;
    reflectionTracerGroup.visible = false;
    return;
  }
  const model = reflectionModel(s);
  const signs = diagonalSigns(model);
  reflectionPaths = [];
  for (let index = 0; index < signs.length; index += 1) {
    const [signX, signY] = signs[index];
    const direct = [];
    const bounced = [];
    for (let point = 0; point <= 60; point += 1) {
      const t = point / 60;
      const z = -t * wgL;
      if (model.componentCount === 2) {
        const variesX = model.transverseAxis === 'x';
        direct.push(new THREE.Vector3(variesX ? signX * wgW * t : 0, variesX ? 0 : signX * wgH * t, z));
        bounced.push(new THREE.Vector3(
          variesX ? signX * wgW * triangleFold((s.mode.m || 1) * t) : 0,
          variesX ? 0 : signX * wgH * triangleFold((s.mode.n || 1) * t),
          z
        ));
      } else {
        direct.push(new THREE.Vector3(signX * wgW * t, signY * wgH * t, z));
        bounced.push(new THREE.Vector3(
          signX * wgW * triangleFold(Math.max(1, s.mode.m) * t),
          signY * wgH * triangleFold(Math.max(1, s.mode.n) * t + (index % 2) * 0.5),
          z
        ));
      }
    }
    const incident = makeReflectionLine(direct, 0xf2a13c);
    const reflected = makeReflectionLine(bounced, 0x16749a);
    reflectionGroup.add(incident, reflected);
    reflectionPaths.push({ incident, reflected });
  }
  buildReflectionTracers(s);
  updateReflectionOverlay(s);
}

function updateReflectionOverlay(s) {
  if (!reflectionGroup || !arrowGroup) return;
  if (isCircular(s)) {
    reflectionGroup.visible = false;
    reflectionTracerGroup.visible = false;
    arrowGroup.visible = true;
    return;
  }
  const visible = ui.showReflection.checked;
  const step = ui.reflectionStep.value;
  reflectionGroup.visible = visible;
  arrowGroup.visible = !visible || step === 'sum';
  for (const path of reflectionPaths) {
    path.incident.visible = visible && step === 'components';
    path.reflected.visible = visible && step !== 'components';
    path.reflected.material.opacity = step === 'sum' ? 0.26 : 0.88;
  }
  updateReflectionTracers(s, step, visible);
  if (visible && step === 'boundaries') {
    ui.status.textContent = `${reflectionModel(s).componentCount}-wave wall reflection`;
  }
}

function fieldAt(x, y, z, s, p) {
  if (isCircular(s)) return circularFieldAt(x, y, z, s, p);
  const u = (x + wgW) / (2 * wgW);
  const v = (y + wgH) / (2 * wgH);
  const { m, n, family } = s.mode;
  const kx = m / s.a, ky = n / s.b;
  const normaliser = 1 / Math.max(Math.hypot(kx, ky), 1);
  const sx = Math.sin(Math.PI * m * u), cx = Math.cos(Math.PI * m * u);
  const sy = Math.sin(Math.PI * n * v), cy = Math.cos(Math.PI * n * v);
  const guideDistance = -z / wgL;
  const attenuation = p.propagating ? 1 : Math.exp(-1.8 * (1 - p.ratio) * guideDistance);
  const theta = phase + p.betaVisual * z / wgW;
  const transversePhase = Math.sin(theta) * attenuation;
  const axialPhase = Math.cos(theta) * attenuation;
  if (family === 'TE') {
    return {
      e: new THREE.Vector3(ky * cx * sy * normaliser * transversePhase, -kx * sx * cy * normaliser * transversePhase, 0),
      h: new THREE.Vector3(kx * sx * cy * normaliser * transversePhase, ky * cx * sy * normaliser * transversePhase, cx * cy * axialPhase),
      axial: cx * cy * axialPhase
    };
  }
  return {
    e: new THREE.Vector3(kx * cx * sy * normaliser * transversePhase, ky * sx * cy * normaliser * transversePhase, sx * sy * axialPhase),
    h: new THREE.Vector3(-ky * sx * cy * normaliser * transversePhase, kx * cx * sy * normaliser * transversePhase, 0),
    axial: sx * sy * axialPhase
  };
}

function besselJ(order, value) {
  // Stable enough for the low orders and first roots exposed by this viewer.
  const half = value / 2;
  let term = Math.pow(half, order) / factorial(order);
  let sum = term;
  for (let index = 1; index < 22; index += 1) {
    term *= -(half * half) / (index * (index + order));
    sum += term;
  }
  return sum;
}

function factorial(value) {
  let answer = 1;
  for (let index = 2; index <= value; index += 1) answer *= index;
  return answer;
}

function besselDerivative(order, value) {
  return order === 0 ? -besselJ(1, value) : (besselJ(order - 1, value) - besselJ(order + 1, value)) / 2;
}

function circularFieldAt(x, y, z, s, p) {
  const radius = Math.hypot(x, y);
  if (radius > wgW * 1.001) return { e: new THREE.Vector3(), h: new THREE.Vector3(), axial: 0 };
  const rho = radius / wgW;
  const phi = Math.atan2(y, x);
  const { m, root, family } = s.mode;
  const argument = root * rho;
  const angular = Math.cos(m * phi);
  const radialDerivative = root * besselDerivative(m, argument) * angular;
  const azimuthDerivative = rho > 0.003 ? -m * besselJ(m, argument) * Math.sin(m * phi) / rho : 0;
  const normaliser = 1 / Math.max(root, 1);
  const c = Math.cos(phi), sn = Math.sin(phi);
  const polarToCartesian = (radial, azimuthal) => new THREE.Vector3(radial * c - azimuthal * sn, radial * sn + azimuthal * c, 0);
  const guideDistance = -z / wgL;
  const attenuation = p.propagating ? 1 : Math.exp(-1.8 * (1 - p.ratio) * guideDistance);
  const theta = phase + p.betaVisual * z / wgW;
  const transversePhase = Math.sin(theta) * attenuation;
  const axialPhase = Math.cos(theta) * attenuation;
  const axial = besselJ(m, argument) * angular * axialPhase;
  if (family === 'TE') {
    return {
      e: polarToCartesian(-azimuthDerivative * normaliser * transversePhase, radialDerivative * normaliser * transversePhase),
      h: polarToCartesian(-radialDerivative * normaliser * transversePhase, -azimuthDerivative * normaliser * transversePhase),
      axial
    };
  }
  return {
    e: polarToCartesian(radialDerivative * normaliser * transversePhase, azimuthDerivative * normaliser * transversePhase),
    h: polarToCartesian(-azimuthDerivative * normaliser * transversePhase, radialDerivative * normaliser * transversePhase),
    axial
  };
}

function updateArrow(arrow, vector, scale, show, delta) {
  const magnitude = vector.length();
  arrow.visible = show && scale > 0;
  if (!arrow.visible) return;

  const data = arrow.userData;
  const smoothing = 1 - Math.exp(-Math.min(delta, 80) / 52);
  const targetLength = Math.min(25, Math.max(4.6, magnitude * scale));
  if (magnitude > 0.004) data.direction.copy(vector).multiplyScalar(1 / magnitude);
  data.targetQuaternion.setFromUnitVectors(arrowAxis, data.direction);

  if (!data.initialised) {
    arrow.quaternion.copy(data.targetQuaternion);
    data.displayedLength = targetLength;
    data.initialised = true;
  } else {
    // Spherical interpolation gives a visible rotation through a reversal
    // instead of an instantaneous 180-degree orientation jump.
    arrow.quaternion.slerp(data.targetQuaternion, smoothing);
    data.displayedLength += (targetLength - data.displayedLength) * smoothing;
  }

  // ArrowHelper r108 collapses its line when length <= headLength. Keeping a
  // short, translucent arrow near a field null lets the reversal read as a
  // continuous rotation/fade rather than a disappearing, reappearing glyph.
  const headLength = Math.min(3.8, Math.max(1.5, data.displayedLength * 0.42));
  const thickness = Number(ui.vectorThickness.value);
  const headWidth = Math.min(5.0, Math.max(0.45, data.displayedLength * 0.22 * thickness));
  const opacity = 0.12 + 0.76 * Math.min(1, magnitude / 0.11);
  arrow.cone.material.opacity = opacity;
  arrow.setLength(data.displayedLength, headLength, headWidth);
  const shaftLength = Math.max(0.05, data.displayedLength - headLength);
  data.shaft.scale.set(thickness * 1.25, shaftLength, thickness * 1.25);
  data.shaft.position.y = shaftLength / 2;
}

function drawArrow2D(ctx, x, y, vx, vy, color) {
  const magnitude = Math.hypot(vx, vy);
  if (magnitude < 0.035) return;
  const ux = vx / magnitude, uy = vy / magnitude;
  const len = Math.min(15, 4 + magnitude * 14);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.15;
  ctx.beginPath(); ctx.moveTo(x - ux * len * 0.45, y - uy * len * 0.45); ctx.lineTo(x + ux * len * 0.45, y + uy * len * 0.45); ctx.stroke();
  const hx = x + ux * len * 0.45, hy = y + uy * len * 0.45;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - ux * 4 - uy * 2.7, hy - uy * 4 + ux * 2.7); ctx.lineTo(hx - ux * 4 + uy * 2.7, hy - uy * 4 - ux * 2.7); ctx.closePath(); ctx.fill();
}

function drawCrossSection(s, p) {
  const canvas = ui.map, ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, gap = 24, panelW = (W - gap * 4) / 3, panelH = H - 68;
  const z = sliceZ();
  const sliceText = `z/L = ${(Math.abs(z) / wgL).toFixed(2)}`;
  const showAxial = (s.mode.family === 'TE' && ui.showH.checked) || (s.mode.family === 'TM' && ui.showE.checked);
  const circular = isCircular(s);
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fafcfd'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  const aspect = circular ? 1 : Math.min(2.7, Math.max(.65, s.a / s.b));
  const mapW = Math.min(panelW - 42, panelH * aspect), mapH = mapW / aspect;
  const headings = [`Transverse E · ${sliceText}`, `Transverse H · ${sliceText}`, `${s.mode.family === 'TE' ? 'Hᶻ' : 'Eᶻ'} sign · ${sliceText}`];
  for (let panel = 0; panel < 3; panel += 1) {
    const px = gap + panel * (panelW + gap), gx = px + (panelW - mapW) / 2, gy = 38 + (panelH - mapH) / 2;
    ctx.fillStyle = '#405d70'; ctx.font = '600 15px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(headings[panel], px, 23);
    ctx.fillStyle = '#ffffff';
    if (circular) {
      ctx.beginPath(); ctx.arc(gx + mapW / 2, gy + mapH / 2, mapW / 2, 0, Math.PI * 2); ctx.fill();
    } else ctx.fillRect(gx, gy, mapW, mapH);
    const cols = circular ? 17 : 16, rows = circular ? 17 : 10, cw = mapW / cols, ch = mapH / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = -wgW + (col + .5) / cols * wgW * 2;
        const y = -wgH + (row + .5) / rows * wgH * 2;
        if (circular && x * x + y * y > wgW * wgW) continue;
        const f = fieldAt(x, y, z, s, p);
        if (panel === 2 && showAxial) {
          const alpha = Math.min(.68, Math.abs(f.axial) * .42);
          ctx.fillStyle = f.axial >= 0 ? `rgba(215,48,50,${alpha})` : `rgba(23,111,193,${alpha})`;
          ctx.fillRect(gx + col * cw, gy + row * ch, Math.ceil(cw) + 1, Math.ceil(ch) + 1);
        }
      }
    }
    ctx.strokeStyle = '#395b6f'; ctx.lineWidth = 1.45;
    if (circular) { ctx.beginPath(); ctx.arc(gx + mapW / 2, gy + mapH / 2, mapW / 2, 0, Math.PI * 2); ctx.stroke(); } else ctx.strokeRect(gx, gy, mapW, mapH);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = -wgW + (col + .5) / cols * wgW * 2;
        const y = -wgH + (row + .5) / rows * wgH * 2;
        if (circular && x * x + y * y > wgW * wgW) continue;
        const sx = gx + (col + .5) / cols * mapW, sy = gy + (row + .5) / rows * mapH;
        const f = fieldAt(x, y, z, s, p);
        if (panel === 0 && ui.showE.checked) drawArrow2D(ctx, sx, sy, f.e.x, -f.e.y, '#d73032');
        if (panel === 1 && ui.showH.checked) drawArrow2D(ctx, sx, sy, f.h.x, -f.h.y, '#176fc1');
        if (panel === 2 && showAxial && Math.abs(f.axial) > .09 && col % 2 === 0 && row % 2 === 0) {
          ctx.fillStyle = f.axial >= 0 ? '#bd262b' : '#176fc1'; ctx.font = '700 16px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.axial >= 0 ? '•' : '×', sx, sy);
        }
      }
    }
  }
}

function init() {
  container = ui.container;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);
  camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 1, 2000);
  camera.position.set(170, 145, 500);
  scene.add(camera);
  camera.add(new THREE.AmbientLight(0xffffff, 1.0));
  group = new THREE.Group(); group.position.y = 14; scene.add(group);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.innerHTML = ''; container.appendChild(renderer.domElement);
  buildGeometry();
  container.addEventListener('mousedown', onDocumentMouseDown, false);
  container.addEventListener('touchstart', onDocumentTouchStart, false);
  container.addEventListener('touchmove', onDocumentTouchMove, false);
  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); redraw = true;
}

function onDocumentMouseDown(event) {
  event.preventDefault(); mouseXOnMouseDown = event.clientX; mouseYOnMouseDown = event.clientY;
  targetRotationOnMouseDown = targetRotation; targetRotationOnMouseDownY = targetRotationY;
  document.addEventListener('mousemove', onDocumentMouseMove, false); document.addEventListener('mouseup', onDocumentMouseUp, false);
}

function onDocumentMouseMove(event) {
  targetRotation = targetRotationOnMouseDown - (event.clientX - mouseXOnMouseDown) * .01;
  targetRotationY = targetRotationOnMouseDownY - (event.clientY - mouseYOnMouseDown) * .01;
  targetRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation));
  targetRotationY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationY)); redraw = true;
}

function onDocumentMouseUp() { document.removeEventListener('mousemove', onDocumentMouseMove, false); document.removeEventListener('mouseup', onDocumentMouseUp, false); }

function onDocumentTouchStart(event) {
  if (event.touches.length !== 1) return;
  event.preventDefault(); mouseXOnMouseDown = event.touches[0].pageX; mouseYOnMouseDown = event.touches[0].pageY;
  targetRotationOnMouseDown = targetRotation; targetRotationOnMouseDownY = targetRotationY;
}

function onDocumentTouchMove(event) {
  if (event.touches.length !== 1) return;
  event.preventDefault(); targetRotation = targetRotationOnMouseDown + (event.touches[0].pageX - mouseXOnMouseDown) * .01;
  targetRotationY = targetRotationOnMouseDownY + (event.touches[0].pageY - mouseYOnMouseDown) * .01;
  redraw = true;
}

function render() { group.rotation.y = targetRotation; group.rotation.x = targetRotationY; renderer.render(scene, camera); }

function animate(timestamp) {
  requestAnimationFrame(animate);
  const delta = timestamp - previousAnimation; previousAnimation = timestamp;
  if (ui.animatePhase.checked) {
    phase = (phase + delta * .0018) % (Math.PI * 2);
    syncAnimatedPhaseControl();
    redraw = true;
  }
  if (!redraw) return;
  redraw = false;
  const s = state(), p = propagation(s);
  updateReflectionOverlay(s);
  const eScale = Number(ui.eScale.value), hScale = Number(ui.hScale.value);
  for (const sample of fieldArrows) {
    const f = fieldAt(sample.x, sample.y, sample.z, s, p);
    updateArrow(sample.e, f.e, eScale, ui.showE.checked, delta);
    updateArrow(sample.h, f.h, hScale, ui.showH.checked, delta);
  }
  drawCrossSection(s, p);
  render();
}

function updateGeometryAndReadout() { updateReadout(); buildGeometry(); redraw = true; }
function updateReadoutAndDraw() { updateReadout(); redraw = true; }

function bindControlEvents(items, handler) {
  items.forEach((item) => {
    item.addEventListener('input', handler);
    item.addEventListener('change', handler);
  });
}

bindControlEvents([ui.frequency, ui.eScale, ui.hScale, ui.vectorThickness, ui.showE, ui.showH, ui.showReflection, ui.reflectionStep, ui.animatePhase], updateReadoutAndDraw);
bindControlEvents([ui.mode, ui.width, ui.height, ui.radius], updateGeometryAndReadout);
bindControlEvents([ui.geometry], () => { applyGeometryUi(); updateGeometryAndReadout(); });
const setManualPhase = () => {
  phase = Number(ui.phase.value) * Math.PI / 180;
  ui.animatePhase.checked = false;
  updateControlLabels();
  redraw = true;
};
const setSlicePosition = () => {
  updateReadout();
  updateSliceMarker();
  redraw = true;
};
bindControlEvents([ui.phase], setManualPhase);
bindControlEvents([ui.slice], setSlicePosition);
ui.reset.addEventListener('click', () => { targetRotation = -0.6; targetRotationY = 0.55; redraw = true; });

applyGeometryUi();
updateReadout();
init();
animate(previousAnimation);
