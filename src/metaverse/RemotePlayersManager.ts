import * as THREE from 'three';
import type { AvatarActionType } from './PlayerAvatar';
import type { RemotePlayerState } from './MultiplayerClient';

interface RemoteAvatarInstance {
  id: string;
  nickname: string;
  mesh: THREE.Group;
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  legPivotL: THREE.Group;
  legPivotR: THREE.Group;
  armPivotL: THREE.Group;
  armPivotR: THREE.Group;
  cushionGroup: THREE.Group;
  nameCtx: CanvasRenderingContext2D;
  nameCanvas: HTMLCanvasElement;
  nameTex: THREE.CanvasTexture;
  targetPos: THREE.Vector3;
  targetRotY: number;
  currentRotY: number;
  action: AvatarActionType;
  isMoving: boolean;
  walkCycle: number;
  actionTimer: number;
}

export class RemotePlayersManager {
  public group: THREE.Group;
  private players = new Map<string, RemoteAvatarInstance>();

  constructor() {
    this.group = new THREE.Group();
  }

  public syncAll(list: RemotePlayerState[]) {
    const incomingIds = new Set(list.map((p) => p.id));

    // Remove players no longer in this temple
    for (const id of Array.from(this.players.keys())) {
      if (!incomingIds.has(id)) {
        this.removePlayer(id);
      }
    }

    // Add or update players
    for (const p of list) {
      if (this.players.has(p.id)) {
        this.updatePlayerState(p);
        this.renamePlayer(p.id, p.nickname);
      } else {
        this.addPlayer(p);
      }
    }
  }

  public addPlayer(data: RemotePlayerState) {
    // Idempotent guard per real-time guidelines
    if (this.players.has(data.id)) {
      this.updatePlayerState(data);
      this.renamePlayer(data.id, data.nickname);
      return;
    }

    const mesh = new THREE.Group();
    mesh.position.set(data.x, data.y, data.z);
    mesh.rotation.y = data.rotY;

    const robeMat = new THREE.MeshStandardMaterial({
      color: data.robeColor || 0x768285,
      roughness: 0.85,
    });
    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x3b3531,
      roughness: 0.9,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfee4d2,
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

    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.y = 0.45;
    mesh.add(pelvisGroup);

    const torsoGroup = new THREE.Group();
    pelvisGroup.add(torsoGroup);

    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.72, 16), robeMat);
    bodyMesh.position.y = 0.36;
    bodyMesh.castShadow = true;
    torsoGroup.add(bodyMesh);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.1, 16), beltMat);
    belt.position.y = 0.36;
    torsoGroup.add(belt);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.78;

    const headGeo = new THREE.SphereGeometry(0.36, 20, 20);
    headGeo.scale(1.0, 0.95, 0.98);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    const cheekGeo = new THREE.SphereGeometry(0.08, 10, 10);
    cheekGeo.scale(1.2, 0.8, 0.5);
    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(-0.22, -0.04, 0.28);
    headGroup.add(cheekL);
    const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
    cheekR.position.set(0.22, -0.04, 0.28);
    headGroup.add(cheekR);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x27272a });
    const eyeGeo = new THREE.TorusGeometry(0.04, 0.012, 8, 14, Math.PI);
    eyeGeo.rotateX(Math.PI);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.13, 0.06, 0.34);
    headGroup.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.13, 0.06, 0.34);
    headGroup.add(eyeR);

    const earGeo = new THREE.SphereGeometry(0.09, 10, 10);
    earGeo.scale(0.5, 1.2, 0.8);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.35, 0, 0);
    headGroup.add(earL);
    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.35, 0, 0);
    headGroup.add(earR);

    torsoGroup.add(headGroup);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.46, 10);
    armGeo.translate(0, -0.22, 0);
    const handGeo = new THREE.SphereGeometry(0.07, 10, 10);

    const armPivotL = new THREE.Group();
    armPivotL.position.set(-0.36, 0.62, 0);
    armPivotL.add(new THREE.Mesh(armGeo, robeMat));
    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(0, -0.46, 0);
    armPivotL.add(handL);
    torsoGroup.add(armPivotL);

    const armPivotR = new THREE.Group();
    armPivotR.position.set(0.36, 0.62, 0);
    armPivotR.add(new THREE.Mesh(armGeo, robeMat));
    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(0, -0.46, 0);
    armPivotR.add(handR);
    torsoGroup.add(armPivotR);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.42, 8);
    legGeo.translate(0, -0.19, 0);
    const shoeGeo = new THREE.BoxGeometry(0.15, 0.09, 0.24);

    const legPivotL = new THREE.Group();
    legPivotL.position.set(-0.16, 0, 0);
    legPivotL.add(new THREE.Mesh(legGeo, robeMat));
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(0, -0.38, 0.04);
    legPivotL.add(shoeL);
    pelvisGroup.add(legPivotL);

    const legPivotR = new THREE.Group();
    legPivotR.position.set(0.16, 0, 0);
    legPivotR.add(new THREE.Mesh(legGeo, robeMat));
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0, -0.38, 0.04);
    legPivotR.add(shoeR);
    pelvisGroup.add(legPivotR);

    const shadowGeo = new THREE.CircleGeometry(0.44, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMesh = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
    );
    shadowMesh.position.y = 0.02;
    mesh.add(shadowMesh);

    const cushionGroup = new THREE.Group();
    cushionGroup.position.set(0, 0.04, 0);
    cushionGroup.visible = false;
    const cushionMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.52, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0x2e5b4f, roughness: 0.8 })
    );
    cushionGroup.add(cushionMesh);
    mesh.add(cushionGroup);

    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 280;
    nameCanvas.height = 70;
    const nameCtx = nameCanvas.getContext('2d')!;
    const nameTex = new THREE.CanvasTexture(nameCanvas);
    nameTex.colorSpace = THREE.SRGBColorSpace;
    const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true }));
    nameSprite.position.set(0, 2.15, 0);
    nameSprite.scale.set(1.55, 0.42, 1);
    mesh.add(nameSprite);

    this.group.add(mesh);

    const instance: RemoteAvatarInstance = {
      id: data.id,
      nickname: data.nickname,
      mesh,
      pelvisGroup,
      torsoGroup,
      headGroup,
      legPivotL,
      legPivotR,
      armPivotL,
      armPivotR,
      cushionGroup,
      nameCtx,
      nameCanvas,
      nameTex,
      targetPos: new THREE.Vector3(data.x, data.y, data.z),
      targetRotY: data.rotY,
      currentRotY: data.rotY,
      action: data.action || 'idle',
      isMoving: data.isMoving,
      walkCycle: 0,
      actionTimer: 0,
    };

    this.players.set(data.id, instance);
    this.drawNametag(instance);
  }

  public updatePlayerState(update: {
    id: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    action: AvatarActionType;
    isMoving: boolean;
  }) {
    const p = this.players.get(update.id);
    if (!p) return;
    p.targetPos.set(update.x, update.y, update.z);
    p.targetRotY = update.rotY;
    if (p.action !== update.action) {
      p.action = update.action;
      p.actionTimer = 0;
      this.drawNametag(p);
    }
    p.isMoving = update.isMoving;
  }

  public renamePlayer(id: string, nickname: string) {
    const p = this.players.get(id);
    if (!p || p.nickname === nickname) return;
    p.nickname = nickname;
    this.drawNametag(p);
  }

  public removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    this.group.remove(p.mesh);
    p.nameTex.dispose();
    this.players.delete(id);
  }

  private drawNametag(p: RemoteAvatarInstance) {
    const ctx = p.nameCtx;
    ctx.clearRect(0, 0, p.nameCanvas.width, p.nameCanvas.height);

    ctx.fillStyle = 'rgba(17, 36, 28, 0.88)';
    ctx.beginPath();
    ctx.roundRect(10, 6, 260, 56, 18);
    ctx.fill();

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.stroke();

    const suffix =
      p.action === 'meditating'
        ? ' · 명상 중'
        : p.action === 'bowing'
          ? ' · 108배 중'
          : p.action === 'dharma'
            ? ' · 법문 경청'
            : p.action === 'poheng'
              ? ' · 포행 중'
              : p.action === 'sitting'
                ? ' · 차담 중'
                : '';

    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold 21px "Noto Serif KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${p.nickname}${suffix}`.slice(0, 18), 140, 34);

    p.nameTex.needsUpdate = true;
  }

  public update(delta: number) {
    this.players.forEach((p) => {
      p.actionTimer += delta;

      // Smoothly interpolate position & rotation
      const prevX = p.mesh.position.x;
      const prevZ = p.mesh.position.z;
      p.mesh.position.x = THREE.MathUtils.damp(p.mesh.position.x, p.targetPos.x, 10, delta);
      p.mesh.position.y = THREE.MathUtils.damp(p.mesh.position.y, p.targetPos.y, 12, delta);
      p.mesh.position.z = THREE.MathUtils.damp(p.mesh.position.z, p.targetPos.z, 10, delta);

      // Wrap angle difference cleanly across -PI / +PI
      let diff = p.targetRotY - p.currentRotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.currentRotY += diff * Math.min(1, delta * 10);
      p.mesh.rotation.y = p.currentRotY;

      const movedDist = Math.hypot(p.mesh.position.x - prevX, p.mesh.position.z - prevZ);
      const isMovingNow = p.isMoving || movedDist > 0.01;

      if (isMovingNow) {
        p.cushionGroup.visible = false;
        if (p.action === 'poheng') {
          p.walkCycle += delta * 5.2;
          const legAngle = Math.sin(p.walkCycle) * 0.38;
          p.legPivotL.rotation.set(legAngle, 0, 0);
          p.legPivotR.rotation.set(-legAngle, 0, 0);
          p.armPivotL.rotation.set(-0.68, -0.35, 0.38);
          p.armPivotR.rotation.set(-0.68, 0.35, -0.38);
          p.pelvisGroup.position.y = 0.45 + Math.abs(Math.sin(p.walkCycle * 2)) * 0.03;
          p.torsoGroup.rotation.set(0, 0, 0);
          p.mesh.rotation.z = Math.sin(p.walkCycle) * 0.02;
        } else {
          p.walkCycle += delta * 11;
          const legAngle = Math.sin(p.walkCycle) * 0.55;
          p.legPivotL.rotation.set(legAngle, 0, 0);
          p.legPivotR.rotation.set(-legAngle, 0, 0);
          p.armPivotL.rotation.set(-legAngle * 0.65, 0, 0.1);
          p.armPivotR.rotation.set(legAngle * 0.65, 0, -0.1);
          p.pelvisGroup.position.y = 0.45 + Math.abs(Math.sin(p.walkCycle * 2)) * 0.06;
          p.torsoGroup.rotation.set(0.04, 0, 0);
          p.mesh.rotation.z = Math.sin(p.walkCycle) * 0.06;
        }
      } else {
        p.mesh.rotation.z = THREE.MathUtils.damp(p.mesh.rotation.z, 0, 8, delta);
        switch (p.action) {
          case 'meditating':
            p.cushionGroup.visible = true;
            p.pelvisGroup.position.y = THREE.MathUtils.damp(p.pelvisGroup.position.y, 0.16, 6, delta);
            p.legPivotL.rotation.set(-1.35, -0.35, 0.45);
            p.legPivotR.rotation.set(-1.35, 0.35, -0.45);
            p.armPivotL.rotation.set(-0.75, -0.35, 0.38);
            p.armPivotR.rotation.set(-0.75, 0.35, -0.38);
            p.torsoGroup.rotation.set(0.04, 0, 0);
            break;
          case 'bowing': {
            p.cushionGroup.visible = false;
            const cycle = (p.actionTimer % 5.4) / 5.4;
            if (cycle < 0.22) {
              const t = cycle / 0.22;
              p.pelvisGroup.position.y = THREE.MathUtils.lerp(0.45, 0.32, t);
              p.torsoGroup.rotation.set(THREE.MathUtils.lerp(0, 0.15, t), 0, 0);
              const ax = THREE.MathUtils.lerp(-1.25, -2.38, t);
              p.armPivotL.rotation.set(ax, 0, 0.58);
              p.armPivotR.rotation.set(ax, 0, -0.58);
              p.legPivotL.rotation.set(THREE.MathUtils.lerp(0, -0.45, t), 0, 0);
              p.legPivotR.rotation.set(THREE.MathUtils.lerp(0, -0.45, t), 0, 0);
            } else if (cycle < 0.70) {
              p.pelvisGroup.position.y = 0.12;
              p.torsoGroup.rotation.set(1.35, 0, 0);
              p.armPivotL.rotation.set(-2.25, 0, 0.58);
              p.armPivotR.rotation.set(-2.25, 0, -0.58);
              p.legPivotL.rotation.set(1.35, 0, 0);
              p.legPivotR.rotation.set(1.35, 0, 0);
            } else {
              const t = (cycle - 0.70) / 0.30;
              p.pelvisGroup.position.y = THREE.MathUtils.lerp(0.12, 0.45, t);
              p.torsoGroup.rotation.set(THREE.MathUtils.lerp(1.35, 0, t), 0, 0);
              const ax = THREE.MathUtils.lerp(-2.25, -1.25, t);
              p.armPivotL.rotation.set(ax, 0, 0.65);
              p.armPivotR.rotation.set(ax, 0, -0.65);
              p.legPivotL.rotation.set(THREE.MathUtils.lerp(1.35, 0, t), 0, 0);
              p.legPivotR.rotation.set(THREE.MathUtils.lerp(1.35, 0, t), 0, 0);
            }
            break;
          }
          case 'dharma':
            p.cushionGroup.visible = false;
            p.pelvisGroup.position.y = THREE.MathUtils.damp(p.pelvisGroup.position.y, 0.45, 6, delta);
            p.torsoGroup.rotation.set(0.04, 0, 0);
            p.armPivotL.rotation.set(-1.25, 0, 0.68);
            p.armPivotR.rotation.set(-1.25, 0, -0.68);
            p.legPivotL.rotation.set(0, 0, 0);
            p.legPivotR.rotation.set(0, 0, 0);
            break;
          case 'poheng':
            p.cushionGroup.visible = false;
            p.pelvisGroup.position.y = THREE.MathUtils.damp(p.pelvisGroup.position.y, 0.45, 6, delta);
            p.torsoGroup.rotation.set(0, 0, 0);
            p.armPivotL.rotation.set(-0.68, -0.35, 0.38);
            p.armPivotR.rotation.set(-0.68, 0.35, -0.38);
            p.legPivotL.rotation.set(0, 0, 0);
            p.legPivotR.rotation.set(0, 0, 0);
            break;
          case 'sitting':
            p.cushionGroup.visible = false;
            p.pelvisGroup.position.y = THREE.MathUtils.damp(p.pelvisGroup.position.y, 0.42, 8, delta);
            p.torsoGroup.rotation.set(-0.06, 0, 0);
            p.legPivotL.rotation.set(-1.57, 0, 0.05);
            p.legPivotR.rotation.set(-1.57, 0, -0.05);
            p.armPivotL.rotation.set(-0.72, -0.25, 0.2);
            p.armPivotR.rotation.set(-0.72, 0.25, -0.2);
            break;
          case 'mindsharing':
            p.cushionGroup.visible = true;
            p.pelvisGroup.position.y = THREE.MathUtils.damp(p.pelvisGroup.position.y, 0.18, 6, delta);
            p.legPivotL.rotation.set(-1.3, -0.35, 0.4);
            p.legPivotR.rotation.set(-1.3, 0.35, -0.4);
            p.armPivotL.rotation.set(-0.68, -0.3, 0.25);
            p.armPivotR.rotation.set(-0.72, 0.4, -0.3);
            break;
          default:
            p.cushionGroup.visible = false;
            p.pelvisGroup.position.y = THREE.MathUtils.damp(p.pelvisGroup.position.y, 0.45, 6, delta);
            p.torsoGroup.rotation.set(0, 0, 0);
            p.legPivotL.rotation.set(0, 0, 0);
            p.legPivotR.rotation.set(0, 0, 0);
            p.armPivotL.rotation.set(-0.12, 0, 0.12);
            p.armPivotR.rotation.set(-0.12, 0, -0.12);
            break;
        }
      }
    });
  }
}
