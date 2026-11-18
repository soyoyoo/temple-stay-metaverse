import * as THREE from 'three';

export interface OtherPractitionerData {
  id: string;
  name: string;
  robeColor: number;
  initialPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  facingYaw?: number;
  action: 'walking' | 'meditating' | 'bowing' | 'standing';
  statusMessage: string;
}

export class OtherPractitionersManager {
  public group: THREE.Group;
  private practitioners: {
    avatarGroup: THREE.Group;
    innerRig: THREE.Group;
    data: OtherPractitionerData;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    body: THREE.Mesh;
    belt: THREE.Mesh;
    headGroup: THREE.Group;
    walkTimer: number;
    actionTimer: number;
  }[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.initDefaultPractitioners();
  }

  private initDefaultPractitioners() {
    const list: OtherPractitionerData[] = [
      {
        id: 'p1',
        name: '도반 보리',
        robeColor: 0x928a7d, // Warm sand
        // Meditation Hall floor y=0.80, cushion at (-48-4.5, 0.88, 4.5) -> top y=0.96
        initialPos: new THREE.Vector3(-52.5, 0.96, 4.5),
        targetPos: new THREE.Vector3(-52.5, 0.96, 4.5),
        facingYaw: Math.PI / 2,
        action: 'meditating',
        statusMessage: '선방에서 고요한 호흡 명상 중 🧘',
      },
      {
        id: 'p2',
        name: '도반 연꽃',
        robeColor: 0x5e564d, // Earth brown
        // 108 Bows Hall floor y=0.70, mat at (48+4, 0.74, 5) -> top y=0.78
        initialPos: new THREE.Vector3(52, 0.78, 5),
        targetPos: new THREE.Vector3(52, 0.78, 5),
        facingYaw: -Math.PI / 2,
        action: 'bowing',
        statusMessage: '108배 정진전에서 정진 중 🙏',
      },
      {
        id: 'p3',
        name: '도반 청안',
        robeColor: 0x768285, // Celadon grey
        initialPos: new THREE.Vector3(14, 0, 18),
        targetPos: new THREE.Vector3(-14, 0, 18),
        action: 'walking',
        statusMessage: '넓은 잔디 마당 포행 중 🌿',
      },
      {
        id: 'p4',
        name: '도반 해탈',
        robeColor: 0x7a7d80, // Classic monk grey
        initialPos: new THREE.Vector3(65, 0, -32),
        targetPos: new THREE.Vector3(65, 0, -52),
        action: 'walking',
        statusMessage: '울창한 대나무 숲길 묵언 포행',
      },
      {
        id: 'p5',
        name: '도반 지혜',
        robeColor: 0x6e786b, // Forest grey
        // Main Dharma Hall floor y=0.80, standing off-center facing the Golden Buddha
        initialPos: new THREE.Vector3(-6, 0.80, -44),
        targetPos: new THREE.Vector3(-6, 0.80, -44),
        facingYaw: Math.PI,
        action: 'standing',
        statusMessage: '대웅전 부처님께 합장 삼배',
      },
    ];

    list.forEach((data) => this.createPractitioner(data));
  }

  private createPractitioner(data: OtherPractitionerData) {
    const avatarGroup = new THREE.Group();
    avatarGroup.position.copy(data.initialPos);
    if (data.facingYaw !== undefined) {
      avatarGroup.rotation.y = data.facingYaw;
    }

    // Inner rig shifts character body vertically inside avatarGroup without sinking below floor Y!
    const innerRig = new THREE.Group();
    avatarGroup.add(innerRig);

    const robeMat = new THREE.MeshStandardMaterial({
      color: data.robeColor,
      roughness: 0.88,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde3cf,
      roughness: 0.55,
    });
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0xfca5a5,
      roughness: 0.8,
    });
    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x3d3935,
      roughness: 0.9,
    });

    // 1. Plump cute body
    const bodyGeo = new THREE.CylinderGeometry(0.26, 0.38, 0.72, 14);
    const body = new THREE.Mesh(bodyGeo, robeMat);
    body.position.y = 0.72;
    body.castShadow = true;
    innerRig.add(body);

    const beltGeo = new THREE.CylinderGeometry(0.3, 0.33, 0.09, 14);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.72;
    innerRig.add(belt);

    // 2. Cute Head with blushing cheeks
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.32;

    const headGeo = new THREE.SphereGeometry(0.34, 20, 20);
    headGeo.scale(1.0, 0.95, 0.98);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Blushing cheeks
    const cheekGeo = new THREE.SphereGeometry(0.07, 10, 10);
    cheekGeo.scale(1.2, 0.8, 0.5);

    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(-0.2, -0.04, 0.26);
    headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
    cheekR.position.set(0.2, -0.04, 0.26);
    headGroup.add(cheekR);

    // Cute monk ears
    const earGeo = new THREE.SphereGeometry(0.08, 10, 10);
    earGeo.scale(0.5, 1.2, 0.8);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.32, 0, 0);
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.32, 0, 0);
    headGroup.add(earR);

    innerRig.add(headGroup);

    // 3. Cute Arms
    const armGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.45, 8);
    armGeo.translate(0, -0.2, 0);

    const leftArm = new THREE.Mesh(armGeo, robeMat);
    leftArm.position.set(-0.33, 1.0, 0);
    innerRig.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, robeMat);
    rightArm.position.set(0.33, 1.0, 0);
    innerRig.add(rightArm);

    // 4. Cute Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.42, 8);
    legGeo.translate(0, -0.18, 0);

    const leftLeg = new THREE.Mesh(legGeo, robeMat);
    leftLeg.position.set(-0.15, 0.4, 0);
    innerRig.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, robeMat);
    rightLeg.position.set(0.15, 0.4, 0);
    innerRig.add(rightLeg);

    // Ground shadow stays flush on floor / cushion surface (y = 0.02 inside avatarGroup)
    const shadowGeo = new THREE.CircleGeometry(0.42, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    avatarGroup.add(shadow);

    // Overhead Nametag Billboard
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 72;
    const ctx = nameCanvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(28, 25, 23, 0.8)';
    ctx.roundRect(10, 6, 236, 60, 16);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Noto Serif KR", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.name, 128, 28);

    ctx.fillStyle = '#fde047';
    ctx.font = '14px sans-serif';
    ctx.fillText(data.statusMessage.slice(0, 16), 128, 50);

    const nameTex = new THREE.CanvasTexture(nameCanvas);
    nameTex.colorSpace = THREE.SRGBColorSpace;
    const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true }));
    nameSprite.position.set(0, 2.0, 0);
    nameSprite.scale.set(1.4, 0.4, 1);
    avatarGroup.add(nameSprite);

    this.group.add(avatarGroup);

    this.practitioners.push({
      avatarGroup,
      innerRig,
      data,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      body,
      belt,
      headGroup,
      walkTimer: Math.random() * 10,
      actionTimer: 0,
    });
  }

  public update(delta: number, getElevation?: (x: number, z: number) => number) {
    this.practitioners.forEach((p) => {
      p.actionTimer += delta;

      if (p.data.action === 'walking') {
        p.walkTimer += delta * 0.45;
        const progress = (Math.sin(p.walkTimer) + 1) / 2;
        const currentPos = new THREE.Vector3().lerpVectors(p.data.initialPos, p.data.targetPos, progress);
        const groundY = getElevation ? getElevation(currentPos.x, currentPos.z) : p.data.initialPos.y;
        p.avatarGroup.position.set(
          currentPos.x,
          groundY + Math.abs(Math.sin(p.actionTimer * 18)) * 0.05,
          currentPos.z
        );

        const dir = new THREE.Vector3().subVectors(p.data.targetPos, p.data.initialPos);
        if (Math.cos(p.walkTimer) < 0) dir.negate();
        p.avatarGroup.rotation.y = Math.atan2(dir.x, dir.z);

        const legSwing = Math.sin(p.actionTimer * 9) * 0.45;
        p.leftLeg.rotation.x = legSwing;
        p.rightLeg.rotation.x = -legSwing;
        p.leftArm.rotation.x = -legSwing * 0.6;
        p.rightArm.rotation.x = legSwing * 0.6;
        p.innerRig.position.y = 0;
        p.avatarGroup.rotation.z = Math.sin(p.actionTimer * 9) * 0.05;
      } else if (p.data.action === 'bowing') {
        // Stay cleanly on top of the 108 bows floor/mat (initialPos.y = 0.78)
        p.avatarGroup.position.y = p.data.initialPos.y;
        const bowCycle = (Math.sin(p.actionTimer * 1.4) + 1) / 2;

        // Bend innerRig forward smoothly while keeping bottom above mat (y >= 0)
        p.innerRig.position.y = 0.02 + (1 - bowCycle) * 0.06;
        p.innerRig.rotation.x = bowCycle * 0.95;

        // Hands raised to forehead in front (-X rotation) rather than behind back!
        p.leftArm.rotation.set(-2.25, 0, 0.52);
        p.rightArm.rotation.set(-2.25, 0, -0.52);
        p.leftLeg.rotation.x = bowCycle * 0.85;
        p.rightLeg.rotation.x = bowCycle * 0.85;
      } else if (p.data.action === 'meditating') {
        // Seated cleanly on top of the meditation cushion (initialPos.y = 0.96)
        p.avatarGroup.position.y = p.data.initialPos.y;
        // Legs fold forward (-X) at y=0.40 inside innerRig -> shifting innerRig down by -0.26 places folded legs at +0.14 (flush on cushion!)
        p.innerRig.position.y = -0.26;
        p.leftLeg.rotation.set(-1.35, -0.3, 0.4);
        p.rightLeg.rotation.set(-1.35, 0.3, -0.4);
        p.leftArm.rotation.set(-0.72, -0.3, 0.35);
        p.rightArm.rotation.set(-0.72, 0.3, -0.35);
        p.body.scale.y = 1.0 + Math.sin(p.actionTimer * 1.2) * 0.03;
      } else {
        // Standing on floor (y = 0.80 in Dharma Hall) in peaceful Hapjang in front (-X)
        p.avatarGroup.position.y = p.data.initialPos.y;
        p.innerRig.position.y = 0;
        p.leftArm.rotation.set(-1.2, 0, 0.58);
        p.rightArm.rotation.set(-1.2, 0, -0.58);
      }
    });
  }
}
