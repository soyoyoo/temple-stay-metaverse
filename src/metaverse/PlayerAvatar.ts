import * as THREE from 'three';

export type AvatarActionType =
  | 'idle'
  | 'walking'
  | 'meditating'
  | 'bowing'
  | 'dharma'
  | 'poheng'
  | 'mindsharing'
  | 'sitting';

/**
 * Adorable Novice Monk (귀여운 동자승 아바타)
 * Fully articulated 3D character with authentic Korean Buddhist monastic animations:
 * - 명상 (Meditation / 좌선): Sitting in lotus posture on a cushion with Dhyana Mudra (선정인) and breathing animation
 * - 108배 (108 Bows / 오체투지): Complete 5-point prostration cycle with Hapjang (합장) and Jeopjokrye (접족례)
 * - 법문 듣기 (Dharma Talks): Standing in Hapjang (합장) with attentive nodding of realization
 * - 포행 (Mindful Walking): Monastic Chasu posture (차수: hands folded over lower abdomen) with slow deliberate steps
 * - 마음 나누기 (Mind Sharing): Warm welcoming companion gesture
 */
export class PlayerAvatar {
  public mesh: THREE.Group;
  public currentAction: AvatarActionType = 'idle';

  // Articulated joints
  private pelvisGroup: THREE.Group;
  private torsoGroup: THREE.Group;
  private headGroup: THREE.Group;
  private legPivotL: THREE.Group;
  private legPivotR: THREE.Group;
  private armPivotL: THREE.Group;
  private armPivotR: THREE.Group;

  // Visual parts
  private bodyMesh: THREE.Mesh;
  private cushionGroup: THREE.Group;
  private nameSprite: THREE.Sprite;
  private nameCanvas: HTMLCanvasElement;
  private nameCtx: CanvasRenderingContext2D;
  private nameTex: THREE.CanvasTexture;

  // Animation clocks
  private walkCycle = 0;
  private actionTimer = 0;

  constructor(robeColorHex = 0x82888f) {
    this.mesh = new THREE.Group();

    // Materials
    const robeMat = new THREE.MeshStandardMaterial({
      color: robeColorHex,
      roughness: 0.88,
    });
    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x3d3935,
      roughness: 0.9,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde3cf,
      roughness: 0.55,
    });
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0xfca5a5,
      roughness: 0.8,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
    });

    // 1. Pelvis Root Group (Hip height ~0.45)
    this.pelvisGroup = new THREE.Group();
    this.pelvisGroup.position.y = 0.45;
    this.mesh.add(this.pelvisGroup);

    // 2. Torso Group (bends at waist)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0, 0);
    this.pelvisGroup.add(this.torsoGroup);

    // Body Mesh (tunic)
    const bodyGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.72, 16);
    this.bodyMesh = new THREE.Mesh(bodyGeo, robeMat);
    this.bodyMesh.position.y = 0.36;
    this.bodyMesh.castShadow = true;
    this.torsoGroup.add(this.bodyMesh);

    // Sash Belt (가사 띠)
    const beltGeo = new THREE.CylinderGeometry(0.33, 0.36, 0.1, 16);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.36;
    this.torsoGroup.add(belt);

    // 3. Head Group (Cute Big Round Head with Rosy Cheeks & Monk Ears)
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.78; // At top of torso

    const headGeo = new THREE.SphereGeometry(0.36, 24, 24);
    headGeo.scale(1.0, 0.95, 0.98);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Blushing rosy cheeks
    const cheekGeo = new THREE.SphereGeometry(0.08, 12, 12);
    cheekGeo.scale(1.2, 0.8, 0.5);

    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(-0.22, -0.04, 0.28);
    this.headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
    cheekR.position.set(0.22, -0.04, 0.28);
    this.headGroup.add(cheekR);

    // Smiling eyes (평온한 눈)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x27272a });
    const eyeGeo = new THREE.TorusGeometry(0.04, 0.012, 8, 16, Math.PI);
    eyeGeo.rotateX(Math.PI);

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.13, 0.06, 0.34);
    this.headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.13, 0.06, 0.34);
    this.headGroup.add(eyeR);

    // Monk ears
    const earGeo = new THREE.SphereGeometry(0.09, 12, 12);
    earGeo.scale(0.5, 1.2, 0.8);

    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.35, 0.0, 0);
    this.headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.35, 0.0, 0);
    this.headGroup.add(earR);

    // Prayer beads necklace (동자승 염주 / 단주)
    const beadsGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 20);
    beadsGeo.rotateX(Math.PI / 2.5);
    const beadsMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 });
    const beads = new THREE.Mesh(beadsGeo, beadsMat);
    beads.position.set(0, -0.2, 0.1);
    this.headGroup.add(beads);

    this.torsoGroup.add(this.headGroup);

    // 4. Arms with Shoulder Pivots & Hands
    const armGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.46, 10);
    armGeo.translate(0, -0.22, 0);

    const handGeo = new THREE.SphereGeometry(0.07, 10, 10);

    // Left Arm Pivot (at shoulder)
    this.armPivotL = new THREE.Group();
    this.armPivotL.position.set(-0.36, 0.62, 0);

    const armMeshL = new THREE.Mesh(armGeo, robeMat);
    armMeshL.castShadow = true;
    this.armPivotL.add(armMeshL);

    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(0, -0.46, 0);
    this.armPivotL.add(handL);

    this.torsoGroup.add(this.armPivotL);

    // Right Arm Pivot (at shoulder)
    this.armPivotR = new THREE.Group();
    this.armPivotR.position.set(0.36, 0.62, 0);

    const armMeshR = new THREE.Mesh(armGeo, robeMat);
    armMeshR.castShadow = true;
    this.armPivotR.add(armMeshR);

    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(0, -0.46, 0);
    this.armPivotR.add(handR);

    this.torsoGroup.add(this.armPivotR);

    // 5. Legs with Hip Pivots & White Monk Shoes (버선과 고무신)
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.42, 8);
    legGeo.translate(0, -0.19, 0);

    const shoeGeo = new THREE.BoxGeometry(0.15, 0.09, 0.24);

    // Left Leg Pivot
    this.legPivotL = new THREE.Group();
    this.legPivotL.position.set(-0.16, 0, 0);

    const legMeshL = new THREE.Mesh(legGeo, robeMat);
    legMeshL.castShadow = true;
    this.legPivotL.add(legMeshL);

    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(0, -0.38, 0.04);
    this.legPivotL.add(shoeL);

    this.pelvisGroup.add(this.legPivotL);

    // Right Leg Pivot
    this.legPivotR = new THREE.Group();
    this.legPivotR.position.set(0.16, 0, 0);

    const legMeshR = new THREE.Mesh(legGeo, robeMat);
    legMeshR.castShadow = true;
    this.legPivotR.add(legMeshR);

    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0, -0.38, 0.04);
    this.legPivotR.add(shoeR);

    this.pelvisGroup.add(this.legPivotR);

    // 6. Ground Shadow
    const shadowGeo = new THREE.CircleGeometry(0.44, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.mesh.add(shadowMesh);

    // 7. Meditation Cushion & Aura (명상용 좌복 / 방석)
    this.cushionGroup = new THREE.Group();
    this.cushionGroup.position.set(0, 0.04, 0);
    this.cushionGroup.visible = false;

    const cushionGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.12, 24);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x6e2a2a, // Traditional rich burgundy cushion
      roughness: 0.8,
    });
    const cushionMesh = new THREE.Mesh(cushionGeo, cushionMat);
    this.cushionGroup.add(cushionMesh);

    // Cushion golden trim ring
    const trimGeo = new THREE.TorusGeometry(0.5, 0.02, 8, 24);
    trimGeo.rotateX(Math.PI / 2);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.4,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = 0.06;
    this.cushionGroup.add(trim);

    // Subtle soft zen lotus aura ring
    const auraGeo = new THREE.RingGeometry(0.54, 0.72, 24);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 0.01;
    this.cushionGroup.add(aura);

    this.mesh.add(this.cushionGroup);

    // 8. Overhead Nametag Billboard Canvas
    this.nameCanvas = document.createElement('canvas');
    this.nameCanvas.width = 280;
    this.nameCanvas.height = 70;
    this.nameCtx = this.nameCanvas.getContext('2d')!;

    this.nameTex = new THREE.CanvasTexture(this.nameCanvas);
    this.nameTex.colorSpace = THREE.SRGBColorSpace;
    const nameSpriteMat = new THREE.SpriteMaterial({ map: this.nameTex, transparent: true });
    this.nameSprite = new THREE.Sprite(nameSpriteMat);
    this.nameSprite.position.set(0, 2.15, 0);
    this.nameSprite.scale.set(1.5, 0.42, 1);
    this.mesh.add(this.nameSprite);

    this.updateNametag('수행자 (나)');
  }

  public setAction(action: AvatarActionType) {
    if (this.currentAction === action) return;
    this.currentAction = action;
    this.actionTimer = 0;

    // Update nametag label based on activity
    switch (action) {
      case 'meditating':
        this.updateNametag('고요한 명상 중 🧘');
        this.cushionGroup.visible = true;
        break;
      case 'bowing':
        this.updateNametag('108배 정진 중 🙏');
        this.cushionGroup.visible = false;
        break;
      case 'dharma':
        this.updateNametag('대웅전 법문 경청 📿');
        this.cushionGroup.visible = false;
        break;
      case 'poheng':
        this.updateNametag('묵언 포행 (산책) 🌿');
        this.cushionGroup.visible = false;
        break;
      case 'mindsharing':
        this.updateNametag('마음나누기 🍵');
        this.cushionGroup.visible = false;
        break;
      case 'sitting':
        this.updateNametag('연화정 의자 차담 🪑');
        this.cushionGroup.visible = false;
        break;
      default:
        this.updateNametag('수행자 (나)');
        this.cushionGroup.visible = false;
        break;
    }
  }

  private updateNametag(label: string) {
    const ctx = this.nameCtx;
    ctx.clearRect(0, 0, this.nameCanvas.width, this.nameCanvas.height);

    ctx.fillStyle = 'rgba(28, 25, 23, 0.85)';
    ctx.roundRect(10, 6, 260, 56, 18);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Noto Serif KR", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 140, 34);

    this.nameTex.needsUpdate = true;
  }

  public updateAnimation(isMoving: boolean, delta: number) {
    this.actionTimer += delta;

    if (isMoving) {
      // Hide cushion while walking
      this.cushionGroup.visible = false;

      // 1. Walking mode
      if (this.currentAction === 'poheng') {
        // Mindful Monastic Walking (차수 묵언 포행)
        // Calm, measured steps with hands folded at abdomen (차수 자세)
        this.walkCycle += delta * 5.2;

        const legAngle = Math.sin(this.walkCycle) * 0.38;
        this.legPivotL.rotation.set(legAngle, 0, 0);
        this.legPivotR.rotation.set(-legAngle, 0, 0);

        // Chasu posture: Both hands clasped calmly in front of lower abdomen
        this.armPivotL.rotation.set(0.68, 0.42, 0.35);
        this.armPivotR.rotation.set(0.68, -0.42, -0.35);

        // Slow calm vertical grounding
        this.pelvisGroup.position.y = 0.45 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.03;
        this.torsoGroup.rotation.set(0, 0, 0);
        this.headGroup.rotation.set(0.06, 0, 0);
        this.mesh.rotation.z = Math.sin(this.walkCycle) * 0.02;
      } else {
        // Adorable Novice Monk Waddle Walk
        this.walkCycle += delta * 11;
        const legAngle = Math.sin(this.walkCycle) * 0.55;

        this.legPivotL.rotation.set(legAngle, 0, 0);
        this.legPivotR.rotation.set(-legAngle, 0, 0);

        this.armPivotL.rotation.set(-legAngle * 0.65, 0, 0.1);
        this.armPivotR.rotation.set(legAngle * 0.65, 0, -0.1);

        this.pelvisGroup.position.y = 0.45 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.06;
        this.torsoGroup.rotation.set(0.04, 0, 0);
        this.mesh.rotation.z = Math.sin(this.walkCycle) * 0.06;
        this.headGroup.rotation.set(0, 0, -Math.sin(this.walkCycle) * 0.04);
      }
    } else {
      // 2. Stationary / Activity Animations
      this.mesh.rotation.z = THREE.MathUtils.damp(this.mesh.rotation.z, 0, 8, delta);

      switch (this.currentAction) {
        case 'meditating': {
          // ==========================================
          // 🧘 명상 (Meditation / 좌선)
          // ==========================================
          this.cushionGroup.visible = true;

          // Lower body down onto cushion
          this.pelvisGroup.position.y = THREE.MathUtils.damp(this.pelvisGroup.position.y, 0.15, 6, delta);

          // Fold legs horizontally in lotus posture (결가부좌)
          this.legPivotL.rotation.set(1.35, 0.45, 0.55);
          this.legPivotR.rotation.set(1.35, -0.45, -0.55);

          // Dhyana Mudra (선정인): Hands placed in lap, right palm in left, thumbs gently touching
          this.armPivotL.rotation.set(0.72, 0.45, 0.32);
          this.armPivotR.rotation.set(0.72, -0.45, -0.32);

          // Deep mindful breathing motion (abdominal and torso expansion)
          const breath = Math.sin(this.actionTimer * 1.5) * 0.035;
          this.torsoGroup.scale.set(1 + breath, 1 + breath * 0.4, 1 + breath);
          this.torsoGroup.rotation.set(0.05, 0, 0);

          // Serene head tilt, eyes cast 45 degrees downward
          this.headGroup.rotation.set(0.12 + breath * 0.3, 0, 0);
          break;
        }

        case 'bowing': {
          // ==========================================
          // 🙏 108배 (108 Bows / 오체투지 참회 절)
          // Complete Korean Buddhist 5-point prostration cycle (~5.4s cycle)
          // ==========================================
          this.cushionGroup.visible = false;
          this.torsoGroup.scale.set(1, 1, 1);

          const bowDuration = 5.4;
          const cycle = (this.actionTimer % bowDuration) / bowDuration;

          if (cycle < 0.22) {
            // Phase 1: Standing in Hapjang (합장), knees beginning to bend
            const t = cycle / 0.22;
            this.pelvisGroup.position.y = THREE.MathUtils.lerp(0.45, 0.32, t);
            this.torsoGroup.rotation.set(THREE.MathUtils.lerp(0, 0.2, t), 0, 0);

            // Hapjang: Palms pressed together at chest
            this.armPivotL.rotation.set(0.85, 0.55, 0.45);
            this.armPivotR.rotation.set(0.85, -0.55, -0.45);

            this.legPivotL.rotation.set(THREE.MathUtils.lerp(0, 0.5, t), 0, 0);
            this.legPivotR.rotation.set(THREE.MathUtils.lerp(0, 0.5, t), 0, 0);
            this.headGroup.rotation.set(0.15, 0, 0);
          } else if (cycle < 0.48) {
            // Phase 2: Kneeling down, bowing torso to the floor (오체투지: 두 무릎, 이마, 팔꿈치가 바닥에 닿음)
            const t = (cycle - 0.22) / 0.26;
            this.pelvisGroup.position.y = THREE.MathUtils.lerp(0.32, 0.1, t);
            this.torsoGroup.rotation.set(THREE.MathUtils.lerp(0.2, 1.48, t), 0, 0);

            // Arms lower to touch the floor in front
            this.armPivotL.rotation.set(THREE.MathUtils.lerp(0.85, 1.55, t), 0.15, 0.15);
            this.armPivotR.rotation.set(THREE.MathUtils.lerp(0.85, 1.55, t), -0.15, -0.15);

            this.legPivotL.rotation.set(1.4, 0, 0);
            this.legPivotR.rotation.set(1.4, 0, 0);
            this.headGroup.rotation.set(THREE.MathUtils.lerp(0.15, 0.45, t), 0, 0);
          } else if (cycle < 0.68) {
            // Phase 3: Jeopjokrye (접족례: 손바닥을 뒤집어 귀 옆으로 살짝 들어올려 부처님 발을 받드는 지극한 공경)
            const t = (cycle - 0.48) / 0.20;
            const lift = Math.sin(t * Math.PI) * 0.25;

            this.pelvisGroup.position.y = 0.08;
            this.torsoGroup.rotation.set(1.5, 0, 0);

            // Palms raise slightly upward in Jeopjokrye
            this.armPivotL.rotation.set(1.35 - lift, 0.45, 0.45);
            this.armPivotR.rotation.set(1.35 - lift, -0.45, -0.45);

            this.legPivotL.rotation.set(1.45, 0, 0);
            this.legPivotR.rotation.set(1.45, 0, 0);
            this.headGroup.rotation.set(0.5, 0, 0);
          } else if (cycle < 0.86) {
            // Phase 4: Palms back to ground, pushing torso up to kneeling
            const t = (cycle - 0.68) / 0.18;
            this.pelvisGroup.position.y = THREE.MathUtils.lerp(0.08, 0.32, t);
            this.torsoGroup.rotation.set(THREE.MathUtils.lerp(1.5, 0.25, t), 0, 0);

            // Pushing up back to Hapjang
            this.armPivotL.rotation.set(THREE.MathUtils.lerp(1.35, 0.85, t), 0.5, 0.4);
            this.armPivotR.rotation.set(THREE.MathUtils.lerp(1.35, 0.85, t), -0.5, -0.4);

            this.legPivotL.rotation.set(THREE.MathUtils.lerp(1.45, 0.5, t), 0, 0);
            this.legPivotR.rotation.set(THREE.MathUtils.lerp(1.45, 0.5, t), 0, 0);
            this.headGroup.rotation.set(0.2, 0, 0);
          } else {
            // Phase 5: Rising back up to standing in Hapjang (합장)
            const t = (cycle - 0.86) / 0.14;
            this.pelvisGroup.position.y = THREE.MathUtils.lerp(0.32, 0.45, t);
            this.torsoGroup.rotation.set(THREE.MathUtils.lerp(0.25, 0, t), 0, 0);

            // Standing tall in Hapjang
            this.armPivotL.rotation.set(0.85, 0.55, 0.45);
            this.armPivotR.rotation.set(0.85, -0.55, -0.45);

            this.legPivotL.rotation.set(THREE.MathUtils.lerp(0.5, 0, t), 0, 0);
            this.legPivotR.rotation.set(THREE.MathUtils.lerp(0.5, 0, t), 0, 0);
            this.headGroup.rotation.set(0.05, 0, 0);
          }
          break;
        }

        case 'dharma': {
          // ==========================================
          // 📿 법문 듣기 (Listening to Master Pomnyun's Dharma Talk)
          // Palms in Hapjang (합장) with appreciative, awakened nodding
          // ==========================================
          this.cushionGroup.visible = false;
          this.pelvisGroup.position.y = THREE.MathUtils.damp(this.pelvisGroup.position.y, 0.45, 6, delta);
          this.torsoGroup.scale.set(1, 1, 1);
          this.torsoGroup.rotation.set(0.04, 0, 0);

          // Hapjang prayer posture
          this.armPivotL.rotation.set(0.85, 0.55, 0.45);
          this.armPivotR.rotation.set(0.85, -0.55, -0.45);

          this.legPivotL.rotation.set(0, 0, 0);
          this.legPivotR.rotation.set(0, 0, 0);

          // Attentive nodding motion
          const nod = Math.sin(this.actionTimer * 2.2);
          const nodAngle = nod > 0 ? nod * 0.16 : 0;
          this.headGroup.rotation.set(0.08 + nodAngle, 0, Math.sin(this.actionTimer * 0.8) * 0.04);
          break;
        }

        case 'poheng': {
          // ==========================================
          // 🌿 묵언 포행 (Mindful Walking - Stationary Pause)
          // Standing calmly in Chasu posture (차수)
          // ==========================================
          this.cushionGroup.visible = false;
          this.pelvisGroup.position.y = THREE.MathUtils.damp(this.pelvisGroup.position.y, 0.45, 6, delta);
          this.torsoGroup.scale.set(1, 1, 1);
          this.torsoGroup.rotation.set(0, 0, 0);

          // Chasu posture: Both hands clasping in front of lower abdomen
          this.armPivotL.rotation.set(0.68, 0.42, 0.35);
          this.armPivotR.rotation.set(0.68, -0.42, -0.35);

          this.legPivotL.rotation.set(0, 0, 0);
          this.legPivotR.rotation.set(0, 0, 0);

          const breath = Math.sin(this.actionTimer * 1.4) * 0.015;
          this.headGroup.rotation.set(0.06 + breath, 0, 0);
          break;
        }

        case 'mindsharing': {
          // ==========================================
          // 🍵 마음 나누기 (Mind Sharing with Fellow Practitioners)
          // Seated warm posture with welcoming hand gestures and friendly head tilt
          // ==========================================
          this.cushionGroup.visible = true;
          this.pelvisGroup.position.y = THREE.MathUtils.damp(this.pelvisGroup.position.y, 0.18, 6, delta);

          // Seated comfortably
          this.legPivotL.rotation.set(1.3, 0.4, 0.4);
          this.legPivotR.rotation.set(1.3, -0.4, -0.4);

          // Welcoming gesturing hands
          const gesture = Math.sin(this.actionTimer * 1.5) * 0.12;
          this.armPivotL.rotation.set(0.6 + gesture, 0.3, 0.25);
          this.armPivotR.rotation.set(0.7 - gesture, -0.4, -0.3);

          this.torsoGroup.rotation.set(0.06, 0, Math.sin(this.actionTimer * 1.2) * 0.03);
          this.headGroup.rotation.set(0.05, Math.sin(this.actionTimer * 1.0) * 0.08, Math.sin(this.actionTimer * 1.4) * 0.06);
          break;
        }

        case 'sitting': {
          // ==========================================
          // 🪑 연화정 원목 의자에 앉기 (Sitting on Chair)
          // ==========================================
          this.cushionGroup.visible = false;
          // Position pelvis at chair cushion level
          this.pelvisGroup.position.y = THREE.MathUtils.damp(this.pelvisGroup.position.y, 0.42, 8, delta);
          this.torsoGroup.scale.set(1, 1, 1);
          this.torsoGroup.rotation.set(-0.06, 0, 0); // Resting comfortably against chair back

          // Legs bent forward 90 degrees at hips and down to floor
          this.legPivotL.rotation.set(1.57, 0, 0.05);
          this.legPivotR.rotation.set(1.57, 0, -0.05);

          // Hands resting comfortably near tea cup
          const teaGesture = Math.sin(this.actionTimer * 1.5) * 0.05;
          this.armPivotL.rotation.set(0.72 + teaGesture, 0.25, 0.2);
          this.armPivotR.rotation.set(0.72 - teaGesture, -0.25, -0.2);

          const breath = Math.sin(this.actionTimer * 1.4) * 0.015;
          this.headGroup.rotation.set(0.04 + breath, Math.sin(this.actionTimer * 0.7) * 0.04, 0);
          break;
        }

        default: {
          // ==========================================
          // 🌸 기본 평온한 대기 (Idle)
          // ==========================================
          this.cushionGroup.visible = false;
          this.pelvisGroup.position.y = THREE.MathUtils.damp(this.pelvisGroup.position.y, 0.45, 6, delta);
          this.torsoGroup.scale.set(1, 1, 1);
          this.torsoGroup.rotation.set(0, 0, 0);

          this.legPivotL.rotation.set(0, 0, 0);
          this.legPivotR.rotation.set(0, 0, 0);

          // Arms resting naturally by the sides with slight curve
          this.armPivotL.rotation.set(0.18, 0, 0.12);
          this.armPivotR.rotation.set(0.18, 0, -0.12);

          const idleBreath = Math.sin(this.actionTimer * 1.6) * 0.015;
          this.headGroup.rotation.set(idleBreath, 0, 0);
          break;
        }
      }
    }
  }
}
