import * as THREE from 'three';
import {
  createAntiqueBronzeTextures,
  createBrocadeReliefTextures,
} from './ProceduralTextures';

/**
 * Generates a soft radial glow sprite texture for the 4 sanctuary pedestal lamps.
 */
function createWarmGlowSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 245, 210, 0.95)');
  grad.addColorStop(0.28, 'rgba(255, 206, 110, 0.55)');
  grad.addColorStop(0.65, 'rgba(240, 160, 50, 0.16)');
  grad.addColorStop(1, 'rgba(240, 160, 50, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a twist-free smooth tapered limb/drapery BufferGeometry along a 3D spline curve
 * using a stable up/reference vector so left & right sides are 100% mirror-symmetric.
 */
function buildTaperedCurveGeometry(
  curve: THREE.CatmullRomCurve3,
  radiusAt: (t: number, angle: number) => number,
  tubularSegments = 32,
  radialSegments = 20,
  closeCaps = true,
  refAxis: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const fallbackAxis = new THREE.Vector3(1, 0, 0);

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const center = curve.getPointAt(t);
    tangent.copy(curve.getTangentAt(t)).normalize();

    // Parallel-free stable frame anchored to refAxis so L/R limbs never twist differently
    const dot = Math.abs(tangent.dot(refAxis));
    const guide = dot > 0.94 ? fallbackAxis : refAxis;
    normal.crossVectors(guide, tangent).normalize();
    binormal.crossVectors(tangent, normal).normalize();

    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const theta = u * Math.PI * 2;
      const r = radiusAt(t, theta);
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);

      const vx = center.x + r * (cos * normal.x + sin * binormal.x);
      const vy = center.y + r * (cos * normal.y + sin * binormal.y);
      const vz = center.z + r * (cos * normal.z + sin * binormal.z);
      positions.push(vx, vy, vz);
      uvs.push(u, t * 2);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  if (closeCaps) {
    const pStart = curve.getPointAt(0);
    const startCenterIdx = positions.length / 3;
    positions.push(pStart.x, pStart.y, pStart.z);
    uvs.push(0.5, 0);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(startCenterIdx, j + 1, j);
    }

    const pEnd = curve.getPointAt(1);
    const endCenterIdx = positions.length / 3;
    positions.push(pEnd.x, pEnd.y, pEnd.z);
    uvs.push(0.5, 1);
    const lastRow = tubularSegments * stride;
    for (let j = 0; j < radialSegments; j++) {
      indices.push(endCenterIdx, lastRow + j, lastRow + j + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a single carved bronze lotus petal with double-lobed heart outline & relief curve.
 */
function buildSculptedLotusPetalGroup(
  giltMat: THREE.Material,
  darkMat: THREE.Material,
  brocadeMat: THREE.Material,
  width: number,
  height: number,
  archOutward: number
): THREE.Group {
  const group = new THREE.Group();

  // Outer carved lotus petal silhouette
  const shape = new THREE.Shape();
  shape.moveTo(0, -height * 0.45);
  shape.bezierCurveTo(width * 0.56, -height * 0.42, width * 0.62, height * 0.15, width * 0.28, height * 0.44);
  shape.quadraticCurveTo(width * 0.10, height * 0.52, 0, height * 0.42);
  shape.quadraticCurveTo(-width * 0.10, height * 0.52, -width * 0.28, height * 0.44);
  shape.bezierCurveTo(-width * 0.62, height * 0.15, -width * 0.56, -height * 0.42, 0, -height * 0.45);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.045,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geo.center();

  // Curve petal vertices gently outward like real cast bronze lotus petals
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const normX = px / Math.max(0.01, width * 0.55);
    const normY = py / Math.max(0.01, height * 0.5);
    const domeZ = (1 - normX * normX * 0.65) * archOutward * (0.35 + 0.65 * Math.max(0, 1 - normY * normY * 0.4));
    pos.setZ(i, pz + domeZ);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const body = new THREE.Mesh(geo, giltMat);
  body.castShadow = true;
  group.add(body);

  // Inner embossed double-arch relief ridge (matching the lotus carving in reference image)
  const rimCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-width * 0.34, -height * 0.26, 0.09),
    new THREE.Vector3(-width * 0.36, height * 0.12, 0.14 + archOutward * 0.65),
    new THREE.Vector3(-width * 0.16, height * 0.30, 0.14 + archOutward * 0.72),
    new THREE.Vector3(0, height * 0.18, 0.15 + archOutward * 0.78),
    new THREE.Vector3(width * 0.16, height * 0.30, 0.14 + archOutward * 0.72),
    new THREE.Vector3(width * 0.36, height * 0.12, 0.14 + archOutward * 0.65),
    new THREE.Vector3(width * 0.34, -height * 0.26, 0.09),
  ]);
  const rimGeo = new THREE.TubeGeometry(rimCurve, 22, 0.032, 6, false);
  const rim = new THREE.Mesh(rimGeo, brocadeMat);
  group.add(rim);

  // Inner dark patina scroll heart medallion
  const centerNode = new THREE.Mesh(new THREE.SphereGeometry(width * 0.14, 10, 10), darkMat);
  centerNode.scale.set(1.0, 1.25, 0.45);
  centerNode.position.set(0, -height * 0.02, 0.12 + archOutward * 0.72);
  group.add(centerNode);

  return group;
}

/**
 * Builds an anatomical Buddha torso with smooth continuous trapezius-to-shoulder slope,
 * balanced pectoral relief, clavicle hollow, and relaxed waist.
 */
function buildSculptedTorsoGeometry(): THREE.BufferGeometry {
  const radialSegs = 56;
  const heightSegs = 44;
  const geo = new THREE.CylinderGeometry(1, 1, 2.26, radialSegs, heightSegs, false);
  geo.translate(0, 1.13, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const rLen = Math.hypot(px, pz);
    if (rLen < 0.0001) continue;

    const nx = px / rLen;
    const nz = pz / rLen;
    const t = THREE.MathUtils.clamp(py / 2.26, 0, 1);

    // Smooth Hermite silhouette profile from waist -> broad chest -> graceful sloping trapezius -> neck base
    let radX = 1.02;
    let radZ = 0.72;
    if (t < 0.24) {
      const u = t / 0.24;
      const s = u * u * (3 - 2 * u);
      radX = THREE.MathUtils.lerp(1.04, 0.97, s);
      radZ = THREE.MathUtils.lerp(0.74, 0.69, s);
    } else if (t < 0.70) {
      const u = (t - 0.24) / 0.46;
      const s = u * u * (3 - 2 * u);
      radX = THREE.MathUtils.lerp(0.97, 1.18, s);
      radZ = THREE.MathUtils.lerp(0.69, 0.77, s);
    } else if (t < 0.88) {
      // Smooth continuous shoulder-to-trapezius bridge matching both shoulder curves
      const u = (t - 0.70) / 0.18;
      const s = u * u * (3 - 2 * u);
      radX = THREE.MathUtils.lerp(1.18, 0.84, s);
      radZ = THREE.MathUtils.lerp(0.77, 0.57, s);
    } else {
      const u = (t - 0.88) / 0.12;
      const s = u * u * (3 - 2 * u);
      radX = THREE.MathUtils.lerp(0.84, 0.44, s);
      radZ = THREE.MathUtils.lerp(0.57, 0.43, s);
    }

    // Anatomical front chest, clavicle, and soft abdomen
    if (nz > 0) {
      const pecBand = Math.exp(-Math.pow((t - 0.64) / 0.13, 2));
      const sternumDip = Math.exp(-Math.pow(nx / 0.16, 2));
      const pecCurve = Math.exp(-Math.pow((Math.abs(nx) - 0.44) / 0.30, 2));
      radZ += pecBand * pecCurve * 0.08;
      radZ -= pecBand * sternumDip * 0.038;

      // Subtle suprasternal hollow just below neck
      const collarHollow = Math.exp(-Math.pow((t - 0.88) / 0.06, 2)) * Math.exp(-Math.pow(nx / 0.22, 2));
      radZ -= collarHollow * 0.035;

      const bellyBand = Math.exp(-Math.pow((t - 0.18) / 0.17, 2));
      radZ += bellyBand * nz * 0.05;
    }

    if (nz < -0.3) {
      const spineDip = Math.exp(-Math.pow(nx / 0.22, 2));
      radZ -= spineDip * 0.04;
    }

    pos.setXYZ(i, nx * radX * rLen, py, nz * radZ * rLen);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const _gauss = (dx: number, dy: number, dz: number, sx: number, sy: number, sz: number) =>
  Math.exp(-(dx * dx) / (sx * sx) - (dy * dy) / (sy * sy) - (dz * dz) / (sz * sz));

/**
 * Analytical vertex sculptor for the Buddha head (상호).
 * Shared by both the head mesh and surface-locked facial accents so every eyelid,
 * nostril, and smiling lip line sits flush on the exact bronze surface.
 */
function sculptHeadPoint(ux: number, uy: number, uz: number, target = new THREE.Vector3()): THREE.Vector3 {
  const R = 0.76;
  let x = ux * R * 0.895;
  let y = uy * R * 1.06;
  let z = uz * R * 0.92;

  if (z > 0.12) {
    // 1. Classic refined oval jaw & warm cheeks tapering gently to rounded chin
    if (y < 0.04) {
      const cheekPush = _gauss(Math.abs(x) - 0.285, y + 0.145, z - 0.48, 0.19, 0.22, 0.30);
      z += cheekPush * 0.052;
      x += Math.sign(x) * cheekPush * 0.016;
    }

    // 2. Sculpted eye orbitals (clean anatomical hollow so eyelids sit inside a calm brow frame)
    const eyeSocketL = _gauss(x + 0.195, y - 0.048, z - 0.62, 0.135, 0.088, 0.22);
    const eyeSocketR = _gauss(x - 0.195, y - 0.048, z - 0.62, 0.135, 0.088, 0.22);
    z -= (eyeSocketL + eyeSocketR) * 0.048;

    // 3. Crisp arched eyebrows curving seamlessly into the upper nasal bridge
    const ax = Math.abs(x);
    if (ax < 0.38) {
      const archT = THREE.MathUtils.clamp((ax - 0.055) / 0.295, 0, 1);
      const archY = 0.132 + Math.sin(archT * Math.PI) * 0.068;
      const browDist = Math.abs(y - archY);
      const browRidge =
        Math.exp(-(browDist * browDist) / (0.022 * 0.022)) *
        Math.exp(-Math.pow((ax - 0.205) / 0.165, 4)) *
        Math.exp(-Math.pow((z - 0.64) / 0.18, 2));
      z += browRidge * 0.036;
    }

    // 4. Sculpted Half-Closed Serene Almond Eyelids (반개안) + Lower Lid Margin
    if (ax > 0.072 && ax < 0.325) {
      const eyeU = (ax - 0.195) / 0.112; // -1 inner corner .. +1 outer corner
      const eyeMask = Math.exp(-Math.pow(eyeU, 4));
      const lidCenterY = 0.050 + eyeU * 0.008;
      // Convex dome of calm downward-looking upper eyelid
      const upperDome =
        _gauss(0, y - (lidCenterY + 0.018), z - 0.63, 1, 0.028, 0.20) * eyeMask;
      // Crisp almond lash slit groove just beneath the upper lid
      const lashLineY = lidCenterY - 0.014 * (1 - eyeU * eyeU * 0.85);
      const lashSlit =
        _gauss(0, y - lashLineY, z - 0.63, 1, 0.009, 0.20) * eyeMask;
      // Soft lower lid bolster beneath lash line
      const lowerLid =
        _gauss(0, y - (lashLineY - 0.022), z - 0.63, 1, 0.016, 0.20) * eyeMask;
      z += upperDome * 0.034 - lashSlit * 0.024 + lowerLid * 0.015;
    }

    // 5. Noble Straight Nose Bridge (sharp beveled ridge + tip + distinct alar nostril wings)
    if (y < 0.175 && y > -0.175) {
      const bridgeYNorm = THREE.MathUtils.clamp((0.145 - y) / 0.255, 0, 1);
      // Smooth beveled nose bridge rising from brow root to straight tip
      const bridgeProjection =
        Math.pow(Math.max(0, Math.sin(bridgeYNorm * Math.PI * 0.56)), 0.72) *
        Math.exp(-Math.pow(Math.abs(x) / THREE.MathUtils.lerp(0.036, 0.048, bridgeYNorm), 2.2)) *
        _gauss(0, Math.max(0, -0.10 - y), z - 0.68, 1, 0.032, 0.22) *
        _gauss(0, Math.max(0, y - 0.135), 0, 1, 0.035, 1);
      z += bridgeProjection * 0.115;

      // Sculpted rounded nose tip
      const noseTip = _gauss(x, y + 0.102, z - 0.70, 0.046, 0.042, 0.18);
      z += noseTip * 0.055;

      // Distinct flared alar wings (콧방울) & crisp alar crease
      const nostrilWingL = _gauss(x + 0.058, y + 0.112, z - 0.68, 0.030, 0.028, 0.16);
      const nostrilWingR = _gauss(x - 0.058, y + 0.112, z - 0.68, 0.030, 0.028, 0.16);
      const nostrilPitL = _gauss(x + 0.036, y + 0.134, z - 0.68, 0.019, 0.014, 0.15);
      const nostrilPitR = _gauss(x - 0.036, y + 0.134, z - 0.68, 0.019, 0.014, 0.15);
      z += (nostrilWingL + nostrilWingR) * 0.034 - (nostrilPitL + nostrilPitR) * 0.022;
    }

    // 6. Crisp Philtrum & Compassionate Cupid's-Bow Smiling Lips
    const philtrumDip = _gauss(x, y + 0.172, z - 0.67, 0.018, 0.036, 0.16);
    const philtrumColL = _gauss(x + 0.022, y + 0.172, z - 0.67, 0.011, 0.036, 0.16);
    const philtrumColR = _gauss(x - 0.022, y + 0.172, z - 0.67, 0.011, 0.036, 0.16);
    z += (philtrumColL + philtrumColR) * 0.011 - philtrumDip * 0.015;

    if (ax < 0.155 && y < -0.17 && y > -0.345) {
      const mU = x / 0.125; // -1 .. +1 across mouth corners
      const mouthMask = Math.exp(-Math.pow(mU, 4));
      // Cupid's bow peaks at mU = +-0.26, subtle center dip, corners gently raised in serene smile
      const bowCurve = Math.exp(-Math.pow((Math.abs(mU) - 0.28) / 0.25, 2)) * 0.012;
      const smileLift = Math.pow(mU, 2) * 0.016;
      const upperLipY = -0.224 + bowCurve - smileLift * 0.35;
      const partY = -0.246 + smileLift;
      const lowerLipY = -0.273 + smileLift * 0.25;

      const upperLip = _gauss(0, y - upperLipY, z - 0.66, 1, 0.019, 0.18) * mouthMask;
      const lipPart = _gauss(0, y - partY, z - 0.66, 1, 0.009, 0.18) * Math.exp(-Math.pow(mU * 0.95, 4));
      const lowerLip =
        _gauss(x, y - lowerLipY, z - 0.66, 0.088, 0.022, 0.18);
      const cornerDimpleL = _gauss(x + 0.128, y + 0.232, z - 0.64, 0.022, 0.020, 0.16);
      const cornerDimpleR = _gauss(x - 0.128, y + 0.232, z - 0.64, 0.022, 0.020, 0.16);

      z += upperLip * 0.044 - lipPart * 0.034 + lowerLip * 0.048 - (cornerDimpleL + cornerDimpleR) * 0.018;
    }

    // 7. Mentolabial chin groove & gentle noble rounded chin
    const chinHollow = _gauss(x, y + 0.322, z - 0.64, 0.095, 0.024, 0.16);
    const chin = _gauss(x, y + 0.405, z - 0.58, 0.125, 0.095, 0.20);
    z += chin * 0.052 - chinHollow * 0.022;
    y -= chin * 0.022;
  }

  return target.set(x, y, z);
}

/**
 * Projects a facial curve cleanly onto the exact sculpted surface of the head mesh
 * so accent lash lines and smile creases never sink inside or float off the bronze skin.
 */
function buildSurfaceProjectedCurve(pointsXY: Array<[number, number]>, surfaceOffset = 0.0025): THREE.CatmullRomCurve3 {
  const projected: THREE.Vector3[] = pointsXY.map(([px, py]) => {
    const ux = px / (0.76 * 0.895);
    const uy = py / (0.76 * 1.06);
    const uz = Math.sqrt(Math.max(0.01, 1 - ux * ux - uy * uy));
    const p = sculptHeadPoint(ux, uy, uz);
    p.z += surfaceOffset;
    return p;
  });
  return new THREE.CatmullRomCurve3(projected);
}

/**
 * Builds a high-resolution vertex-sculpted serene Buddha head (상호) with vertex density
 * concentrated smoothly across the face (144x120) for razor-crisp eyes, nose, and lips.
 */
function buildSculptedHeadGeometry(): THREE.BufferGeometry {
  const uSegs = 144;
  const vSegs = 120;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const tmp = new THREE.Vector3();

  for (let iy = 0; iy <= vSegs; iy++) {
    const v = iy / vSegs;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      // Centered so u = 0.5 is front (+Z, theta = 0) and concentrates vertices on front face
      const rawTheta = (u - 0.5) * Math.PI * 2;
      const theta = rawTheta - 0.36 * Math.sin(rawTheta);

      const ux = sinPhi * Math.sin(theta);
      const uy = cosPhi;
      const uz = sinPhi * Math.cos(theta);

      sculptHeadPoint(ux, uy, uz, tmp);
      positions.push(tmp.x, tmp.y, tmp.z);
      uvs.push(u, 1 - v);
    }
  }

  const stride = uSegs + 1;
  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * stride + ix;
      const b = (iy + 1) * stride + ix;
      const c = (iy + 1) * stride + (ix + 1);
      const d = iy * stride + (ix + 1);
      if (iy > 0) indices.push(a, b, d);
      if (iy < vSegs - 1) indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a realistic sculpted hand with arched palm, curved thumb, and 4 multi-jointed fingers.
 */
function buildSculptedHandGroup(
  mat: THREE.Material,
  mode: 'bhumisparsha' | 'dhyana'
): THREE.Group {
  const hand = new THREE.Group();

  if (mode === 'bhumisparsha') {
    // Arched palm draped smoothly over right knee, fingers hanging downward
    const palmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.16, -0.06),
      new THREE.Vector3(0, 0.04, 0.02),
      new THREE.Vector3(0, -0.10, 0.04),
    ]);
    const palmGeo = buildTaperedCurveGeometry(
      palmCurve,
      (t, angle) => {
        const widthFactor = THREE.MathUtils.lerp(0.11, 0.15, t);
        const thickFactor = 0.065;
        return Math.hypot(Math.cos(angle) * thickFactor, Math.sin(angle) * widthFactor);
      },
      10,
      14,
      true
    );
    const palm = new THREE.Mesh(palmGeo, mat);
    palm.castShadow = true;
    hand.add(palm);

    // 4 anatomically proportioned, gently curving downward fingers
    const fingerSpecs = [
      { x: -0.105, len: 0.22, r: 0.027 }, // Pinky
      { x: -0.035, len: 0.265, r: 0.030 }, // Ring
      { x: 0.038, len: 0.285, r: 0.031 },  // Middle
      { x: 0.108, len: 0.255, r: 0.030 },  // Index
    ];
    fingerSpecs.forEach(({ x, len, r }) => {
      const fCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, -0.08, 0.04),
        new THREE.Vector3(x * 1.02, -0.08 - len * 0.45, 0.052),
        new THREE.Vector3(x * 1.01, -0.08 - len * 0.82, 0.035),
        new THREE.Vector3(x, -0.08 - len, 0.008),
      ]);
      const fGeo = buildTaperedCurveGeometry(
        fCurve,
        (t) => THREE.MathUtils.lerp(r, r * 0.68, t),
        10,
        10,
        true
      );
      hand.add(new THREE.Mesh(fGeo, mat));
    });

    // Natural relaxed thumb on inner side (+X toward body center)
    const thumbCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.12, 0.04, 0.01),
      new THREE.Vector3(0.165, -0.05, 0.02),
      new THREE.Vector3(0.168, -0.16, 0.01),
    ]);
    const thumbGeo = buildTaperedCurveGeometry(
      thumbCurve,
      (t) => THREE.MathUtils.lerp(0.034, 0.024, t),
      8,
      10,
      true
    );
    hand.add(new THREE.Mesh(thumbGeo, mat));
  } else {
    // Dhyana left hand resting palm-up cleanly in center lap
    const palmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.14, 0.02, 0),
      new THREE.Vector3(0.02, -0.01, 0.02),
      new THREE.Vector3(-0.10, 0.0, 0.02),
    ]);
    const palmGeo = buildTaperedCurveGeometry(
      palmCurve,
      (t, angle) => {
        const w = THREE.MathUtils.lerp(0.10, 0.14, t);
        const h = 0.052;
        return Math.hypot(Math.cos(angle) * h, Math.sin(angle) * w);
      },
      10,
      14,
      true
    );
    hand.add(new THREE.Mesh(palmGeo, mat));

    // 4 gently upward-curled fingers cradling the lap
    [-0.085, -0.028, 0.032, 0.088].forEach((fz, idx) => {
      const len = idx === 1 || idx === 2 ? 0.22 : 0.19;
      const fCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.09, 0.0, fz),
        new THREE.Vector3(-0.09 - len * 0.45, 0.015, fz),
        new THREE.Vector3(-0.09 - len * 0.85, 0.065, fz),
        new THREE.Vector3(-0.09 - len * 0.92, 0.105, fz),
      ]);
      const fGeo = buildTaperedCurveGeometry(
        fCurve,
        (t) => THREE.MathUtils.lerp(0.028, 0.020, t),
        10,
        10,
        true
      );
      hand.add(new THREE.Mesh(fGeo, mat));
    });

    // Relaxed thumb curving slightly up beside index finger
    const thumbCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, 0.02, 0.09),
      new THREE.Vector3(-0.04, 0.05, 0.14),
      new THREE.Vector3(-0.11, 0.075, 0.12),
    ]);
    const thumbGeo = buildTaperedCurveGeometry(
      thumbCurve,
      (t) => THREE.MathUtils.lerp(0.032, 0.022, t),
      8,
      10,
      true
    );
    hand.add(new THREE.Mesh(thumbGeo, mat));
  }

  return hand;
}

/**
 * Builds the complete realistic Antique Gilt-Bronze Bhumisparsha Buddha Altar Assembly
 * faithfully inspired by the attached reference artwork.
 */
export function buildRealisticBuddhaAltar(woodMat: THREE.Material): THREE.Group {
  const assembly = new THREE.Group();

  // 1. Dark Timber Sanctuary Backdrop Panels & Rich Altar Table (matches moody dark sanctuary behind Buddha)
  const backdropMat = new THREE.MeshStandardMaterial({
    color: 0x1e1610,
    roughness: 0.78,
    metalness: 0.08,
  });
  const trimWoodMat = new THREE.MeshStandardMaterial({
    color: 0x352517,
    roughness: 0.6,
    metalness: 0.12,
  });

  // Recessed dark timber reredos screen behind Buddha
  const backdrop = new THREE.Mesh(new THREE.BoxGeometry(15.5, 9.6, 0.35), backdropMat);
  backdrop.position.set(0, 5.6, -12.1);
  backdrop.receiveShadow = true;
  assembly.add(backdrop);

  for (let px = -6; px <= 6; px += 3) {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.32, 9.6, 0.45), trimWoodMat);
    pilaster.position.set(px, 5.6, -11.95);
    assembly.add(pilaster);
  }

  // Grand Altar Table (불단)
  const altar = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.4, 4.4), woodMat);
  altar.position.set(0, 1.5, -8.5);
  altar.castShadow = true;
  altar.receiveShadow = true;
  assembly.add(altar);

  const altarTopTrim = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.14, 4.6), trimWoodMat);
  altarTopTrim.position.set(0, 2.18, -8.5);
  assembly.add(altarTopTrim);

  // 2. Procedural Antique Gilt-Bronze & Brocade Materials
  const bronzeTex = createAntiqueBronzeTextures();
  const brocadeTex = createBrocadeReliefTextures();

  const giltBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xe6be68,
    map: bronzeTex.map,
    roughnessMap: bronzeTex.roughnessMap,
    bumpMap: bronzeTex.bumpMap,
    bumpScale: 0.018,
    roughness: 0.30,
    metalness: 0.86,
    emissive: 0x2c1e06,
    emissiveIntensity: 0.10,
  });

  const darkPatinaMat = new THREE.MeshStandardMaterial({
    color: 0x705427,
    map: bronzeTex.map,
    roughnessMap: bronzeTex.roughnessMap,
    bumpMap: bronzeTex.bumpMap,
    bumpScale: 0.025,
    roughness: 0.40,
    metalness: 0.78,
    emissive: 0x160f03,
    emissiveIntensity: 0.06,
  });

  const brocadeBandMat = new THREE.MeshStandardMaterial({
    color: 0xf2cf78,
    map: brocadeTex.map,
    bumpMap: brocadeTex.bumpMap,
    bumpScale: 0.045,
    roughness: 0.25,
    metalness: 0.88,
    emissive: 0x473006,
    emissiveIntensity: 0.14,
  });

  const creaseBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x22170a,
    roughness: 0.48,
    metalness: 0.55,
  });

  // 3. Buddha Statue Group atop Altar (y = 2.25)
  const buddha = new THREE.Group();
  buddha.position.set(0, 2.25, -8.5);

  // =========================================================================
  // 3a. DOUBLE-TIERED SCULPTED LOTUS PEDESTAL (상·하대 연화대좌)
  // =========================================================================
  const pedestalProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(3.38, 0.0),
    new THREE.Vector2(3.38, 0.14),
    new THREE.Vector2(3.15, 0.22),
    new THREE.Vector2(2.80, 0.45),
    new THREE.Vector2(2.38, 0.62),
    new THREE.Vector2(2.18, 0.72), // recessed waist
    new THREE.Vector2(2.45, 0.86),
    new THREE.Vector2(2.85, 1.06),
    new THREE.Vector2(2.74, 1.24),
    new THREE.Vector2(2.58, 1.30),
    new THREE.Vector2(0.0, 1.30),
  ];
  const pedestal = new THREE.Mesh(new THREE.LatheGeometry(pedestalProfile, 48), darkPatinaMat);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  buddha.add(pedestal);

  // Beaded pearl rings (연주장식) at pedestal base, waist, and lotus seat top
  const beadGeo = new THREE.SphereGeometry(0.042, 8, 8);
  const beadRings = [
    { y: 0.18, r: 3.18, count: 64 },
    { y: 0.68, r: 2.24, count: 48 },
    { y: 1.25, r: 2.66, count: 56 },
  ];
  const totalBeads = beadRings.reduce((acc, row) => acc + row.count, 0);
  const beadInstanced = new THREE.InstancedMesh(beadGeo, brocadeBandMat, totalBeads);
  const dummy = new THREE.Object3D();
  let bIdx = 0;
  beadRings.forEach(({ y, r, count }) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dummy.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      beadInstanced.setMatrixAt(bIdx++, dummy.matrix);
    }
  });
  beadInstanced.instanceMatrix.needsUpdate = true;
  buddha.add(beadInstanced);

  // Lower Tier Downturned Sculpted Lotus Petals (18 carved petals)
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const petal = buildSculptedLotusPetalGroup(
      giltBronzeMat,
      darkPatinaMat,
      brocadeBandMat,
      0.88,
      0.66,
      0.13
    );
    petal.position.set(Math.sin(angle) * 2.95, 0.42, Math.cos(angle) * 2.95);
    petal.rotation.y = angle;
    petal.rotation.x = 0.56;
    buddha.add(petal);
  }

  // Upper Tier Upturned Sculpted Lotus Petals (18 overlapping petals cradling seat)
  for (let i = 0; i < 18; i++) {
    const angle = ((i + 0.5) / 18) * Math.PI * 2;
    const petal = buildSculptedLotusPetalGroup(
      giltBronzeMat,
      darkPatinaMat,
      brocadeBandMat,
      0.86,
      0.72,
      0.14
    );
    petal.position.set(Math.sin(angle) * 2.68, 0.96, Math.cos(angle) * 2.68);
    petal.rotation.y = angle;
    petal.rotation.x = -0.34;
    buddha.add(petal);
  }

  // =========================================================================
  // 3b. SEATED PADMASANA LEGS, EXPOSED FOOT & DRAPED CENTER PLEATS (결가부좌)
  // =========================================================================
  const legsGroup = new THREE.Group();
  legsGroup.position.y = 1.30;

  // Seated hip foundation
  const seatBaseGeo = new THREE.CylinderGeometry(1.42, 1.92, 0.58, 32);
  seatBaseGeo.scale(1.26, 1.0, 0.78);
  const seatBase = new THREE.Mesh(seatBaseGeo, darkPatinaMat);
  seatBase.position.y = 0.25;
  seatBase.castShadow = true;
  legsGroup.add(seatBase);

  // Continuous Right Thigh & Knee (-X, Viewer's Left)
  const rightThighCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.35, 0.34, 0.02),
    new THREE.Vector3(-1.12, 0.38, 0.22),
    new THREE.Vector3(-1.82, 0.34, 0.54),
    new THREE.Vector3(-1.55, 0.30, 0.74),
    new THREE.Vector3(-0.45, 0.30, 0.76),
  ]);
  const rightThighGeo = buildTaperedCurveGeometry(
    rightThighCurve,
    (t) => THREE.MathUtils.lerp(0.46, 0.31, t) + Math.sin(t * Math.PI) * 0.08,
    28,
    18,
    true
  );
  const rightThigh = new THREE.Mesh(rightThighGeo, giltBronzeMat);
  rightThigh.castShadow = true;
  legsGroup.add(rightThigh);

  // Continuous Left Thigh & Knee (+X, Viewer's Right)
  const leftThighCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.35, 0.34, 0.02),
    new THREE.Vector3(1.12, 0.38, 0.22),
    new THREE.Vector3(1.82, 0.34, 0.54),
    new THREE.Vector3(1.52, 0.36, 0.74),
    new THREE.Vector3(0.35, 0.40, 0.68),
  ]);
  const leftThighGeo = buildTaperedCurveGeometry(
    leftThighCurve,
    (t) => THREE.MathUtils.lerp(0.46, 0.30, t) + Math.sin(t * Math.PI) * 0.08,
    28,
    18,
    true
  );
  const leftThigh = new THREE.Mesh(leftThighGeo, giltBronzeMat);
  leftThigh.castShadow = true;
  legsGroup.add(leftThigh);

  // Crossed Shin sweeping from Left Knee across to Right Thigh + Sculpted Bare Foot (결가부좌 발바닥)
  const crossedShinCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.62, 0.34, 0.66),
    new THREE.Vector3(0.75, 0.34, 0.80),
    new THREE.Vector3(-0.08, 0.38, 0.78),
    new THREE.Vector3(-0.62, 0.44, 0.68),
  ]);
  const crossedShin = new THREE.Mesh(
    buildTaperedCurveGeometry(crossedShinCurve, (t) => THREE.MathUtils.lerp(0.34, 0.22, t), 24, 16, true),
    giltBronzeMat
  );
  crossedShin.castShadow = true;
  legsGroup.add(crossedShin);

  // Sculpted Bare Upturned Foot resting visibly in center-left lap (matches photo!)
  const footGroup = new THREE.Group();
  footGroup.position.set(-0.74, 0.48, 0.64);
  footGroup.rotation.set(-0.18, 0.38, 0.14);
  const soleGeo = new THREE.CapsuleGeometry(0.16, 0.34, 8, 12);
  soleGeo.rotateZ(Math.PI / 2);
  soleGeo.scale(1.0, 0.55, 0.85);
  footGroup.add(new THREE.Mesh(soleGeo, giltBronzeMat));
  // Subtle sculpted toes
  for (let ti = 0; ti < 5; ti++) {
    const toe = new THREE.Mesh(
      new THREE.SphereGeometry(0.036 - ti * 0.003, 8, 8),
      giltBronzeMat
    );
    toe.position.set(0.24, 0.01, -0.075 + ti * 0.038);
    footGroup.add(toe);
  }
  legsGroup.add(footGroup);

  // Fanning Center Robe Drapery Folds cascading over crossed legs onto lotus seat
  const skirtShell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.48, 0.44, 24, 1, false, -0.85, 1.7),
    darkPatinaMat
  );
  skirtShell.position.set(0, 0.04, 0.28);
  legsGroup.add(skirtShell);

  for (let p = -3; p <= 3; p++) {
    const px = p * 0.26;
    const pleatCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px * 0.52, 0.34, 0.72),
      new THREE.Vector3(px * 0.88, 0.10, 1.18 - Math.abs(p) * 0.04),
      new THREE.Vector3(px * 1.12, -0.14, 1.36 - Math.abs(p) * 0.06),
    ]);
    const pleat = new THREE.Mesh(
      buildTaperedCurveGeometry(
        pleatCurve,
        (t) => THREE.MathUtils.lerp(0.055, 0.08, t),
        14,
        10,
        true
      ),
      p % 2 === 0 ? giltBronzeMat : darkPatinaMat
    );
    legsGroup.add(pleat);
  }

  // Embossed ornate brocade skirt hem draping over the lotus pedestal edge
  const skirtHemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.28, 0.14, 0.96),
    new THREE.Vector3(-0.75, -0.10, 1.28),
    new THREE.Vector3(0.0, -0.19, 1.39),
    new THREE.Vector3(0.75, -0.10, 1.28),
    new THREE.Vector3(1.28, 0.14, 0.96),
  ]);
  legsGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(skirtHemCurve, 28, 0.068, 12, false), brocadeBandMat)
  );

  // Subtle decorative knee cuff brocade trim on left shin
  const kneeTrimCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.92, 0.58, 0.58),
    new THREE.Vector3(1.16, 0.36, 0.92),
    new THREE.Vector3(1.38, 0.14, 0.76),
  ]);
  legsGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(kneeTrimCurve, 14, 0.052, 8, false), brocadeBandMat)
  );

  buddha.add(legsGroup);

  // =========================================================================
  // 3c. SCULPTED ANATOMICAL TORSO & LEFT-SHOULDER DRAPED ROBE (우견편단)
  // =========================================================================
  const torsoMesh = new THREE.Mesh(buildSculptedTorsoGeometry(), giltBronzeMat);
  torsoMesh.position.y = 1.66;
  torsoMesh.castShadow = true;
  buddha.add(torsoMesh);

  // Subtle bare right chest relief (-X) matching the reference sculpture
  const nippleRelief = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), darkPatinaMat);
  nippleRelief.scale.set(1.0, 1.0, 0.45);
  nippleRelief.position.set(-0.54, 3.12, 0.75);
  buddha.add(nippleRelief);

  // Right shoulder thin brocade trim strap (-X, hugging right trapezius-to-deltoid contour seamlessly)
  const rightStrapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.56, 3.72, -0.24),
    new THREE.Vector3(-0.78, 3.63, 0.14),
    new THREE.Vector3(-1.02, 3.36, 0.27),
    new THREE.Vector3(-1.30, 3.04, 0.24),
    new THREE.Vector3(-1.54, 2.90, 0.04),
    new THREE.Vector3(-1.36, 2.98, -0.20),
    new THREE.Vector3(-1.00, 3.24, -0.32),
  ]);
  buddha.add(
    new THREE.Mesh(new THREE.TubeGeometry(rightStrapCurve, 30, 0.044, 10, false), brocadeBandMat)
  );

  // Ornate Double-Band Diagonal Brocade Collar (우견편단 가사 금란 띠)
  const collarOuterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 3.78, -0.34),
    new THREE.Vector3(0.68, 3.58, 0.36),
    new THREE.Vector3(0.18, 2.98, 0.83),
    new THREE.Vector3(-0.56, 2.40, 0.79),
    new THREE.Vector3(-1.00, 2.04, 0.40),
    new THREE.Vector3(-1.02, 2.02, -0.34),
  ]);
  buddha.add(
    new THREE.Mesh(new THREE.TubeGeometry(collarOuterCurve, 34, 0.088, 12, false), brocadeBandMat)
  );

  const collarInnerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.72, 3.72, -0.24),
    new THREE.Vector3(0.84, 3.48, 0.40),
    new THREE.Vector3(0.32, 2.82, 0.86),
    new THREE.Vector3(-0.46, 2.26, 0.80),
    new THREE.Vector3(-0.96, 1.92, 0.40),
  ]);
  buddha.add(
    new THREE.Mesh(new THREE.TubeGeometry(collarInnerCurve, 28, 0.060, 10, false), giltBronzeMat)
  );

  // Flowing diagonal drapery folds hugging torso cleanly from left shoulder (+X) down to right waist (-X)
  for (let f = 0; f < 6; f++) {
    const dy = f * 0.165;
    const foldCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.12, 3.32 - dy * 0.58, 0.26),
      new THREE.Vector3(0.52, 2.74 - dy * 0.90, 0.82),
      new THREE.Vector3(-0.22, 2.22 - dy * 0.78, 0.82),
      new THREE.Vector3(-0.94, 1.92 - dy * 0.34, 0.45),
    ]);
    const foldMesh = new THREE.Mesh(
      buildTaperedCurveGeometry(
        foldCurve,
        (t) => 0.038 + Math.sin(t * Math.PI) * 0.022,
        24,
        10,
        true
      ),
      f % 2 === 0 ? giltBronzeMat : darkPatinaMat
    );
    buddha.add(foldMesh);
  }

  // Subtle close-fitting sanghati robe drapery folds over Left Shoulder (+X) — matches right shoulder silhouette!
  for (let sf = 0; sf < 3; sf++) {
    const shiftZ = (sf - 1) * 0.10;
    const shoulderFoldCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.70, 3.60, shiftZ - 0.12),
      new THREE.Vector3(1.08, 3.30 - sf * 0.04, shiftZ + 0.06),
      new THREE.Vector3(1.33, 2.86 - sf * 0.05, shiftZ + 0.16),
      new THREE.Vector3(1.24, 2.42 - sf * 0.04, shiftZ + 0.24),
    ]);
    buddha.add(
      new THREE.Mesh(
        buildTaperedCurveGeometry(
          shoulderFoldCurve,
          (t) => 0.022 + Math.sin(t * Math.PI) * 0.012,
          18,
          8,
          true
        ),
        sf === 1 ? giltBronzeMat : darkPatinaMat
      )
    );
  }

  // =========================================================================
  // 3d. SYMMETRIC SEAMLESS SHOULDERS, ARMS & HANDS (좌우 대칭 어깨 + 항마촉지인 / 선정인)
  // =========================================================================
  // Smooth continuous slope from neck base (3.84) -> trapezius -> deltoid cap -> upper bicep
  const rightArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.56, 3.50, -0.02), // Embedded seamlessly inside upper trapezius slope
    new THREE.Vector3(-0.92, 3.36, 0.01),  // Continuous descending shoulder slope
    new THREE.Vector3(-1.22, 3.12, 0.04),  // Rounded symmetrical deltoid shoulder cap
    new THREE.Vector3(-1.33, 2.72, 0.14),  // Upper bicep
    new THREE.Vector3(-1.35, 2.22, 0.34),  // Elbow
    new THREE.Vector3(-1.31, 1.78, 0.72),  // Forearm
    new THREE.Vector3(-1.26, 1.62, 0.98),  // Wrist over knee
  ]);
  const rightArmGeo = buildTaperedCurveGeometry(
    rightArmCurve,
    (t) => {
      if (t < 0.16) return THREE.MathUtils.lerp(0.28, 0.32, t / 0.16);
      if (t < 0.34) return THREE.MathUtils.lerp(0.32, 0.295, (t - 0.16) / 0.18);
      if (t < 0.62) return THREE.MathUtils.lerp(0.295, 0.245, (t - 0.34) / 0.28);
      return THREE.MathUtils.lerp(0.245, 0.155, (t - 0.62) / 0.38);
    },
    44,
    24,
    true
  );
  const rightArm = new THREE.Mesh(rightArmGeo, giltBronzeMat);
  rightArm.castShadow = true;
  buddha.add(rightArm);

  // Right Hand (항마촉지인) hanging gracefully over front of right knee
  const rightHand = buildSculptedHandGroup(giltBronzeMat, 'bhumisparsha');
  rightHand.position.set(-1.26, 1.54, 1.00);
  rightHand.rotation.x = 0.08;
  buddha.add(rightHand);

  // Left Arm (+X, Viewer's Right): Exact mirrored shoulder contour + sleeved forearm cradling in lap
  const leftArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 3.50, -0.02),  // Exact mirror of right trapezius anchor
    new THREE.Vector3(0.92, 3.36, 0.01),   // Exact mirror of right shoulder slope
    new THREE.Vector3(1.22, 3.12, 0.04),   // Exact mirror of right deltoid cap
    new THREE.Vector3(1.33, 2.72, 0.14),   // Exact mirror of right bicep
    new THREE.Vector3(1.35, 2.22, 0.34),   // Exact mirror of right elbow
    new THREE.Vector3(0.92, 1.90, 0.72),   // Robe sleeve crossing smoothly toward lap
    new THREE.Vector3(0.26, 1.74, 0.90),   // Wrist in center lap
  ]);
  const leftArmGeo = buildTaperedCurveGeometry(
    leftArmCurve,
    (t) => {
      // Matches right shoulder cleanly (+0.014m fabric drape thickness)
      if (t < 0.16) return THREE.MathUtils.lerp(0.29, 0.334, t / 0.16);
      if (t < 0.34) return THREE.MathUtils.lerp(0.334, 0.312, (t - 0.16) / 0.18);
      if (t < 0.66) return THREE.MathUtils.lerp(0.312, 0.285, (t - 0.34) / 0.32);
      return THREE.MathUtils.lerp(0.285, 0.20, (t - 0.66) / 0.34);
    },
    44,
    24,
    true
  );
  const leftArm = new THREE.Mesh(leftArmGeo, giltBronzeMat);
  leftArm.castShadow = true;
  buddha.add(leftArm);

  // Ornate brocade sleeve cuff trim around left wrist
  const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.045, 12, 24), brocadeBandMat);
  cuffRing.position.set(0.32, 1.75, 0.89);
  cuffRing.rotation.set(0.15, Math.PI / 2 - 0.25, 0);
  buddha.add(cuffRing);

  // Left Hand (선정인) resting palm-up in center lap
  const leftHand = buildSculptedHandGroup(giltBronzeMat, 'dhyana');
  leftHand.position.set(0.08, 1.74, 0.92);
  buddha.add(leftHand);

  // =========================================================================
  // 3e. THREE NECK RINGS (삼도) & HIGH-PRECISION SCULPTED HEAD (상호)
  // =========================================================================
  const neckCore = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.47, 0.54, 32), giltBronzeMat);
  neckCore.position.set(0, 3.98, 0.0);
  buddha.add(neckCore);

  [3.83, 3.92, 4.01].forEach((ny, idx) => {
    const neckRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.425 - idx * 0.015, 0.042, 14, 36),
      giltBronzeMat
    );
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.set(0, ny, 0.02);
    buddha.add(neckRing);
  });

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 4.82, 0.04);
  headGroup.rotation.x = 0.04;

  const sculptedHead = new THREE.Mesh(buildSculptedHeadGeometry(), giltBronzeMat);
  sculptedHead.castShadow = true;
  headGroup.add(sculptedHead);

  // Surface-locked Crisp Dark Patina Almond Lash Lines & Upper Eyelid Crease Accents
  [-1, 1].forEach((side) => {
    const innerX = side * 0.086;
    const midX = side * 0.195;
    const outerX = side * 0.304;

    const lashPoints: Array<[number, number]> =
      side < 0
        ? [
            [outerX, 0.044],
            [side * 0.25, 0.036],
            [midX, 0.034],
            [side * 0.138, 0.038],
            [innerX, 0.045],
          ]
        : [
            [innerX, 0.045],
            [side * 0.138, 0.038],
            [midX, 0.034],
            [side * 0.25, 0.036],
            [outerX, 0.044],
          ];
    const lashCurve = buildSurfaceProjectedCurve(lashPoints, 0.004);
    headGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(lashCurve, 22, 0.0085, 6, false), creaseBronzeMat)
    );

    // Delicate upper eyelid crease line curving just above half-closed lid dome
    const lidCreasePoints: Array<[number, number]> =
      side < 0
        ? [
            [side * 0.285, 0.085],
            [midX, 0.106],
            [side * 0.105, 0.082],
          ]
        : [
            [side * 0.105, 0.082],
            [midX, 0.106],
            [side * 0.285, 0.085],
          ];
    const lidCreaseCurve = buildSurfaceProjectedCurve(lidCreasePoints, 0.002);
    headGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(lidCreaseCurve, 16, 0.0055, 6, false), darkPatinaMat)
    );

    // Crisp brow arch accent line flowing gently from brow peak toward nasal bridge
    const browPoints: Array<[number, number]> =
      side < 0
        ? [
            [side * 0.32, 0.155],
            [side * 0.205, 0.20],
            [side * 0.075, 0.145],
          ]
        : [
            [side * 0.075, 0.145],
            [side * 0.205, 0.20],
            [side * 0.32, 0.155],
          ];
    const browCurve = buildSurfaceProjectedCurve(browPoints, 0.002);
    headGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(browCurve, 18, 0.0075, 6, false), darkPatinaMat)
    );

    // Subtle dark patinated nostril shadow under alar wing
    const nostrilPt = buildSurfaceProjectedCurve(
      [
        [side * 0.024, -0.132],
        [side * 0.035, -0.134],
        [side * 0.046, -0.134],
      ],
      0.002
    );
    headGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(nostrilPt, 8, 0.009, 6, false), creaseBronzeMat)
    );
  });

  // Crisp Surface-Locked Compassionate Smile Lip Parting Line (입술 선)
  const smileCreaseCurve = buildSurfaceProjectedCurve(
    [
      [-0.122, -0.232],
      [-0.065, -0.244],
      [0.0, -0.246],
      [0.065, -0.244],
      [0.122, -0.232],
    ],
    0.0035
  );
  headGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(smileCreaseCurve, 24, 0.0072, 6, false), creaseBronzeMat)
  );

  // Golden Urna (백호) cleanly centered between eyebrows
  const urnaUy = 0.228 / (0.76 * 1.06);
  const urnaPos = sculptHeadPoint(0, urnaUy, Math.sqrt(Math.max(0.01, 1 - urnaUy * urnaUy)));
  const urna = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 16), brocadeBandMat);
  urna.position.set(urnaPos.x, urnaPos.y, urnaPos.z + 0.012);
  urna.scale.set(1.0, 1.0, 0.72);
  headGroup.add(urna);

  // Sculpted Anatomical Ears with Helix Rim & Elongated Hanging Earlobes (장수귀)
  [-1, 1].forEach((side) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.665, -0.04, -0.02);
    earGroup.rotation.y = side * 0.24;

    const helixCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.16, 0.06),
      new THREE.Vector3(side * 0.07, 0.21, -0.05),
      new THREE.Vector3(side * 0.06, -0.10, -0.08),
      new THREE.Vector3(side * 0.03, -0.44, -0.01),
      new THREE.Vector3(0, -0.49, 0.06),
      new THREE.Vector3(0, -0.30, 0.06),
    ]);
    const helix = new THREE.Mesh(
      buildTaperedCurveGeometry(helixCurve, (t) => 0.035 + Math.sin(t * Math.PI) * 0.025, 20, 10, true),
      giltBronzeMat
    );
    earGroup.add(helix);

    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), darkPatinaMat);
    earInner.scale.set(0.32, 1.35, 0.65);
    earInner.position.set(-side * 0.02, 0.02, -0.02);
    earGroup.add(earInner);

    headGroup.add(earGroup);
  });

  // Hair Cap + Ushnisha Dome + Pointed Finial (계주)
  const hairCapGeo = new THREE.SphereGeometry(0.735, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.56);
  hairCapGeo.scale(0.92, 1.06, 0.94);
  const hairCap = new THREE.Mesh(hairCapGeo, darkPatinaMat);
  hairCap.position.set(0, 0.14, -0.03);
  hairCap.rotation.x = -0.22;
  headGroup.add(hairCap);

  const ushnisha = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 24), darkPatinaMat);
  ushnisha.scale.set(1.0, 0.94, 0.96);
  ushnisha.position.set(0, 0.89, -0.05);
  headGroup.add(ushnisha);

  const finialBase = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 16), giltBronzeMat);
  finialBase.position.set(0, 1.24, -0.05);
  headGroup.add(finialBase);
  const finialTip = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.26, 16), brocadeBandMat);
  finialTip.position.set(0, 1.39, -0.05);
  headGroup.add(finialTip);

  // Dense Instanced Nabal (나발) Stepped Coiled Spiral Hair Beads (~270 tight sculpted coils)
  const curlEntries: Array<{ pos: THREE.Vector3; normal: THREE.Vector3 }> = [];
  const scalpRings = [
    { lat: 0.30, count: 26, r: 0.72 },
    { lat: 0.48, count: 25, r: 0.72 },
    { lat: 0.66, count: 22, r: 0.71 },
    { lat: 0.84, count: 18, r: 0.69 },
    { lat: 1.02, count: 14, r: 0.655 },
    { lat: 1.20, count: 9, r: 0.595 },
  ];
  scalpRings.forEach(({ lat, count, r }, ringIdx) => {
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + ringIdx * 0.18;
      const cz = Math.cos(theta) * Math.cos(lat) * r * 0.92 - 0.03;
      const cy = Math.sin(lat) * r * 1.05 + 0.14;
      const cx = Math.sin(theta) * Math.cos(lat) * r * 0.90;
      // Arched classical hairline framing temples cleanly down toward ears
      const hairlineFloor = 0.50 - Math.pow(cx / 0.48, 2) * 0.12;
      if (cz > 0.30 && cy < hairlineFloor) continue;
      const pos = new THREE.Vector3(cx, cy, cz);
      const normal = new THREE.Vector3(cx, cy - 0.14, cz + 0.03).normalize();
      curlEntries.push({ pos, normal });
    }
  });
  [
    { y: 0.08, r: 0.34, count: 16 },
    { y: 0.20, r: 0.29, count: 12 },
    { y: 0.32, r: 0.20, count: 8 },
  ].forEach(({ y, r, count }, ri) => {
    for (let i = 0; i < count; i++) {
      const th = (i / count) * Math.PI * 2 + ri * 0.25;
      const pos = new THREE.Vector3(Math.sin(th) * r, 0.84 + y, Math.cos(th) * r - 0.05);
      const normal = new THREE.Vector3(Math.sin(th) * r, y - 0.02, Math.cos(th) * r).normalize();
      curlEntries.push({ pos, normal });
    }
  });

  // Sculpted tiered spiral bead LatheGeometry (catches crisp bronze specular rings!)
  const coilProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.056, 0.0),
    new THREE.Vector2(0.056, 0.018),
    new THREE.Vector2(0.044, 0.026),
    new THREE.Vector2(0.044, 0.040),
    new THREE.Vector2(0.028, 0.048),
    new THREE.Vector2(0.024, 0.058),
    new THREE.Vector2(0.0, 0.062),
  ];
  const coilGeo = new THREE.LatheGeometry(coilProfile, 12);
  const coilInst = new THREE.InstancedMesh(coilGeo, giltBronzeMat, curlEntries.length);
  const upVec = new THREE.Vector3(0, 1, 0);
  const orientQuat = new THREE.Quaternion();
  curlEntries.forEach(({ pos, normal }, idx) => {
    dummy.position.copy(pos);
    orientQuat.setFromUnitVectors(upVec, normal);
    dummy.quaternion.copy(orientQuat);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrix();
    coilInst.setMatrixAt(idx, dummy.matrix);
  });
  coilInst.instanceMatrix.needsUpdate = true;
  headGroup.add(coilInst);

  buddha.add(headGroup);
  assembly.add(buddha);

  // =========================================================================
  // 4. 4 FLANKING WARM GLOWING SPHERICAL LAMPS & CINEMATIC LIGHTING
  // =========================================================================
  const lampStandMat = new THREE.MeshStandardMaterial({
    color: 0x1e1812,
    roughness: 0.52,
    metalness: 0.45,
  });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff6dc,
    emissive: 0xffc864,
    emissiveIntensity: 1.9,
    roughness: 0.15,
  });
  const glowTex = createWarmGlowSpriteTexture();

  const lampConfigs = [
    { lx: -6.3, lz: -9.8, h: 4.5, r: 0.54 },
    { lx: -4.2, lz: -10.9, h: 3.3, r: 0.44 },
    { lx: 4.2, lz: -10.9, h: 3.3, r: 0.44 },
    { lx: 6.3, lz: -9.8, h: 4.5, r: 0.54 },
  ];
  lampConfigs.forEach(({ lx, lz, h, r }) => {
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.14, 14), lampStandMat);
    baseDisc.position.set(lx, 0.87, lz);
    assembly.add(baseDisc);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, h, 10), lampStandMat);
    pole.position.set(lx, 0.85 + h / 2, lz);
    assembly.add(pole);

    const orbY = 0.85 + h + r * 0.72;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 18), lampBulbMat);
    orb.position.set(lx, orbY, lz);
    assembly.add(orb);

    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glowSprite.position.set(lx, orbY, lz);
    glowSprite.scale.set(r * 5.2, r * 5.2, 1);
    assembly.add(glowSprite);
  });

  // Warm key Spotlight & Rim Lights sculpting the gilt-bronze patina highlights
  const keySpot = new THREE.SpotLight(0xffe2a8, 20, 28, Math.PI / 4, 0.55, 1.35);
  keySpot.position.set(0.6, 10.4, -3.0);
  keySpot.target.position.set(0, 5.4, -8.5);
  assembly.add(keySpot);
  assembly.add(keySpot.target);

  const fillAura = new THREE.PointLight(0xffd27a, 3.8, 22);
  fillAura.position.set(0, 6.4, -5.0);
  assembly.add(fillAura);

  // Soft warm under-chin bounce light to sculpt compassionate lips, eyelids & neck cleanly
  const chinBounce = new THREE.PointLight(0xffcf7a, 1.4, 8);
  chinBounce.position.set(0, 4.6, -6.7);
  assembly.add(chinBounce);

  const rimLeft = new THREE.PointLight(0xffb84d, 2.8, 16);
  rimLeft.position.set(-5.6, 5.4, -10.3);
  assembly.add(rimLeft);

  const rimRight = new THREE.PointLight(0xffb84d, 2.8, 16);
  rimRight.position.set(5.6, 5.4, -10.3);
  assembly.add(rimRight);

  return assembly;
}
