import * as THREE from 'three';
import {
  createWoodTexture,
  createStoneTileTexture,
  createRoofTileTexture,
  createHanjiScreenTexture,
  createDancheongPatternTexture,
  createLawnGrassTexture,
} from './ProceduralTextures';

export interface InteractiveHotspot {
  id: 'dharma' | 'meditation' | 'bows108' | 'mindshare' | 'walking' | 'bell';
  title: string;
  subTitle: string;
  position: THREE.Vector3;
  radius: number;
}

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class TempleBuilder {
  private woodTex = createWoodTexture();
  private stoneTex = createStoneTileTexture();
  private roofTex = createRoofTileTexture();
  private hanjiTex = createHanjiScreenTexture();
  private dancheongTex = createDancheongPatternTexture();
  private grassTex = createLawnGrassTexture();

  // Materials
  private woodMat = new THREE.MeshStandardMaterial({
    map: this.woodTex,
    roughness: 0.65,
    metalness: 0.05,
  });

  private pillarMat = new THREE.MeshStandardMaterial({
    color: 0x73291d, // Traditional red-ochre timber
    roughness: 0.55,
    metalness: 0.05,
  });

  private stoneMat = new THREE.MeshStandardMaterial({
    map: this.stoneTex,
    roughness: 0.85,
    metalness: 0.02,
  });

  private grassMat = new THREE.MeshStandardMaterial({
    map: this.grassTex,
    roughness: 0.95,
    metalness: 0.02,
  });

  private roofMat = new THREE.MeshStandardMaterial({
    map: this.roofTex,
    roughness: 0.45,
    metalness: 0.15,
  });

  private dancheongMat = new THREE.MeshStandardMaterial({
    map: this.dancheongTex,
    roughness: 0.5,
  });

  private hanjiMat = new THREE.MeshStandardMaterial({
    map: this.hanjiTex,
    roughness: 0.7,
    transparent: true,
    opacity: 0.88,
  });

  // Radiant Golden Buddha Material (금동 부처님 상)
  private pureGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf5c338,
    roughness: 0.22,
    metalness: 0.9,
    emissive: 0x8a6208,
    emissiveIntensity: 0.2,
  });

  private bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x5a4a3a,
    roughness: 0.4,
    metalness: 0.7,
  });

  public hotspots: InteractiveHotspot[] = [];
  public collisionBoxes: CollisionBox[] = [];

  /**
   * Builds the Expansive Calming Green Lawn Courtyard (4배 넓어진 푸른 잔디 마당)
   * With wide stone paths and wildflowers
   */
  public buildPeacefulLawnCourtyard(x: number, z: number): THREE.Group {
    const courtyard = new THREE.Group();
    courtyard.position.set(x, 0, z);

    // 1. Lush Green Grass Lawn Plane (100m x 100m)
    const lawnGeo = new THREE.PlaneGeometry(104, 104);
    lawnGeo.rotateX(-Math.PI / 2);
    const lawn = new THREE.Mesh(lawnGeo, this.grassMat);
    lawn.position.set(0, 0.03, 0);
    lawn.receiveShadow = true;
    courtyard.add(lawn);

    // 2. Wide Stepping Stone Paths (폭 2.2m 디딤돌 길)
    const stepMat = new THREE.MeshStandardMaterial({
      map: this.stoneTex,
      roughness: 0.85,
    });

    // Main path to Dharma Hall (North: z = 20 to z = -32)
    for (let pz = 24; pz >= -32; pz -= 2.4) {
      const stepGeo = new THREE.CylinderGeometry(1.3, 1.4, 0.08, 10);
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(Math.sin(pz * 0.2) * 0.4, 0.05, pz);
      step.receiveShadow = true;
      courtyard.add(step);
    }

    // Branch path to Meditation Hall (West: x = 0 to x = -34)
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const px = THREE.MathUtils.lerp(0, -34, t);
      const pz = THREE.MathUtils.lerp(4, 0, t);
      const stepGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.08, 10);
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(px, 0.05, pz);
      step.receiveShadow = true;
      courtyard.add(step);
    }

    // Branch path to 108 Bows Hall (East: x = 0 to x = 34)
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const px = THREE.MathUtils.lerp(0, 34, t);
      const pz = THREE.MathUtils.lerp(4, 0, t);
      const stepGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.08, 10);
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(px, 0.05, pz);
      step.receiveShadow = true;
      courtyard.add(step);
    }

    // Branch path to Bell Pavilion (South-West: (-38, 42))
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const px = THREE.MathUtils.lerp(0, -34, t);
      const pz = THREE.MathUtils.lerp(12, 38, t);
      const stepGeo = new THREE.CylinderGeometry(1.1, 1.2, 0.08, 10);
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(px, 0.05, pz);
      step.receiveShadow = true;
      courtyard.add(step);
    }

    // Branch path to Yeonhwajeong (South-East: (38, 42))
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const px = THREE.MathUtils.lerp(0, 34, t);
      const pz = THREE.MathUtils.lerp(12, 38, t);
      const stepGeo = new THREE.CylinderGeometry(1.1, 1.2, 0.08, 10);
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(px, 0.05, pz);
      step.receiveShadow = true;
      courtyard.add(step);
    }

    // Branch path to Bamboo Forest Trail (North-East: (54, -38))
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const px = THREE.MathUtils.lerp(0, 48, t);
      const pz = THREE.MathUtils.lerp(-8, -34, t);
      const stepGeo = new THREE.CylinderGeometry(1.1, 1.2, 0.08, 10);
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(px, 0.05, pz);
      step.receiveShadow = true;
      courtyard.add(step);
    }

    // 3. Wildflowers in the grass
    const flowerMatYellow = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    const flowerMatPink = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.4 });
    const flowerGeo = new THREE.SphereGeometry(0.18, 6, 6);

    const flowerSpots = [
      [-12, 8], [12, 8], [-18, 18], [18, 18], [-10, -12], [10, -12],
      [-22, 12], [22, 12], [-14, 28], [14, 28], [-6, 32], [6, 32],
      [-28, -6], [28, -6], [-25, 25], [25, 25],
    ];

    flowerSpots.forEach(([fx, fz], idx) => {
      const f = new THREE.Mesh(flowerGeo, idx % 2 === 0 ? flowerMatYellow : flowerMatPink);
      f.position.set(fx + (Math.random() - 0.5), 0.16, fz + (Math.random() - 0.5));
      courtyard.add(f);
    });

    return courtyard;
  }

  /**
   * Builds the 4x Scale Main Dharma Hall (대웅전)
   * Enshrining the Glorious Golden Buddha Statue
   * With 16-meter super-wide open entrance (NO wall collision at door!)
   */
  public buildMainDharmaHall(x: number, z: number): THREE.Group {
    const hall = new THREE.Group();
    hall.position.set(x, 0, z);

    // 1. Raised Stone Plinth Foundation (38m wide x 26m deep, height 0.8m)
    const plinthGeo = new THREE.BoxGeometry(38, 0.8, 26);
    const plinth = new THREE.Mesh(plinthGeo, this.stoneMat);
    plinth.position.y = 0.4;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    hall.add(plinth);

    // Gentle wide steps leading up (18m wide x 6m deep ramp)
    const stepsGeo = new THREE.BoxGeometry(18, 0.4, 6.0);
    const steps = new THREE.Mesh(stepsGeo, this.stoneMat);
    steps.position.set(0, 0.2, 15.0);
    steps.receiveShadow = true;
    hall.add(steps);

    // 2. Pillars (12 grand timber pillars)
    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, 8.5, 16);
    const pillarPositions = [
      [-16, 11], [-8, 11], [8, 11], [16, 11],
      [-16, 0], [-8, 0], [8, 0], [16, 0],
      [-16, -11], [-8, -11], [8, -11], [16, -11],
    ];

    pillarPositions.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, this.pillarMat);
      pillar.position.set(px, 5.05, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      hall.add(pillar);
    });

    // 3. Walls (Back wall and side walls - with 16-meter wide open door in front)
    // Back Wall
    const backWallGeo = new THREE.BoxGeometry(36, 8.0, 0.5);
    const backWall = new THREE.Mesh(backWallGeo, this.hanjiMat);
    backWall.position.set(0, 4.8, -12.5);
    backWall.castShadow = true;
    hall.add(backWall);

    // Left Wall
    const sideWallGeo = new THREE.BoxGeometry(0.5, 8.0, 24);
    const leftWall = new THREE.Mesh(sideWallGeo, this.hanjiMat);
    leftWall.position.set(-18.5, 4.8, 0);
    leftWall.castShadow = true;
    hall.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(sideWallGeo, this.hanjiMat);
    rightWall.position.set(18.5, 4.8, 0);
    rightWall.castShadow = true;
    hall.add(rightWall);

    // Front Wing Walls (leaves wide 16m center door x: [-8.0, 8.0] open!)
    const frontWingGeo = new THREE.BoxGeometry(10.0, 8.0, 0.5);
    const frontWallLeft = new THREE.Mesh(frontWingGeo, this.hanjiMat);
    frontWallLeft.position.set(-13.5, 4.8, 12.5);
    frontWallLeft.castShadow = true;
    hall.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(frontWingGeo, this.hanjiMat);
    frontWallRight.position.set(13.5, 4.8, 12.5);
    frontWallRight.castShadow = true;
    hall.add(frontWallRight);

    // COLLISION BOXES: ONLY on the outer boundaries and back altar (NO collision at front entrance!)
    this.collisionBoxes.push(
      // Back wall
      { minX: x - 19, maxX: x + 19, minZ: z - 13.5, maxZ: z - 11.5 },
      // Left wall
      { minX: x - 19.5, maxX: x - 17.5, minZ: z - 12.5, maxZ: z + 12.5 },
      // Right wall
      { minX: x + 17.5, maxX: x + 19.5, minZ: z - 12.5, maxZ: z + 12.5 },
      // Front left wing
      { minX: x - 19, maxX: x - 8.2, minZ: z + 11.5, maxZ: z + 13.5 },
      // Front right wing
      { minX: x + 8.2, maxX: x + 19, minZ: z + 11.5, maxZ: z + 13.5 },
      // Altar inside
      { minX: x - 5.5, maxX: x + 5.5, minZ: z - 11.5, maxZ: z - 5.5 }
    );

    // 4. Dancheong Cross Beams
    const beamGeo = new THREE.BoxGeometry(37, 1.2, 25);
    const beam = new THREE.Mesh(beamGeo, this.dancheongMat);
    beam.position.y = 9.4;
    beam.castShadow = true;
    hall.add(beam);

    // 5. Curved Korean Giwa Roof
    const roofLowerGeo = new THREE.ConeGeometry(28, 6.5, 4);
    roofLowerGeo.rotateY(Math.PI / 4);
    const roofLower = new THREE.Mesh(roofLowerGeo, this.roofMat);
    roofLower.position.y = 12.8;
    roofLower.scale.set(1.45, 0.65, 1.15);
    roofLower.castShadow = true;
    hall.add(roofLower);

    const ridgeGeo = new THREE.BoxGeometry(34, 1.2, 1.4);
    const ridge = new THREE.Mesh(ridgeGeo, this.roofMat);
    ridge.position.y = 15.5;
    ridge.castShadow = true;
    hall.add(ridge);

    // 6. MAGNIFICENT GOLDEN BUDDHA STATUE (금색 부처님 상)
    // Altar Table
    const altarGeo = new THREE.BoxGeometry(10.0, 1.4, 3.8);
    const altar = new THREE.Mesh(altarGeo, this.woodMat);
    altar.position.set(0, 1.5, -8.5);
    altar.castShadow = true;
    hall.add(altar);

    // Buddha Group
    const goldenBuddha = new THREE.Group();
    goldenBuddha.position.set(0, 2.2, -8.5);

    // Multi-tier Golden Lotus Throne (황금 연화대좌)
    const lotusBaseGeo = new THREE.CylinderGeometry(2.4, 2.9, 1.0, 24);
    const lotusBase = new THREE.Mesh(lotusBaseGeo, this.pureGoldMat);
    goldenBuddha.add(lotusBase);

    // Carved Golden Lotus Petals
    const petalGeo = new THREE.ConeGeometry(0.55, 0.7, 6);
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, this.pureGoldMat);
      petal.position.set(Math.cos(angle) * 2.7, 0.1, Math.sin(angle) * 2.7);
      petal.rotation.z = Math.PI / 3;
      petal.rotation.y = angle + Math.PI / 2;
      goldenBuddha.add(petal);
    }

    // Seated Lower Body (결가부좌)
    const legsGeo = new THREE.CylinderGeometry(2.1, 2.5, 1.1, 16);
    legsGeo.scale(1.25, 1.0, 0.85);
    const legs = new THREE.Mesh(legsGeo, this.pureGoldMat);
    legs.position.y = 1.0;
    goldenBuddha.add(legs);

    // Golden Torso
    const torsoGeo = new THREE.CylinderGeometry(1.3, 1.7, 2.6, 16);
    const torso = new THREE.Mesh(torsoGeo, this.pureGoldMat);
    torso.position.y = 2.7;
    goldenBuddha.add(torso);

    // Mudra Arms (항마촉지인)
    const armGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.9, 10);
    const armR = new THREE.Mesh(armGeo, this.pureGoldMat);
    armR.position.set(1.4, 2.4, 0.5);
    armR.rotation.z = -0.38;
    armR.rotation.x = 0.45;
    goldenBuddha.add(armR);

    const armL = new THREE.Mesh(armGeo, this.pureGoldMat);
    armL.position.set(-1.2, 2.1, 0.7);
    armL.rotation.z = 0.5;
    armL.rotation.x = 0.7;
    goldenBuddha.add(armL);

    // Buddha Head
    const headGeo = new THREE.SphereGeometry(0.95, 20, 20);
    const head = new THREE.Mesh(headGeo, this.pureGoldMat);
    head.position.y = 4.9;
    goldenBuddha.add(head);

    const ushnishaGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const ushnisha = new THREE.Mesh(ushnishaGeo, this.pureGoldMat);
    ushnisha.position.y = 5.75;
    goldenBuddha.add(ushnisha);

    // Radiant Golden Halo Mandorla (광배)
    const haloGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.12, 32);
    haloGeo.rotateX(Math.PI / 2);
    const halo = new THREE.Mesh(haloGeo, this.pureGoldMat);
    halo.position.set(0, 4.5, -0.6);
    goldenBuddha.add(halo);

    const rayGeo = new THREE.TorusGeometry(3.2, 0.08, 8, 32);
    const ray = new THREE.Mesh(rayGeo, this.pureGoldMat);
    ray.position.set(0, 4.5, -0.5);
    goldenBuddha.add(ray);

    hall.add(goldenBuddha);

    // Warm Altar Candlelight and Sacred Aura
    const sacredAura = new THREE.PointLight(0xffd56b, 3.5, 25);
    sacredAura.position.set(0, 6.0, -6.0);
    hall.add(sacredAura);

    // Signboard: 大雄殿
    const plaqueGeo = new THREE.BoxGeometry(4.2, 1.4, 0.15);
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 9.4, 13.2);
    hall.add(plaque);

    this.hotspots.push({
      id: 'dharma',
      title: '대웅전',
      subTitle: '지도 법사님 법문 & 부처님 참배',
      position: new THREE.Vector3(x, 1.5, z + 8.0),
      radius: 12.0,
    });

    return hall;
  }

  /**
   * Builds the 4x Scale Meditation Hall (선방 · 명상원)
   * With 16-meter super-wide open entrance facing the courtyard
   */
  public buildMeditationHall(x: number, z: number): THREE.Group {
    const hall = new THREE.Group();
    hall.position.set(x, 0, z);

    // 1. Plinth: 28m wide (in X) x 34m deep (in Z), height 0.8m
    const baseGeo = new THREE.BoxGeometry(28, 0.8, 34);
    const base = new THREE.Mesh(baseGeo, this.woodMat);
    base.position.y = 0.4;
    base.receiveShadow = true;
    hall.add(base);

    // Entrance steps facing East toward courtyard (ramp 16m wide in Z)
    const stepsGeo = new THREE.BoxGeometry(5.0, 0.4, 18.0);
    const steps = new THREE.Mesh(stepsGeo, this.woodMat);
    steps.position.set(16.0, 0.2, 0);
    steps.receiveShadow = true;
    hall.add(steps);

    // 2. Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.45, 0.5, 7.5, 16);
    const coords = [
      [-12, -14], [0, -14], [12, -14],
      [-12, 14], [0, 14], [12, 14],
      [-12, 0], [12, 0],
    ];
    coords.forEach(([cx, cz]) => {
      const p = new THREE.Mesh(pillarGeo, this.pillarMat);
      p.position.set(cx, 4.5, cz);
      p.castShadow = true;
      hall.add(p);
    });

    // 3. Walls (West back wall, North & South side walls, East wall with 16m open door)
    // Back Wall (West)
    const backWallGeo = new THREE.BoxGeometry(0.4, 7.0, 32);
    const backWall = new THREE.Mesh(backWallGeo, this.hanjiMat);
    backWall.position.set(-13.5, 4.3, 0);
    hall.add(backWall);

    // North side wall
    const sideWallGeo = new THREE.BoxGeometry(26, 7.0, 0.4);
    const northWall = new THREE.Mesh(sideWallGeo, this.hanjiMat);
    northWall.position.set(0, 4.3, -16.5);
    hall.add(northWall);

    // South side wall
    const southWall = new THREE.Mesh(sideWallGeo, this.hanjiMat);
    southWall.position.set(0, 4.3, 16.5);
    hall.add(southWall);

    // East Wing Walls (leaves wide 16m center door z: [-8.0, 8.0] open!)
    const frontWingGeo = new THREE.BoxGeometry(0.4, 7.0, 8.5);
    const eastWallNorth = new THREE.Mesh(frontWingGeo, this.hanjiMat);
    eastWallNorth.position.set(13.5, 4.3, -12.25);
    hall.add(eastWallNorth);

    const eastWallSouth = new THREE.Mesh(frontWingGeo, this.hanjiMat);
    eastWallSouth.position.set(13.5, 4.3, 12.25);
    hall.add(eastWallSouth);

    // COLLISION BOXES: ONLY on outer walls, NO obstruction in entrance
    this.collisionBoxes.push(
      // Back wall (West)
      { minX: x - 14.5, maxX: x - 12.5, minZ: z - 17, maxZ: z + 17 },
      // North wall
      { minX: x - 14, maxX: x + 14, minZ: z - 17.5, maxZ: z - 15.5 },
      // South wall
      { minX: x - 14, maxX: x + 14, minZ: z + 15.5, maxZ: z + 17.5 },
      // East north wing
      { minX: x + 12.5, maxX: x + 14.5, minZ: z - 17, maxZ: z - 8.2 },
      // East south wing
      { minX: x + 12.5, maxX: x + 14.5, minZ: z + 8.2, maxZ: z + 17 }
    );

    // Roof
    const roofGeo = new THREE.ConeGeometry(22, 5.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.y = 10.5;
    roof.scale.set(1.2, 0.65, 1.4);
    roof.castShadow = true;
    hall.add(roof);

    // Meditation Cushions (방석들)
    const cushionGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.16, 20);
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x8a7e6b, roughness: 0.9 });
    const centerCushionMat = new THREE.MeshStandardMaterial({ color: 0xa38d6d, roughness: 0.85 });

    for (let r = -10; r <= 10; r += 4.5) {
      for (let c = -8; c <= 8; c += 4.5) {
        const isCenter = Math.abs(r) < 1 && Math.abs(c) < 1;
        const cushion = new THREE.Mesh(cushionGeo, isCenter ? centerCushionMat : cushionMat);
        cushion.position.set(c, 0.88, r);
        hall.add(cushion);
      }
    }

    const lanternLight = new THREE.PointLight(0xffbe76, 2.5, 20);
    lanternLight.position.set(0, 4.5, 0);
    hall.add(lanternLight);

    this.hotspots.push({
      id: 'meditation',
      title: '선방 · 명상원 (選佛場)',
      subTitle: '고요한 호흡 명상 (아나파나사티)',
      position: new THREE.Vector3(x, 1.2, z),
      radius: 12.0,
    });

    return hall;
  }

  /**
   * Builds the 4x Scale 108 Bows Hall (108배 정진전)
   * With 16-meter super-wide open entrance facing the courtyard
   */
  public buildBows108Hall(x: number, z: number): THREE.Group {
    const hall = new THREE.Group();
    hall.position.set(x, 0, z);

    // 1. Deck Plinth: 28m wide (in X) x 34m deep (in Z), height 0.7m
    const deckGeo = new THREE.BoxGeometry(28, 0.7, 34);
    const deck = new THREE.Mesh(deckGeo, this.woodMat);
    deck.position.y = 0.35;
    deck.receiveShadow = true;
    hall.add(deck);

    // Entrance steps facing West toward courtyard (ramp 16m wide in Z)
    const stepsGeo = new THREE.BoxGeometry(5.0, 0.35, 18.0);
    const steps = new THREE.Mesh(stepsGeo, this.woodMat);
    steps.position.set(-16.0, 0.18, 0);
    steps.receiveShadow = true;
    hall.add(steps);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.45, 0.5, 7.5, 16);
    const coords = [
      [-12, -14], [0, -14], [12, -14],
      [-12, 14], [0, 14], [12, 14],
      [-12, 0], [12, 0],
    ];
    coords.forEach(([cx, cz]) => {
      const p = new THREE.Mesh(pillarGeo, this.pillarMat);
      p.position.set(cx, 4.4, cz);
      p.castShadow = true;
      hall.add(p);
    });

    // Walls (East back wall, North & South side walls, West wall with 16m open door)
    // Back Wall (East)
    const backWallGeo = new THREE.BoxGeometry(0.4, 7.0, 32);
    const backWall = new THREE.Mesh(backWallGeo, this.woodMat);
    backWall.position.set(13.5, 4.2, 0);
    hall.add(backWall);

    // North side wall
    const sideWallGeo = new THREE.BoxGeometry(26, 7.0, 0.4);
    const northWall = new THREE.Mesh(sideWallGeo, this.woodMat);
    northWall.position.set(0, 4.2, -16.5);
    hall.add(northWall);

    // South side wall
    const southWall = new THREE.Mesh(sideWallGeo, this.woodMat);
    southWall.position.set(0, 4.2, 16.5);
    hall.add(southWall);

    // West Wing Walls (leaves wide 16m center door z: [-8.0, 8.0] open!)
    const frontWingGeo = new THREE.BoxGeometry(0.4, 7.0, 8.5);
    const westWallNorth = new THREE.Mesh(frontWingGeo, this.woodMat);
    westWallNorth.position.set(-13.5, 4.2, -12.25);
    hall.add(westWallNorth);

    const westWallSouth = new THREE.Mesh(frontWingGeo, this.woodMat);
    westWallSouth.position.set(-13.5, 4.2, 12.25);
    hall.add(westWallSouth);

    // COLLISION BOXES: ONLY on outer boundaries
    this.collisionBoxes.push(
      // Back wall (East)
      { minX: x + 12.5, maxX: x + 14.5, minZ: z - 17, maxZ: z + 17 },
      // North wall
      { minX: x - 14, maxX: x + 14, minZ: z - 17.5, maxZ: z - 15.5 },
      // South wall
      { minX: x - 14, maxX: x + 14, minZ: z + 15.5, maxZ: z + 17.5 },
      // West north wing
      { minX: x - 14.5, maxX: x - 12.5, minZ: z - 17, maxZ: z - 8.2 },
      // West south wing
      { minX: x - 14.5, maxX: x - 12.5, minZ: z + 8.2, maxZ: z + 17 }
    );

    // Roof
    const roofGeo = new THREE.ConeGeometry(22, 5.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.y = 10.2;
    roof.scale.set(1.2, 0.65, 1.4);
    roof.castShadow = true;
    hall.add(roof);

    // Bowing Mats (108배 정진 방석들)
    const matGeo = new THREE.BoxGeometry(2.2, 0.08, 3.2);
    const matColor = new THREE.MeshStandardMaterial({ color: 0x9e8e78, roughness: 0.85 });
    const centerMatColor = new THREE.MeshStandardMaterial({ color: 0xb39c7b, roughness: 0.8 });

    for (let c = -7; c <= 7; c += 4.5) {
      for (let r = -10; r <= 10; r += 5.0) {
        const isCenter = Math.abs(c) < 1 && Math.abs(r) < 1;
        const mat = new THREE.Mesh(matGeo, isCenter ? centerMatColor : matColor);
        mat.position.set(c, 0.74, r);
        hall.add(mat);
      }
    }

    this.hotspots.push({
      id: 'bows108',
      title: '108배 정진전 (百八拜)',
      subTitle: '하심(下心)과 번뇌를 비우는 108배 정진',
      position: new THREE.Vector3(x, 1.2, z),
      radius: 12.0,
    });

    return hall;
  }

  /**
   * Bell Pavilion (범종각) - Open on all sides
   */
  public buildBellPavilion(x: number, z: number): THREE.Group {
    const pavilion = new THREE.Group();
    pavilion.position.set(x, 0, z);

    const baseGeo = new THREE.BoxGeometry(16, 0.8, 16);
    const base = new THREE.Mesh(baseGeo, this.stoneMat);
    base.position.y = 0.4;
    pavilion.add(base);

    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.55, 7.5, 16);
    const coords = [
      [-6.5, 6.5], [6.5, 6.5],
      [-6.5, -6.5], [6.5, -6.5],
    ];
    coords.forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, this.pillarMat);
      p.position.set(px, 4.4, pz);
      p.castShadow = true;
      pavilion.add(p);
    });

    const roofGeo = new THREE.ConeGeometry(15, 5.0, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.y = 10.0;
    roof.scale.set(1.2, 0.7, 1.2);
    roof.castShadow = true;
    pavilion.add(roof);

    const bellGroup = new THREE.Group();
    bellGroup.position.set(0, 5.0, 0);

    const bellBodyGeo = new THREE.CylinderGeometry(1.6, 2.4, 3.5, 24);
    const bell = new THREE.Mesh(bellBodyGeo, this.bronzeMat);
    bellGroup.add(bell);

    const crownGeo = new THREE.TorusGeometry(0.7, 0.2, 16, 16);
    const crown = new THREE.Mesh(crownGeo, this.bronzeMat);
    crown.position.y = 2.0;
    bellGroup.add(crown);

    pavilion.add(bellGroup);

    this.hotspots.push({
      id: 'bell',
      title: '범종각 (梵鐘閣)',
      subTitle: '세상을 깨우는 맑은 종소리 울림',
      position: new THREE.Vector3(x, 1.2, z),
      radius: 9.0,
    });

    return pavilion;
  }

  /**
   * Lotus Pavilion Courtyard (연화정 마당 - 차담과 마음나누기)
   * Open peaceful green lawn with tea table and chairs for heartfelt sharing
   */
  public buildMindSharingCourtyard(x: number, z: number): THREE.Group {
    const courtyard = new THREE.Group();
    courtyard.position.set(x, 0, z);

    // 1. Seamless Green Lawn Grass (34m x 34m)
    const grassGeo = new THREE.PlaneGeometry(36, 36);
    grassGeo.rotateX(-Math.PI / 2);
    const grass = new THREE.Mesh(grassGeo, this.grassMat);
    grass.position.y = 0.035;
    grass.receiveShadow = true;
    courtyard.add(grass);

    // 2. Central Natural Wood Tea Table (마음나누기 차담 원목 테이블)
    const tableTopGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.15, 28);
    const tableTop = new THREE.Mesh(tableTopGeo, this.woodMat);
    tableTop.position.y = 0.65;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    courtyard.add(tableTop);

    const tablePedestalGeo = new THREE.CylinderGeometry(0.5, 0.75, 0.58, 16);
    const tablePedestal = new THREE.Mesh(tablePedestalGeo, this.woodMat);
    tablePedestal.position.y = 0.3;
    tablePedestal.castShadow = true;
    courtyard.add(tablePedestal);

    // Celadon Tea Set
    const celadonMat = new THREE.MeshStandardMaterial({
      color: 0x86b099,
      roughness: 0.25,
      metalness: 0.1,
    });

    const teapotGeo = new THREE.SphereGeometry(0.28, 12, 12);
    teapotGeo.scale(1.1, 0.8, 1.1);
    const teapot = new THREE.Mesh(teapotGeo, celadonMat);
    teapot.position.set(0, 0.88, 0);
    courtyard.add(teapot);

    // 4 Teacups
    const cupGeo = new THREE.CylinderGeometry(0.1, 0.07, 0.1, 10);
    const cupOffsets = [
      [0.75, 0.45], [-0.75, -0.45], [0.45, -0.75], [-0.45, 0.75]
    ];
    cupOffsets.forEach(([cx, cz]) => {
      const cup = new THREE.Mesh(cupGeo, celadonMat);
      cup.position.set(cx, 0.78, cz);
      courtyard.add(cup);
    });

    // 3. 4 Wooden Chairs around the table (radius 3.5m)
    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x694328,
      roughness: 0.7,
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0xbc9b7b,
      roughness: 0.9,
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const chairGroup = new THREE.Group();
      chairGroup.position.set(Math.cos(angle) * 3.5, 0, Math.sin(angle) * 3.5);
      chairGroup.rotation.y = -angle - Math.PI / 2; // Facing the table center

      // Chair Seat
      const seatGeo = new THREE.BoxGeometry(1.0, 0.1, 0.95);
      const seat = new THREE.Mesh(seatGeo, chairMat);
      seat.position.y = 0.38;
      seat.castShadow = true;
      chairGroup.add(seat);

      // Soft Cushion
      const cGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16);
      const cMesh = new THREE.Mesh(cGeo, cushionMat);
      cMesh.position.y = 0.44;
      chairGroup.add(cMesh);

      // 4 Chair Legs
      const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.36, 8);
      const legCoords = [
        [-0.4, -0.38], [0.4, -0.38], [-0.4, 0.38], [0.4, 0.38]
      ];
      legCoords.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, 0.18, lz);
        leg.castShadow = true;
        chairGroup.add(leg);
      });

      // Chair Backrest
      const backGeo = new THREE.BoxGeometry(0.98, 0.55, 0.08);
      const back = new THREE.Mesh(backGeo, chairMat);
      back.position.set(0, 0.72, -0.44);
      chairGroup.add(back);

      courtyard.add(chairGroup);
    }

    // Warm ambient lantern
    const lantern = new THREE.PointLight(0xffbe76, 1.8, 16);
    lantern.position.set(0, 2.5, 0);
    courtyard.add(lantern);

    // Interactive Hotspot (centered at the table)
    this.hotspots.push({
      id: 'mindshare',
      title: '연화정 마당 (차담과 마음나누기)',
      subTitle: '푸른 잔디 위 따뜻한 차담 & 도반들과 마음 나누기',
      position: new THREE.Vector3(x, 1.2, z),
      radius: 10.0,
    });

    return courtyard;
  }

  /**
   * Bamboo Forest Walking Trail (대나무 숲길 / 포행로 - 65m x 40m)
   */
  public buildBambooForestTrail(x: number, z: number): THREE.Group {
    const trail = new THREE.Group();
    trail.position.set(x, 0, z);

    // Wide Stone Path (폭 4.5m, 길이 60m)
    const pathGeo = new THREE.BoxGeometry(4.5, 0.06, 60);
    const path = new THREE.Mesh(pathGeo, this.stoneMat);
    path.position.set(0, 0.03, 0);
    path.receiveShadow = true;
    trail.add(path);

    const bambooStalkGeo = new THREE.CylinderGeometry(0.14, 0.18, 9.5, 8);
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3d7a42, roughness: 0.5 });
    const leafGeo = new THREE.SphereGeometry(1.2, 8, 8);
    leafGeo.scale(1.6, 0.6, 1.6);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6633, roughness: 0.7 });

    for (let i = -28; i <= 28; i += 2.2) {
      // Left side bamboo grove
      const stalkL = new THREE.Mesh(bambooStalkGeo, bambooMat);
      stalkL.position.set(-3.5 - Math.random() * 4.5, 4.75, i + (Math.random() - 0.5));
      stalkL.castShadow = true;
      trail.add(stalkL);

      const leafL = new THREE.Mesh(leafGeo, leafMat);
      leafL.position.set(stalkL.position.x, 8.8, stalkL.position.z);
      trail.add(leafL);

      // Right side bamboo grove
      const stalkR = new THREE.Mesh(bambooStalkGeo, bambooMat);
      stalkR.position.set(3.5 + Math.random() * 4.5, 4.75, i + (Math.random() - 0.5));
      stalkR.castShadow = true;
      trail.add(stalkR);

      const leafR = new THREE.Mesh(leafGeo, leafMat);
      leafR.position.set(stalkR.position.x, 8.8, stalkR.position.z);
      trail.add(leafR);
    }

    this.hotspots.push({
      id: 'walking',
      title: '대나무 숲길 (포행로)',
      subTitle: '발바닥 감각을 알아차리는 묵언 산책 (보행 명상)',
      position: new THREE.Vector3(x, 1.2, z),
      radius: 14.0,
    });

    return trail;
  }

  /**
   * Seoul Seocho Environment: Modern Rooftop Skyline (서초 회관)
   */
  public buildSeochoUrbanEnvironment(): THREE.Group {
    const env = new THREE.Group();

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });

    // Spacious rooftop perimeter at 140m
    const perimeterSize = 150;
    const wallConfigs = [
      { x: 0, z: -75, w: perimeterSize, d: 0.6 },
      { x: 0, z: 75, w: perimeterSize, d: 0.6 },
      { x: -75, z: 0, w: 0.6, d: perimeterSize },
      { x: 75, z: 0, w: 0.6, d: perimeterSize },
    ];

    wallConfigs.forEach(({ x, z, w, d }) => {
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), railMat);
      baseMesh.position.set(x, 0.4, z);
      env.add(baseMesh);

      const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, d), glassMat);
      glassMesh.position.set(x, 1.7, z);
      env.add(glassMesh);

      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d * 1.5), railMat);
      topMesh.position.set(x, 2.7, z);
      env.add(topMesh);
    });

    // Outer edge railings collision at perimeter
    this.collisionBoxes.push(
      { minX: -76, maxX: 76, minZ: -76, maxZ: -74 },
      { minX: -76, maxX: 76, minZ: 74, maxZ: 76 },
      { minX: -76, maxX: -74, minZ: -76, maxZ: 76 },
      { minX: 74, maxX: 76, minZ: -76, maxZ: 76 }
    );

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.3,
    });
    const glassBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.3,
      metalness: 0.8,
    });

    const skylineBuildings = [
      { x: -95, z: -85, w: 28, h: 70, d: 28 },
      { x: -115, z: -40, w: 32, h: 90, d: 34 },
      { x: -100, z: 45, w: 30, h: 75, d: 30 },
      { x: 95, z: -85, w: 30, h: 80, d: 30 },
      { x: 115, z: -30, w: 34, h: 95, d: 34 },
      { x: 100, z: 50, w: 28, h: 68, d: 28 },
      { x: 0, z: -110, w: 45, h: 110, d: 35 },
      { x: -45, z: -105, w: 25, h: 85, d: 25 },
      { x: 45, z: -105, w: 25, h: 90, d: 25 },
    ];

    skylineBuildings.forEach(({ x, z, w, h, d }, idx) => {
      const bGeo = new THREE.BoxGeometry(w, h, d);
      const bMesh = new THREE.Mesh(bGeo, idx % 2 === 0 ? buildingMat : glassBuildingMat);
      bMesh.position.set(x, h / 2 - 10, z);
      env.add(bMesh);
    });

    return env;
  }

  /**
   * Mungyeong Environment: Deep Mountain Peaks & Ancient Forests
   */
  public buildMungyeongMountainEnvironment(): THREE.Group {
    const env = new THREE.Group();

    const rockMat = new THREE.MeshStandardMaterial({
      map: this.stoneTex,
      color: 0x5a6358,
      roughness: 0.95,
    });

    const peaks = [
      { x: 0, z: -115, r: 60, h: 75 },
      { x: -105, z: -70, r: 55, h: 68 },
      { x: 105, z: -70, r: 55, h: 66 },
      { x: -110, z: 45, r: 50, h: 60 },
      { x: 110, z: 45, r: 50, h: 58 },
      { x: 0, z: 120, r: 65, h: 65 },
    ];

    peaks.forEach(({ x, z, r, h }) => {
      const peakGeo = new THREE.ConeGeometry(r, h, 7);
      peakGeo.scale(1.2, 1, 0.9);
      const peak = new THREE.Mesh(peakGeo, rockMat);
      peak.position.set(x, h / 2 - 2, z);
      env.add(peak);
    });

    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 68 + Math.random() * 45;
      const pine = this.buildPineTree(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.4 + Math.random() * 0.8);
      env.add(pine);
    }

    return env;
  }

  /**
   * Jukrimjeongsa Environment: Pastoral Suburban Mountain Temple (죽림정사)
   */
  public buildJukrimBambooEnvironment(): THREE.Group {
    const env = new THREE.Group();

    // Natural stone boundary walls placed generously at outer perimeter (110m)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x9c8973,
      roughness: 0.9,
    });

    const wallSegments = [
      { x: 0, z: -90, w: 140, d: 0.8 },
      { x: -85, z: 0, w: 0.8, d: 140 },
      { x: 85, z: 0, w: 0.8, d: 140 },
    ];

    wallSegments.forEach(({ x, z, w, d }) => {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), wallMat);
      wallMesh.position.set(x, 0.75, z);
      wallMesh.castShadow = true;
      env.add(wallMesh);

      const capMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d * 1.5), this.roofMat);
      capMesh.position.set(x, 1.65, z);
      capMesh.castShadow = true;
      env.add(capMesh);
    });

    // Wall collisions on the outer boundary
    this.collisionBoxes.push(
      { minX: -70, maxX: 70, minZ: -91, maxZ: -89 },
      { minX: -86, maxX: -84, minZ: -70, maxZ: 70 },
      { minX: 84, maxX: 86, minZ: -70, maxZ: 70 }
    );

    const bambooStalkGeo = new THREE.CylinderGeometry(0.14, 0.18, 10.5, 8);
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3d7a42, roughness: 0.5 });
    const leafGeo = new THREE.SphereGeometry(1.3, 8, 8);
    leafGeo.scale(1.4, 0.5, 1.4);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6633, roughness: 0.7 });

    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const dist = 72 + Math.random() * 25;
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist;

      const stalk = new THREE.Mesh(bambooStalkGeo, bambooMat);
      stalk.position.set(bx, 5.25, bz);
      stalk.castShadow = true;
      env.add(stalk);

      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(bx, 9.8, bz);
      env.add(leaf);
    }

    return env;
  }

  /**
   * Pine Trees
   */
  public buildPineTree(x: number, z: number, scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 5.5, 10);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.75;
    trunk.castShadow = true;
    tree.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.85 });
    const layerSizes = [2.4, 2.0, 1.5, 0.9];
    layerSizes.forEach((radius, i) => {
      const folGeo = new THREE.SphereGeometry(radius, 8, 8);
      folGeo.scale(1.4, 0.45, 1.4);
      const fol = new THREE.Mesh(folGeo, foliageMat);
      fol.position.set((Math.random() - 0.5) * 0.4, 4.2 + i * 1.4, (Math.random() - 0.5) * 0.4);
      fol.castShadow = true;
      tree.add(fol);
    });

    return tree;
  }

  /**
   * Stone Lanterns
   */
  public buildStoneLantern(x: number, z: number): THREE.Group {
    const lantern = new THREE.Group();
    lantern.position.set(x, 0, z);

    const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.45, 8);
    const base = new THREE.Mesh(baseGeo, this.stoneMat);
    base.position.y = 0.22;
    lantern.add(base);

    const stemGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.1, 8);
    const stem = new THREE.Mesh(stemGeo, this.stoneMat);
    stem.position.y = 0.95;
    lantern.add(stem);

    const chamberGeo = new THREE.BoxGeometry(0.7, 0.55, 0.7);
    const chamberMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffa600,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });
    const chamber = new THREE.Mesh(chamberGeo, chamberMat);
    chamber.position.y = 1.75;
    lantern.add(chamber);

    const pl = new THREE.PointLight(0xffb347, 1.2, 8);
    pl.position.set(0, 1.75, 0);
    lantern.add(pl);

    const roofGeo = new THREE.ConeGeometry(0.9, 0.5, 8);
    const roof = new THREE.Mesh(roofGeo, this.stoneMat);
    roof.position.y = 2.25;
    lantern.add(roof);

    return lantern;
  }
}
