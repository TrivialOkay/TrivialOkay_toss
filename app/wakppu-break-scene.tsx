"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  alignOuterShellPattern,
  createOuterShell,
  prepareOuterShellForFinalBreak,
  updateOuterShellFracture,
  updateOuterShellGeometry,
  type OuterShellFragment,
} from "./wakppu-outer-shell";
import { createNestLayout, type NestLayoutTarget } from "./wakppu-nest-layout";

type WakppuBreakSceneProps = {
  stage: number;
  revealed: boolean;
  onImpact: () => void;
  onNestReady: () => void;
  onNotePull: () => void;
};

type SurfaceDeformation = {
  direction: THREE.Vector3;
  currentDepth: number;
  targetDepth: number;
};

type ActivePress = {
  pointerId: number;
  startedAt: number;
  deformation: SurfaceDeformation;
};

type NoteDrag = {
  pointerId: number;
  startX: number;
  startY: number;
};

type NestFragmentMotion = NestLayoutTarget & {
  startPosition: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
  startScale: THREE.Vector3;
};

type NestPhase = "idle" | "gathering" | "ready";

type ElasticArm = {
  outline: THREE.Mesh;
  fill: THREE.Mesh;
};

type SceneRuntime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  intactBall: THREE.Mesh;
  shellGeometry: THREE.BufferGeometry;
  shellBasePositions: Float32Array;
  outerShell: THREE.Mesh;
  outerShellGeometry: THREE.BufferGeometry;
  outerShellBasePositions: Float32Array;
  outerShellFragments: OuterShellFragment[];
  deformations: SurfaceDeformation[];
  impactPoint: THREE.Vector3;
  activePress: ActivePress | null;
  noteDrag: NoteDrag | null;
  lastPressStrength: number;
  fracturePatternAligned: boolean;
  cameraTarget: THREE.Vector3;
  cameraLookAt: THREE.Vector3;
  cameraLookTarget: THREE.Vector3;
  shellScaleTarget: THREE.Vector3;
  exploded: boolean;
  noteRoot: THREE.Group;
  noteHitbox: THREE.Mesh;
  noteLoaded: boolean;
  noteReady: boolean;
  noteHome: THREE.Vector3;
  mascotRoot: THREE.Group;
  mascotHome: THREE.Vector3;
  elasticArmsRoot: THREE.Group;
  leftArm: ElasticArm;
  rightArm: ElasticArm;
  faceTintMaterial: THREE.SpriteMaterial;
  nestPhase: NestPhase;
  nestGatherStartedAt: number;
  nestMotions: NestFragmentMotion[];
  reduceMotion: boolean;
  frameId: number;
  disposed: boolean;
};

const BALL_RADIUS = 1.55;
const NOTE_MODEL = "/models/fortune-note.glb?v=20260813-folded-reference-2";
const MASCOT_IMAGE = "/outcome-mascot-happened.png";
const NOTE_SCALE = 0.78;
const NEST_GATHER_DURATION = 1480;
const CAMERA_STAGE_POSITIONS = [
  new THREE.Vector3(0, 0.34, 8.45),
  new THREE.Vector3(0.58, 0.52, 8.28),
  new THREE.Vector3(-0.62, 0.16, 8.12),
  new THREE.Vector3(0.68, 0.56, 7.98),
  new THREE.Vector3(-0.72, 0.12, 7.86),
  new THREE.Vector3(0, 0.34, 8.35),
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number) {
  const clamped = clamp(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function createFaceTintTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const gradient = context.createRadialGradient(64, 48, 5, 64, 48, 58);
  gradient.addColorStop(0, "rgba(255,104,110,.82)");
  gradient.addColorStop(0.5, "rgba(255,128,132,.48)");
  gradient.addColorStop(1, "rgba(255,150,150,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createElasticArm(): ElasticArm {
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x1b1715, transparent: true, depthWrite: false });
  const fillMaterial = new THREE.MeshBasicMaterial({ color: 0xfffdf9, transparent: true, depthWrite: false });
  const outline = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), outlineMaterial);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fillMaterial);
  outline.renderOrder = 7;
  fill.renderOrder = 8;
  return { outline, fill };
}

function placeElasticArm(arm: ElasticArm, start: THREE.Vector3, end: THREE.Vector3) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(Math.hypot(dx, dy), 0.06);
  const angle = Math.atan2(dy, dx);
  const midpointX = (start.x + end.x) * 0.5;
  const midpointY = (start.y + end.y) * 0.5;
  arm.outline.position.set(midpointX, midpointY, 1.075);
  arm.outline.rotation.z = angle;
  arm.outline.scale.set(distance, 0.15, 1);
  arm.fill.position.set(midpointX, midpointY, 1.082);
  arm.fill.rotation.z = angle;
  arm.fill.scale.set(Math.max(distance - 0.015, 0.045), 0.105, 1);
}

function createOpalTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const baseOpal = context.createLinearGradient(0, canvas.height, canvas.width, 0);
  baseOpal.addColorStop(0, "#cdb8bd");
  baseOpal.addColorStop(0.22, "#ddd0bf");
  baseOpal.addColorStop(0.5, "#cbd8cf");
  baseOpal.addColorStop(0.72, "#c7d4d2");
  baseOpal.addColorStop(1, "#d4cad8");
  context.fillStyle = baseOpal;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,252,248,.38)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  [
    { x: 0.08, y: 0.28, radius: 0.42, color: "rgba(232,190,198,.34)" },
    { x: 0.34, y: 0.76, radius: 0.38, color: "rgba(235,214,185,.3)" },
    { x: 0.55, y: 0.23, radius: 0.4, color: "rgba(190,218,205,.34)" },
    { x: 0.76, y: 0.7, radius: 0.43, color: "rgba(190,210,215,.3)" },
    { x: 0.96, y: 0.32, radius: 0.39, color: "rgba(215,201,221,.3)" },
  ].forEach(({ x, y, radius, color }) => {
    const gradient = context.createRadialGradient(
      x * canvas.width,
      y * canvas.height,
      0,
      x * canvas.width,
      y * canvas.height,
      radius * canvas.width,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.58, color.replace(/0\.\d+\)/, "0.12)"));
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  });

  const sheen = context.createLinearGradient(0, 0, 0, canvas.height);
  sheen.addColorStop(0, "rgba(255,255,255,.68)");
  sheen.addColorStop(0.4, "rgba(255,255,255,.08)");
  sheen.addColorStop(1, "rgba(74,62,69,.16)");
  context.fillStyle = sheen;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(1.25, 1);
  texture.needsUpdate = true;
  return texture;
}

function deformShellGeometry(
  geometry: THREE.BufferGeometry,
  basePositions: Float32Array,
  deformations: SurfaceDeformation[],
) {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const base = new THREE.Vector3();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    const offset = index * 3;
    base.set(basePositions[offset], basePositions[offset + 1], basePositions[offset + 2]);
    point.copy(base);
    normal.copy(base).normalize();
    deformations.forEach(({ direction, currentDepth }) => {
      if (currentDepth < 0.001) return;
      const angle = Math.acos(THREE.MathUtils.clamp(normal.dot(direction), -1, 1));
      const dent = smoothstep(1 - angle / 0.88);
      const bulge = smoothstep(1 - Math.abs(angle - 0.72) / 0.24);
      point.addScaledVector(direction, -currentDepth * dent);
      point.addScaledVector(normal, currentDepth * 0.24 * bulge);
      point.y -= currentDepth * dent * 0.08;
    });
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((item) => {
    if ("map" in item && item.map instanceof THREE.Texture) item.map.dispose();
    item.dispose();
  });
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!geometries.has(object.geometry)) {
      geometries.add(object.geometry);
      object.geometry.dispose();
    }
    const items = Array.isArray(object.material) ? object.material : [object.material];
    items.forEach((material) => {
      if (materials.has(material)) return;
      materials.add(material);
      disposeMaterial(material);
    });
  });
}

function setPointerRay(runtime: SceneRuntime, event: PointerEvent) {
  const rect = runtime.renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  runtime.raycaster.setFromCamera(pointer, runtime.camera);
}

export function WakppuBreakScene({ stage, revealed, onImpact, onNestReady, onNotePull }: WakppuBreakSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const stageRef = useRef(stage);
  const revealedRef = useRef(revealed);
  const impactCallbackRef = useRef(onImpact);
  const nestReadyCallbackRef = useRef(onNestReady);
  const notePullCallbackRef = useRef(onNotePull);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    stageRef.current = stage;
    revealedRef.current = revealed;
    impactCallbackRef.current = onImpact;
    nestReadyCallbackRef.current = onNestReady;
    notePullCallbackRef.current = onNotePull;
  }, [stage, revealed, onImpact, onNestReady, onNotePull]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    const mount = host;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.copy(CAMERA_STAGE_POSITIONS[0]);
    camera.lookAt(0, 0.16, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.className = "wakppu-break-canvas";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfffbf5, 0x716b82, 2.05));
    const keyLight = new THREE.DirectionalLight(0xfffaf2, 3.15);
    keyLight.position.set(3.5, 5, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc5e1ee, 1.25);
    fillLight.position.set(-4, 1, 3);
    scene.add(fillLight);
    const coolRimLight = new THREE.DirectionalLight(0xdff8ff, 2.25);
    coolRimLight.position.set(-4.5, 3.2, -5.5);
    scene.add(coolRimLight);
    const blushRimLight = new THREE.DirectionalLight(0xffd7e7, 1.45);
    blushRimLight.position.set(4.2, 1.2, -4.8);
    scene.add(blushRimLight);

    const opalTexture = createOpalTexture();
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: opalTexture,
      roughness: 0.27,
      metalness: 0,
      clearcoat: 0.76,
      clearcoatRoughness: 0.19,
      iridescence: 0.58,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [180, 520],
      side: THREE.DoubleSide,
    });
    const shellGeometry = new THREE.SphereGeometry(BALL_RADIUS, 48, 32);
    const shellPosition = shellGeometry.getAttribute("position") as THREE.BufferAttribute;
    const shellBasePositions = new Float32Array(shellPosition.array as Float32Array);
    const intactBall = new THREE.Mesh(shellGeometry, shellMaterial);
    scene.add(intactBall);

    const outerShellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfff5f8,
      transparent: true,
      opacity: 0.14,
      roughness: 0.12,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
      iridescence: 0.42,
      transmission: 0.34,
      thickness: 0.035,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const fragmentMaterial = outerShellMaterial.clone();
    fragmentMaterial.color.set(0xfffafd);
    fragmentMaterial.opacity = 0.2;
    fragmentMaterial.transmission = 0.78;
    fragmentMaterial.roughness = 0.08;
    fragmentMaterial.clearcoat = 1;
    fragmentMaterial.clearcoatRoughness = 0.05;
    fragmentMaterial.ior = 1.42;
    fragmentMaterial.thickness = 0.018;
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffedf6,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      clearcoat: 0.94,
      clearcoatRoughness: 0.08,
      iridescence: 0.38,
      emissive: 0x281620,
      emissiveIntensity: 0.34,
      transmission: 0.54,
      thickness: 0.012,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerShellState = createOuterShell({
      surface: outerShellMaterial,
      fragmentSurface: fragmentMaterial,
      edge: edgeMaterial,
    });
    scene.add(outerShellState.mesh);
    outerShellState.fragments.forEach((fragment) => scene.add(fragment.mesh));

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.7, 64),
      new THREE.MeshBasicMaterial({ color: 0x9a5364, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.scale.set(1, 0.38, 1);
    ground.position.y = -1.86;
    scene.add(ground);

    const noteRoot = new THREE.Group();
    noteRoot.visible = false;
    noteRoot.position.set(0, -0.34, 1.18);
    noteRoot.rotation.set(0.1, 0.08, -0.09);
    const noteHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.8, 0.12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    noteHitbox.userData.isFortuneNote = true;
    noteRoot.add(noteHitbox);
    scene.add(noteRoot);

    const mascotRoot = new THREE.Group();
    mascotRoot.visible = false;
    mascotRoot.position.set(0, -0.28, 0.28);
    const mascotMaterial = new THREE.SpriteMaterial({
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const mascotSprite = new THREE.Sprite(mascotMaterial);
    mascotSprite.scale.set(1.82, 2.02, 1);
    mascotSprite.position.set(0, 0.16, 0);
    mascotSprite.renderOrder = 7;
    mascotRoot.add(mascotSprite);
    const faceTintMaterial = new THREE.SpriteMaterial({
      map: createFaceTintTexture(),
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const faceTint = new THREE.Sprite(faceTintMaterial);
    faceTint.scale.set(0.82, 0.58, 1);
    faceTint.position.set(0, 0.43, 0.08);
    faceTint.renderOrder = 10;
    mascotRoot.add(faceTint);
    scene.add(mascotRoot);

    const elasticArmsRoot = new THREE.Group();
    elasticArmsRoot.visible = false;
    const leftArm = createElasticArm();
    const rightArm = createElasticArm();
    Object.values(leftArm).forEach((mesh) => elasticArmsRoot.add(mesh));
    Object.values(rightArm).forEach((mesh) => elasticArmsRoot.add(mesh));
    scene.add(elasticArmsRoot);

    const runtime: SceneRuntime = {
      renderer,
      scene,
      camera,
      raycaster: new THREE.Raycaster(),
      intactBall,
      shellGeometry,
      shellBasePositions,
      outerShell: outerShellState.mesh,
      outerShellGeometry: outerShellState.geometry,
      outerShellBasePositions: outerShellState.basePositions,
      outerShellFragments: outerShellState.fragments,
      deformations: [],
      impactPoint: new THREE.Vector3(0, 0, BALL_RADIUS),
      activePress: null,
      noteDrag: null,
      lastPressStrength: 0.35,
      fracturePatternAligned: false,
      cameraTarget: CAMERA_STAGE_POSITIONS[0].clone(),
      cameraLookAt: new THREE.Vector3(0, 0.16, 0),
      cameraLookTarget: new THREE.Vector3(0, 0.16, 0),
      shellScaleTarget: new THREE.Vector3(1, 1, 1),
      exploded: false,
      noteRoot,
      noteHitbox,
      noteLoaded: false,
      noteReady: false,
      noteHome: new THREE.Vector3(0, -0.34, 1.18),
      mascotRoot,
      mascotHome: new THREE.Vector3(0, -0.28, 0.28),
      elasticArmsRoot,
      leftArm,
      rightArm,
      faceTintMaterial,
      nestPhase: "idle",
      nestGatherStartedAt: 0,
      nestMotions: [],
      reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      frameId: 0,
      disposed: false,
    };
    runtimeRef.current = runtime;

    new THREE.TextureLoader().load(
      MASCOT_IMAGE,
      (texture) => {
        if (runtime.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        mascotMaterial.map = texture;
        mascotMaterial.needsUpdate = true;
      },
    );

    new GLTFLoader().load(
      NOTE_MODEL,
      (gltf) => {
        if (runtime.disposed) return;
        gltf.scene.scale.setScalar(NOTE_SCALE);
        gltf.scene.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = true;
          child.receiveShadow = true;
          child.renderOrder = 9;
        });
        noteRoot.add(gltf.scene);
        runtime.noteLoaded = true;
      },
      undefined,
      () => {
        if (!runtime.disposed) runtime.noteLoaded = true;
      },
    );

    function resize() {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    function pickNote(event: PointerEvent) {
      if (!runtime.noteReady || !runtime.noteRoot.visible) return false;
      setPointerRay(runtime, event);
      return runtime.raycaster.intersectObject(runtime.noteRoot, true).length > 0;
    }

    function handlePointerDown(event: PointerEvent) {
      if (runtime.noteDrag || runtime.activePress) return;
      if (stageRef.current >= 5) {
        if (pickNote(event)) {
          runtime.noteDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
          renderer.domElement.setPointerCapture?.(event.pointerId);
        }
        return;
      }

      setPointerRay(runtime, event);
      const hit = runtime.raycaster.intersectObject(runtime.intactBall, false)[0];
      if (!hit) return;
      const localImpact = runtime.intactBall.worldToLocal(hit.point.clone());
      runtime.impactPoint.copy(localImpact).normalize();
      runtime.activePress = {
        pointerId: event.pointerId,
        startedAt: performance.now(),
        deformation: { direction: runtime.impactPoint.clone(), currentDepth: 0, targetDepth: 0.055 },
      };
      renderer.domElement.setPointerCapture?.(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (runtime.noteDrag?.pointerId === event.pointerId) {
        const dx = event.clientX - runtime.noteDrag.startX;
        const dy = event.clientY - runtime.noteDrag.startY;
        const distance = Math.hypot(dx, dy);
        runtime.noteRoot.position.set(
          runtime.noteHome.x + THREE.MathUtils.clamp(dx / 105, -1.45, 1.45),
          runtime.noteHome.y + THREE.MathUtils.clamp(-dy / 92, -0.18, 1.72),
          runtime.noteHome.z + Math.min(distance / 210, 0.44),
        );
        if (distance >= 112 || dy <= -92) {
          runtime.noteReady = false;
          runtime.noteRoot.visible = false;
          notePullCallbackRef.current();
        }
        return;
      }
    }

    function finishPointer(event: PointerEvent) {
      if (runtime.noteDrag?.pointerId === event.pointerId) {
        runtime.noteDrag = null;
        renderer.domElement.releasePointerCapture?.(event.pointerId);
        return;
      }
      const activePress = runtime.activePress;
      if (!activePress || activePress.pointerId !== event.pointerId) return;
      runtime.activePress = null;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
      const duration = performance.now() - activePress.startedAt;
      const holdStrength = clamp((duration - 70) / 1050);
      if (!runtime.fracturePatternAligned) {
        alignOuterShellPattern(
          runtime.outerShellGeometry,
          runtime.outerShellBasePositions,
          runtime.outerShellFragments,
          runtime.impactPoint,
        );
        runtime.fracturePatternAligned = true;
      }
      activePress.deformation.targetDepth = 0.105 + holdStrength * 0.25;
      runtime.deformations.push(activePress.deformation);
      runtime.lastPressStrength = holdStrength;
      impactCallbackRef.current();
    }

    function cancelPointer(event: PointerEvent) {
      if (runtime.noteDrag?.pointerId === event.pointerId) runtime.noteDrag = null;
      if (runtime.activePress?.pointerId === event.pointerId) runtime.activePress = null;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", finishPointer);
    renderer.domElement.addEventListener("pointercancel", cancelPointer);

    const fragmentTarget = new THREE.Vector3();
    const leftArmStart = new THREE.Vector3();
    const rightArmStart = new THREE.Vector3();
    const leftArmEnd = new THREE.Vector3();
    const rightArmEnd = new THREE.Vector3();
    const noteIdleTarget = new THREE.Vector3();
    function render(time: number) {
      if (!runtime.exploded) {
        let geometryChanged = false;
        if (runtime.activePress) {
          const heldFor = performance.now() - runtime.activePress.startedAt;
          const previewStrength = clamp(heldFor / 1120);
          runtime.activePress.deformation.targetDepth = 0.055 + previewStrength * 0.285;
          if (runtime.fracturePatternAligned) {
            const pressure = clamp(stageRef.current * 0.16 + previewStrength * 0.42, 0, 0.96);
            updateOuterShellFracture(
              runtime.outerShellFragments,
              runtime.activePress.deformation.direction,
              pressure,
              runtime.activePress.deformation.currentDepth,
            );
          }
          geometryChanged = true;
        }
        const visibleDeformations = runtime.activePress
          ? [...runtime.deformations, runtime.activePress.deformation]
          : runtime.deformations;
        visibleDeformations.forEach((deformation) => {
          const nextDepth = THREE.MathUtils.lerp(deformation.currentDepth, deformation.targetDepth, 0.14);
          if (Math.abs(nextDepth - deformation.currentDepth) > 0.0002) geometryChanged = true;
          deformation.currentDepth = nextDepth;
        });
        if (geometryChanged) {
          deformShellGeometry(runtime.shellGeometry, runtime.shellBasePositions, visibleDeformations);
          updateOuterShellGeometry(
            runtime.outerShellGeometry,
            runtime.outerShellBasePositions,
            visibleDeformations,
            runtime.outerShellFragments,
          );
        }
        runtime.cameraLookAt.lerp(runtime.cameraLookTarget, 0.065);
        runtime.camera.position.lerp(runtime.cameraTarget, 0.08);
        runtime.camera.lookAt(runtime.cameraLookAt);
        runtime.intactBall.scale.lerp(runtime.shellScaleTarget, 0.16);
        runtime.outerShell.scale.lerp(runtime.shellScaleTarget, 0.16);
        const floatOffset = Math.sin(time * 0.0018) * 0.035;
        runtime.intactBall.position.y = floatOffset;
        runtime.outerShell.position.y = floatOffset;
        runtime.outerShellFragments.forEach((fragment) => {
          fragmentTarget.copy(fragment.targetPosition).multiply(runtime.shellScaleTarget);
          fragmentTarget.y += floatOffset;
          fragment.mesh.position.lerp(fragmentTarget, 0.15);
          fragment.mesh.quaternion.slerp(fragment.targetQuaternion, 0.13);
          fragment.mesh.scale.lerp(fragment.targetScale, 0.14);
        });
      }

      if (runtime.nestPhase === "gathering") {
        const rawProgress = runtime.reduceMotion
          ? 1
          : clamp((time - runtime.nestGatherStartedAt) / NEST_GATHER_DURATION);
        runtime.nestMotions.forEach((motion) => {
          const motionProgress = runtime.reduceMotion
            ? 1
            : clamp((rawProgress - motion.delay) / Math.max(1 - motion.delay, 0.01));
          const progress = smoothstep(motionProgress);
          const arc = Math.sin(progress * Math.PI);
          motion.fragment.mesh.position.lerpVectors(motion.startPosition, motion.position, progress);
          motion.fragment.mesh.position.y += arc * motion.arcHeight;
          motion.fragment.mesh.position.x += arc * motion.arcSide;
          motion.fragment.mesh.quaternion.slerpQuaternions(motion.startQuaternion, motion.quaternion, progress);
          motion.fragment.mesh.scale.lerpVectors(motion.startScale, motion.scale, progress);
        });
        runtime.camera.position.lerp(runtime.cameraTarget, runtime.reduceMotion ? 1 : 0.055);
        runtime.cameraLookAt.lerp(runtime.cameraLookTarget, runtime.reduceMotion ? 1 : 0.07);
        runtime.camera.lookAt(runtime.cameraLookAt);

        if (rawProgress >= 1) {
          runtime.nestPhase = "ready";
          runtime.mascotRoot.position.copy(runtime.mascotHome);
          runtime.mascotRoot.visible = true;
          runtime.noteRoot.position.copy(runtime.noteHome);
          runtime.noteRoot.rotation.set(0.1, 0.08, -0.09);
          runtime.noteRoot.visible = !revealedRef.current;
          runtime.noteReady = !revealedRef.current;
          nestReadyCallbackRef.current();
        }
      } else if (runtime.nestPhase === "ready") {
        const idle = runtime.reduceMotion ? 0 : Math.sin(time * 0.0021) * 0.025;
        runtime.mascotRoot.position.set(
          runtime.mascotHome.x,
          runtime.mascotHome.y + idle,
          runtime.mascotHome.z,
        );
        runtime.mascotRoot.rotation.z = runtime.reduceMotion ? 0 : Math.sin(time * 0.00135) * 0.015;
        if (runtime.noteReady && !runtime.noteDrag) {
          noteIdleTarget.set(runtime.noteHome.x, runtime.noteHome.y + idle, runtime.noteHome.z);
          runtime.noteRoot.position.lerp(noteIdleTarget, runtime.reduceMotion ? 1 : 0.2);
        }
        if (runtime.noteRoot.visible) {
          runtime.elasticArmsRoot.visible = true;
          leftArmStart.set(
            runtime.mascotRoot.position.x - 0.31,
            runtime.mascotRoot.position.y - 0.08,
            1.075,
          );
          rightArmStart.set(
            runtime.mascotRoot.position.x + 0.31,
            runtime.mascotRoot.position.y - 0.08,
            1.075,
          );
          leftArmEnd.set(runtime.noteRoot.position.x - 0.22, runtime.noteRoot.position.y, 1.09);
          rightArmEnd.set(runtime.noteRoot.position.x + 0.22, runtime.noteRoot.position.y, 1.09);
          placeElasticArm(runtime.leftArm, leftArmStart, leftArmEnd);
          placeElasticArm(runtime.rightArm, rightArmStart, rightArmEnd);
          const pullLength = runtime.noteRoot.position.distanceTo(runtime.noteHome);
          const targetBlush = clamp(pullLength / 0.82) * 0.54;
          runtime.faceTintMaterial.opacity = THREE.MathUtils.lerp(
            runtime.faceTintMaterial.opacity,
            targetBlush,
            runtime.reduceMotion ? 1 : 0.24,
          );
        } else {
          runtime.elasticArmsRoot.visible = false;
          runtime.faceTintMaterial.opacity = THREE.MathUtils.lerp(runtime.faceTintMaterial.opacity, 0, 0.28);
        }
      }
      renderer.render(scene, camera);
      runtime.frameId = window.requestAnimationFrame(render);
    }
    runtime.frameId = window.requestAnimationFrame(render);
    setReady(true);

    return () => {
      runtime.disposed = true;
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", finishPointer);
      renderer.domElement.removeEventListener("pointercancel", cancelPointer);
      window.cancelAnimationFrame(runtime.frameId);
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || stage <= 0) return;
    if (stage < 5) {
      const pressure = clamp(stage * 0.18 + runtime.lastPressStrength * 0.22, 0, 0.96);
      const hit = runtime.impactPoint.clone().normalize();
      if (!runtime.deformations[stage - 1]) {
        runtime.deformations[stage - 1] = {
          direction: hit.clone(),
          currentDepth: 0,
          targetDepth: 0.2 + stage * 0.018,
        };
      }
      runtime.cameraTarget.copy(CAMERA_STAGE_POSITIONS[stage]);
      runtime.cameraTarget.x += hit.x * 0.2;
      runtime.cameraTarget.y += hit.y * 0.1;
      runtime.cameraLookTarget.set(hit.x * 0.1, 0.16 + hit.y * 0.06, 0);
      const holdMultiplier = 0.55 + runtime.lastPressStrength * 0.75;
      const squash = Math.min((0.13 + pressure * 0.2) * holdMultiplier, 0.32);
      updateOuterShellFracture(
        runtime.outerShellFragments,
        hit,
        pressure,
        runtime.deformations[stage - 1].targetDepth,
      );
      updateOuterShellGeometry(
        runtime.outerShellGeometry,
        runtime.outerShellBasePositions,
        runtime.deformations,
        runtime.outerShellFragments,
      );
      runtime.shellScaleTarget.set(
        1 + squash * 0.48,
        1 - squash * (0.62 + Math.abs(hit.y) * 0.18),
        1 - squash * 0.18,
      );
      runtime.noteRoot.visible = false;
      return;
    }

    if (runtime.exploded) return;
    runtime.exploded = true;
    runtime.nestPhase = "gathering";
    runtime.noteReady = false;
    runtime.noteRoot.visible = false;
    runtime.mascotRoot.visible = false;
    const hit = runtime.impactPoint.clone().normalize();
    const finalDepth = Math.max(runtime.deformations.at(-1)?.targetDepth ?? 0.32, 0.32);
    prepareOuterShellForFinalBreak(runtime.outerShellFragments, hit, finalDepth);
    runtime.outerShellFragments.forEach((fragment) => {
      if (!fragment.broken) return;
      fragment.mesh.position.copy(fragment.targetPosition).multiply(runtime.shellScaleTarget);
      fragment.mesh.quaternion.copy(fragment.targetQuaternion);
      fragment.mesh.scale.copy(fragment.targetScale);
    });
    updateOuterShellGeometry(
      runtime.outerShellGeometry,
      runtime.outerShellBasePositions,
      runtime.deformations,
      runtime.outerShellFragments,
    );

    runtime.intactBall.visible = false;
    runtime.outerShell.visible = false;
    runtime.elasticArmsRoot.visible = false;
    runtime.faceTintMaterial.opacity = 0;
    runtime.nestMotions = createNestLayout(runtime.outerShellFragments).map((target) => ({
      ...target,
      startPosition: target.fragment.mesh.position.clone(),
      startQuaternion: target.fragment.mesh.quaternion.clone(),
      startScale: target.fragment.mesh.scale.clone(),
    }));
    runtime.nestGatherStartedAt = performance.now();
    runtime.nestPhase = "gathering";
    runtime.cameraTarget.set(0, 2.05, 7.45);
    runtime.cameraLookTarget.set(0, -0.66, 0);
  }, [stage, revealed]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !revealed) return;
    runtime.noteReady = false;
    runtime.noteRoot.visible = false;
  }, [revealed]);

  return (
    <div ref={containerRef} className="wakppu-break-scene" aria-hidden="true">
      {!ready && <div className="wakppu-break-loading" role="status">왁뿌볼 준비 중...</div>}
    </div>
  );
}
