import * as THREE from 'three';

export interface OtherPractitionerData {
  id: string;
  name: string;
  robeColor: number;
  initialPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  action: 'walking' | 'meditating' | 'bowing' | 'standing';
  statusMessage: string;
}

export class OtherPractitionersManager {
  public group: THREE.Group;
  private practitioners: {
    avatarGroup: THREE.Group;
    data: OtherPractitionerData;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    body: THREE.Mesh;
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
        initialPos: new THREE.Vector3(-56, 0.88, 3.5),
        targetPos: new THREE.Vector3(-56, 0.88, 3.5),
        action: 'meditating',
        statusMessage: '선방에서 고요한 호흡 명상 중 🧘',
      },
      {
        id: 'p2',
        name: '도반 연꽃',
        robeColor: 0x5e564d, // Earth brown
        initialPos: new THREE.Vector3(56, 0.75, 3.5),
        targetPos: new THREE.Vector3(56, 0.75, 3.5),
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
        initialPos: new THREE.Vector3(0, 0.8, -48),
        targetPos: new THREE.Vector3(0, 0.8, -48),
        action: 'standing',
        statusMessage: '대웅전 부처님께 합장 삼배',
      },
    ];

    list.forEach((data) => this.createPractitioner(data));
  }

  private createPractitioner(data: OtherPractitionerData) {
    const avatarGroup = new THREE.Group();
    avatarGroup.position.copy(data.initialPos);

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
    avatarGroup.add(body);

    const beltGeo = new THREE.CylinderGeometry(0.3, 0.33, 0.09, 14);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.72;
    avatarGroup.add(belt);

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

    avatarGroup.add(headGroup);

    // 3. Cute Arms
    const armGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.45, 8);
    armGeo.translate(0, -0.2, 0);

    const leftArm = new THREE.Mesh(armGeo, robeMat);
    leftArm.position.set(-0.33, 1.0, 0);
    avatarGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, robeMat);
    rightArm.position.set(0.33, 1.0, 0);
    avatarGroup.add(rightArm);

    // 4. Cute Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.42, 8);
    legGeo.translate(0, -0.18, 0);

    const leftLeg = new THREE.Mesh(legGeo, robeMat);
    leftLeg.position.set(-0.15, 0.4, 0);
    avatarGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, robeMat);
    rightLeg.position.set(0.15, 0.4, 0);
    avatarGroup.add(rightLeg);

    // Ground shadow
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
      data,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      body,
      headGroup,
      walkTimer: Math.random() * 10,
      actionTimer: 0,
    });
  }

  public update(delta: number) {
    this.practitioners.forEach((p) => {
      p.actionTimer += delta;

      if (p.data.action === 'walking') {
        p.walkTimer += delta * 0.45;
        const progress = (Math.sin(p.walkTimer) + 1) / 2;
        const currentPos = new THREE.Vector3().lerpVectors(p.data.initialPos, p.data.targetPos, progress);
        p.avatarGroup.position.copy(currentPos);

        const dir = new THREE.Vector3().subVectors(p.data.targetPos, p.data.initialPos);
        if (Math.cos(p.walkTimer) < 0) dir.negate();
        p.avatarGroup.rotation.y = Math.atan2(dir.x, dir.z);

        const legSwing = Math.sin(p.actionTimer * 9) * 0.45;
        p.leftLeg.rotation.x = legSwing;
        p.rightLeg.rotation.x = -legSwing;
        p.leftArm.rotation.x = -legSwing * 0.6;
        p.rightArm.rotation.x = legSwing * 0.6;

        // Cute waddle bounce
        p.avatarGroup.position.y = Math.abs(Math.sin(p.actionTimer * 18)) * 0.05;
        p.avatarGroup.rotation.z = Math.sin(p.actionTimer * 9) * 0.05;
      } else if (p.data.action === 'bowing') {
        const bowCycle = (Math.sin(p.actionTimer * 1.5) + 1) / 2;
        p.body.rotation.x = bowCycle * 0.8;
        p.avatarGroup.position.y = -bowCycle * 0.35;
        p.leftArm.rotation.x = bowCycle * 1.1;
        p.rightArm.rotation.x = bowCycle * 1.1;
      } else if (p.data.action === 'meditating') {
        p.leftLeg.rotation.x = 1.2;
        p.rightLeg.rotation.x = 1.2;
        p.avatarGroup.position.y = -0.28;
        p.leftArm.rotation.x = 0.35;
        p.rightArm.rotation.x = 0.35;
        p.body.scale.y = 1.0 + Math.sin(p.actionTimer * 1.2) * 0.03;
      } else {
        // Standing in peaceful prayer
        p.leftArm.rotation.x = 0.7;
        p.rightArm.rotation.x = 0.7;
        p.leftArm.rotation.z = 0.25;
        p.rightArm.rotation.z = -0.25;
      }
    });
  }
}
