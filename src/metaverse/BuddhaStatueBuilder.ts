import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const GOLDEN_BUDDHA_GLB_URL = '/assets/golden_buddha_simp_mesh.glb';
const TARGET_STATUE_HEIGHT = 5.5; // Fits atop y=2.25 altar (4.6m deep) with clearance under y=8.8 ceiling beam

let cachedBuddhaTemplatePromise: Promise<THREE.Group> | null = null;

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
              child.receiveShadow = true;

              const enhanceMaterial = (srcMat: THREE.Material): THREE.Material => {
                const cached = processedMats.get(srcMat);
                if (cached) return cached;

                const mat = srcMat.clone();
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.flatShading = false;
                  mat.envMapIntensity = 1.4;
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
export function buildRealisticBuddhaAltar(woodMat: THREE.Material): THREE.Group {
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

  // Warm key Spotlight, Fill Aura, Under-chin Sculpting Bounce & Side Rim Lights
  const keySpot = new THREE.SpotLight(0xffe2a8, 24, 28, Math.PI / 4, 0.55, 1.3);
  keySpot.position.set(0.5, 8.6, -2.6);
  keySpot.target.position.set(0, 5.2, -9.2);
  assembly.add(keySpot);
  assembly.add(keySpot.target);

  const fillAura = new THREE.PointLight(0xffd27a, 4.4, 22);
  fillAura.position.set(0, 6.2, -5.0);
  assembly.add(fillAura);

  const chinBounce = new THREE.PointLight(0xffcf7a, 1.8, 9);
  chinBounce.position.set(0, 4.4, -6.7);
  assembly.add(chinBounce);

  const rimLeft = new THREE.PointLight(0xffb84d, 3.0, 16);
  rimLeft.position.set(-5.6, 5.4, -10.3);
  assembly.add(rimLeft);

  const rimRight = new THREE.PointLight(0xffb84d, 3.0, 16);
  rimRight.position.set(5.6, 5.4, -10.3);
  assembly.add(rimRight);

  return assembly;
}
