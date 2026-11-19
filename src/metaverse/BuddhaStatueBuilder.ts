import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const GOLDEN_BUDDHA_GLB_URL = '/assets/golden_buddha_simp_mesh.glb';
const TARGET_STATUE_HEIGHT = 5.5; // Fits atop y=2.25 altar (4.6m deep) with clearance under y=8.8 ceiling beam

let cachedBuddhaTemplatePromise: Promise<THREE.Group> | null = null;

/**
 * Generates a gap-free warm golden studio PMREM environment map for the Buddha statue.
 * Eliminates dark RoomEnvironment wall voids that cause dark blotches on curved metallic surfaces,
 * especially on mobile WebGL GPUs.
 */
export function createWarmBuddhaStudioEnvMap(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const envScene = new THREE.Scene();

  // Seamless 360° warm sky-to-gold gradient dome (zero dark gaps)
  const gradCanvas = document.createElement('canvas');
  gradCanvas.width = 64;
  gradCanvas.height = 128;
  const gctx = gradCanvas.getContext('2d')!;
  const grad = gctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, '#fff9e6');  // zenith soft cream
  grad.addColorStop(0.38, '#ffe7ad'); // upper warm gold
  grad.addColorStop(0.58, '#ffd480'); // horizon luminous gold
  grad.addColorStop(1.0, '#b57f36');  // warm amber-bronze bounce below
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 64, 128);

  const domeTex = new THREE.CanvasTexture(gradCanvas);
  domeTex.colorSpace = THREE.SRGBColorSpace;
  const domeGeo = new THREE.SphereGeometry(20, 24, 16);
  const domeMat = new THREE.MeshBasicMaterial({ map: domeTex, side: THREE.BackSide });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  // Soft wrap-around warm studio softbox panels for natural metallic specular sculpting
  const panelMatBright = new THREE.MeshBasicMaterial({ color: 0xfff8e1, side: THREE.DoubleSide });
  const panelMatWarm = new THREE.MeshBasicMaterial({ color: 0xffdf96, side: THREE.DoubleSide });
  const panelGeo = new THREE.PlaneGeometry(10, 8);

  const panels: Array<{ pos: [number, number, number]; look: [number, number, number]; bright: boolean }> = [
    { pos: [0, 8, 12], look: [0, 0, 0], bright: true },    // Front-top key softbox
    { pos: [-11, 4, 8], look: [0, 0, 0], bright: false },  // Front-left fill softbox
    { pos: [11, 4, 8], look: [0, 0, 0], bright: false },   // Front-right fill softbox
    { pos: [0, 14, 0], look: [0, 0, 0], bright: true },    // Overhead halo softbox
    { pos: [0, 4, -12], look: [0, 0, 0], bright: false },  // Back rim softbox
  ];
  const panelMeshes: THREE.Mesh[] = [];
  panels.forEach(({ pos, look, bright }) => {
    const p = new THREE.Mesh(panelGeo, bright ? panelMatBright : panelMatWarm);
    p.position.set(pos[0], pos[1], pos[2]);
    p.lookAt(look[0], look[1], look[2]);
    envScene.add(p);
    panelMeshes.push(p);
  });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const renderTarget = pmrem.fromScene(envScene, 0.04);

  // Clean up temporary studio scene resources
  pmrem.dispose();
  domeGeo.dispose();
  domeMat.dispose();
  domeTex.dispose();
  panelGeo.dispose();
  panelMatBright.dispose();
  panelMatWarm.dispose();

  return renderTarget;
}

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
 * Loads, normalizes, and caches `/assets/golden_buddha_simp_mesh.glb` (Meshoptimizer-compressed PBR)
 * once so sanctuary switches reuse the decoded geometry and PBR textures instantaneously.
 */
function loadGoldenBuddhaTemplate(): Promise<THREE.Group> {
  if (cachedBuddhaTemplatePromise) {
    return cachedBuddhaTemplatePromise;
  }

  cachedBuddhaTemplatePromise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    Promise.resolve(MeshoptDecoder.ready)
      .then(() => {
        loader.load(
          GOLDEN_BUDDHA_GLB_URL,
          (gltf) => {
            const rawRoot = gltf.scene;
            const processedMats = new Map<THREE.Material, THREE.Material>();

            rawRoot.traverse((child) => {
              if (!(child instanceof THREE.Mesh)) return;

              // Only compute normals if a mesh lacks them; preserve baked PBR normals + tangent normalMap
              if (child.geometry && !child.geometry.attributes.normal) {
                const oldGeo = child.geometry;
                child.geometry = toCreasedNormals(oldGeo, Math.PI / 5);
                oldGeo.dispose();
              }

              child.castShadow = true;
              // Disable self-receiveShadow to eliminate mobile 16-bit shadow acne & roof blotches
              child.receiveShadow = false;

              const enhanceMaterial = (srcMat: THREE.Material): THREE.Material => {
                const cached = processedMats.get(srcMat);
                if (cached) return cached;

                const mat = srcMat.clone();
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.flatShading = false;
                  mat.envMapIntensity = 1.45;
                  // Balanced metalness unlocks warm front diffuse fill alongside metallic gold sheen
                  mat.metalness = 0.72;
                  mat.roughness = 0.92;
                  if (mat.normalScale) {
                    mat.normalScale.set(0.65, 0.65);
                  }
                  mat.emissive = new THREE.Color(0x2a1804);
                  mat.emissiveIntensity = 0.08;
                  mat.needsUpdate = true;
                }
                processedMats.set(srcMat, mat);
                return mat;
              };

              if (Array.isArray(child.material)) {
                child.material = child.material.map(enhanceMaterial);
              } else if (child.material) {
                child.material = enhanceMaterial(child.material);
              }
            });

            rawRoot.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(rawRoot);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            const uniformScale = TARGET_STATUE_HEIGHT / Math.max(0.01, size.y);

            // Wrap in a bottom-centered container so pedestal rests flush on the altar top (y = 0)
            const normalizedWrapper = new THREE.Group();
            rawRoot.scale.setScalar(uniformScale);
            rawRoot.position.set(
              -center.x * uniformScale,
              -box.min.y * uniformScale,
              -center.z * uniformScale
            );
            normalizedWrapper.add(rawRoot);

            resolve(normalizedWrapper);
          },
          undefined,
          (err) => {
            cachedBuddhaTemplatePromise = null;
            reject(err);
          }
        );
      })
      .catch((err) => {
        cachedBuddhaTemplatePromise = null;
        reject(err);
      });
  });

  return cachedBuddhaTemplatePromise;
}

/**
 * Builds the Main Dharma Hall Sanctuary Altar Assembly (대웅전 불단)
 * enshrining the `/assets/golden_buddha_simp_mesh.glb` Golden Buddha Statue.
 */
export function buildRealisticBuddhaAltar(
  woodMat: THREE.Material,
  buddhaEnvMap?: THREE.Texture
): THREE.Group {
  const assembly = new THREE.Group();

  // 1. Dark Timber Sanctuary Backdrop Panels & Grand Altar Table (불단)
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

  const backdrop = new THREE.Mesh(new THREE.BoxGeometry(15.5, 9.6, 0.35), backdropMat);
  backdrop.position.set(0, 5.6, -12.1);
  backdrop.receiveShadow = true;
  assembly.add(backdrop);

  for (let px = -6; px <= 6; px += 3) {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.32, 9.6, 0.45), trimWoodMat);
    pilaster.position.set(px, 5.6, -11.95);
    assembly.add(pilaster);
  }

  const altar = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.4, 4.4), woodMat);
  altar.position.set(0, 1.5, -8.5);
  altar.castShadow = true;
  altar.receiveShadow = true;
  assembly.add(altar);

  const altarTopTrim = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.14, 4.6), trimWoodMat);
  altarTopTrim.position.set(0, 2.18, -8.5);
  assembly.add(altarTopTrim);

  // 2. Golden Buddha Container atop Altar (y = 2.25, z = -8.5)
  const buddhaMount = new THREE.Group();
  buddhaMount.position.set(0, 2.25, -8.5);
  assembly.add(buddhaMount);

  // Subtle temporary golden lotus plinth while Meshoptimizer GLB finishes streaming/decoding
  const placeholderGeo = new THREE.CylinderGeometry(1.75, 1.95, 0.42, 32);
  const placeholderMat = new THREE.MeshStandardMaterial({
    color: 0xd4871f,
    roughness: 0.28,
    metalness: 0.88,
  });
  const placeholderPlinth = new THREE.Mesh(placeholderGeo, placeholderMat);
  placeholderPlinth.position.y = 0.21;
  buddhaMount.add(placeholderPlinth);

  loadGoldenBuddhaTemplate()
    .then((template) => {
      buddhaMount.remove(placeholderPlinth);
      placeholderGeo.dispose();
      placeholderMat.dispose();

      const statueInstance = template.clone(true);
      statueInstance.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const applyEnv = (mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            if (buddhaEnvMap) {
              mat.envMap = buddhaEnvMap;
            }
            mat.envMapIntensity = 1.45;
            mat.needsUpdate = true;
          }
        };
        if (Array.isArray(child.material)) {
          child.material.forEach(applyEnv);
        } else if (child.material) {
          applyEnv(child.material);
        }
      });
      buddhaMount.add(statueInstance);
    })
    .catch((err) => {
      console.error('Failed to load golden_buddha_simp_mesh.glb:', err);
    });

  // 3. 4 Flanking Warm Glowing Spherical Lamps & Sanctuary Lighting Rig
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

  // Warm key Spotlight & Soft Wrap-around Front/Side Fill Lights illuminating face, shoulders, arms & chest
  const keySpot = new THREE.SpotLight(0xffe6b8, 28, 30, Math.PI / 3, 0.85, 1.0);
  keySpot.position.set(0.4, 8.2, -1.8);
  keySpot.target.position.set(0, 5.0, -8.8);
  assembly.add(keySpot);
  assembly.add(keySpot.target);

  const fillAura = new THREE.PointLight(0xffdca0, 4.8, 22, 1.15);
  fillAura.position.set(0, 6.0, -4.4);
  assembly.add(fillAura);

  const fillLeft = new THREE.PointLight(0xffe0a8, 3.4, 18, 1.2);
  fillLeft.position.set(-3.2, 5.3, -4.6);
  assembly.add(fillLeft);

  const fillRight = new THREE.PointLight(0xffe0a8, 3.4, 18, 1.2);
  fillRight.position.set(3.2, 5.3, -4.6);
  assembly.add(fillRight);

  const chinBounce = new THREE.PointLight(0xffd78a, 2.2, 11, 1.2);
  chinBounce.position.set(0, 4.2, -6.2);
  assembly.add(chinBounce);

  const rimLeft = new THREE.PointLight(0xffbe5c, 3.0, 16);
  rimLeft.position.set(-5.6, 5.4, -10.3);
  assembly.add(rimLeft);

  const rimRight = new THREE.PointLight(0xffbe5c, 3.0, 16);
  rimRight.position.set(5.6, 5.4, -10.3);
  assembly.add(rimRight);

  return assembly;
}
