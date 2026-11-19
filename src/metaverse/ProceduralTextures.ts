import * as THREE from 'three';

/**
 * Creates high-fidelity procedural textures using HTML5 2D Canvas.
 * 100% zero external file dependencies to eliminate any 404/broken assets.
 */

export function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base warm timber
  ctx.fillStyle = '#6e4726';
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain lines
  ctx.fillStyle = '#543317';
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * 512;
    const h = Math.random() * 3 + 1;
    ctx.globalAlpha = Math.random() * 0.25 + 0.05;
    ctx.fillRect(0, y, 512, h);
  }

  // Wooden plank borders
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#2d1808';
  ctx.lineWidth = 3;
  for (let i = 0; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createStoneTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Granite base
  ctx.fillStyle = '#c5bdb2';
  ctx.fillRect(0, 0, 512, 512);

  // Granite flecks
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = Math.random() * 3 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? '#80776c' : '#ded7cb';
    ctx.globalAlpha = Math.random() * 0.4 + 0.1;
    ctx.fillRect(x, y, s, s);
  }

  // Flagstone mortar grid
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#635b51';
  ctx.lineWidth = 6;
  const tileSize = 128;
  for (let x = 0; x <= 512; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRoofTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep dark celadon / charcoal Korean Giwa (기와)
  ctx.fillStyle = '#2c3333';
  ctx.fillRect(0, 0, 512, 512);

  // Ribbed tile shadows and highlights
  const rowHeight = 32;
  for (let y = 0; y < 512; y += rowHeight) {
    // dark shadow groove
    ctx.fillStyle = '#181d1d';
    ctx.fillRect(0, y, 512, 6);
    // highlight ridge
    ctx.fillStyle = '#424d4d';
    ctx.fillRect(0, y + 6, 512, 4);
    // curved tile scallops
    ctx.strokeStyle = '#1e2424';
    ctx.lineWidth = 2;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 14, Math.PI, 0);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createHanjiScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Semi-translucent warm Hanji paper (창호지)
  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, 256, 256);

  // Traditional wooden lattice grid (문살)
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 5;
  const step = 32;
  for (let x = 0; x <= 256; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDancheongPatternTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Traditional Korean Dancheong colors (vermilion, jade, lapis, gold)
  ctx.fillStyle = '#8b251a'; // Deep vermilion
  ctx.fillRect(0, 0, 256, 64);

  // Jade green wave
  ctx.fillStyle = '#226052';
  for (let x = 0; x < 256; x += 32) {
    ctx.beginPath();
    ctx.arc(x + 16, 32, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gold lotus florets
  ctx.fillStyle = '#d4af37';
  for (let x = 0; x < 256; x += 32) {
    ctx.beginPath();
    ctx.arc(x + 16, 32, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createLawnGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Calming lush green grass base
  ctx.fillStyle = '#487040';
  ctx.fillRect(0, 0, 512, 512);

  // Soft grass color gradients
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const h = Math.random() * 8 + 3;
    const colors = ['#3d6336', '#527e49', '#5d8a54', '#6a9960', '#34542d'];
    ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.lineWidth = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, y - h);
    ctx.stroke();
  }

  // Tiny subtle clover and flower spots
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.4 ? '#fef08a' : '#fbcfe8'; // Yellow & pink tiny petals
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Antique Gilt-Bronze Patina Textures (color, roughness, bump)
 * Produces realistic burnished gold highlights blended with aged dark-bronze patina.
 */
export function createAntiqueBronzeTextures(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Warm burnished gilt-bronze base
  cCtx.fillStyle = '#c89b44';
  cCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#484848'; // ~0.28 roughness base
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Mottled antique oxidation patina patches
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = 8 + Math.random() * 44;
    const isDarkPatina = Math.random() > 0.35;

    const grad = cCtx.createRadialGradient(x, y, 0, x, y, rad);
    if (isDarkPatina) {
      grad.addColorStop(0, 'rgba(62, 45, 20, 0.24)');
      grad.addColorStop(1, 'rgba(62, 45, 20, 0)');
    } else {
      grad.addColorStop(0, 'rgba(232, 194, 102, 0.18)');
      grad.addColorStop(1, 'rgba(232, 194, 102, 0)');
    }
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(x, y, rad, 0, Math.PI * 2);
    cCtx.fill();

    // Roughness higher in oxidized dark spots, lower on burnished areas
    const rGrad = rCtx.createRadialGradient(x, y, 0, x, y, rad);
    rGrad.addColorStop(0, isDarkPatina ? 'rgba(130, 130, 130, 0.28)' : 'rgba(32, 32, 32, 0.22)');
    rGrad.addColorStop(1, 'rgba(72, 72, 72, 0)');
    rCtx.fillStyle = rGrad;
    rCtx.beginPath();
    rCtx.arc(x, y, rad, 0, Math.PI * 2);
    rCtx.fill();
  }

  // Fine hand-hammered bronze micro-grain
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    const bright = Math.random() > 0.5;
    bCtx.fillStyle = bright ? 'rgba(155,155,155,0.12)' : 'rgba(95,95,95,0.12)';
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap, bumpMap };
}

/**
 * Procedural Ornate Chased-Gold Brocade Scrollwork (가사 금란 문양 띠)
 * Creates repeating carved lotus-arabesque relief along robe edges.
 */
export function createBrocadeReliefTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 128;

  const cCanvas = document.createElement('canvas');
  cCanvas.width = w;
  cCanvas.height = h;
  const cCtx = cCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = w;
  bCanvas.height = h;
  const bCtx = bCanvas.getContext('2d')!;

  // Dark bronze recessed background inside trim border
  cCtx.fillStyle = '#473316';
  cCtx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#282828';
  bCtx.fillRect(0, 0, w, h);

  // Raised golden outer border rails
  cCtx.fillStyle = '#d9ae54';
  cCtx.fillRect(0, 8, w, 12);
  cCtx.fillRect(0, h - 20, w, 12);

  bCtx.fillStyle = '#e0e0e0';
  bCtx.fillRect(0, 8, w, 12);
  bCtx.fillRect(0, h - 20, w, 12);

  // Embossed floral/scroll arabesque motifs
  const repeatCount = 8;
  const step = w / repeatCount;
  for (let i = 0; i < repeatCount; i++) {
    const cx = i * step + step * 0.5;
    const cy = h * 0.5;

    [
      { ctx: cCtx, stroke: '#e5bc63', fill: '#cca047' },
      { ctx: bCtx, stroke: '#ebebeb', fill: '#c8c8c8' },
    ].forEach(({ ctx, stroke, fill }) => {
      ctx.strokeStyle = stroke;
      ctx.fillStyle = fill;
      ctx.lineWidth = 5;

      // Central lotus rosette
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Symmetrical curling vine tendrils
      ctx.beginPath();
      ctx.arc(cx - 20, cy - 8, 11, 0, Math.PI * 1.4);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx + 20, cy + 8, 11, Math.PI, Math.PI * 2.4);
      ctx.stroke();
    });
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 1);
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 1);

  return { map, bumpMap };
}

