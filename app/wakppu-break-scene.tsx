"use client";

import RAPIER from "@dimforge/rapier3d-compat";
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

type WakppuBreakSceneProps = {
  stage: number;
  revealed: boolean;
  onImpact: () => void;
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
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isOrbiting: boolean;
};

type NoteDrag = {
  pointerId: number;
  startX: number;
  startY: number;
};

type FragmentBody = {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
};

type FragmentDrag = {
  pointerId: number;
  lastX: number;
  lastY: number;
  body: RAPIER.RigidBody;
};

type AnimatedFragment = {
  mesh: THREE.Mesh;
  startPosition: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  spin: number;
  startedAt: number;
  floorY: number;
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
  fragmentDrag: FragmentDrag | null;
  lastPressStrength: number;
  fracturePatternAligned: boolean;
  orbitYaw: number;
  orbitPitch: number;
  orbitYawTarget: number;
  orbitPitchTarget: number;
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
  world: RAPIER.World | null;
  fragmentBodies: FragmentBody[];
  fragmentBodyByMesh: Map<THREE.Mesh, RAPIER.RigidBody>;
  animatedFragments: AnimatedFragment[];
  frameId: number;
  physicsTimer: number | null;
  physicsBatchTimers: number[];
  noteRevealTimer: number | null;
  disposed: boolean;
};

const BALL_RADIUS = 1.55;
const NOTE_MODEL = "/models/fortune-note.glb?v=20260813-folded-reference-2";
const NOTE_SCALE = 0.8;
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

export function WakppuBreakScene({ stage, revealed, onImpact, onNotePull }: WakppuBreakSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const stageRef = useRef(stage);
  const impactCallbackRef = useRef(onImpact);
  const notePullCallbackRef = useRef(onNotePull);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    stageRef.current = stage;
    impactCallbackRef.current = onImpact;
    notePullCallbackRef.current = onNotePull;
  }, [stage, onImpact, onNotePull]);

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
    noteRoot.position.set(0, -0.08, 0.92);
    noteRoot.rotation.set(0.1, 0.08, -0.09);
    const noteHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.8, 0.12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    noteHitbox.userData.isFortuneNote = true;
    noteRoot.add(noteHitbox);
    scene.add(noteRoot);

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
      fragmentDrag: null,
      lastPressStrength: 0.35,
      fracturePatternAligned: false,
      orbitYaw: 0,
      orbitPitch: 0,
      orbitYawTarget: 0,
      orbitPitchTarget: 0,
      cameraTarget: CAMERA_STAGE_POSITIONS[0].clone(),
      cameraLookAt: new THREE.Vector3(0, 0.16, 0),
      cameraLookTarget: new THREE.Vector3(0, 0.16, 0),
      shellScaleTarget: new THREE.Vector3(1, 1, 1),
      exploded: false,
      noteRoot,
      noteHitbox,
      noteLoaded: false,
      noteReady: false,
      noteHome: new THREE.Vector3(0, -0.08, 0.92),
      world: null,
      fragmentBodies: [],
      fragmentBodyByMesh: new Map(),
      animatedFragments: [],
      frameId: 0,
      physicsTimer: null,
      physicsBatchTimers: [],
      noteRevealTimer: null,
      disposed: false,
    };
    runtimeRef.current = runtime;

    new GLTFLoader().load(
      NOTE_MODEL,
      (gltf) => {
        if (runtime.disposed) return;
        gltf.scene.scale.setScalar(NOTE_SCALE);
        gltf.scene.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = true;
          child.receiveShadow = true;
        });
        noteRoot.add(gltf.scene);
        runtime.noteLoaded = true;
      },
      undefined,
      () => {
        if (!runtime.disposed) runtime.noteLoaded = true;
      },
    );

    void RAPIER.init().then(() => {
      if (runtime.disposed) return;
      runtime.world = new RAPIER.World({ x: 0, y: -7.8, z: 0 });
      const groundBody = runtime.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -2.12, 0));
      runtime.world.createCollider(RAPIER.ColliderDesc.cuboid(4, 0.12, 4).setRestitution(0.2), groundBody);
    }).catch(() => {
      runtime.world = null;
    });

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

    function pickFragmentBody(event: PointerEvent) {
      if (!runtime.exploded || runtime.fragmentBodyByMesh.size === 0) return null;
      setPointerRay(runtime, event);
      const meshes = Array.from(runtime.fragmentBodyByMesh.keys());
      const hit = runtime.raycaster.intersectObjects(meshes, false)[0];
      return hit?.object instanceof THREE.Mesh ? runtime.fragmentBodyByMesh.get(hit.object) ?? null : null;
    }

    function handlePointerDown(event: PointerEvent) {
      if (runtime.noteDrag || runtime.fragmentDrag || runtime.activePress) return;
      if (stageRef.current >= 5) {
        if (pickNote(event)) {
          runtime.noteDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
          renderer.domElement.setPointerCapture?.(event.pointerId);
          return;
        }
        const fragmentBody = pickFragmentBody(event);
        if (fragmentBody) {
          runtime.fragmentDrag = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY, body: fragmentBody };
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
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        isOrbiting: false,
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
        if (distance >= 74 || dy <= -58) {
          runtime.noteReady = false;
          runtime.noteRoot.visible = false;
          notePullCallbackRef.current();
        }
        return;
      }
      if (runtime.fragmentDrag?.pointerId === event.pointerId) {
        const dx = event.clientX - runtime.fragmentDrag.lastX;
        const dy = event.clientY - runtime.fragmentDrag.lastY;
        runtime.fragmentDrag.body.applyImpulse({ x: dx * 0.018, y: -dy * 0.018 + 0.025, z: 0.02 }, true);
        runtime.fragmentDrag.body.applyTorqueImpulse({ x: dy * 0.008, y: dx * 0.009, z: -dx * 0.005 }, true);
        runtime.fragmentDrag.lastX = event.clientX;
        runtime.fragmentDrag.lastY = event.clientY;
        return;
      }

      const activePress = runtime.activePress;
      if (!activePress || activePress.pointerId !== event.pointerId) return;
      const totalX = event.clientX - activePress.startX;
      const totalY = event.clientY - activePress.startY;
      if (!activePress.isOrbiting && Math.hypot(totalX, totalY) > 9) activePress.isOrbiting = true;
      if (activePress.isOrbiting) {
        const deltaX = event.clientX - activePress.lastX;
        const deltaY = event.clientY - activePress.lastY;
        runtime.orbitYawTarget -= deltaX * 0.006;
        runtime.orbitPitchTarget = THREE.MathUtils.clamp(runtime.orbitPitchTarget + deltaY * 0.004, -0.42, 0.42);
      }
      activePress.lastX = event.clientX;
      activePress.lastY = event.clientY;
    }

    function finishPointer(event: PointerEvent) {
      if (runtime.noteDrag?.pointerId === event.pointerId) {
        runtime.noteDrag = null;
        renderer.domElement.releasePointerCapture?.(event.pointerId);
        return;
      }
      if (runtime.fragmentDrag?.pointerId === event.pointerId) {
        runtime.fragmentDrag = null;
        renderer.domElement.releasePointerCapture?.(event.pointerId);
        return;
      }
      const activePress = runtime.activePress;
      if (!activePress || activePress.pointerId !== event.pointerId) return;
      runtime.activePress = null;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
      if (activePress.isOrbiting) return;
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
      if (runtime.fragmentDrag?.pointerId === event.pointerId) runtime.fragmentDrag = null;
      if (runtime.activePress?.pointerId === event.pointerId) runtime.activePress = null;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", finishPointer);
    renderer.domElement.addEventListener("pointercancel", cancelPointer);

    let previousTime = performance.now();
    const cameraOffset = new THREE.Vector3();
    const desiredCameraPosition = new THREE.Vector3();
    const cameraSpherical = new THREE.Spherical();
    const fragmentTarget = new THREE.Vector3();
    function render(time: number) {
      const delta = Math.min((time - previousTime) / 1000, 1 / 30);
      previousTime = time;
      if (runtime.exploded && runtime.world) {
        runtime.world.timestep = Math.max(delta, 1 / 120);
        runtime.world.step();
        runtime.fragmentBodies.forEach(({ mesh, body }) => {
          const position = body.translation();
          const rotation = body.rotation();
          mesh.position.set(position.x, position.y, position.z);
          mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        });
      } else {
        let geometryChanged = false;
        if (runtime.activePress && !runtime.activePress.isOrbiting) {
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
        const visibleDeformations = runtime.activePress && !runtime.activePress.isOrbiting
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
        runtime.orbitYaw = THREE.MathUtils.lerp(runtime.orbitYaw, runtime.orbitYawTarget, 0.14);
        runtime.orbitPitch = THREE.MathUtils.lerp(runtime.orbitPitch, runtime.orbitPitchTarget, 0.14);
        runtime.cameraLookAt.lerp(runtime.cameraLookTarget, 0.065);
        cameraOffset.copy(runtime.cameraTarget).sub(runtime.cameraLookTarget);
        cameraSpherical.setFromVector3(cameraOffset);
        cameraSpherical.theta += runtime.orbitYaw;
        cameraSpherical.phi = THREE.MathUtils.clamp(cameraSpherical.phi + runtime.orbitPitch, 0.28, Math.PI - 0.28);
        desiredCameraPosition.setFromSpherical(cameraSpherical).add(runtime.cameraLookTarget);
        runtime.camera.position.lerp(desiredCameraPosition, 0.08);
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

      runtime.animatedFragments.forEach((fragment) => {
        const elapsed = clamp((time - fragment.startedAt) / 1000, 0, 1.8);
        fragment.mesh.position.copy(fragment.startPosition).addScaledVector(fragment.velocity, elapsed);
        fragment.mesh.position.y = Math.max(
          fragment.floorY,
          fragment.startPosition.y + fragment.velocity.y * elapsed - 3.6 * elapsed * elapsed,
        );
        fragment.mesh.quaternion.copy(fragment.startQuaternion).multiply(
          new THREE.Quaternion().setFromAxisAngle(fragment.rotationAxis, fragment.spin * elapsed),
        );
      });
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
      if (runtime.physicsTimer !== null) window.clearTimeout(runtime.physicsTimer);
      runtime.physicsBatchTimers.forEach((timer) => window.clearTimeout(timer));
      if (runtime.noteRevealTimer !== null) window.clearTimeout(runtime.noteRevealTimer);
      runtime.world?.free();
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
      if (stage >= 3 && runtime.noteLoaded) {
        runtime.noteRoot.visible = true;
        runtime.noteRoot.position.set(hit.x * 0.18, hit.y * 0.12 - 0.04, 1.28 + pressure * 0.22);
        runtime.noteRoot.rotation.set(0.1, 0.08, -0.09 - hit.x * 0.08);
      }
      return;
    }

    if (runtime.exploded) return;
    runtime.exploded = true;
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

    runtime.physicsTimer = window.setTimeout(() => {
      const rankedFragments = runtime.outerShellFragments
        .filter((fragment) => fragment.broken)
        .map((fragment, index) => {
          fragment.mesh.geometry.computeBoundingSphere();
          return {
            fragment,
            index,
            score: (fragment.mesh.geometry.boundingSphere?.radius ?? 0) * 2.4
              + Math.max(0, fragment.radial.dot(hit)) * 0.8,
          };
        })
        .sort((a, b) => b.score - a.score);
      const physicalFragments = runtime.world ? rankedFragments.slice(0, 40) : [];
      const animatedFragments = runtime.world ? rankedFragments.slice(40) : rankedFragments;
      const animationStart = performance.now();
      animatedFragments.forEach(({ fragment }) => {
        const direction = fragment.radial.clone().multiplyScalar(0.72).addScaledVector(fragment.tangent, 0.28).normalize();
        runtime.animatedFragments.push({
          mesh: fragment.mesh,
          startPosition: fragment.mesh.position.clone(),
          startQuaternion: fragment.mesh.quaternion.clone(),
          velocity: direction.multiplyScalar(1.2 + fragment.liftSeed * 0.75)
            .add(new THREE.Vector3(0, 0.48 + fragment.twistSeed * 0.2, 0)),
          rotationAxis: fragment.rotationAxis.clone(),
          spin: 1.1 + fragment.twistSeed * 1.25,
          startedAt: animationStart,
          floorY: -1.82 + fragment.liftSeed * 0.045,
        });
      });
      const world = runtime.world;
      if (!world) return;

      const createPhysicalFragment = (fragment: OuterShellFragment, index: number) => {
        const mesh = fragment.mesh;
        mesh.geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        mesh.geometry.boundingBox!.getSize(size);
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
            .setRotation({ x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w })
            .setLinearDamping(0.08)
            .setAngularDamping(0.1),
        );
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(
            Math.max(size.x * 0.34, 0.055),
            Math.max(size.y * 0.34, 0.055),
            Math.max(size.z * 0.34, 0.025),
          ).setDensity(0.18).setFriction(0.56).setRestitution(0.32),
          body,
        );
        const awayFromTap = fragment.radial.clone().sub(hit).normalize();
        const direction = fragment.radial.clone().multiplyScalar(0.66).addScaledVector(awayFromTap, 0.34).normalize();
        const force = 1.65 + fragment.liftSeed * 1.25;
        body.applyImpulse({ x: direction.x * force, y: direction.y * force + 0.62, z: direction.z * force }, true);
        body.applyTorqueImpulse({
          x: (index % 3 - 1) * 0.72,
          y: (index % 4 - 1.5) * 0.58,
          z: (index % 5 - 2) * 0.46,
        }, true);
        runtime.fragmentBodies.push({ mesh, body });
        runtime.fragmentBodyByMesh.set(mesh, body);
      };
      for (let batchIndex = 0; batchIndex < 3; batchIndex += 1) {
        const timer = window.setTimeout(() => {
          physicalFragments.forEach(({ fragment, index }, order) => {
            if (order % 3 === batchIndex) createPhysicalFragment(fragment, index);
          });
        }, batchIndex * 18);
        runtime.physicsBatchTimers.push(timer);
      }
    }, 520);

    runtime.noteRevealTimer = window.setTimeout(() => {
      runtime.intactBall.visible = false;
      runtime.noteRoot.position.copy(runtime.noteHome);
      runtime.noteRoot.rotation.set(0.1, 0.08, -0.09);
      runtime.noteRoot.visible = !revealed;
      runtime.noteReady = !revealed;
    }, 760);
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
