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
