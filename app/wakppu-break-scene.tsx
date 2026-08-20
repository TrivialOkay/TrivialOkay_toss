"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  alignOuterShellPattern,
  createOuterShell,
  prepareOuterShellForFinalBreak,
  syncOuterShellFragmentBatches,
  updateOuterShellFracture,
  updateOuterShellGeometry,
  type OuterShellFragmentBatches,
  type OuterShellFragment,
} from "./wakppu-outer-shell";
import { createFallLayout, type FallLayoutTarget } from "./wakppu-fall-layout";

type WakppuBreakSceneProps = {
  stage: number;
  revealed: boolean;
  fortune: string;
  fortuneId: number;
  onImpact: () => void;
  onSlice: () => void;
  onNoteReady: () => void;
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
  startX: number;
  startY: number;
  deformation: SurfaceDeformation;
};

type SliceEffect = {
  startedAt: number;
  direction: THREE.Vector2;
  angle: number;
};

type NoteDrag = {
  pointerId: number;
  startX: number;
  startY: number;
};

type MascotDrag = {
  pointerId: number;
  startX: number;
  startY: number;
};

type FallingFragmentMotion = FallLayoutTarget & {
  startPosition: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
  startScale: THREE.Vector3;
  floorHitTime: number;
};

type FragmentPhase = "idle" | "falling" | "ready";

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
  fragmentBatches: OuterShellFragmentBatches;
  deformations: SurfaceDeformation[];
  impactPoint: THREE.Vector3;
  activePress: ActivePress | null;
  noteDrag: NoteDrag | null;
  mascotDrag: MascotDrag | null;
  mascotElastic: THREE.Vector2;
  mascotElasticTarget: THREE.Vector2;
  mascotElasticVelocity: THREE.Vector2;
  lastPressStrength: number;
  fracturePatternAligned: boolean;
  cameraTarget: THREE.Vector3;
  cameraLookAt: THREE.Vector3;
  cameraLookTarget: THREE.Vector3;
  shellScaleTarget: THREE.Vector3;
  exploded: boolean;
  noteRoot: THREE.Group;
  noteHitbox: THREE.Mesh;
  noteReady: boolean;
  noteHome: THREE.Vector3;
  mascotRoot: THREE.Group;
  mascotSprite: THREE.Sprite;
  mascotHome: THREE.Vector3;
  bladeRoot: THREE.Group;
  bladeMaterial: THREE.MeshPhysicalMaterial;
  bladeHandleMaterial: THREE.MeshPhysicalMaterial;
  sliceLine: THREE.Mesh;
  sliceLineMaterial: THREE.MeshBasicMaterial;
  sliceEffect: SliceEffect | null;
  fragmentPhase: FragmentPhase;
  fragmentFallStartedAt: number;
  fragmentMotions: FallingFragmentMotion[];
  notePresented: boolean;
  reduceMotion: boolean;
  frameId: number;
  disposed: boolean;
};

const BALL_RADIUS = 1.55;
const MASCOT_IMAGE = "/byeolil-jelly-mascot.webp";
const MASCOT_FALLBACK_IMAGE = "/outcome-mascot-happened.png";
const MASCOT_HEIGHT = 2.02 * 1.2;
const MASCOT_HOME_Y = -0.4;
const ROCKET_IMAGE = "/byeolil-rocket-soft-3d.webp";
const ROCKET_HEIGHT = MASCOT_HEIGHT * 1.12;
const ROCKET_WIDTH = ROCKET_HEIGHT * (2 / 3);
const ROCKET_HOME_X = -0.72;
const ROCKET_HOME_Y = -0.1;
const FRAGMENT_FALL_DURATION = 1650;
const NOTE_REVEAL_DELAY = 520;
const FRAGMENT_GRAVITY = 3.6;
const DEFORMATION_MIN_DOT = Math.cos(0.96);
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

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const characters = [...text];
  const lines: string[] = [];
  let line = "";
  characters.forEach((character) => {
    const candidate = line + character;
    if (line && context.measureText(candidate).width > maxWidth && lines.length < maxLines - 1) {
      lines.push(line.trim());
      line = character;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line.trim());
  lines.slice(0, maxLines).forEach((item, index) => context.fillText(item, x, y + index * lineHeight));
  return y + Math.min(lines.length, maxLines) * lineHeight;
}

function createFortuneAwardCardTexture(fortune: string, fortuneId: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1056;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  roundedRectPath(context, 3, 3, 506, 1050, 22);
  context.clip();
  context.fillStyle = "#fff9e8";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#efc650";
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(205, 0);
  context.lineTo(180, 58);
  context.lineTo(0, 58);
  context.closePath();
  context.fill();
  context.fillStyle = "#17140f";
  context.font = "900 20px sans-serif";
  context.textAlign = "left";
  context.fillText("별일 시상위원회", 22, 37);

  roundedRectPath(context, 414, 14, 78, 34, 7);
  context.fillStyle = "#a87918";
  context.fill();
  context.fillStyle = "#fff";
  context.font = "900 14px sans-serif";
  context.textAlign = "center";
  context.fillText("AWARD", 453, 36);

  context.strokeStyle = "rgba(80,66,38,.55)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, 58);
  context.lineTo(512, 58);
  context.moveTo(26, 90);
  context.lineTo(190, 90);
  context.moveTo(322, 90);
  context.lineTo(486, 90);
  context.stroke();
  context.fillStyle = "#756d5d";
  context.font = "700 13px sans-serif";
  context.fillText("오늘의 하찮은 수상작", 256, 94);

  context.textAlign = "left";
  context.fillStyle = "#29251e";
  context.font = "900 17px sans-serif";
  context.fillText(`NO.${String(fortuneId).padStart(3, "0")}`, 24, 143);
  roundedRectPath(context, 394, 118, 92, 34, 9);
  context.fillStyle = "#dda71b";
  context.fill();
  context.fillStyle = "#fff";
  context.font = "900 13px sans-serif";
  context.textAlign = "center";
  context.fillText("오늘 좀 됨", 440, 140);

  context.fillStyle = "#26231e";
  context.font = "900 32px sans-serif";
  context.textAlign = "left";
  const titleBottom = drawWrappedText(context, fortune, 24, 205, 464, 43, 3);
  context.fillStyle = "#514a40";
  context.font = "28px sans-serif";
  context.fillText("★★★★☆", 24, Math.max(280, titleBottom + 16));

  context.strokeStyle = "#daa21e";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(142, 342);
  context.lineTo(152, 367);
  context.moveTo(378, 320);
  context.lineTo(396, 314);
  context.moveTo(430, 548);
  context.lineTo(449, 544);
  context.stroke();

  context.fillStyle = "#f1d7b0";
  context.strokeStyle = "#1d1915";
  context.lineWidth = 4;
  roundedRectPath(context, 108, 414, 96, 132, 10);
  context.fill();
  context.stroke();
  context.fillStyle = "#b98e5a";
  roundedRectPath(context, 135, 455, 43, 91, 5);
  context.fill();
  context.stroke();

  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(287, 466, 64, Math.PI, 0);
  context.quadraticCurveTo(358, 500, 335, 557);
  context.quadraticCurveTo(305, 584, 278, 552);
  context.quadraticCurveTo(245, 581, 224, 548);
  context.quadraticCurveTo(206, 494, 223, 468);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#191715";
  context.beginPath();
  context.arc(265, 473, 5, 0, Math.PI * 2);
  context.arc(309, 473, 5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f5a895";
  context.beginPath();
  context.arc(246, 490, 8, 0, Math.PI * 2);
  context.arc(328, 490, 8, 0, Math.PI * 2);
  context.fill();
  roundedRectPath(context, 273, 500, 35, 53, 5);
  context.fillStyle = "#33302d";
  context.fill();
  context.stroke();

  roundedRectPath(context, 28, 620, 456, 104, 14);
  context.fillStyle = "#fffaf0";
  context.fill();
  context.strokeStyle = "#c99c36";
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = "#e9bd48";
  context.beginPath();
  context.arc(68, 668, 26, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#765513";
  context.font = "900 23px sans-serif";
  context.textAlign = "center";
  context.fillText("★", 68, 676);
  context.fillStyle = "#8a7442";
  context.font = "700 11px sans-serif";
  context.textAlign = "left";
  context.fillText("본 기록을 공식 수상작으로 인정합니다", 108, 654);
  context.fillStyle = "#242019";
  context.font = "900 19px sans-serif";
  context.fillText("오늘의 피식상", 108, 683);
  context.fillStyle = "#7763a5";
  context.font = "800 11px sans-serif";
  context.textAlign = "right";
  context.fillText("우주 기여도 4%", 462, 706);

  roundedRectPath(context, 28, 744, 456, 156, 14);
  context.fillStyle = "#fffdf7";
  context.fill();
  context.strokeStyle = "#b9aa8c";
  context.stroke();
  context.fillStyle = "#7763a5";
  context.font = "900 15px sans-serif";
  context.textAlign = "left";
  context.fillText("관측국의 쓸데없이 진지한 해석", 48, 777);
  context.fillStyle = "#302c25";
  context.font = "800 17px sans-serif";
  drawWrappedText(context, "우주가 오늘의 작은 행운을 공식적으로 관측했습니다.", 48, 813, 374, 27, 3);

  roundedRectPath(context, 28, 918, 456, 55, 12);
  context.fillStyle = "#f2eee5";
  context.fill();
  context.fillStyle = "#81796d";
  context.font = "700 14px sans-serif";
  context.fillText("“오늘의 운세를 직접 꺼냈음”", 48, 952);

  context.strokeStyle = "#d2c8b5";
  context.beginPath();
  context.moveTo(0, 990);
  context.lineTo(512, 990);
  context.stroke();
  context.fillStyle = "#928877";
  context.font = "700 10px sans-serif";
  context.fillText("발견 날짜", 24, 1015);
  context.fillText("발견 시간", 190, 1015);
  context.fillText("별일 횟수", 360, 1015);
  context.fillStyle = "#29251e";
  context.font = "900 13px sans-serif";
  const now = new Date();
  context.fillText(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`, 24, 1040);
  context.fillText(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, 190, 1040);
  context.fillText("1회", 360, 1040);
  context.restore();

  roundedRectPath(context, 3, 3, 506, 1050, 22);
  context.strokeStyle = "#c99c36";
  context.lineWidth = 3;
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
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
    for (const { direction, currentDepth } of deformations) {
      if (currentDepth < 0.001) continue;
      const dot = THREE.MathUtils.clamp(normal.dot(direction), -1, 1);
      if (dot < DEFORMATION_MIN_DOT) continue;
      const angle = Math.acos(dot);
      const dent = smoothstep(1 - angle / 0.88);
      const bulge = smoothstep(1 - Math.abs(angle - 0.72) / 0.24);
      point.addScaledVector(direction, -currentDepth * dent);
      point.addScaledVector(normal, currentDepth * 0.24 * bulge);
      point.y -= currentDepth * dent * 0.08;
    }
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
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
      if (object instanceof THREE.BatchedMesh) object.dispose();
      else object.geometry.dispose();
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

export function WakppuBreakScene({
  stage,
  revealed,
  fortune,
  fortuneId,
  onImpact,
  onSlice,
  onNoteReady,
  onNotePull,
}: WakppuBreakSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const stageRef = useRef(stage);
  const revealedRef = useRef(revealed);
  const impactCallbackRef = useRef(onImpact);
  const sliceCallbackRef = useRef(onSlice);
  const noteReadyCallbackRef = useRef(onNoteReady);
  const notePullCallbackRef = useRef(onNotePull);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    stageRef.current = stage;
    revealedRef.current = revealed;
    impactCallbackRef.current = onImpact;
    sliceCallbackRef.current = onSlice;
    noteReadyCallbackRef.current = onNoteReady;
    notePullCallbackRef.current = onNotePull;
  }, [stage, revealed, onImpact, onSlice, onNoteReady, onNotePull]);

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
    shellGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), BALL_RADIUS + 0.45);
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
    scene.add(outerShellState.fragmentBatches.surface, outerShellState.fragmentBatches.edge);

    const bladeRoot = new THREE.Group();
    bladeRoot.visible = false;
    bladeRoot.position.z = 2.35;
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.72, -0.09);
    bladeShape.lineTo(0.92, -0.065);
    bladeShape.lineTo(1.38, 0);
    bladeShape.lineTo(0.92, 0.065);
    bladeShape.lineTo(-0.72, 0.09);
    bladeShape.closePath();
    const bladeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x91d4f5,
      emissive: 0x6fc7f1,
      emissiveIntensity: 0.72,
      metalness: 0.76,
      roughness: 0.14,
      clearcoat: 1,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const blade = new THREE.Mesh(new THREE.ShapeGeometry(bladeShape), bladeMaterial);
    blade.renderOrder = 20;
    bladeRoot.add(blade);
    const bladeHandleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x583247,
      emissive: 0x190b12,
      emissiveIntensity: 0.3,
      roughness: 0.34,
      metalness: 0.18,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const bladeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.25, 0.08), bladeHandleMaterial);
    bladeHandle.position.x = -1.02;
    bladeHandle.renderOrder = 20;
    bladeRoot.add(bladeHandle);
    scene.add(bladeRoot);

    const sliceLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa9da,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sliceLine = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.05), sliceLineMaterial);
    sliceLine.visible = false;
    sliceLine.position.z = 2.18;
    sliceLine.renderOrder = 19;
    scene.add(sliceLine);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.7, 64),
      new THREE.MeshBasicMaterial({ color: 0x9a5364, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.scale.set(1, 0.38, 1);
    ground.position.y = -1.86;
    scene.add(ground);

    const textureLoader = new THREE.TextureLoader();
    const noteRoot = new THREE.Group();
    noteRoot.visible = false;
    noteRoot.position.set(ROCKET_HOME_X, ROCKET_HOME_Y, 1.18);
    noteRoot.rotation.set(0.02, 0.015, -0.012);
    const awardCardTexture = createFortuneAwardCardTexture(fortune, fortuneId);
    const noteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: awardCardTexture,
      transparent: true,
      alphaTest: 0.02,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const noteMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(ROCKET_WIDTH, ROCKET_HEIGHT),
      noteMaterial,
    );
    noteMesh.renderOrder = 9;
    noteRoot.add(noteMesh);
    const cardGripMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeee9,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const grip = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), cardGripMaterial);
    grip.position.set(ROCKET_WIDTH / 2 - 0.055, -0.13, 0.02);
    grip.scale.set(0.78, 1.04, 1);
    grip.renderOrder = 10;
    noteRoot.add(grip);
    const noteHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(ROCKET_WIDTH, ROCKET_HEIGHT, 0.12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    noteHitbox.userData.isFortuneNote = true;
    noteRoot.add(noteHitbox);
    scene.add(noteRoot);

    const mascotRoot = new THREE.Group();
    mascotRoot.visible = false;
    mascotRoot.position.set(0, MASCOT_HOME_Y, 0.28);
    const mascotMaterial = new THREE.SpriteMaterial({
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const mascotSprite = new THREE.Sprite(mascotMaterial);
    mascotSprite.scale.set(MASCOT_HEIGHT * 0.8, MASCOT_HEIGHT, 1);
    mascotSprite.position.set(0, 0.16, 0);
    mascotSprite.renderOrder = 7;
    mascotRoot.add(mascotSprite);
    scene.add(mascotRoot);

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
      fragmentBatches: outerShellState.fragmentBatches,
      deformations: [],
      impactPoint: new THREE.Vector3(0, 0, BALL_RADIUS),
      activePress: null,
      noteDrag: null,
      mascotDrag: null,
      mascotElastic: new THREE.Vector2(),
      mascotElasticTarget: new THREE.Vector2(),
      mascotElasticVelocity: new THREE.Vector2(),
      lastPressStrength: 0.35,
      fracturePatternAligned: false,
      cameraTarget: CAMERA_STAGE_POSITIONS[0].clone(),
      cameraLookAt: new THREE.Vector3(0, 0.16, 0),
      cameraLookTarget: new THREE.Vector3(0, 0.16, 0),
      shellScaleTarget: new THREE.Vector3(1, 1, 1),
      exploded: false,
      noteRoot,
      noteHitbox,
      noteReady: false,
      noteHome: new THREE.Vector3(ROCKET_HOME_X, ROCKET_HOME_Y, 1.18),
      mascotRoot,
      mascotSprite,
      mascotHome: new THREE.Vector3(0, MASCOT_HOME_Y, 0.28),
      bladeRoot,
      bladeMaterial,
      bladeHandleMaterial,
      sliceLine,
      sliceLineMaterial,
      sliceEffect: null,
      fragmentPhase: "idle",
      fragmentFallStartedAt: 0,
      fragmentMotions: [],
      notePresented: false,
      reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      frameId: 0,
      disposed: false,
    };
    runtimeRef.current = runtime;

    textureLoader.load(ROCKET_IMAGE, (texture) => {
      if (runtime.disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      noteMaterial.map?.dispose();
      noteMaterial.map = texture;
      noteMaterial.needsUpdate = true;
    });
    const applyMascotTexture = (texture: THREE.Texture) => {
      if (runtime.disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      mascotMaterial.map = texture;
      mascotMaterial.needsUpdate = true;
      const image = texture.image as { width?: number; height?: number };
      const aspect = image.width && image.height ? image.width / image.height : 0.8;
      mascotSprite.scale.set(MASCOT_HEIGHT * aspect, MASCOT_HEIGHT, 1);
    };
    textureLoader.load(
      MASCOT_IMAGE,
      applyMascotTexture,
      undefined,
      () => {
        if (!runtime.disposed) textureLoader.load(MASCOT_FALLBACK_IMAGE, applyMascotTexture);
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

    function pickMascot(event: PointerEvent) {
      if (!runtime.noteReady || !runtime.mascotRoot.visible) return false;
      setPointerRay(runtime, event);
      return runtime.raycaster.intersectObject(runtime.mascotSprite, false).length > 0;
    }

    function handlePointerDown(event: PointerEvent) {
      if (runtime.noteDrag || runtime.mascotDrag || runtime.activePress) return;
      if (stageRef.current >= 5) {
        if (pickNote(event)) {
          runtime.noteDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
          runtime.mascotElasticTarget.set(0, 0);
          renderer.domElement.setPointerCapture?.(event.pointerId);
        } else if (pickMascot(event)) {
          runtime.mascotDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
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
        startX: event.clientX,
        startY: event.clientY,
        deformation: { direction: runtime.impactPoint.clone(), currentDepth: 0, targetDepth: 0.055 },
      };
      renderer.domElement.setPointerCapture?.(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (runtime.mascotDrag?.pointerId === event.pointerId) {
        const dx = event.clientX - runtime.mascotDrag.startX;
        const dy = event.clientY - runtime.mascotDrag.startY;
        runtime.mascotElasticTarget.set(
          THREE.MathUtils.clamp(dx / 140, -1, 1),
          THREE.MathUtils.clamp(-dy / 140, -1, 1),
        );
        return;
      }
      if (runtime.noteDrag?.pointerId === event.pointerId) {
        const dx = event.clientX - runtime.noteDrag.startX;
        const dy = event.clientY - runtime.noteDrag.startY;
        const distance = Math.hypot(dx, dy);
        const offsetX = THREE.MathUtils.clamp(dx / 105, -1.45, 1.45);
        const offsetY = THREE.MathUtils.clamp(-dy / 92, -0.18, 1.72);
        const offsetZ = Math.min(distance / 210, 0.44);
        runtime.noteRoot.position.set(
          runtime.noteHome.x + offsetX,
          runtime.noteHome.y + offsetY,
          runtime.noteHome.z + offsetZ,
        );
        runtime.mascotRoot.position.set(
          runtime.mascotHome.x + offsetX,
          runtime.mascotHome.y + offsetY,
          runtime.mascotHome.z + offsetZ * 0.35,
        );
        runtime.mascotRoot.rotation.z = THREE.MathUtils.clamp(dx / 900, -0.12, 0.12);
        if (distance >= 112 || dy <= -92) {
          runtime.noteReady = false;
          runtime.noteRoot.visible = false;
          runtime.mascotRoot.visible = false;
          notePullCallbackRef.current();
        }
        return;
      }
      const activePress = runtime.activePress;
      if (activePress?.pointerId === event.pointerId) {
        const dx = event.clientX - activePress.startX;
        const dy = event.clientY - activePress.startY;
        const distance = Math.hypot(dx, dy);
        const duration = performance.now() - activePress.startedAt;
        const swipeThreshold = Math.max(82, Math.min(112, renderer.domElement.clientWidth * 0.34));
        const speed = distance / Math.max(duration, 1);
        if (duration <= 520 && distance >= swipeThreshold && speed >= 0.5) {
          const direction = new THREE.Vector2(dx / distance, -dy / distance);
          runtime.activePress = null;
          runtime.lastPressStrength = 1;
          runtime.sliceEffect = {
            startedAt: performance.now(),
            direction,
            angle: Math.atan2(direction.y, direction.x),
          };
          runtime.bladeRoot.visible = true;
          runtime.sliceLine.visible = true;
          renderer.domElement.releasePointerCapture?.(event.pointerId);
          sliceCallbackRef.current();
        }
      }
    }

    function finishPointer(event: PointerEvent) {
      if (runtime.mascotDrag?.pointerId === event.pointerId) {
        runtime.mascotDrag = null;
        runtime.mascotElasticTarget.set(0, 0);
        renderer.domElement.releasePointerCapture?.(event.pointerId);
        return;
      }
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
      if (runtime.mascotDrag?.pointerId === event.pointerId) {
        runtime.mascotDrag = null;
        runtime.mascotElasticTarget.set(0, 0);
      }
      if (runtime.activePress?.pointerId === event.pointerId) runtime.activePress = null;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", finishPointer);
    renderer.domElement.addEventListener("pointercancel", cancelPointer);

    const fragmentTarget = new THREE.Vector3();
    const noteIdleTarget = new THREE.Vector3();
    const fragmentSpinQuaternion = new THREE.Quaternion();
    const mascotSpringForce = new THREE.Vector2();
    function render(time: number) {
      if (runtime.sliceEffect) {
        const sliceProgress = clamp((time - runtime.sliceEffect.startedAt) / 620);
        const travel = smoothstep(sliceProgress) * 6.4 - 3.2;
        runtime.bladeRoot.position.set(
          runtime.sliceEffect.direction.x * travel,
          runtime.sliceEffect.direction.y * travel,
          2.35,
        );
        runtime.bladeRoot.rotation.z = runtime.sliceEffect.angle - Math.PI / 2;
        runtime.sliceLine.rotation.z = runtime.sliceEffect.angle;
        const bladeOpacity = clamp(Math.sin(sliceProgress * Math.PI) * 1.45);
        runtime.bladeMaterial.opacity = bladeOpacity;
        runtime.bladeHandleMaterial.opacity = bladeOpacity;
        runtime.sliceLineMaterial.opacity = clamp((1 - sliceProgress) * 1.35);
        if (sliceProgress >= 1) {
          runtime.bladeRoot.visible = false;
          runtime.sliceLine.visible = false;
          runtime.sliceEffect = null;
        }
      }

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
        syncOuterShellFragmentBatches(runtime.outerShellFragments, runtime.fragmentBatches);
      }

      if (runtime.fragmentPhase === "falling") {
        const elapsedMilliseconds = runtime.reduceMotion
          ? FRAGMENT_FALL_DURATION
          : time - runtime.fragmentFallStartedAt;
        runtime.fragmentMotions.forEach((motion) => {
          const elapsed = Math.max(0, elapsedMilliseconds / 1000 - motion.delay);
          const fallTime = Math.min(elapsed, motion.floorHitTime);
          const slideTime = elapsed > motion.floorHitTime
            ? Math.min(elapsed - motion.floorHitTime, 0.42) * 0.18
            : 0;
          motion.fragment.mesh.position.set(
            motion.startPosition.x + motion.velocity.x * (fallTime + slideTime),
            motion.startPosition.y + motion.velocity.y * fallTime - FRAGMENT_GRAVITY * fallTime * fallTime,
            motion.startPosition.z + motion.velocity.z * (fallTime + slideTime),
          );
          if (elapsed >= motion.floorHitTime) {
            const bounceTime = elapsed - motion.floorHitTime;
            const bounce = Math.abs(Math.sin(bounceTime * 13.5)) * 0.13 * Math.exp(-bounceTime * 5.2);
            motion.fragment.mesh.position.y = motion.floorY + bounce;
          }
          fragmentSpinQuaternion.setFromAxisAngle(
            motion.rotationAxis,
            motion.spin * Math.min(elapsed, motion.floorHitTime + 0.72),
          );
          motion.fragment.mesh.quaternion.copy(motion.startQuaternion).multiply(fragmentSpinQuaternion);
          motion.fragment.mesh.scale.copy(motion.startScale);
        });
        syncOuterShellFragmentBatches(runtime.outerShellFragments, runtime.fragmentBatches);
        runtime.camera.position.lerp(runtime.cameraTarget, runtime.reduceMotion ? 1 : 0.055);
        runtime.cameraLookAt.lerp(runtime.cameraLookTarget, runtime.reduceMotion ? 1 : 0.07);
        runtime.camera.lookAt(runtime.cameraLookAt);

        if (!runtime.notePresented && elapsedMilliseconds >= NOTE_REVEAL_DELAY) {
          runtime.notePresented = true;
          runtime.mascotRoot.position.copy(runtime.mascotHome);
          runtime.mascotRoot.rotation.z = 0;
          runtime.mascotRoot.visible = !revealedRef.current;
          runtime.noteRoot.position.copy(runtime.noteHome);
          runtime.noteRoot.rotation.set(0.02, 0.015, -0.012);
          runtime.noteRoot.visible = !revealedRef.current;
          runtime.noteReady = !revealedRef.current;
          noteReadyCallbackRef.current();
        }
        if (runtime.notePresented && runtime.noteReady && !runtime.noteDrag && !runtime.mascotDrag) {
          noteIdleTarget.copy(runtime.noteHome);
          runtime.noteRoot.position.lerp(noteIdleTarget, runtime.reduceMotion ? 1 : 0.2);
          fragmentTarget.copy(runtime.mascotHome);
          runtime.mascotRoot.position.lerp(fragmentTarget, runtime.reduceMotion ? 1 : 0.2);
          runtime.mascotRoot.rotation.z = THREE.MathUtils.lerp(runtime.mascotRoot.rotation.z, 0, 0.2);
        }
        if (elapsedMilliseconds >= FRAGMENT_FALL_DURATION) runtime.fragmentPhase = "ready";
      } else if (runtime.fragmentPhase === "ready") {
        const idle = runtime.reduceMotion ? 0 : Math.sin(time * 0.0021) * 0.025;
        if (!runtime.noteDrag && !runtime.mascotDrag) {
          runtime.mascotRoot.position.set(
            runtime.mascotHome.x,
            runtime.mascotHome.y + idle,
            runtime.mascotHome.z,
          );
          runtime.mascotRoot.rotation.z = runtime.reduceMotion ? 0 : Math.sin(time * 0.00135) * 0.015;
          if (runtime.noteReady) {
            noteIdleTarget.set(runtime.noteHome.x, runtime.noteHome.y + idle, runtime.noteHome.z);
            runtime.noteRoot.position.lerp(noteIdleTarget, runtime.reduceMotion ? 1 : 0.2);
          }
        }
      }

      const mascotTextureImage = runtime.mascotSprite.material.map?.image as
        | { width?: number; height?: number }
        | undefined;
      const mascotAspect = mascotTextureImage?.width && mascotTextureImage.height
        ? mascotTextureImage.width / mascotTextureImage.height
        : 0.8;
      if (runtime.noteDrag) {
        runtime.mascotElastic.set(0, 0);
        runtime.mascotElasticTarget.set(0, 0);
        runtime.mascotElasticVelocity.set(0, 0);
        runtime.mascotSprite.scale.set(MASCOT_HEIGHT * mascotAspect, MASCOT_HEIGHT, 1);
        runtime.mascotSprite.position.set(0, 0.16, 0);
      } else {
        if (runtime.reduceMotion) {
          runtime.mascotElastic.copy(runtime.mascotElasticTarget);
          runtime.mascotElasticVelocity.set(0, 0);
        } else {
          mascotSpringForce.copy(runtime.mascotElasticTarget).sub(runtime.mascotElastic).multiplyScalar(0.14);
          runtime.mascotElasticVelocity.add(mascotSpringForce).multiplyScalar(0.7);
          runtime.mascotElastic.add(runtime.mascotElasticVelocity);
        }
        const pullX = runtime.mascotElastic.x;
        const pullY = runtime.mascotElastic.y;
        const horizontalStretch = Math.abs(pullX) * 0.25;
        const verticalStretch = Math.abs(pullY) * 0.25;
        const horizontalCompression = Math.abs(pullY) * 0.08;
        const verticalCompression = Math.abs(pullX) * 0.08;
        runtime.mascotSprite.scale.set(
          MASCOT_HEIGHT * mascotAspect * (1 + horizontalStretch - horizontalCompression),
          MASCOT_HEIGHT * (1 + verticalStretch - verticalCompression),
          1,
        );
        runtime.mascotSprite.position.set(pullX * 0.06, 0.16 + pullY * 0.06, 0);
        const idle = runtime.fragmentPhase === "ready" && !runtime.reduceMotion
          ? Math.sin(time * 0.0021) * 0.025
          : 0;
        runtime.mascotRoot.position.set(
          runtime.mascotHome.x + pullX * 0.22,
          runtime.mascotHome.y + idle + pullY * 0.22,
          runtime.mascotHome.z,
        );
        runtime.mascotRoot.rotation.z = -pullX * 0.055;
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
      runtime.outerShellFragments.forEach((fragment) => fragment.mesh.geometry.dispose());
      disposeScene(scene);
      mascotMaterial.map?.dispose();
      mascotMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, [fortune, fortuneId]);

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
    runtime.fragmentPhase = "falling";
    runtime.notePresented = false;
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
    syncOuterShellFragmentBatches(runtime.outerShellFragments, runtime.fragmentBatches);
    updateOuterShellGeometry(
      runtime.outerShellGeometry,
      runtime.outerShellBasePositions,
      runtime.deformations,
      runtime.outerShellFragments,
    );

    runtime.intactBall.visible = false;
    runtime.outerShell.visible = false;
    runtime.fragmentMotions = createFallLayout(runtime.outerShellFragments, hit).map((target) => {
      const startPosition = target.fragment.mesh.position.clone();
      const fallDistance = Math.max(startPosition.y - target.floorY, 0.01);
      const floorHitTime = (
        target.velocity.y + Math.sqrt(
          target.velocity.y * target.velocity.y + 4 * FRAGMENT_GRAVITY * fallDistance,
        )
      ) / (2 * FRAGMENT_GRAVITY);
      return {
        ...target,
        startPosition,
        startQuaternion: target.fragment.mesh.quaternion.clone(),
        startScale: target.fragment.mesh.scale.clone(),
        floorHitTime,
      };
    });
    runtime.fragmentFallStartedAt = performance.now();
    runtime.fragmentPhase = "falling";
    runtime.cameraTarget.set(0, 2.05, 7.45);
    runtime.cameraLookTarget.set(0, -0.66, 0);
  }, [stage, revealed]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !revealed) return;
    runtime.noteReady = false;
    runtime.noteRoot.visible = false;
    runtime.mascotRoot.visible = false;
  }, [revealed]);

  return (
    <div ref={containerRef} className="wakppu-break-scene" aria-hidden="true">
      {!ready && <div className="wakppu-break-loading" role="status">왁뿌볼 준비 중...</div>}
    </div>
  );
}
