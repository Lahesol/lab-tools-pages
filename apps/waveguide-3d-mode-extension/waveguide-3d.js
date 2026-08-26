/*
 * 3D extension of the PA3FWM waveguide.html interaction model.
 * The original uses two diagonal waves for TE_m0. This file keeps its scene,
 * transparent guide and direct drag rotation while evaluating the full
 * rectangular-waveguide TE/TM eigenmode field components.
 */
import * as THREE from './three.module.js';

const C0 = 299792458;
const modes = {
  TE10: { family: 'TE', m: 1, n: 0, title: 'TE₁₀', description: 'Dominant mode for the usual a > b guide. It varies once across the broad wall and not across height.' },
  TE20: { family: 'TE', m: 2, n: 0, title: 'TE₂₀', description: 'Two-lobe TE mode across the broad-wall direction. Its axial magnetic field changes sign across the centre plane.' },
  TE30: { family: 'TE', m: 3, n: 0, title: 'TE₃₀', description: 'Three-lobe TE mode across the broad-wall direction.' },
  TE01: { family: 'TE', m: 0, n: 1, title: 'TE₀₁', description: 'TE mode with one variation across the narrow-wall dimension.' },
  TE11: { family: 'TE', m: 1, n: 1, title: 'TE₁₁', description: 'One transverse variation across both dimensions. Hᶻ has four alternating-sign lobes.' },
  TE21: { family: 'TE', m: 2, n: 1, title: 'TE₂₁', description: 'Two variations across width and one across height, yielding six Hᶻ lobes.' },
  TM11: { family: 'TM', m: 1, n: 1, title: 'TM₁₁', description: 'Lowest TM mode. Eᶻ is nonzero inside the guide but zero at every conducting wall.' },
  TM21: { family: 'TM', m: 2, n: 1, title: 'TM₂₁', description: 'TM mode with two opposite-sign Eᶻ lobes across the broad-wall direction.' }
};

const ui = {
  mode: document.querySelector('#mode'), frequency: document.querySelector('#frequency'), width: document.querySelector('#width'), height: document.querySelector('#height'),
  frequencyLabel: document.querySelector('#frequencyLabel'), widthLabel: document.querySelector('#widthLabel'), heightLabel: document.querySelector('#heightLabel'),
  eScale: document.querySelector('#efieldscale'), hScale: document.querySelector('#hfieldscale'), showE: document.querySelector('#showE'), showH: document.querySelector('#showH'), showReflection: document.querySelector('#showReflection'), reflectionStep: document.querySelector('#reflectionStep'), freeze: document.querySelector('#freeze'), reset: document.querySelector('#resetView'),
  status: document.querySelector('#status'), description: document.querySelector('#modeDescription'), equations: document.querySelector('#equations'), cutoff: document.querySelector('#cutoff'), ratio: document.querySelector('#ratio'), lambdaG: document.querySelector('#lambdaG'), axial: document.querySelector('#axial'),
  container: document.querySelector('#webgldiv'), map: document.querySelector('[id="2ddiv"]'), reflectionSummary: document.querySelector('#reflectionSummary'), reflectionCanvas: document.querySelector('#reflectionCanvas')
};

let camera, scene, renderer, group, guideGroup, arrowGroup, reflectionGroup, container;
let fieldArrows = [];
let reflectionPaths = [];
let targetRotation = -0.6, targetRotationY = 0.55;
let targetRotationOnMouseDown = targetRotation, targetRotationOnMouseDownY = targetRotationY;
let mouseXOnMouseDown = 0, mouseYOnMouseDown = 0;
let phase = 0, previousAnimation = performance.now(), redraw = true;
let wgW = 80, wgH = 36, wgL = 560;
const arrowAxis = new THREE.Vector3(0, 1, 0);

function state() {
  return {
    mode: modes[ui.mode.value],
    a: Number(ui.width.value) * 1e-3,
    b: Number(ui.height.value) * 1e-3,
    frequency: Number(ui.frequency.value) * 1e9
  };
}

function cutoffFrequency(s) {
  return C0 / 2 * Math.hypot(s.mode.m / s.a, s.mode.n / s.b);
}

function propagation(s) {
  const fc = cutoffFrequency(s);
  const ratio = s.frequency / fc;
  return { fc, ratio, propagating: ratio > 1, betaVisual: ratio > 1 ? Math.sqrt(ratio * ratio - 1) * 0.72 : 0.16 };
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
  const model = reflectionModel(s);
  ui.frequencyLabel.value = `${Number(ui.frequency.value).toFixed(2)} GHz`;
  ui.widthLabel.value = `${Number(ui.width.value).toFixed(2)} mm`;
  ui.heightLabel.value = `${Number(ui.height.value).toFixed(2)} mm`;
  ui.description.textContent = s.mode.description;
  ui.status.textContent = p.propagating ? 'Propagating' : 'Below cutoff';
  ui.status.classList.toggle('below', !p.propagating);
  ui.cutoff.textContent = `${(p.fc / 1e9).toFixed(3)} GHz`;
  ui.ratio.textContent = p.ratio.toFixed(3);
  ui.lambdaG.textContent = p.propagating ? `${(C0 / s.frequency / Math.sqrt(1 - 1 / (p.ratio * p.ratio)) * 1e3).toFixed(2)} mm` : 'Evanescent';
  ui.axial.textContent = s.mode.family === 'TE' ? 'Hᶻ (magnetic)' : 'Eᶻ (electric)';
  ui.equations.innerHTML = s.mode.family === 'TE'
    ? `<b>TE mode:</b> <i>E</i><sub>z</sub> = 0<br><i>H</i><sub>z</sub> ∝ cos(${s.mode.m}π<i>x</i>/<i>a</i>) cos(${s.mode.n}π<i>y</i>/<i>b</i>)`
    : `<b>TM mode:</b> <i>H</i><sub>z</sub> = 0<br><i>E</i><sub>z</sub> ∝ sin(${s.mode.m}π<i>x</i>/<i>a</i>) sin(${s.mode.n}π<i>y</i>/<i>b</i>)`;
  ui.reflectionSummary.textContent = model.summary;
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
  arrow.userData = {
    direction: arrowAxis.clone(),
    targetQuaternion: new THREE.Quaternion(),
    displayedLength: 4.6,
    initialised: false
  };
  return arrow;
}

function buildGeometry() {
  const s = state();
  wgH = Math.max(19, Math.min(72, wgW * s.b / s.a));
  wgL = wgW * 7;
  if (guideGroup) group.remove(guideGroup);
  if (arrowGroup) group.remove(arrowGroup);
  if (reflectionGroup) group.remove(reflectionGroup);
  guideGroup = new THREE.Group();
  arrowGroup = new THREE.Group();
  reflectionGroup = new THREE.Group();
  group.add(guideGroup);
  group.add(arrowGroup);
  group.add(reflectionGroup);

  const box = new THREE.BoxGeometry(wgW * 2, wgH * 2, wgL);
  const guide = new THREE.Mesh(box, new THREE.MeshPhongMaterial({ color: 0x587287, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  guide.position.z = -wgL / 2;
  guideGroup.add(guide);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0x1f3444 }));
  edges.position.z = -wgL / 2;
  guideGroup.add(edges);

  const axisMaterial = new THREE.LineBasicMaterial({ color: 0x6b8799, transparent: true, opacity: 0.7 });
  const axisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-wgW - 18, -wgH - 14, 2), new THREE.Vector3(-wgW - 18, -wgH - 14, -wgL - 18)]);
  guideGroup.add(new THREE.Line(axisGeometry, axisMaterial));

  fieldArrows = [];
  // Resolve the propagation direction more finely than the cross-section.
  // Each sample owns one E and one H ArrowHelper, so retain a deliberately
  // modest transverse grid while using 22 longitudinal samples.
  const xCount = 5, yCount = 3, zCount = 22;
  for (let iz = 0; iz < zCount; iz += 1) {
    for (let iy = 0; iy < yCount; iy += 1) {
      for (let ix = 0; ix < xCount; ix += 1) {
        const x = -wgW + (ix + 0.5) / xCount * wgW * 2;
        const y = -wgH + (iy + 0.5) / yCount * wgH * 2;
        const z = -(iz + 0.35) / zCount * wgL;
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

function triangleFold(value) {
  const wrapped = value - Math.floor(value);
  return 1 - 4 * Math.abs(wrapped - 0.5);
}

function makeReflectionLine(points, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false });
  return new THREE.Line(geometry, material);
}

function buildReflectionOverlay(s) {
  const model = reflectionModel(s);
  const signs = model.componentCount === 2 ? [[-1, 0], [1, 0]] : [[-1, -1], [-1, 1], [1, -1], [1, 1]];
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
  updateReflectionOverlay(s);
}

function updateReflectionOverlay(s) {
  if (!reflectionGroup || !arrowGroup) return;
  const visible = ui.showReflection.checked;
  const step = ui.reflectionStep.value;
  reflectionGroup.visible = visible;
  arrowGroup.visible = !visible || step === 'sum';
  for (const path of reflectionPaths) {
    path.incident.visible = visible && step === 'components';
    path.reflected.visible = visible && step !== 'components';
    path.reflected.material.opacity = step === 'sum' ? 0.26 : 0.88;
  }
  if (visible && step === 'boundaries') {
    ui.status.textContent = `${reflectionModel(s).componentCount}-wave wall reflection`;
  }
}

function fieldAt(x, y, z, s, p) {
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
  const headWidth = Math.min(2.1, Math.max(0.9, data.displayedLength * 0.22));
  const opacity = 0.12 + 0.76 * Math.min(1, magnitude / 0.11);
  arrow.line.material.opacity = opacity;
  arrow.cone.material.opacity = opacity;
  arrow.setLength(data.displayedLength, headLength, headWidth);
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
  const showAxial = (s.mode.family === 'TE' && ui.showH.checked) || (s.mode.family === 'TM' && ui.showE.checked);
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fafcfd'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  const aspect = Math.min(2.7, Math.max(.65, s.a / s.b));
  const mapW = Math.min(panelW - 42, panelH * aspect), mapH = mapW / aspect;
  const headings = ['Transverse E', 'Transverse H', `${s.mode.family === 'TE' ? 'Hᶻ' : 'Eᶻ'} sign`];
  for (let panel = 0; panel < 3; panel += 1) {
    const px = gap + panel * (panelW + gap), gx = px + (panelW - mapW) / 2, gy = 38 + (panelH - mapH) / 2;
    ctx.fillStyle = '#405d70'; ctx.font = '600 15px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(headings[panel], px, 23);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(gx, gy, mapW, mapH);
    const cols = 16, rows = 10, cw = mapW / cols, ch = mapH / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = -wgW + (col + .5) / cols * wgW * 2;
        const y = -wgH + (row + .5) / rows * wgH * 2;
        const f = fieldAt(x, y, 0, s, p);
        if (panel === 2 && showAxial) {
          const alpha = Math.min(.68, Math.abs(f.axial) * .42);
          ctx.fillStyle = f.axial >= 0 ? `rgba(215,48,50,${alpha})` : `rgba(23,111,193,${alpha})`;
          ctx.fillRect(gx + col * cw, gy + row * ch, Math.ceil(cw) + 1, Math.ceil(ch) + 1);
        }
      }
    }
    ctx.strokeStyle = '#395b6f'; ctx.lineWidth = 1.45; ctx.strokeRect(gx, gy, mapW, mapH);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = -wgW + (col + .5) / cols * wgW * 2;
        const y = -wgH + (row + .5) / rows * wgH * 2;
        const sx = gx + (col + .5) / cols * mapW, sy = gy + (row + .5) / rows * mapH;
        const f = fieldAt(x, y, 0, s, p);
        if (panel === 0 && ui.showE.checked) drawArrow2D(ctx, sx, sy, f.e.x, -f.e.y, '#d73032');
        if (panel === 1 && ui.showH.checked) drawArrow2D(ctx, sx, sy, f.h.x, -f.h.y, '#176fc1');
        if (panel === 2 && showAxial && Math.abs(f.axial) > .09 && col % 2 === 0 && row % 2 === 0) {
          ctx.fillStyle = f.axial >= 0 ? '#bd262b' : '#176fc1'; ctx.font = '700 16px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.axial >= 0 ? '•' : '×', sx, sy);
        }
      }
    }
  }
}

function drawCanvasSegment(ctx, x1, y1, x2, y2, color, width = 2) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
  if (length < 1) return;
  const ux = dx / length, uy = dy / length;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ux * 8 - uy * 4, y2 - uy * 8 + ux * 4); ctx.lineTo(x2 - ux * 8 + uy * 4, y2 - uy * 8 - ux * 4); ctx.closePath(); ctx.fill();
}

function drawReflectionLesson(s) {
  const canvas = ui.reflectionCanvas, ctx = canvas.getContext('2d');
  const model = reflectionModel(s);
  const W = canvas.width, H = canvas.height, gap = 18, panelW = (W - gap * 4) / 3;
  const activePanel = { components: 0, boundaries: 1, sum: 2 }[ui.reflectionStep.value];
  const labels = ['1  Diagonal components', '2  PEC-wall reflection', '3  Sum = guided mode'];
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  for (let panel = 0; panel < 3; panel += 1) {
    const px = gap + panel * (panelW + gap), py = 18, pw = panelW, ph = H - 36;
    const active = ui.showReflection.checked && panel === activePanel;
    ctx.fillStyle = active ? '#edf8fb' : '#f8fbfc'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = active ? '#1680a2' : '#c7d7df'; ctx.lineWidth = active ? 2 : 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = active ? '#075d79' : '#466276'; ctx.font = '700 14px Segoe UI, Arial, sans-serif'; ctx.fillText(labels[panel], px + 14, py + 23);

    const gx = px + 28, gy = py + 54, gw = pw - 56, gh = ph - 92;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = '#365a70'; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
    ctx.fillStyle = '#5d7584'; ctx.font = '12px Segoe UI, Arial, sans-serif'; ctx.fillText('−z →', gx + gw - 32, gy + gh + 22);

    if (panel === 0) {
      const rays = model.componentCount === 2 ? [-1, 1] : [-1, -0.35, 0.35, 1];
      rays.forEach((offset, index) => {
        const startY = gy + gh / 2 + offset * gh * 0.12;
        const endY = gy + gh / 2 + offset * gh * 0.42;
        drawCanvasSegment(ctx, gx + 16, startY, gx + gw - 18, endY, index % 2 ? '#f2a13c' : '#d27721', 2);
      });
      ctx.fillStyle = '#6a808e'; ctx.font = '12px Segoe UI, Arial, sans-serif';
      ctx.fillText(`${model.componentCount} components: ${model.componentCount === 2 ? '±k' + model.transverseAxis : '±kx, ±ky'}`, gx + 7, gy + gh - 8);
    }

    if (panel === 1) {
      ctx.strokeStyle = '#172f42'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
      const rayCount = model.componentCount === 2 ? 2 : 4;
      for (let ray = 0; ray < rayCount; ray += 1) {
        ctx.strokeStyle = ray % 2 ? '#16749a' : '#f2a13c'; ctx.lineWidth = 2; ctx.beginPath();
        for (let point = 0; point <= 12; point += 1) {
          const t = point / 12;
          const localY = gy + gh / 2 + (ray % 2 ? -1 : 1) * gh * .43 * triangleFold((model.componentCount === 2 ? 1 : 1.6) * t + (ray > 1 ? .5 : 0));
          const localX = gx + 8 + t * (gw - 16);
          if (point === 0) ctx.moveTo(localX, localY); else ctx.lineTo(localX, localY);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#b7353f'; ctx.font = '700 12px Segoe UI, Arial, sans-serif'; ctx.fillText(s.mode.family === 'TM' ? 'Eᶻ = 0 at PEC wall' : 'Eₜ = 0 at PEC wall', gx + 8, gy + 18);
    }

    if (panel === 2) {
      const bands = 34;
      for (let band = 0; band < bands; band += 1) {
        const value = Math.sin((band / (bands - 1)) * Math.PI * Math.max(1, s.mode.m));
        ctx.fillStyle = value >= 0 ? `rgba(215,48,50,${.13 + Math.abs(value) * .48})` : `rgba(23,111,193,${.13 + Math.abs(value) * .48})`;
        ctx.fillRect(gx + band / bands * gw, gy + 10, gw / bands + 1, gh - 20);
      }
      ctx.strokeStyle = '#365a70'; ctx.lineWidth = 1; ctx.strokeRect(gx, gy + 10, gw, gh - 20);
      drawCanvasSegment(ctx, gx + 28, gy + gh / 2, gx + gw - 24, gy + gh / 2, '#168445', 3);
      ctx.fillStyle = '#168445'; ctx.font = '700 12px Segoe UI, Arial, sans-serif'; ctx.fillText('⟨Sᶻ⟩: forward power', gx + 8, gy + gh - 8);
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
  if (!ui.freeze.checked) { phase = (phase + delta * .0018) % (Math.PI * 2); redraw = true; }
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
  drawReflectionLesson(s);
  render();
}

function updateGeometryAndReadout() { updateReadout(); buildGeometry(); redraw = true; }
function updateReadoutAndDraw() { updateReadout(); redraw = true; }

[ui.frequency, ui.eScale, ui.hScale, ui.showE, ui.showH, ui.showReflection, ui.reflectionStep, ui.freeze].forEach((item) => item.addEventListener('input', updateReadoutAndDraw));
[ui.mode, ui.width, ui.height].forEach((item) => item.addEventListener('input', updateGeometryAndReadout));
ui.reset.addEventListener('click', () => { targetRotation = -0.6; targetRotationY = 0.55; redraw = true; });

updateReadout();
init();
animate(previousAnimation);
