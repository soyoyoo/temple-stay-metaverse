import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TempleBuilder, InteractiveHotspot, CollisionBox } from './TempleBuilder';
import { PlayerAvatar, AvatarActionType } from './PlayerAvatar';
import { OtherPractitionersManager } from './OtherPractitioners';
import { InWorldProgramModal } from './InWorldProgramModal';
import { sound } from '../utils/soundEngine';
import {
  Compass,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  X,
  Calendar,
  Footprints,
  Flame,
  BookOpen,
  Eye,
  MousePointerClick,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';

interface MetaverseSceneProps {
  currentTempleId: 'seocho' | 'mungyeong' | 'jukrim';
  onSelectTemple: (id: 'seocho' | 'mungyeong' | 'jukrim') => void;
}

export const MetaverseScene: React.FC<MetaverseSceneProps> = ({
  currentTempleId,
  onSelectTemple,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Active in-world program modal
  const [activeModal, setActiveModal] = useState<
    'meditation' | 'bows108' | 'dharma' | 'mindshare' | 'walking' | 'booking' | null
  >(null);

  const [activeNearbyHotspot, setActiveNearbyHotspot] = useState<InteractiveHotspot | null>(null);
  const activeNearbyHotspotRef = useRef<InteractiveHotspot | null>(null);
  const [avatarAction, setAvatarAction] = useState<AvatarActionType>('idle');
  const avatarRef = useRef<PlayerAvatar | null>(null);

  const [cameraMode, setCameraMode] = useState<'third' | 'first'>('third');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [clickMoveFeedback, setClickMoveFeedback] = useState<string | null>(null);
  const [isAutoWalking, setIsAutoWalking] = useState(false);
  const [autoWalkMessage, setAutoWalkMessage] = useState<string | null>(null);

  // Chair Sitting States (연화정 마당 원목 의자 앉기)
  const [isSittingOnChair, setIsSittingOnChair] = useState(false);
  const isSittingOnChairRef = useRef(false);
  const [isNearYeonhwajeongChairs, setIsNearYeonhwajeongChairs] = useState(false);
  const isNearChairsRef = useRef(false);

  // Mutable refs for Three.js render loop
  const playerPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 18));
  const playerTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 18));
  const playerTargetRotation = useRef<number>(0);
  const playerCurrentRotation = useRef<number>(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const hotspotsRef = useRef<InteractiveHotspot[]>([]);
  const collisionBoxesRef = useRef<CollisionBox[]>([]);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const waypointMarkerRef = useRef<THREE.Group | null>(null);

  const waypointQueueRef = useRef<THREE.Vector3[]>([]);
  const walkTargetActionRef = useRef<AvatarActionType | null>(null);
  const walkTargetLabelRef = useRef<string | null>(null);
  const walkTargetHotspotRef = useRef<string | null>(null);

  // Continuous Mountain Terrain Height (산속으로 파묻히지 않고 산을 올라가게)
  const calculateMountainHeight = useCallback((x: number, z: number, templeId: string): number => {
    if (templeId === 'seocho') return 0.0;
    const maxCoord = Math.max(Math.abs(x), Math.abs(z));
    if (maxCoord <= 62.0) return 0.0;
    const blend = THREE.MathUtils.clamp((maxCoord - 62.0) / 22.0, 0, 1);
    const rawHeight =
      (Math.sin(x * 0.04) + Math.cos(z * 0.04)) * 3.8 +
      Math.sin(x * 0.018) * 7.5 +
      Math.cos(z * 0.02) * 6.5;
    return Math.max(0, rawHeight) * blend;
  }, []);

  // Surface Elevation Calculation (마루 위로 걷기 & 언덕/산 능선 위로 걷기)
  const getSurfaceElevation = useCallback((x: number, z: number, templeId: string): number => {
    let hallElev = 0.0;

    // 1. Main Dharma Hall (대웅전: center 0, -48, floor top y = 0.80)
    // Bounds: x: [-19, 19], z: [-61, -35]
    if (x >= -19 && x <= 19 && z >= -61 && z <= -35) {
      hallElev = Math.max(hallElev, 0.80);
    } else if (Math.abs(x) <= 9.0 && z > -35 && z <= -29) {
      // Gentle wide entrance steps ramp from z = -29 (y = 0.0) to z = -35 (y = 0.80)
      const t = (-29 - z) / 6.0;
      hallElev = Math.max(hallElev, THREE.MathUtils.clamp(t, 0, 1) * 0.80);
    }

    // 2. Meditation Hall (선방 · 명상원: center -48, 0, floor top y = 0.80)
    // Bounds: x: [-62, -34], z: [-17, 17]
    if (x >= -62 && x <= -34 && z >= -17 && z <= 17) {
      hallElev = Math.max(hallElev, 0.80);
    } else if (Math.abs(z) <= 9.0 && x > -34 && x <= -29) {
      // Entrance steps ramp facing courtyard from x = -29 (0.0) to x = -34 (0.80)
      const t = (-29 - x) / 5.0;
      hallElev = Math.max(hallElev, THREE.MathUtils.clamp(t, 0, 1) * 0.80);
    }

    // 3. 108 Bows Hall (108배 정진전: center 48, 0, floor top y = 0.70)
    // Bounds: x: [34, 62], z: [-17, 17]
    if (x >= 34 && x <= 62 && z >= -17 && z <= 17) {
      hallElev = Math.max(hallElev, 0.70);
    } else if (Math.abs(z) <= 9.0 && x >= 29 && x < 34) {
      // Entrance steps ramp facing courtyard from x = 29 (0.0) to x = 34 (0.70)
      const t = (x - 29) / 5.0;
      hallElev = Math.max(hallElev, THREE.MathUtils.clamp(t, 0, 1) * 0.70);
    }

    // 4. Bell Pavilion (범종각: center -38, 42, floor top y = 0.80)
    if (x >= -46 && x <= -30 && z >= 34 && z <= 50) {
      hallElev = Math.max(hallElev, 0.80);
    }

    // 5. Mountain slopes & hills (산속으로 파묻히지 않고 산을 올라가게)
    const mountainElev = calculateMountainHeight(x, z, templeId);

    return Math.max(hallElev, mountainElev);
  }, [calculateMountainHeight]);

  // 4 Chairs in Yeonhwajeong around the central tea table (38, 42)
  const YEONHWAJEONG_CHAIRS = [
    { x: 41.5, z: 42.0, rotY: -Math.PI / 2, label: '동쪽 의자' },
    { x: 38.0, z: 45.5, rotY: -Math.PI, label: '남쪽 의자' },
    { x: 34.5, z: 42.0, rotY: Math.PI / 2, label: '서쪽 의자' },
    { x: 38.0, z: 38.5, rotY: 0, label: '북쪽 의자' },
  ];

  // Smart Walk Navigation (벽에 막히지 않고 뚫린 길로 알아서 찾아가기)
  const walkToLocation = useCallback((locationId: 'dharma' | 'meditation' | 'bows108' | 'courtyard' | 'mindshare' | 'walking') => {
    // Stand up if currently sitting
    if (isSittingOnChairRef.current) {
      isSittingOnChairRef.current = false;
      setIsSittingOnChair(false);
    }

    const currentX = playerPos.current.x;
    const currentZ = playerPos.current.z;

    const queue: THREE.Vector3[] = [];
    const courtyardHub = new THREE.Vector3(0, 0, 8);

    // If player is deep inside one of the wings or halls, route smoothly via open central courtyard hub
    const isFarWing = Math.abs(currentX) > 20 || currentZ < -25 || currentZ > 30;
    if (isFarWing) {
      queue.push(courtyardHub.clone());
    }

    let finalAction: AvatarActionType = 'idle';
    let targetLabel = '';
    let hotspotId: string | null = null;

    switch (locationId) {
      case 'dharma': {
        targetLabel = '대웅전';
        finalAction = 'dharma';
        hotspotId = 'dharma';
        // Open front steps into prayer hall
        queue.push(new THREE.Vector3(0, 0.0, -26));
        queue.push(new THREE.Vector3(0, 0.80, -38));
        queue.push(new THREE.Vector3(0, 0.80, -48));
        break;
      }
      case 'meditation': {
        targetLabel = '선방 · 명상원 (명상 방석 착석)';
        finalAction = 'meditating';
        hotspotId = 'meditation';
        // Open West branch, wide steps, and directly to center cushion
        queue.push(new THREE.Vector3(-24, 0.0, 0));
        queue.push(new THREE.Vector3(-36, 0.80, 0));
        queue.push(new THREE.Vector3(-48, 0.88, 0)); // Center meditation cushion!
        break;
      }
      case 'bows108': {
        targetLabel = '108배 정진전 (정진 방석)';
        finalAction = 'bowing';
        hotspotId = 'bows108';
        // Open East branch, wide steps, and directly to center bowing mat
        queue.push(new THREE.Vector3(24, 0.0, 0));
        queue.push(new THREE.Vector3(36, 0.70, 0));
        queue.push(new THREE.Vector3(48, 0.75, 0)); // Center bowing mat!
        break;
      }
      case 'courtyard': {
        targetLabel = '푸른 잔디 마당';
        finalAction = 'idle';
        hotspotId = null;
        queue.push(new THREE.Vector3(0, 0.0, 10));
        break;
      }
      case 'mindshare': {
        targetLabel = '연화정 마당 (차담 의자 착석)';
        finalAction = 'sitting';
        hotspotId = 'mindshare';
        queue.push(new THREE.Vector3(26, 0.0, 26));
        queue.push(new THREE.Vector3(38.0, 0.0, 38.5)); // North chair
        break;
      }
      case 'walking': {
        targetLabel = '대나무 숲길 (포행로)';
        finalAction = 'poheng';
        hotspotId = 'walking';
        queue.push(new THREE.Vector3(32, 0.0, -18));
        queue.push(new THREE.Vector3(54, 0.0, -38));
        break;
      }
    }

    // Set correct surface elevation on all route waypoints
    for (const wp of queue) {
      wp.y = getSurfaceElevation(wp.x, wp.z, currentTempleId);
    }

    const finalTarget = queue[queue.length - 1];
    waypointQueueRef.current = queue;
    walkTargetActionRef.current = finalAction;
    walkTargetLabelRef.current = targetLabel;
    walkTargetHotspotRef.current = hotspotId;

    const firstWp = queue.shift()!;
    playerTargetPos.current.copy(firstWp);

    if (waypointMarkerRef.current) {
      waypointMarkerRef.current.position.set(finalTarget.x, finalTarget.y + 0.05, finalTarget.z);
      waypointMarkerRef.current.visible = true;
    }

    setIsAutoWalking(true);
    // setAutoWalkMessage(`${targetLabel}(으)로 걸어갑니다...`);

    if (avatarAction !== 'poheng' && finalAction === 'poheng') {
      setAvatarAction('poheng');
      avatarRef.current?.setAction('poheng');
    } else if (avatarAction !== 'idle' && finalAction !== 'poheng') {
      setAvatarAction('idle');
      avatarRef.current?.setAction('idle');
    }
  }, [avatarAction, currentTempleId, getSurfaceElevation]);

  // Toggle Sit on Yeonhwajeong Chair (연화정 의자 앉기 / 일어나기 기능)
  const toggleSitOnChair = useCallback(() => {
    if (isSittingOnChairRef.current) {
      // Stand up
      isSittingOnChairRef.current = false;
      setIsSittingOnChair(false);
      setAvatarAction('idle');
      avatarRef.current?.setAction('idle');
      setClickMoveFeedback('의자에서 일어났습니다 🚶');
      setTimeout(() => setClickMoveFeedback(null), 2500);
      return;
    }

    // Find closest chair
    let closestChair = YEONHWAJEONG_CHAIRS[0];
    let minDist = Infinity;
    for (const chair of YEONHWAJEONG_CHAIRS) {
      const dist = Math.hypot(playerPos.current.x - chair.x, playerPos.current.z - chair.z);
      if (dist < minDist) {
        minDist = dist;
        closestChair = chair;
      }
    }

    // If player is far away, walk directly to Yeonhwajeong chair
    if (minDist > 14.0) {
      walkToLocation('mindshare');
      return;
    }

    // Immediately sit down on the nearest chair
    const elev = getSurfaceElevation(closestChair.x, closestChair.z, currentTempleId);
    playerPos.current.set(closestChair.x, elev, closestChair.z);
    playerTargetPos.current.copy(playerPos.current);
    playerTargetRotation.current = closestChair.rotY;
    playerCurrentRotation.current = closestChair.rotY;

    if (avatarRef.current) {
      avatarRef.current.mesh.position.set(closestChair.x, elev, closestChair.z);
      avatarRef.current.mesh.rotation.y = closestChair.rotY;
      avatarRef.current.setAction('sitting');
    }

    isSittingOnChairRef.current = true;
    setIsSittingOnChair(true);
    setAvatarAction('sitting');

    sound.playSingingBowl();
    setClickMoveFeedback(`연화정 ${closestChair.label}에 앉아 따뜻한 차담을 나눕니다 🪑🍵`);
    setTimeout(() => setClickMoveFeedback(null), 3200);
  }, [currentTempleId, getSurfaceElevation, walkToLocation]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL as instructed by Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene Setup
    const scene = new THREE.Scene();

    const sanctuaryThemes = {
      mungyeong: {
        sky: 0xb5c6bf, // Deep mountain misty morning
        fogDensity: 0.012,
        groundColor: 0x3d4a3e,
        sunIntensity: 2.1,
      },
      seocho: {
        sky: 0xd9e6f2, // High-rise rooftop clear sky
        fogDensity: 0.007,
        groundColor: 0x5a6361,
        sunIntensity: 2.3,
      },
      jukrim: {
        sky: 0xbed1c3, // Pastoral countryside atmosphere
        fogDensity: 0.013,
        groundColor: 0x314631,
        sunIntensity: 2.0,
      },
    };
    const currentTheme = sanctuaryThemes[currentTempleId] || sanctuaryThemes.mungyeong;

    scene.background = new THREE.Color(currentTheme.sky);
    scene.fog = new THREE.FogExp2(currentTheme.sky, currentTheme.fogDensity);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      280
    );
    camera.position.set(0, 7.5, 23);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);

    // 4. Lighting Rig
    const sunLight = new THREE.DirectionalLight(0xfffaed, currentTheme.sunIntensity);
    sunLight.position.set(34, 52, 28);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 140;
      sunLight.shadow.camera.left = -40;
      sunLight.shadow.camera.right = 40;
      sunLight.shadow.camera.top = 40;
      sunLight.shadow.camera.bottom = -40;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xdceaf5, currentTheme.groundColor, 0.95);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // 5. Expansive Terrain Ground (360m x 360m, 64x64 segments)
    const groundGeo = new THREE.PlaneGeometry(360, 360, 64, 64);
    groundGeo.rotateX(-Math.PI / 2);

    if (currentTempleId !== 'seocho') {
      const posAttr = groundGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const height = calculateMountainHeight(vx, vz, currentTempleId);
        posAttr.setY(i, height);
      }
      groundGeo.computeVertexNormals();
    }

    const groundMat = new THREE.MeshStandardMaterial({
      color: currentTheme.groundColor,
      roughness: 0.95,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    groundMeshRef.current = ground;
    scene.add(ground);

    // 6. Click Waypoint Marker (Glowing Lotus Ring)
    const waypointGroup = new THREE.Group();
    waypointGroup.position.set(0, 0.05, 18);
    waypointGroup.visible = false;

    const ringGeo = new THREE.RingGeometry(0.35, 0.65, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    waypointGroup.add(ring);

    const jewelGeo = new THREE.ConeGeometry(0.22, 0.42, 8);
    const jewelMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
    });
    const jewel = new THREE.Mesh(jewelGeo, jewelMat);
    jewel.position.y = 0.22;
    waypointGroup.add(jewel);

    scene.add(waypointGroup);
    waypointMarkerRef.current = waypointGroup;

    // 7. 4x Scale Temple Architecture & Expansive Environments
    const builder = new TempleBuilder();

    // Specific Environmental Surrounding:
    if (currentTempleId === 'seocho') {
      const urbanEnv = builder.buildSeochoUrbanEnvironment();
      scene.add(urbanEnv);
    } else if (currentTempleId === 'mungyeong') {
      const mountainEnv = builder.buildMungyeongMountainEnvironment();
      scene.add(mountainEnv);
    } else {
      const bambooEnv = builder.buildJukrimBambooEnvironment();
      scene.add(bambooEnv);
    }

    // Main Dharma Hall with Golden Buddha Statue (대웅전 - 금색 부처님 상 봉안)
    const dharmaHall = builder.buildMainDharmaHall(0, -48);
    scene.add(dharmaHall);

    // Meditation Hall (선방 · 명상원 - West)
    const medHall = builder.buildMeditationHall(-48, 0);
    scene.add(medHall);

    // 108 Bows Hall (108배 정진전 - East)
    const bowsHall = builder.buildBows108Hall(48, 0);
    scene.add(bowsHall);

    // Bell Pavilion (범종각 - South-West)
    const bellPavilion = builder.buildBellPavilion(-38, 42);
    scene.add(bellPavilion);

    // Calming Green Lawn Courtyard (마음 편해지는 넓은 잔디밭 마당)
    const peacefulLawn = builder.buildPeacefulLawnCourtyard(0, 0);
    scene.add(peacefulLawn);

    // Lotus Pond & Mind Sharing Courtyard (연화정 마당 - South-East)
    const mindCourtyard = builder.buildMindSharingCourtyard(38, 42);
    scene.add(mindCourtyard);

    // Bamboo Forest Trail (죽림 포행로 - North-East)
    const bambooTrail = builder.buildBambooForestTrail(54, -38);
    scene.add(bambooTrail);

    // Stone Lanterns
    const lanternPositions = [
      [-8, 16], [8, 16],
      [-14, -12], [14, -12],
      [-24, 0], [24, 0],
      [0, -28],
      [-22, 28], [22, 28],
    ];
    lanternPositions.forEach(([lx, lz]) => {
      const lantern = builder.buildStoneLantern(lx, lz);
      scene.add(lantern);
    });

    hotspotsRef.current = builder.hotspots;
    collisionBoxesRef.current = builder.collisionBoxes;

    // 8. Other Practitioners (다중 접속 귀여운 동자승 및 도반 아바타들)
    const otherPractitioners = new OtherPractitionersManager();
    scene.add(otherPractitioners.group);

    // 9. Cute Novice Monk Player Avatar (귀여운 동자승 아바타)
    const avatar = new PlayerAvatar();
    avatar.mesh.position.copy(playerPos.current);
    avatar.setAction(avatarAction);
    scene.add(avatar.mesh);
    avatarRef.current = avatar;

    // 10. Wall Collision Checking Helper (실내에서 벽을 뚫고 이동하지 못하게 방지 - 문 통과 원활)
    const checkCollision = (testPos: THREE.Vector3, padding = 0.20): boolean => {
      for (const box of collisionBoxesRef.current) {
        if (
          testPos.x >= box.minX - padding &&
          testPos.x <= box.maxX + padding &&
          testPos.z >= box.minZ - padding &&
          testPos.z <= box.maxZ + padding
        ) {
          return true; // Wall hit!
        }
      }
      return false;
    };

    // 11. Mouse Raycaster for Click-to-Move
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let pointerDownX = 0;
    let pointerDownY = 0;
    let isMouseDown = false;
    let cameraYaw = 0;

    const handlePointerDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      isMouseDown = true;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - pointerDownX;
      cameraYaw -= dx * 0.005;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (dist < 8 && container && groundMeshRef.current) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(groundMeshRef.current);

        if (intersects.length > 0) {
          const hit = intersects[0].point;

          // If sitting on chair, stand up smoothly
          if (isSittingOnChairRef.current) {
            isSittingOnChairRef.current = false;
            setIsSittingOnChair(false);
            setAvatarAction('idle');
            avatarRef.current?.setAction('idle');
          }

          // Cancel auto-walking queue on manual click
          waypointQueueRef.current = [];
          setIsAutoWalking(false);
          setAutoWalkMessage(null);

          // Target clamped within 4x bounds
          const targetX = THREE.MathUtils.clamp(hit.x, -120, 120);
          const targetZ = THREE.MathUtils.clamp(hit.z, -120, 120);
          const targetY = getSurfaceElevation(targetX, targetZ, currentTempleId);

          playerTargetPos.current.set(targetX, targetY, targetZ);

          if (waypointMarkerRef.current) {
            waypointMarkerRef.current.position.set(targetX, targetY + 0.05, targetZ);
            waypointMarkerRef.current.visible = true;
          }

          // setClickMoveFeedback(`총총 걸어갑니다... (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
          setTimeout(() => setClickMoveFeedback(null), 2500);
        }
      }
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        if (isSittingOnChairRef.current) {
          isSittingOnChairRef.current = false;
          setIsSittingOnChair(false);
          setAvatarAction('idle');
          avatarRef.current?.setAction('idle');
        }
        waypointQueueRef.current = [];
        setIsAutoWalking(false);
        setAutoWalkMessage(null);
      }
      if (key === 'f') {
        toggleSitOnChair();
      }
      if (key === 'e' || e.key === 'Enter') {
        const spot = activeNearbyHotspotRef.current;
        if (spot) {
          if (spot.id === 'bell') {
            sound.playTempleGong();
          } else {
            setActiveModal(spot.id as 'meditation' | 'bows108' | 'dharma' | 'mindshare' | 'walking');
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // 12. Animation Tick Loop
    const clock = new THREE.Clock();
    let frameId = 0;

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Update cute novice monk practitioners
      otherPractitioners.update(delta);

      // Check click-to-move distance
      const toTarget = new THREE.Vector3().subVectors(playerTargetPos.current, playerPos.current);
      toTarget.y = 0;
      const distanceToTarget = toTarget.length();

      // Check keyboard input
      let kbX = 0;
      let kbZ = 0;
      const keys = keysPressed.current;
      if (keys['w'] || keys['arrowup']) kbZ -= 1;
      if (keys['s'] || keys['arrowdown']) kbZ += 1;
      if (keys['a'] || keys['arrowleft']) kbX -= 1;
      if (keys['d'] || keys['arrowright']) kbZ += 1;

      const isKeyboardMoving = kbX !== 0 || kbZ !== 0;
      let isMoving = false;

      if (isKeyboardMoving) {
        const moveVec = new THREE.Vector2(kbX, kbZ).normalize();
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

        const deltaPos = new THREE.Vector3()
          .addScaledVector(forward, -moveVec.y)
          .addScaledVector(right, moveVec.x)
          .multiplyScalar(7.0 * delta);

        // WALL COLLISION DETECTION (벽 뚫림 방지 - Sliding along wall)
        const nextPosX = new THREE.Vector3(playerPos.current.x + deltaPos.x, playerPos.current.y, playerPos.current.z);
        if (!checkCollision(nextPosX)) {
          playerPos.current.x = nextPosX.x;
        }

        const nextPosZ = new THREE.Vector3(playerPos.current.x, playerPos.current.y, playerPos.current.z + deltaPos.z);
        if (!checkCollision(nextPosZ)) {
          playerPos.current.z = nextPosZ.z;
        }

        playerTargetPos.current.copy(playerPos.current);
        playerTargetRotation.current = Math.atan2(deltaPos.x, deltaPos.z);
        isMoving = true;

        if (waypointMarkerRef.current) {
          waypointMarkerRef.current.visible = false;
        }
      } else if (distanceToTarget > 0.35) {
        const walkDir = toTarget.clone().normalize();
        const stepDist = Math.min(6.5 * delta, distanceToTarget);
        const deltaPos = walkDir.clone().multiplyScalar(stepDist);

        // WALL COLLISION DETECTION for Walk-to-Move
        const nextPosX = new THREE.Vector3(playerPos.current.x + deltaPos.x, playerPos.current.y, playerPos.current.z);
        let blockedX = false;
        if (!checkCollision(nextPosX, 0.20)) {
          playerPos.current.x = nextPosX.x;
        } else {
          blockedX = true;
        }

        const nextPosZ = new THREE.Vector3(playerPos.current.x, playerPos.current.y, playerPos.current.z + deltaPos.z);
        let blockedZ = false;
        if (!checkCollision(nextPosZ, 0.20)) {
          playerPos.current.z = nextPosZ.z;
        } else {
          blockedZ = true;
        }

        // If completely blocked by a corner, advance to next waypoint or stop
        if (blockedX && blockedZ) {
          if (waypointQueueRef.current.length > 0) {
            const nextWp = waypointQueueRef.current.shift()!;
            playerTargetPos.current.copy(nextWp);
          } else {
            playerTargetPos.current.copy(playerPos.current);
            if (waypointMarkerRef.current) waypointMarkerRef.current.visible = false;
          }
        } else {
          playerTargetRotation.current = Math.atan2(walkDir.x, walkDir.z);
          isMoving = true;
        }
      } else {
        // Current waypoint reached!
        if (waypointQueueRef.current.length > 0) {
          const nextWp = waypointQueueRef.current.shift()!;
          playerTargetPos.current.copy(nextWp);
          isMoving = true;
        } else {
          // Reached final destination!
          if (waypointMarkerRef.current && waypointMarkerRef.current.visible) {
            waypointMarkerRef.current.visible = false;
          }
          if (isAutoWalking) {
            setIsAutoWalking(false);
            const action = walkTargetActionRef.current;
            if (action) {
              setAvatarAction(action);
              avatarRef.current?.setAction(action);

              if (action === 'meditating') {
                // Auto-sit directly on the center meditation cushion in Meditation Hall!
                playerPos.current.set(-48, 0.88, 0);
                playerTargetPos.current.copy(playerPos.current);
                playerTargetRotation.current = Math.PI / 2;
                playerCurrentRotation.current = Math.PI / 2;
                avatar.mesh.position.copy(playerPos.current);
                avatar.mesh.rotation.y = Math.PI / 2;
                sound.playSingingBowl();
                setAutoWalkMessage('선방 명상 방석에 가부좌로 착석하였습니다 🧘');
              } else if (action === 'bowing') {
                // Auto-align directly on the bowing mat in 108 Bows Hall!
                playerPos.current.set(48, 0.75, 0);
                playerTargetPos.current.copy(playerPos.current);
                playerTargetRotation.current = -Math.PI / 2;
                playerCurrentRotation.current = -Math.PI / 2;
                avatar.mesh.position.copy(playerPos.current);
                avatar.mesh.rotation.y = -Math.PI / 2;
                sound.playMoktak();
                setAutoWalkMessage('108배 정진전 방석에서 참회 정진을 시작합니다 🙏');
              } else if (action === 'sitting') {
                isSittingOnChairRef.current = true;
                setIsSittingOnChair(true);
                playerTargetRotation.current = 0; // face table
                playerCurrentRotation.current = 0;
                avatar.mesh.rotation.y = 0;
                sound.playSingingBowl();
                setAutoWalkMessage('연화정 의자에 앉아 따뜻한 차담을 나눕니다 🪑🍵');
              } else {
                const label = walkTargetLabelRef.current || '목적지';
                setAutoWalkMessage(`${label}에 도착했습니다 🙏`);
              }
            }
            setTimeout(() => setAutoWalkMessage(null), 3500);
          }
        }
      }

      // Stand up if moving while sitting
      if (isMoving && isSittingOnChairRef.current) {
        isSittingOnChairRef.current = false;
        setIsSittingOnChair(false);
        setAvatarAction('idle');
        avatarRef.current?.setAction('idle');
      }

      playerPos.current.x = THREE.MathUtils.clamp(playerPos.current.x, -120, 120);
      playerPos.current.z = THREE.MathUtils.clamp(playerPos.current.z, -120, 120);

      // SURFACE ELEVATION TRACKING (마루 위로 걷기 & 언덕/산 능선 위로 걷기)
      // Smoothly lifts the practitioner onto raised floors and hill terrain slopes so they never sink!
      const currentSurfaceY = getSurfaceElevation(playerPos.current.x, playerPos.current.z, currentTempleId);
      playerPos.current.y = THREE.MathUtils.damp(playerPos.current.y, currentSurfaceY, 16, delta);
      avatar.mesh.position.y = playerPos.current.y;

      playerCurrentRotation.current = THREE.MathUtils.damp(
        playerCurrentRotation.current,
        playerTargetRotation.current,
        14,
        delta
      );
      avatar.mesh.rotation.y = playerCurrentRotation.current;
      avatar.mesh.position.x = playerPos.current.x;
      avatar.mesh.position.z = playerPos.current.z;
      avatar.updateAnimation(isMoving, delta);

      if (waypointMarkerRef.current && waypointMarkerRef.current.visible) {
        const pulse = 1 + Math.sin(clock.getElapsedTime() * 8) * 0.15;
        waypointMarkerRef.current.scale.set(pulse, 1, pulse);
      }

      // Camera Follow (Smoothly tracks elevation Y + lookTarget Y in 4x spacious scale)
      if (cameraMode === 'third') {
        const camDistance = 9.5;
        const camHeight = 4.6;
        const targetCamX = playerPos.current.x + Math.sin(cameraYaw) * camDistance;
        const targetCamZ = playerPos.current.z + Math.cos(cameraYaw) * camDistance;
        const targetCamY = playerPos.current.y + camHeight;

        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 6, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 6, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 6, delta);

        const lookTarget = new THREE.Vector3(
          playerPos.current.x,
          playerPos.current.y + 1.2,
          playerPos.current.z
        );
        camera.lookAt(lookTarget);
      } else {
        camera.position.set(
          playerPos.current.x,
          playerPos.current.y + 1.45,
          playerPos.current.z
        );
        const lookDir = new THREE.Vector3(0, 0, -10).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        camera.lookAt(playerPos.current.clone().add(lookDir));
      }

      // Check proximity to landmarks
      let nearestSpot: InteractiveHotspot | null = null;
      let minDistance = Infinity;

      for (const spot of hotspotsRef.current) {
        const dist = playerPos.current.distanceTo(spot.position);
        if (dist <= spot.radius && dist < minDistance) {
          minDistance = dist;
          nearestSpot = spot;
        }
      }

      if (nearestSpot?.id !== activeNearbyHotspotRef.current?.id) {
        activeNearbyHotspotRef.current = nearestSpot;
        setActiveNearbyHotspot(nearestSpot);
      }

      // Proximity to Yeonhwajeong chairs for sitting prompt (at 38, 42)
      const distToChairs = Math.hypot(playerPos.current.x - 38, playerPos.current.z - 42);
      const isNearChairs = distToChairs < 8.5;
      if (isNearChairs !== isNearChairsRef.current) {
        isNearChairsRef.current = isNearChairs;
        setIsNearYeonhwajeongChairs(isNearChairs);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      avatarRef.current = null;
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [currentTempleId, cameraMode]);

  const templeTitles = {
    mungyeong: {
      name: '수련원 본도량',
      envNote: '깊은 산속 희양산 원시림과 푸른 잔디 마당',
    },
    seocho: {
      name: '사회문화회관',
      envNote: '도심 속 선원과 푸른 잔디 정원',
    },
    jukrim: {
      name: 'J 정사',
      envNote: '근교의 산사 돌담과 울창한 대나무 숲',
    },
  };

  // Synchronize avatar animation with opened program modal or deliberate user choice
  useEffect(() => {
    if (activeModal === 'meditation') {
      setAvatarAction('meditating');
      avatarRef.current?.setAction('meditating');
    } else if (activeModal === 'bows108') {
      setAvatarAction('bowing');
      avatarRef.current?.setAction('bowing');
    } else if (activeModal === 'dharma') {
      setAvatarAction('dharma');
      avatarRef.current?.setAction('dharma');
    } else if (activeModal === 'walking') {
      setAvatarAction('poheng');
      avatarRef.current?.setAction('poheng');
    } else if (activeModal === 'mindshare') {
      setAvatarAction('mindsharing');
      avatarRef.current?.setAction('mindsharing');
    } else if (!activeModal) {
      if (avatarAction !== 'poheng' && avatarAction !== 'meditating' && avatarAction !== 'bowing') {
        setAvatarAction('idle');
        avatarRef.current?.setAction('idle');
      }
    }
  }, [activeModal]);

  return (
    <div className="relative w-screen h-screen bg-stone-950 overflow-hidden select-none">
      
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Top Left: 3D Sanctuary HUD Status & Sanctuary Switcher */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <div className="bg-stone-950/85 backdrop-blur-md border border-stone-700/80 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-serif text-xs font-semibold">
            淨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-serif text-stone-400">3D 체험 메타버스</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-sans flex items-center gap-1">
                <Users className="w-3 h-3 inline" />
                <span>도반 6명 실시간 접속 중</span>
              </span>
            </div>
            <h1 className="text-sm font-serif font-semibold text-white tracking-tight">
              {templeTitles[currentTempleId].name}
            </h1>
            <p className="text-[11px] text-amber-400/90 font-serif">
              {templeTitles[currentTempleId].envNote}
            </p>
          </div>
        </div>

        {/* 3 Sanctuary Switcher Pills */}
        <div className="mt-2 flex gap-1.5 bg-stone-950/80 p-1 rounded-xl border border-stone-800">
          {[
            { id: 'mungyeong' as const, label: '깊은 산속 수련원' },
            { id: 'seocho' as const, label: '도심속 회관' },
            { id: 'jukrim' as const, label: '근교 산사' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectTemple(s.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-colors ${
                currentTempleId === s.id
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Right: View Controls, Bell strike, Booking & Help */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setActiveModal('booking')}
          className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
        >
          <Calendar className="w-4 h-4 text-stone-900" />
          <span>템플스테이 신청</span>
        </button>

        <button
          onClick={() => setCameraMode(cameraMode === 'third' ? 'first' : 'third')}
          className="p-2.5 bg-stone-950/80 hover:bg-stone-900 border border-stone-700/70 text-stone-200 rounded-xl text-xs flex items-center gap-1 font-sans"
          title="시점 변경"
        >
          <Eye className="w-4 h-4 text-stone-400" />
          <span className="hidden sm:inline">{cameraMode === 'third' ? '3인칭' : '1인칭'}</span>
        </button>

        <button
          onClick={() => sound.playTempleGong()}
          className="p-2.5 bg-stone-950/80 hover:bg-stone-900 border border-stone-700/70 text-stone-200 rounded-xl text-xs flex items-center gap-1"
          title="범종 타종"
        >
          <Volume2 className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">타종</span>
        </button>

        <button
          onClick={() => setShowHelpModal(true)}
          className="p-2.5 bg-stone-950/80 hover:bg-stone-900 border border-stone-700/70 text-stone-200 rounded-xl text-xs flex items-center gap-1"
          title="조작 안내"
        >
          <HelpCircle className="w-4 h-4 text-stone-400" />
        </button>
      </div>

      {/* Proximity Interaction Prompt Banner */}
      {activeNearbyHotspot && (
        <div className="absolute top-26 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-bounce">
          <button
            onClick={() => {
              if (activeNearbyHotspot.id === 'bell') {
                sound.playTempleGong();
              } else {
                setActiveModal(activeNearbyHotspot.id as 'meditation' | 'bows108' | 'dharma' | 'mindshare' | 'walking');
              }
            }}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 font-serif font-semibold text-xs sm:text-sm border-2 border-white/80 transition-transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>[{activeNearbyHotspot.title}] {activeNearbyHotspot.id === 'bell' ? '타종하기' : '체험 시작'}</span>
            <span className="text-[11px] bg-stone-900 text-white px-2 py-0.5 rounded-full font-mono">
              클릭 / [E]키
            </span>
          </button>
        </div>
      )}

      {/* Yeonhwajeong Chair Sit / Stand Button (연화정 마당 의자 앉기 / 일어나기) */}
      {(isNearYeonhwajeongChairs || isSittingOnChair) && (
        <div className="absolute top-38 left-1/2 -translate-x-1/2 z-25 pointer-events-auto">
          <button
            onClick={toggleSitOnChair}
            className={`px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 font-serif font-semibold text-xs sm:text-sm border-2 transition-all active:scale-95 ${
              isSittingOnChair
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 border-amber-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-white/90 animate-bounce'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isSittingOnChair ? '🚶 의자에서 일어나기' : '🪑 연화정 의자에 앉기 (차담)'}</span>
            <span className="text-[11px] bg-stone-900/90 text-amber-300 px-2 py-0.5 rounded-full font-mono">
              클릭 / [F]키
            </span>
          </button>
        </div>
      )}

      {/* Mouse Click-to-Move Guidance Toast */}
      {clickMoveFeedback && (
        <div className="absolute top-50 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-stone-900/90 text-amber-300 border border-amber-500/40 px-4 py-1.5 rounded-full text-xs font-serif shadow-lg animate-fade-in flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>{clickMoveFeedback}</span>
          </div>
        </div>
      )}

      {/* Unified Bottom Dock: 5 Core Programs & Golden Buddha Hall */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-4xl transition-all duration-300 pointer-events-auto ${
          isControlsCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        {/* Toggle Collapse */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="px-4 py-1 bg-stone-950/90 text-stone-300 hover:text-white rounded-t-lg border-t border-x border-stone-700 text-xs font-serif flex items-center gap-1.5 shadow-md"
          >
            {isControlsCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>5대 수행 프로그램 및 장소 바로가기</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>참선 모드 (메뉴 접기)</span>
              </>
            )}
          </button>
        </div>

        {/* Dock Panel */}
        <div className="bg-stone-950/92 backdrop-blur-md border border-stone-700/80 rounded-2xl p-4 shadow-2xl text-stone-200">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-serif mb-2.5">
            <span className="flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
              <span>잔디밭 클릭 이동 · 마루 & 언덕 위 보행 · 연화정 의자 앉기(F) · 수행자 실시간 동행</span>
            </span>
            <span className="hidden sm:inline text-amber-300/90 font-serif">
              메뉴를 클릭하면 자연스럽게 걸어서 이동합니다 🚶
            </span>
          </div>

          {/* 걸어서 이동 중 알림 배너 */}
          {autoWalkMessage && (
            <div className="mb-2.5 px-3.5 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs rounded-xl flex items-center justify-between font-serif animate-pulse">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-amber-400" />
                <span className="font-medium">{autoWalkMessage}</span>
              </div>
              <span className="text-[10px] bg-stone-900/85 px-2 py-0.5 rounded text-stone-300">
                {isAutoWalking ? '걸어서 이동 중...' : '도착 완료 🙏'}
              </span>
            </div>
          )}

          {/* 동자승 수행 자세 실시간 3D 애니메이션 컨트롤 바 */}
          <div className="mb-3 p-2 bg-stone-900/90 backdrop-blur-md rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-serif">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-400"> 수행 자세:</span>
              <span className="text-[11px] text-stone-300">
                {avatarAction === 'idle' && '자유 이동 (평온한 걸음)'}
                {avatarAction === 'sitting' && '연화정 의자 차담 (원목 의자 착석 & 따뜻한 차 한 잔 🪑🍵)'}
                {avatarAction === 'meditating' && '좌선 명상 (결가부좌 & 선정 호흡)'}
                {avatarAction === 'bowing' && '108배 참회 (합장 & 절수행)'}
                {avatarAction === 'dharma' && '법문 경청 (합장 & 깨달음의 끄덕임)'}
                {avatarAction === 'poheng' && '묵언 포행 (차수 자세 & 느린 걸음)'}
                {avatarAction === 'mindsharing' && '마음나누기 (따뜻한 담소와 손짓)'}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'idle' as const, label: '🚶 걷기/서기' },
                { id: 'sitting' as const, label: '🪑 의자앉기' },
                { id: 'meditating' as const, label: '🧘 좌선 명상' },
                { id: 'bowing' as const, label: '🙏 108배' },
                { id: 'dharma' as const, label: '📿 법문듣기' },
                { id: 'poheng' as const, label: '🌿 묵언 포행' },
                { id: 'mindsharing' as const, label: '🍵 마음나누기' },
              ].map((act) => (
                <button
                  key={act.id}
                  onClick={() => {
                    if (act.id === 'sitting') {
                      toggleSitOnChair();
                    } else {
                      if (isSittingOnChairRef.current) {
                        isSittingOnChairRef.current = false;
                        setIsSittingOnChair(false);
                      }
                      setAvatarAction(act.id);
                      avatarRef.current?.setAction(act.id);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all ${
                    avatarAction === act.id
                      ? 'bg-amber-500 text-stone-950 font-semibold shadow-md scale-105'
                      : 'bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6 Sanctuary Locations Walking Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            
            {/* 1. Main Dharma Hall with Golden Buddha */}
            <button
              onClick={() => walkToLocation('dharma')}
              className="p-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl text-left transition-all hover:scale-[1.02] group"
              title="대웅전으로 걸어서 이동"
            >
              <div className="flex items-center justify-between text-amber-300 mb-0.5">
                <span className="font-serif font-semibold">대웅전</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              </div>
              <span className="text-[11px] text-amber-200/90 block font-serif">부처님 상 & 법문</span>
            </button>

            {/* 2. Meditation Hall */}
            <button
              onClick={() => walkToLocation('meditation')}
              className="p-2.5 bg-stone-800/80 hover:bg-stone-700/90 border border-stone-700 rounded-xl text-left transition-all hover:scale-[1.02] group"
              title="선방(명상원)으로 걸어서 이동"
            >
              <div className="flex items-center justify-between text-amber-400 mb-0.5">
                <span className="font-serif font-semibold">선방 · 명상원</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
              </div>
              <span className="text-[11px] text-stone-300 block font-serif">호흡 명상</span>
            </button>

            {/* 3. 108 Bows Hall */}
            <button
              onClick={() => walkToLocation('bows108')}
              className="p-2.5 bg-stone-800/80 hover:bg-stone-700/90 border border-stone-700 rounded-xl text-left transition-all hover:scale-[1.02] group"
              title="108배 정진전으로 걸어서 이동"
            >
              <div className="flex items-center justify-between text-amber-400 mb-0.5">
                <span className="font-serif font-semibold">108배 정진전</span>
                <Flame className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] text-stone-300 block font-serif">108배 정진</span>
            </button>

            {/* 4. Peaceful Lawn Courtyard (마당) */}
            <button
              onClick={() => walkToLocation('courtyard')}
              className="p-2.5 bg-stone-800/80 hover:bg-stone-700/90 border border-stone-700 rounded-xl text-left transition-all hover:scale-[1.02] group"
              title="푸른 잔디밭 마당으로 걸어서 이동"
            >
              <div className="flex items-center justify-between text-emerald-400 mb-0.5">
                <span className="font-serif font-semibold">푸른 잔디 마당</span>
                <Footprints className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] text-stone-300 block font-serif">디딤돌 & 들꽃 산책</span>
            </button>

            {/* 5. Mind Sharing (연화정 마당 - 차담 테이블과 의자) */}
            <button
              onClick={() => walkToLocation('mindshare')}
              className="p-2.5 bg-stone-800/80 hover:bg-stone-700/90 border border-stone-700 rounded-xl text-left transition-all hover:scale-[1.02] group"
              title="연화정 차담 테이블로 걸어서 이동"
            >
              <div className="flex items-center justify-between text-amber-400 mb-0.5">
                <span className="font-serif font-semibold">연화정 마당</span>
                <Sparkles className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] text-stone-300 block font-serif">차담 & 마음나누기</span>
            </button>

            {/* 6. Bamboo Forest Trail (대나무 숲길) */}
            <button
              onClick={() => walkToLocation('walking')}
              className="p-2.5 bg-stone-800/80 hover:bg-stone-700/90 border border-stone-700 rounded-xl text-left transition-all hover:scale-[1.02] group"
              title="대나무 숲길로 걸어서 이동"
            >
              <div className="flex items-center justify-between text-amber-400 mb-0.5">
                <span className="font-serif font-semibold">대나무 숲길</span>
                <Footprints className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] text-stone-300 block font-serif">묵언 포행</span>
            </button>

          </div>
        </div>
      </div>

      {/* Control Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] text-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h4 className="font-serif font-bold text-lg">3D 메타버스 으뜸절 안내</h4>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-stone-200"
              >
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs sm:text-sm text-stone-700 font-sans">
              <div className="flex justify-between items-center p-2.5 bg-stone-100 rounded-lg">
                <span className="font-medium">마우스 클릭 이동 (잔디밭 & 길)</span>
                <span className="font-mono bg-white px-2 py-1 rounded border border-stone-300 font-semibold text-amber-800">
                  바닥 클릭 / 터치
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-stone-100 rounded-lg">
                <span className="font-medium">실내 벽 충돌 방지</span>
                <span className="text-emerald-700 font-medium">
                  벽을 통과할 수 없으며 정문으로 입장
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-stone-100 rounded-lg">
                <span className="font-medium">연화정 의자 앉기 / 일어나기</span>
                <span className="font-mono bg-white px-2 py-1 rounded border border-stone-300 font-semibold text-emerald-800">
                  [F] 키 또는 의자 클릭
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-stone-100 rounded-lg">
                <span className="font-medium">마루 위 & 언덕 위 보행</span>
                <span className="text-amber-800 font-medium">
                  대웅전·선방 마루 및 언덕 위로 자연스럽게 이동
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-stone-100 rounded-lg">
                <span className="font-medium">카메라 시점 회전</span>
                <span className="font-mono bg-white px-2 py-1 rounded border border-stone-300 font-semibold">
                  마우스 드래그 / 터치 스와이프
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-stone-100 rounded-lg">
                <span className="font-medium">장소 이동 및 수행 기능 이용</span>
                <span className="font-mono bg-white px-2 py-1 rounded border border-stone-300 font-semibold">
                  [E] 키 또는 하단 메뉴 버튼
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-3 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
            >
              확인하고 3D 도량 거닐기
            </button>
          </div>
        </div>
      )}

      {/* In-World Program Modal (Meditation, 108 Bows, Dharma, MindShare, Walking, Booking) */}
      <InWorldProgramModal
        programId={activeModal}
        onClose={() => setActiveModal(null)}
        templeId={currentTempleId}
      />

    </div>
  );
};
