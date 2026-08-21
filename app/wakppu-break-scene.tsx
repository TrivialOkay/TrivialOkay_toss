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
import { createFloatLayout, type FloatLayoutTarget, type FragmentMotionStyle } from "./wakppu-fall-layout";
import { hiddenCardFor, type HiddenCard, type HiddenCardId } from "./byeolil-data";
import type { WakppuVariant } from "./wakppu-data";

type WakppuBreakSceneProps = {
  stage: number;
  revealed: boolean;
  fortune: string;
  fortuneId: number;
  variant: WakppuVariant;
  specialCardId: HiddenCardId | null;
  launchRequested: boolean;
  onImpact: () => void;
  onSlice: () => void;
  onChargedBreak: () => void;
  onRocketReady: () => void;
  onRocketLaunch: () => void;
  onCardReveal: () => void;
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

type MascotDrag = {
  pointerId: number;
  startX: number;
  startY: number;
};

type FloatingFragmentMotion = FloatLayoutTarget & {
  startPosition: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
  startScale: THREE.Vector3;
  interactionOffset: THREE.Vector3;
  interactionVelocity: THREE.Vector3;
  interactionAngle: number;
  interactionSpin: number;
};

type FragmentPhase = "idle" | "spreading" | "floating";

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
  shellBaseScale: THREE.Vector3;
  variant: WakppuVariant;
  variantDecoration: THREE.Object3D | null;
  exploded: boolean;
  rocketRoot: THREE.Group;
  rocketHitbox: THREE.Mesh;
  rocketFlame: THREE.Mesh;
  rocketHalo: THREE.Mesh;
  rocketHaloMaterial: THREE.MeshBasicMaterial;
  rocketBeacon: THREE.Mesh;
  rocketBeaconMaterial: THREE.MeshBasicMaterial;
  rocketReady: boolean;
  rocketHome: THREE.Vector3;
  rocketLaunchedAt: number | null;
  cardDropRoot: THREE.Group;
  cardMaterial: THREE.MeshBasicMaterial;
  cardRevealDispatched: boolean;
  mascotRoot: THREE.Group;
  mascotSprite: THREE.Sprite;
  mascotHome: THREE.Vector3;
  bladeRoot: THREE.Group;
  bladeMaterial: THREE.MeshPhysicalMaterial;
  bladeHandleMaterial: THREE.MeshPhysicalMaterial;
  sliceLine: THREE.Mesh;
  sliceLineMaterial: THREE.MeshBasicMaterial;
  sliceEffect: SliceEffect | null;
  chargeRoot: THREE.Group;
  chargeMaterials: [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial];
  chargeReady: boolean;
  chargedBreak: boolean;
  fragmentPhase: FragmentPhase;
  fragmentFallStartedAt: number;
  fragmentMotions: FloatingFragmentMotion[];
  rocketPresented: boolean;
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
// 로켓은 카메라에 더 가까운 z축에 있어 실제 기하 크기는 줄여야 캐릭터보다 살짝 크게 보인다.
const ROCKET_HEIGHT = MASCOT_HEIGHT * 0.75;
const ROCKET_WIDTH = ROCKET_HEIGHT * (2 / 3);
const AWARD_CARD_WIDTH = 0.92;
const AWARD_CARD_HEIGHT = 1.9;
const ROCKET_HOME_X = -0.72;
const ROCKET_HOME_Y = -0.14;
const ROCKET_HOME_Z = 2.55;
const ROCKET_SCALE = 1.12;
const FRAGMENT_SPREAD_DURATION = 1450;
const ROCKET_REVEAL_DELAY = 520;
const ROCKET_SEQUENCE_DURATION = 1650;
const LONG_PRESS_CHARGE_MS = 1200;
const LONG_PRESS_VISIBLE_MS = 360;
const DEFORMATION_MIN_DOT = Math.cos(0.96);
const CAMERA_STAGE_POSITIONS = [
  new THREE.Vector3(0, 0.34, 8.45),
  new THREE.Vector3(0.58, 0.52, 8.28),
  new THREE.Vector3(-0.62, 0.16, 8.12),
  new THREE.Vector3(0.68, 0.56, 7.98),
  new THREE.Vector3(-0.72, 0.12, 7.86),
  new THREE.Vector3(0, 0.34, 8.35),
];

export function wakppuBreakThresholdFor(variant: WakppuVariant) {
  return variant === "blackHole" ? 8 : 5;
}

const variantMotionStyles: Record<WakppuVariant, FragmentMotionStyle> = {
  chewyCookie: "stretch",
  butterBar: "crumble",
  sun: "flare",
  earth: "plate",
  mars: "dust",
  jupiter: "shear",
  moon: "chunk",
  saturn: "orbit",
  blackHole: "collapse",
};

const variantBreakResponses: Record<WakppuVariant, { deformation: number; squash: number; pressure: number }> = {
  chewyCookie: { deformation: 1.65, squash: 1.55, pressure: 0.78 },
  butterBar: { deformation: 0.72, squash: 0.5, pressure: 1.28 },
  sun: { deformation: 0.45, squash: 0.3, pressure: 1.38 },
  earth: { deformation: 0.92, squash: 0.82, pressure: 1 },
  mars: { deformation: 0.7, squash: 0.62, pressure: 1.18 },
  jupiter: { deformation: 0.58, squash: 0.48, pressure: 1.24 },
  moon: { deformation: 0.36, squash: 0.22, pressure: 1.45 },
  saturn: { deformation: 0.54, squash: 0.42, pressure: 1.3 },
  blackHole: { deformation: 0.3, squash: 0.18, pressure: 1.5 },
};

const variantChargeColors: Record<WakppuVariant, [number, number]> = {
  chewyCookie: [0xffd08a, 0x8fda75],
  butterBar: [0xffed8f, 0xe5a43e],
  sun: [0xffffb2, 0xff6a22],
  earth: [0x9de8ff, 0x6ed18d],
  mars: [0xffae73, 0xe55735],
  jupiter: [0xffe0ad, 0xcf865c],
  moon: [0xf4f4df, 0x9da9bf],
  saturn: [0xffe5ac, 0xc38c4b],
  blackHole: [0xfff9dc, 0xd7af63],
};

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

function createHiddenCommandCardTexture(card: HiddenCard, fortune: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1056;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const isCharge = card.id === "stellar-overcharge";
  const accent = isCharge ? "#ffe37c" : "#ffa4dc";
  const secondary = isCharge ? "#896dff" : "#62d9ff";

  roundedRectPath(context, 3, 3, 506, 1050, 22);
  context.clip();
  const background = context.createLinearGradient(0, 0, 512, 1056);
  background.addColorStop(0, "#100b29");
  background.addColorStop(0.55, "#24134e");
  background.addColorStop(1, "#08172a");
  context.fillStyle = background;
  context.fillRect(0, 0, 512, 1056);

  context.globalAlpha = 0.32;
  for (let index = 0; index < 56; index += 1) {
    const x = (index * 83) % 512;
    const y = (index * index * 29 + 43) % 1056;
    context.fillStyle = index % 3 === 0 ? accent : "#ffffff";
    context.beginPath();
    context.arc(x, y, index % 5 === 0 ? 2.2 : 1.1, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  context.fillStyle = accent;
  context.fillRect(0, 0, 512, 64);
  context.fillStyle = "#17102d";
  context.font = "900 21px sans-serif";
  context.textAlign = "left";
  context.fillText("별일 비밀관측국", 24, 41);
  roundedRectPath(context, 402, 15, 86, 34, 8);
  context.fillStyle = "#17102d";
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "900 13px sans-serif";
  context.textAlign = "center";
  context.fillText("HIDDEN", 445, 37);

  context.textAlign = "left";
  context.fillStyle = "#dcd5ff";
  context.font = "800 15px sans-serif";
  context.fillText(`${card.code} · ${card.label}`, 26, 115);
  context.fillStyle = "#ffffff";
  context.font = "900 38px sans-serif";
  drawWrappedText(context, card.title, 26, 178, 460, 48, 2);

  const glow = context.createRadialGradient(256, 445, 12, 256, 445, 190);
  glow.addColorStop(0, isCharge ? "rgba(255,240,140,.95)" : "rgba(255,174,225,.92)");
  glow.addColorStop(0.35, isCharge ? "rgba(137,109,255,.42)" : "rgba(98,217,255,.36)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = glow;
  context.fillRect(50, 250, 412, 400);
  context.strokeStyle = accent;
  context.lineWidth = isCharge ? 8 : 5;
  context.shadowColor = accent;
  context.shadowBlur = 28;
  if (isCharge) {
    for (const radius of [72, 112, 154]) {
      context.beginPath();
      context.arc(256, 444, radius, 0, Math.PI * 2);
      context.stroke();
    }
  } else {
    context.beginPath();
    context.moveTo(98, 588);
    context.lineTo(414, 302);
    context.stroke();
    context.strokeStyle = secondary;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(74, 612);
    context.lineTo(390, 326);
    context.stroke();
  }
  context.shadowBlur = 0;
  context.fillStyle = "#ffffff";
  context.font = `900 ${isCharge ? 112 : 138}px sans-serif`;
  context.textAlign = "center";
  context.fillText(card.symbol, 256, isCharge ? 482 : 505);

  roundedRectPath(context, 28, 682, 456, 178, 16);
  context.fillStyle = "rgba(255,255,255,.09)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,.26)";
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = accent;
  context.font = "900 15px sans-serif";
  context.textAlign = "left";
  context.fillText("숨겨진 관측 기록", 50, 722);
  context.fillStyle = "#ffffff";
  context.font = "800 20px sans-serif";
  drawWrappedText(context, card.copy, 50, 765, 410, 31, 3);

  context.fillStyle = "#bdb5d9";
  context.font = "700 13px sans-serif";
  context.fillText("원래 관측 예보", 34, 916);
  context.fillStyle = "#ffffff";
  context.font = "800 16px sans-serif";
  drawWrappedText(context, fortune, 34, 948, 442, 25, 2);
  context.strokeStyle = secondary;
  context.lineWidth = 3;
  roundedRectPath(context, 3, 3, 506, 1050, 22);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
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

function createWakppuTexture(variant: WakppuVariant) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const palette: Record<WakppuVariant, [string, string, string]> = {
    chewyCookie: ["#3a201c", "#6f3c2c", "#21110f"],
    butterBar: ["#f5cf61", "#d99a31", "#fff0a6"],
    sun: ["#ff8b16", "#ffd34d", "#ef4b0b"],
    earth: ["#0c65b8", "#43a8d8", "#07386e"],
    mars: ["#8e321f", "#d2663e", "#5d2119"],
    jupiter: ["#d79a61", "#f0d1a0", "#9f6548"],
    moon: ["#777b82", "#c8c9c4", "#555a62"],
    saturn: ["#c28d4d", "#ead4a1", "#8e6638"],
    blackHole: ["#010204", "#11151a", "#030405"],
  };
  const [start, middle, end] = palette[variant];
  const base = context.createLinearGradient(0, canvas.height, canvas.width, 0);
  base.addColorStop(0, start);
  base.addColorStop(0.5, middle);
  base.addColorStop(1, end);
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (variant === "chewyCookie") {
    for (let index = 0; index < 70; index += 1) {
      const x = (Math.sin(index * 91.7) * 0.5 + 0.5) * canvas.width;
      const y = (Math.sin(index * 47.3 + 2) * 0.5 + 0.5) * canvas.height;
      const radius = 5 + (index % 5) * 2.2;
      context.fillStyle = index % 4 === 0 ? "#70a55a" : index % 3 === 0 ? "#d9b782" : "#160b09";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  } else if (variant === "butterBar") {
    context.fillStyle = "rgba(119,68,20,.15)";
    for (let index = 0; index < 54; index += 1) {
      const x = (Math.sin(index * 63.1) * 0.5 + 0.5) * canvas.width;
      const y = (Math.sin(index * 29.7 + 1) * 0.5 + 0.5) * canvas.height;
      context.beginPath();
      context.arc(x, y, 2 + index % 4, 0, Math.PI * 2);
      context.fill();
    }
  } else if (variant === "sun") {
    context.fillStyle = "rgba(255,245,154,.48)";
    for (let index = 0; index < 34; index += 1) {
      const x = index * 37 - 80;
      const y = 70 + (index % 6) * 74;
      context.beginPath();
      context.ellipse(x, y, 62, 14, -0.18, 0, Math.PI * 2);
      context.fill();
    }
  } else if (variant === "earth") {
    context.fillStyle = "#4caa62";
    [
      [110, 120, 210, 105], [360, 305, 250, 130], [650, 145, 180, 120], [880, 360, 230, 115],
    ].forEach(([x, y, width, height]) => {
      context.beginPath();
      context.ellipse(x, y, width / 2, height / 2, x * 0.003, 0, Math.PI * 2);
      context.fill();
    });
    context.fillStyle = "rgba(245,252,255,.72)";
    context.fillRect(0, 74, canvas.width, 16);
    context.fillRect(0, 418, canvas.width, 22);
  } else if (variant === "mars") {
    for (let index = 0; index < 38; index += 1) {
      const x = (Math.sin(index * 51.2) * 0.5 + 0.5) * canvas.width;
      const y = (Math.sin(index * 77.9 + 1.4) * 0.5 + 0.5) * canvas.height;
      const radius = 5 + index % 5 * 4;
      context.fillStyle = index % 3 === 0 ? "rgba(78,25,20,.48)" : "rgba(244,145,91,.3)";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  } else if (variant === "jupiter" || variant === "saturn") {
    const bands = variant === "saturn"
      ? ["#87613a", "#ead6a7", "#c99558", "#f2dfb4", "#b47a43", "#e6c98f", "#795535"]
      : ["#9d654d", "#f1d9ae", "#c47f55", "#ecd1a2", "#805044", "#dfaa72", "#f3debc"];
    bands.forEach((color, index, colors) => {
      context.fillStyle = color;
      context.fillRect(0, index * canvas.height / colors.length, canvas.width, canvas.height / colors.length + 3);
    });
    if (variant === "jupiter") {
      context.fillStyle = "#a94d3f";
      context.beginPath();
      context.ellipse(760, 318, 112, 43, -0.08, 0, Math.PI * 2);
      context.fill();
    }
  } else if (variant === "moon") {
    for (let index = 0; index < 46; index += 1) {
      const x = (Math.sin(index * 39.4) * 0.5 + 0.5) * canvas.width;
      const y = (Math.sin(index * 61.8 + 0.7) * 0.5 + 0.5) * canvas.height;
      const radius = 5 + index % 6 * 4;
      context.fillStyle = index % 2 ? "rgba(55,59,66,.28)" : "rgba(238,239,232,.24)";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  } else {
    const glow = context.createRadialGradient(512, 256, 22, 512, 256, 480);
    glow.addColorStop(0, "#000000");
    glow.addColorStop(0.44, "#020304");
    glow.addColorStop(0.72, "#1a2023");
    glow.addColorStop(1, "#030405");
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const sheen = context.createLinearGradient(0, 0, 0, canvas.height);
  sheen.addColorStop(0, variant === "blackHole" ? "rgba(255,238,199,.12)" : "rgba(255,255,255,.56)");
  sheen.addColorStop(0.4, "rgba(255,255,255,.08)");
  sheen.addColorStop(1, "rgba(74,62,69,.16)");
  context.fillStyle = sheen;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(variant === "jupiter" || variant === "saturn" ? 1 : 1.15, 1);
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

function beginRocketLaunch(runtime: SceneRuntime, onLaunch: () => void) {
  if (!runtime.rocketReady || runtime.rocketLaunchedAt !== null) return;
  runtime.rocketReady = false;
  runtime.rocketLaunchedAt = performance.now();
  runtime.rocketFlame.visible = true;
  runtime.rocketHalo.visible = false;
  runtime.rocketBeacon.visible = false;
  runtime.mascotDrag = null;
  runtime.mascotElasticTarget.set(0, 0);
  onLaunch();
}

export function WakppuBreakScene({
  stage,
  revealed,
  fortune,
  fortuneId,
  variant,
  specialCardId,
  launchRequested,
  onImpact,
  onSlice,
  onChargedBreak,
  onRocketReady,
  onRocketLaunch,
  onCardReveal,
}: WakppuBreakSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const stageRef = useRef(stage);
  const revealedRef = useRef(revealed);
  const impactCallbackRef = useRef(onImpact);
  const sliceCallbackRef = useRef(onSlice);
  const chargedBreakCallbackRef = useRef(onChargedBreak);
  const rocketReadyCallbackRef = useRef(onRocketReady);
  const rocketLaunchCallbackRef = useRef(onRocketLaunch);
  const cardRevealCallbackRef = useRef(onCardReveal);
  const [ready, setReady] = useState(false);
  const breakThreshold = wakppuBreakThresholdFor(variant);

  useEffect(() => {
    stageRef.current = stage;
    revealedRef.current = revealed;
    impactCallbackRef.current = onImpact;
    sliceCallbackRef.current = onSlice;
    chargedBreakCallbackRef.current = onChargedBreak;
    rocketReadyCallbackRef.current = onRocketReady;
    rocketLaunchCallbackRef.current = onRocketLaunch;
    cardRevealCallbackRef.current = onCardReveal;
  }, [stage, revealed, onImpact, onSlice, onChargedBreak, onRocketReady, onRocketLaunch, onCardReveal]);

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

    const variantStyle: Record<WakppuVariant, { scale: [number, number, number]; fragment: number; edge: number; roughness: number }> = {
      chewyCookie: { scale: [1.06, 0.9, 0.98], fragment: 0x5c3026, edge: 0x21110f, roughness: 0.58 },
      butterBar: { scale: [1.13, 0.73, 0.91], fragment: 0xe0aa43, edge: 0x8f5d23, roughness: 0.5 },
      sun: { scale: [1.03, 1.03, 1.03], fragment: 0xff8b19, edge: 0xffe16a, roughness: 0.3 },
      earth: { scale: [1, 1, 1], fragment: 0x267eb6, edge: 0xa9dff1, roughness: 0.3 },
      mars: { scale: [0.97, 0.97, 0.97], fragment: 0xb94c31, edge: 0xf09a69, roughness: 0.62 },
      jupiter: { scale: [1.08, 0.96, 1], fragment: 0xc78c61, edge: 0xf0d4ad, roughness: 0.4 },
      moon: { scale: [0.94, 0.94, 0.94], fragment: 0x96999e, edge: 0xd6d6d0, roughness: 0.72 },
      saturn: { scale: [1.02, 0.95, 1], fragment: 0xc79558, edge: 0xf0d9a8, roughness: 0.46 },
      blackHole: { scale: [0.9, 0.9, 0.9], fragment: 0x080b0d, edge: 0xffdf9f, roughness: 0.14 },
    };
    const style = variantStyle[variant];
    const shellBaseScale = new THREE.Vector3(...style.scale);
    const wakppuTexture = createWakppuTexture(variant);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: wakppuTexture,
      roughness: style.roughness,
      metalness: 0,
      clearcoat: variant === "chewyCookie" || variant === "butterBar" ? 0.38 : 0.76,
      clearcoatRoughness: variant === "chewyCookie" || variant === "butterBar" ? 0.32 : 0.19,
      iridescence: variant === "blackHole" ? 0.08 : 0.18,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [180, 520],
      emissive: variant === "blackHole" ? 0x010203 : variant === "sun" ? 0x8c2600 : 0x000000,
      emissiveIntensity: variant === "blackHole" ? 0.42 : variant === "sun" ? 0.56 : 0,
      side: THREE.DoubleSide,
    });
    const shellGeometry = new THREE.SphereGeometry(BALL_RADIUS, 48, 32);
    shellGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), BALL_RADIUS + 0.45);
    const shellPosition = shellGeometry.getAttribute("position") as THREE.BufferAttribute;
    const shellBasePositions = new Float32Array(shellPosition.array as Float32Array);
    const intactBall = new THREE.Mesh(shellGeometry, shellMaterial);
    intactBall.scale.copy(shellBaseScale);
    scene.add(intactBall);

    const outerShellMaterial = new THREE.MeshPhysicalMaterial({
      color: style.fragment,
      transparent: true,
      opacity: variant === "blackHole" ? 0.3 : 0.2,
      roughness: style.roughness,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
      iridescence: 0.42,
      transmission: variant === "earth" || variant === "blackHole" ? 0.24 : 0.08,
      thickness: 0.035,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const fragmentMaterial = outerShellMaterial.clone();
    fragmentMaterial.color.set(style.fragment);
    fragmentMaterial.opacity = variant === "blackHole" ? 0.82 : 0.72;
    fragmentMaterial.transmission = variant === "earth" ? 0.12 : 0;
    fragmentMaterial.roughness = style.roughness;
    fragmentMaterial.clearcoat = 1;
    fragmentMaterial.clearcoatRoughness = 0.05;
    fragmentMaterial.ior = 1.42;
    fragmentMaterial.thickness = 0.018;
    fragmentMaterial.emissive.set(variant === "sun" ? 0x8f2b00 : variant === "blackHole" ? 0x17110a : 0x000000);
    fragmentMaterial.emissiveIntensity = variant === "sun" ? 0.62 : variant === "blackHole" ? 0.48 : 0;
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: style.edge,
      transparent: true,
      opacity: variant === "blackHole" ? 0.72 : 0.48,
      roughness: 0.1,
      clearcoat: 0.94,
      clearcoatRoughness: 0.08,
      iridescence: variant === "blackHole" ? 0.08 : 0.18,
      emissive: variant === "blackHole" ? 0x7a531f : 0x281620,
      emissiveIntensity: variant === "blackHole" ? 0.82 : 0.24,
      transmission: 0.08,
      thickness: 0.012,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerShellState = createOuterShell({
      surface: outerShellMaterial,
      fragmentSurface: fragmentMaterial,
      edge: edgeMaterial,
    });
    outerShellState.mesh.scale.copy(shellBaseScale);
    scene.add(outerShellState.mesh);
    scene.add(outerShellState.fragmentBatches.surface, outerShellState.fragmentBatches.edge);
    if (variant === "blackHole") {
      intactBall.visible = false;
      outerShellState.mesh.visible = false;
      outerShellState.fragmentBatches.surface.visible = false;
      outerShellState.fragmentBatches.edge.visible = false;
    }

    let variantDecoration: THREE.Object3D | null = null;
    if (variant === "sun") {
      const corona = new THREE.Mesh(
        new THREE.TorusGeometry(BALL_RADIUS * 1.03, 0.045, 12, 96),
        new THREE.MeshBasicMaterial({
          color: 0xffd84d,
          transparent: true,
          opacity: 0.62,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      corona.rotation.set(0.12, 0.08, 0);
      variantDecoration = corona;
      scene.add(corona);
    } else if (variant === "saturn") {
      const ringGroup = new THREE.Group();
      const ringMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xd6ad6b,
        emissive: 0x3e260c,
        emissiveIntensity: 0.22,
        roughness: 0.38,
        metalness: 0.16,
        side: THREE.DoubleSide,
      });
      const segmentCount = 20;
      for (let index = 0; index < segmentCount; index += 1) {
        const angle = index / segmentCount * Math.PI * 2;
        const segment = new THREE.Mesh(
          new THREE.TorusGeometry(BALL_RADIUS * 1.18, 0.075, 8, 5, Math.PI * 2 / segmentCount * 0.82),
          ringMaterial,
        );
        segment.rotation.z = angle;
        segment.userData.ringAngle = angle;
        ringGroup.add(segment);
      }
      ringGroup.rotation.set(1.08, 0.08, -0.14);
      variantDecoration = ringGroup;
      scene.add(ringGroup);
    } else if (variant === "blackHole") {
      const blackHoleGroup = new THREE.Group();
      const addGlowRing = (radius: number, tube: number, color: number, opacity: number) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(radius, tube, 16, 128),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
          }),
        );
        ring.renderOrder = 4;
        blackHoleGroup.add(ring);
      };
      const addLensArc = (
        radius: number,
        tube: number,
        rotation: number,
        arc: number,
        color: number,
        opacity: number,
        yScale = 1,
      ) => {
        const lensArc = new THREE.Mesh(
          new THREE.TorusGeometry(radius, tube, 16, 96, arc),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
          }),
        );
        lensArc.rotation.z = rotation;
        lensArc.scale.y = yScale;
        lensArc.renderOrder = 5;
        blackHoleGroup.add(lensArc);
      };
      addGlowRing(BALL_RADIUS * 0.99, 0.155, 0xffa94d, 0.025);
      addGlowRing(BALL_RADIUS * 1.015, 0.076, 0xffd99a, 0.065);
      addGlowRing(BALL_RADIUS * 1.045, 0.024, 0xffffe8, 0.11);
      addLensArc(BALL_RADIUS * 1.025, 0.09, -0.14, Math.PI * 0.92, 0xffffef, 0.08);
      addLensArc(BALL_RADIUS * 1.055, 0.052, Math.PI + 0.18, Math.PI * 0.72, 0xffc778, 0.06);
      addLensArc(BALL_RADIUS * 1.42, 0.026, 0.38, Math.PI * 1.38, 0xdca348, 0.045, 0.76);

      const diskCanvas = document.createElement("canvas");
      diskCanvas.width = 1024;
      diskCanvas.height = 256;
      const diskContext = diskCanvas.getContext("2d");
      if (diskContext) {
        const horizontalGlow = diskContext.createLinearGradient(0, 0, diskCanvas.width, 0);
        horizontalGlow.addColorStop(0, "rgba(255,173,72,0)");
        horizontalGlow.addColorStop(0.12, "rgba(255,173,72,.18)");
        horizontalGlow.addColorStop(0.35, "rgba(255,204,115,.72)");
        horizontalGlow.addColorStop(0.5, "rgba(255,250,221,1)");
        horizontalGlow.addColorStop(0.65, "rgba(255,204,115,.72)");
        horizontalGlow.addColorStop(0.88, "rgba(255,173,72,.18)");
        horizontalGlow.addColorStop(1, "rgba(255,173,72,0)");
        const verticalGlow = diskContext.createLinearGradient(0, 0, 0, diskCanvas.height);
        verticalGlow.addColorStop(0, "rgba(255,255,255,0)");
        verticalGlow.addColorStop(0.24, "rgba(255,255,255,.08)");
        verticalGlow.addColorStop(0.4, "rgba(255,255,255,.48)");
        verticalGlow.addColorStop(0.5, "rgba(255,255,255,1)");
        verticalGlow.addColorStop(0.6, "rgba(255,255,255,.48)");
        verticalGlow.addColorStop(0.76, "rgba(255,255,255,.08)");
        verticalGlow.addColorStop(1, "rgba(255,255,255,0)");
        diskContext.fillStyle = horizontalGlow;
        diskContext.fillRect(0, 0, diskCanvas.width, diskCanvas.height);
        diskContext.globalCompositeOperation = "destination-in";
        diskContext.fillStyle = verticalGlow;
        diskContext.fillRect(0, 0, diskCanvas.width, diskCanvas.height);
        diskContext.globalCompositeOperation = "source-atop";
        diskContext.lineCap = "round";
        diskContext.shadowColor = "rgba(255,159,61,.72)";
        diskContext.shadowBlur = 7;
        for (let index = 0; index < 58; index += 1) {
          const wave = Math.sin(index * 91.37);
          const y = diskCanvas.height * 0.5 + wave * 92;
          const bend = Math.cos(index * 47.11) * 38;
          const streakGradient = diskContext.createLinearGradient(0, y, diskCanvas.width, y + bend);
          streakGradient.addColorStop(0, "rgba(229,98,24,0)");
          streakGradient.addColorStop(0.16, `rgba(240,112,30,${0.08 + index % 4 * 0.035})`);
          streakGradient.addColorStop(0.42, `rgba(255,184,83,${0.2 + index % 5 * 0.045})`);
          streakGradient.addColorStop(0.54, `rgba(255,245,211,${0.3 + index % 3 * 0.08})`);
          streakGradient.addColorStop(0.82, `rgba(255,153,53,${0.08 + index % 4 * 0.025})`);
          streakGradient.addColorStop(1, "rgba(229,98,24,0)");
          diskContext.strokeStyle = streakGradient;
          diskContext.lineWidth = 0.8 + index % 6 * 0.48;
          diskContext.beginPath();
          diskContext.moveTo(-32, y + bend * 0.5);
          diskContext.bezierCurveTo(210, y - bend * 1.25, 720, y + bend, 1056, y - bend * 0.55);
          diskContext.stroke();
        }
        diskContext.shadowBlur = 0;
        diskContext.globalCompositeOperation = "source-over";
      }
      const diskTexture = new THREE.CanvasTexture(diskCanvas);
      diskTexture.colorSpace = THREE.SRGBColorSpace;
      diskTexture.minFilter = THREE.LinearFilter;
      const diskMaterial = new THREE.MeshBasicMaterial({
        map: diskTexture,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const lensedDiskMaterial = diskMaterial.clone();
      lensedDiskMaterial.opacity = 0.045;
      lensedDiskMaterial.depthTest = true;
      const lensedDisk = new THREE.Mesh(
        new THREE.PlaneGeometry(BALL_RADIUS * 3.15, 0.62),
        lensedDiskMaterial,
      );
      lensedDisk.position.z = -0.28;
      lensedDisk.rotation.z = Math.PI / 2 - 0.13;
      lensedDisk.renderOrder = 1;
      blackHoleGroup.add(lensedDisk);

      const diskHazeMaterial = diskMaterial.clone();
      diskHazeMaterial.opacity = 0.035;
      const diskHaze = new THREE.Mesh(
        new THREE.PlaneGeometry(BALL_RADIUS * 4.65, 1.02),
        diskHazeMaterial,
      );
      diskHaze.position.z = 0.18;
      diskHaze.rotation.z = -0.13;
      diskHaze.renderOrder = 5;
      blackHoleGroup.add(diskHaze);

      const diskGlow = new THREE.Mesh(new THREE.PlaneGeometry(BALL_RADIUS * 4.3, 0.78), diskMaterial);
      diskGlow.position.z = 0.22;
      diskGlow.rotation.z = -0.13;
      diskGlow.renderOrder = 6;
      blackHoleGroup.add(diskGlow);

      const diskCore = new THREE.Mesh(
        new THREE.PlaneGeometry(BALL_RADIUS * 3.7, 0.055),
        new THREE.MeshBasicMaterial({
          color: 0xfff5d2,
          transparent: true,
          opacity: 0.06,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        }),
      );
      diskCore.position.z = 0.23;
      diskCore.rotation.z = -0.13;
      diskCore.renderOrder = 7;
      blackHoleGroup.add(diskCore);

      const blackHoleTexture = new THREE.TextureLoader().load("/wakppu-black-hole-v2.webp");
      blackHoleTexture.colorSpace = THREE.SRGBColorSpace;
      blackHoleTexture.minFilter = THREE.LinearMipmapLinearFilter;
      blackHoleTexture.magFilter = THREE.LinearFilter;
      blackHoleTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const blackHoleSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: blackHoleTexture,
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.018,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }));
      const blackHoleSpriteWidth = BALL_RADIUS * 4.3;
      blackHoleSprite.scale.set(blackHoleSpriteWidth, blackHoleSpriteWidth / (1695 / 928), 1);
      blackHoleSprite.position.z = 0.26;
      blackHoleSprite.renderOrder = 8;
      blackHoleGroup.add(blackHoleSprite);

      variantDecoration = blackHoleGroup;
      scene.add(blackHoleGroup);
    }

    const [chargePrimary, chargeSecondary] = variantChargeColors[variant];
    const chargeMaterialOuter = new THREE.MeshBasicMaterial({
      color: chargePrimary,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const chargeMaterialInner = new THREE.MeshBasicMaterial({
      color: chargeSecondary,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const chargeRoot = new THREE.Group();
    chargeRoot.visible = false;
    chargeRoot.position.z = 2.04;
    const chargeOuterRing = new THREE.Mesh(
      new THREE.TorusGeometry(BALL_RADIUS * 1.22, 0.035, 10, 96),
      chargeMaterialOuter,
    );
    chargeOuterRing.renderOrder = 18;
    chargeRoot.add(chargeOuterRing);
    const chargeInnerRing = new THREE.Mesh(
      new THREE.TorusGeometry(BALL_RADIUS * 1.05, 0.022, 8, 80),
      chargeMaterialInner,
    );
    chargeInnerRing.rotation.x = 1.05;
    chargeInnerRing.rotation.z = -0.2;
    chargeInnerRing.renderOrder = 18;
    chargeRoot.add(chargeInnerRing);
    scene.add(chargeRoot);

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

    const awardCardTexture = createFortuneAwardCardTexture(fortune, fortuneId);
    const cardMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: awardCardTexture,
      transparent: true,
      alphaTest: 0.02,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const cardDropRoot = new THREE.Group();
    cardDropRoot.visible = false;
    cardDropRoot.position.set(0, 3.1, 1.45);
    const cardDropMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(AWARD_CARD_WIDTH, AWARD_CARD_HEIGHT),
      cardMaterial,
    );
    cardDropMesh.renderOrder = 12;
    cardDropRoot.add(cardDropMesh);
    scene.add(cardDropRoot);

    const rocketRoot = new THREE.Group();
    rocketRoot.visible = false;
    rocketRoot.position.set(ROCKET_HOME_X, ROCKET_HOME_Y, ROCKET_HOME_Z);
    rocketRoot.rotation.z = -0.2;
    rocketRoot.scale.setScalar(ROCKET_SCALE);
    const rocketModelRoot = new THREE.Group();
    rocketRoot.add(rocketModelRoot);
    const rocketBodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfff8e8,
      roughness: 0.24,
      clearcoat: 0.9,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    const rocketAccentMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf05a42,
      emissive: 0x4c0d05,
      emissiveIntensity: 0.24,
      roughness: 0.3,
      clearcoat: 0.74,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    const rocketBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 0.82, 24),
      rocketBodyMaterial,
    );
    rocketBody.renderOrder = 18;
    rocketModelRoot.add(rocketBody);
    const rocketNose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 24), rocketAccentMaterial);
    rocketNose.position.y = 0.61;
    rocketNose.renderOrder = 18;
    rocketModelRoot.add(rocketNose);
    const windowRing = new THREE.Mesh(
      new THREE.CircleGeometry(0.105, 24),
      new THREE.MeshBasicMaterial({
        color: 0xe4bc48,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false,
      }),
    );
    windowRing.position.set(0, 0.14, 0.255);
    windowRing.renderOrder = 19;
    rocketModelRoot.add(windowRing);
    const windowGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.067, 24),
      new THREE.MeshBasicMaterial({
        color: 0x84d7ef,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false,
      }),
    );
    windowGlass.position.set(0, 0.14, 0.265);
    windowGlass.renderOrder = 20;
    rocketModelRoot.add(windowGlass);
    const rocketArtworkMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const rocketArtwork = new THREE.Mesh(
      new THREE.PlaneGeometry(ROCKET_WIDTH, ROCKET_HEIGHT),
      rocketArtworkMaterial,
    );
    rocketArtwork.position.z = 0.31;
    rocketArtwork.renderOrder = 22;
    rocketRoot.add(rocketArtwork);
    const rocketHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd75d,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const rocketHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.84, 48),
      rocketHaloMaterial,
    );
    rocketHalo.position.z = -0.02;
    rocketHalo.visible = false;
    rocketHalo.renderOrder = 17;
    rocketRoot.add(rocketHalo);
    const rocketBeaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff2a8,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const rocketBeacon = new THREE.Mesh(
      new THREE.CircleGeometry(0.055, 20),
      rocketBeaconMaterial,
    );
    rocketBeacon.position.set(0.39, 0.72, 0.34);
    rocketBeacon.visible = false;
    rocketBeacon.renderOrder = 21;
    rocketRoot.add(rocketBeacon);
    [-1, 1].forEach((direction) => {
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0.2);
      finShape.lineTo(direction * 0.27, -0.17);
      finShape.lineTo(0, -0.1);
      finShape.closePath();
      const fin = new THREE.Mesh(new THREE.ShapeGeometry(finShape), rocketAccentMaterial);
      fin.position.set(direction * 0.16, -0.32, 0.01);
      fin.renderOrder = 18;
      rocketModelRoot.add(fin);
    });
    const rocketFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.42, 18),
      new THREE.MeshBasicMaterial({
        color: 0xffd44d,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    rocketFlame.position.y = -ROCKET_HEIGHT / 2 - 0.14;
    rocketFlame.rotation.z = Math.PI;
    rocketFlame.visible = false;
    rocketFlame.renderOrder = 18;
    rocketRoot.add(rocketFlame);
    const rocketHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(ROCKET_WIDTH, ROCKET_HEIGHT, 0.24),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    rocketHitbox.userData.isFortuneRocket = true;
    rocketRoot.add(rocketHitbox);
    scene.add(rocketRoot);

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
      mascotDrag: null,
      mascotElastic: new THREE.Vector2(),
      mascotElasticTarget: new THREE.Vector2(),
      mascotElasticVelocity: new THREE.Vector2(),
      lastPressStrength: 0.35,
      fracturePatternAligned: false,
      cameraTarget: CAMERA_STAGE_POSITIONS[0].clone(),
      cameraLookAt: new THREE.Vector3(0, 0.16, 0),
      cameraLookTarget: new THREE.Vector3(0, 0.16, 0),
      shellScaleTarget: shellBaseScale.clone(),
      shellBaseScale,
      variant,
      variantDecoration,
      exploded: false,
      rocketRoot,
      rocketHitbox,
      rocketFlame,
      rocketHalo,
      rocketHaloMaterial,
      rocketBeacon,
      rocketBeaconMaterial,
      rocketReady: false,
      rocketHome: new THREE.Vector3(ROCKET_HOME_X, ROCKET_HOME_Y, ROCKET_HOME_Z),
      rocketLaunchedAt: null,
      cardDropRoot,
      cardMaterial,
      cardRevealDispatched: false,
      mascotRoot,
      mascotSprite,
      mascotHome: new THREE.Vector3(0, MASCOT_HOME_Y, 0.28),
      bladeRoot,
      bladeMaterial,
      bladeHandleMaterial,
      sliceLine,
      sliceLineMaterial,
      sliceEffect: null,
      chargeRoot,
      chargeMaterials: [chargeMaterialOuter, chargeMaterialInner],
      chargeReady: false,
      chargedBreak: false,
      fragmentPhase: "idle",
      fragmentFallStartedAt: 0,
      fragmentMotions: [],
      rocketPresented: false,
      reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      frameId: 0,
      disposed: false,
    };
    runtimeRef.current = runtime;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(ROCKET_IMAGE, (texture) => {
      if (runtime.disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      rocketArtworkMaterial.map?.dispose();
      rocketArtworkMaterial.map = texture;
      rocketArtworkMaterial.opacity = 1;
      rocketArtworkMaterial.needsUpdate = true;
      rocketModelRoot.visible = false;
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

    function pickRocket(event: PointerEvent) {
      if (!runtime.rocketReady || !runtime.rocketRoot.visible) return false;
      setPointerRay(runtime, event);
      return runtime.raycaster.intersectObject(runtime.rocketHitbox, false).length > 0;
    }

    function pickMascot(event: PointerEvent) {
      if (!runtime.mascotRoot.visible) return false;
      setPointerRay(runtime, event);
      return runtime.raycaster.intersectObject(runtime.mascotSprite, false).length > 0;
    }

    function pushFragment(event: PointerEvent) {
      if (runtime.fragmentPhase === "idle" || runtime.fragmentMotions.length === 0) return false;
      setPointerRay(runtime, event);
      const hit = runtime.raycaster.intersectObject(runtime.fragmentBatches.surface, false)[0];
      if (!hit || !("batchId" in hit) || typeof hit.batchId !== "number") return false;
      const batchId = hit.batchId;
      const motion = runtime.fragmentMotions.find(
        (candidate) => candidate.fragment.surfaceBatchId === batchId,
      );
      if (!motion) return false;
      const pushDirection = motion.fragment.radial.clone()
        .addScaledVector(runtime.raycaster.ray.direction, 0.28)
        .normalize();
      motion.interactionVelocity.addScaledVector(pushDirection, 0.82 + motion.fragment.liftSeed * 0.34);
      motion.interactionOffset.addScaledVector(pushDirection, 0.035);
      const spinDirection = motion.fragment.twistSeed >= 0.5 ? 1 : -1;
      motion.interactionSpin += spinDirection * (3.4 + motion.fragment.liftSeed * 2.4);
      motion.bobAmplitude = Math.min(0.22, motion.bobAmplitude + 0.035);
      return true;
    }

    function handlePointerDown(event: PointerEvent) {
      if (runtime.mascotDrag || runtime.activePress) return;
      if (stageRef.current >= breakThreshold) {
        if (pickRocket(event)) {
          beginRocketLaunch(runtime, rocketLaunchCallbackRef.current);
        } else if (pickMascot(event)) {
          runtime.mascotDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
          renderer.domElement.setPointerCapture?.(event.pointerId);
        } else {
          pushFragment(event);
        }
        return;
      }

      setPointerRay(runtime, event);
      const hit = runtime.raycaster.intersectObject(runtime.intactBall, false)[0];
      if (!hit) return;
      const localImpact = runtime.intactBall.worldToLocal(hit.point.clone());
      runtime.impactPoint.copy(localImpact).normalize();
      runtime.chargeReady = false;
      runtime.chargedBreak = false;
      runtime.chargeRoot.visible = false;
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
          runtime.chargeRoot.visible = false;
          runtime.chargeReady = false;
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
        const drag = runtime.mascotDrag;
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (distance < 12 && !runtime.reduceMotion) {
          const bounds = renderer.domElement.getBoundingClientRect();
          const bounceDirection = event.clientX < bounds.left + bounds.width * 0.5 ? 1 : -1;
          runtime.mascotElasticVelocity.set(bounceDirection * 0.26, 0.42);
        }
        runtime.mascotDrag = null;
        runtime.mascotElasticTarget.set(0, 0);
        renderer.domElement.releasePointerCapture?.(event.pointerId);
        return;
      }
      const activePress = runtime.activePress;
      if (!activePress || activePress.pointerId !== event.pointerId) return;
      runtime.activePress = null;
      runtime.chargeRoot.visible = false;
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
      activePress.deformation.targetDepth = (0.105 + holdStrength * 0.25)
        * variantBreakResponses[runtime.variant].deformation;
      runtime.deformations.push(activePress.deformation);
      runtime.lastPressStrength = holdStrength;
      if (runtime.chargeReady || duration >= LONG_PRESS_CHARGE_MS) {
        runtime.chargeReady = false;
        runtime.chargedBreak = true;
        runtime.lastPressStrength = 1;
        chargedBreakCallbackRef.current();
        return;
      }
      impactCallbackRef.current();
    }

    function cancelPointer(event: PointerEvent) {
      if (runtime.mascotDrag?.pointerId === event.pointerId) {
        runtime.mascotDrag = null;
        runtime.mascotElasticTarget.set(0, 0);
      }
      if (runtime.activePress?.pointerId === event.pointerId) {
        runtime.activePress = null;
        runtime.chargeReady = false;
        runtime.chargeRoot.visible = false;
      }
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", finishPointer);
    renderer.domElement.addEventListener("pointercancel", cancelPointer);

    const fragmentTarget = new THREE.Vector3();
    const rocketIdleTarget = new THREE.Vector3();
    const fragmentSpinQuaternion = new THREE.Quaternion();
    const mascotSpringForce = new THREE.Vector2();
    const orbitAxis = new THREE.Vector3(0, 1, 0);
    let previousFrameTime = performance.now();
    function render(time: number) {
      const frameDelta = clamp((time - previousFrameTime) / 1000, 0, 0.05);
      previousFrameTime = time;
      const mascotCanFloat = runtime.rocketLaunchedAt === null || runtime.cardRevealDispatched;
      const zeroGravityActive = runtime.rocketPresented
        && mascotCanFloat
        && !runtime.mascotDrag
        && !runtime.reduceMotion;
      const zeroGravityX = zeroGravityActive
        ? Math.sin(time * 0.00105) * 0.075 + Math.sin(time * 0.00043 + 1.7) * 0.025
        : 0;
      const zeroGravityY = zeroGravityActive
        ? Math.sin(time * 0.00145 + 0.4) * 0.09 + Math.cos(time * 0.00072) * 0.025
        : 0;
      const zeroGravityZ = zeroGravityActive ? Math.sin(time * 0.00082 + 2.3) * 0.035 : 0;
      const zeroGravityTilt = zeroGravityActive
        ? Math.sin(time * 0.0011 + 0.2) * 0.045 + Math.sin(time * 0.00037) * 0.015
        : 0;
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

      if (runtime.activePress && !runtime.exploded) {
        const heldFor = time - runtime.activePress.startedAt;
        const chargeProgress = clamp(
          (heldFor - LONG_PRESS_VISIBLE_MS) / (LONG_PRESS_CHARGE_MS - LONG_PRESS_VISIBLE_MS),
        );
        runtime.chargeRoot.visible = chargeProgress > 0;
        if (chargeProgress > 0) {
          const chargedPulse = chargeProgress >= 1 && !runtime.reduceMotion
            ? 1 + Math.sin(time * 0.018) * 0.055
            : 1;
          runtime.chargeRoot.scale.setScalar((0.72 + chargeProgress * 0.3) * chargedPulse);
          if (!runtime.reduceMotion) {
            runtime.chargeRoot.rotation.z += 0.006 + chargeProgress * 0.012;
            runtime.chargeRoot.children[1].rotation.z -= 0.012 + chargeProgress * 0.018;
          }
          runtime.chargeMaterials[0].opacity = 0.12 + chargeProgress * 0.72;
          runtime.chargeMaterials[1].opacity = 0.08 + chargeProgress * 0.64;
        }
        if (chargeProgress >= 1 && !runtime.chargeReady) {
          runtime.chargeReady = true;
          navigator.vibrate?.([18, 28, 34]);
        }
      } else if (runtime.chargeRoot.visible) {
        runtime.chargeRoot.visible = false;
      }

      if (!runtime.exploded) {
        let geometryChanged = false;
        if (runtime.activePress) {
          const heldFor = performance.now() - runtime.activePress.startedAt;
          const previewStrength = clamp(heldFor / 1120);
          const breakResponse = variantBreakResponses[runtime.variant];
          runtime.activePress.deformation.targetDepth = (0.055 + previewStrength * 0.285) * breakResponse.deformation;
          if (runtime.fracturePatternAligned) {
            const equivalentStage = stageRef.current / breakThreshold * 5;
            const pressure = clamp(
              (equivalentStage * 0.16 + previewStrength * 0.42) * breakResponse.pressure,
              0,
              0.98,
            );
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
        if (runtime.variantDecoration) {
          runtime.variantDecoration.position.y = floatOffset;
          if (runtime.variant !== "blackHole") {
            runtime.variantDecoration.rotation.z += runtime.reduceMotion ? 0 : 0.0035;
          }
          runtime.variantDecoration.scale.lerp(runtime.shellScaleTarget, 0.14);
        }
        runtime.outerShellFragments.forEach((fragment) => {
          fragmentTarget.copy(fragment.targetPosition).multiply(runtime.shellScaleTarget);
          fragmentTarget.y += floatOffset;
          fragment.mesh.position.lerp(fragmentTarget, 0.15);
          fragment.mesh.quaternion.slerp(fragment.targetQuaternion, 0.13);
          fragment.mesh.scale.lerp(fragment.targetScale, 0.14);
        });
        syncOuterShellFragmentBatches(runtime.outerShellFragments, runtime.fragmentBatches);
      }

      if (runtime.fragmentPhase === "spreading" || runtime.fragmentPhase === "floating") {
        const elapsedMilliseconds = runtime.reduceMotion
          ? FRAGMENT_SPREAD_DURATION
          : time - runtime.fragmentFallStartedAt;
        runtime.fragmentMotions.forEach((motion) => {
          const elapsed = Math.max(0, elapsedMilliseconds / 1000 - motion.delay);
          const spreadTime = Math.min(elapsed, 1.35);
          const driftTime = Math.max(0, elapsed - 1.35);
          if (motion.motionStyle === "collapse") {
            const collapse = smoothstep(spreadTime / 1.2);
            motion.fragment.mesh.position.copy(motion.startPosition).multiplyScalar(1 - collapse * 0.78);
            motion.fragment.mesh.position.addScaledVector(
              motion.fragment.tangent,
              Math.sin(elapsed * 2.4 + motion.orbitPhase) * (0.08 + collapse * 0.18),
            );
            if (runtime.chargedBreak) {
              const rebound = smoothstep(clamp((spreadTime - 0.72) / 0.63));
              motion.fragment.mesh.position.addScaledVector(
                motion.fragment.radial,
                rebound * (1.2 + motion.fragment.liftSeed * 0.55),
              );
            }
          } else {
            motion.fragment.mesh.position.copy(motion.startPosition)
              .addScaledVector(motion.velocity, spreadTime + Math.min(driftTime, 8) * 0.055)
              .addScaledVector(
                motion.fragment.tangent,
                Math.sin(elapsed * motion.bobSpeed + motion.orbitPhase) * motion.bobAmplitude,
              );
            if (motion.motionStyle === "orbit") {
              motion.fragment.mesh.position.applyAxisAngle(orbitAxis, elapsed * 0.24);
            }
          }
          motion.fragment.mesh.position.y += Math.cos(elapsed * motion.bobSpeed * 0.78 + motion.orbitPhase)
            * motion.bobAmplitude;
          motion.interactionOffset.addScaledVector(motion.interactionVelocity, frameDelta);
          motion.interactionVelocity.multiplyScalar(Math.pow(0.965, frameDelta * 60));
          motion.interactionOffset.multiplyScalar(Math.pow(0.999, frameDelta * 60));
          motion.fragment.mesh.position.add(motion.interactionOffset);
          if (runtime.rocketLaunchedAt !== null) {
            const exhaustPush = smoothstep(clamp((time - runtime.rocketLaunchedAt) / 720)) * 0.42;
            motion.fragment.mesh.position.addScaledVector(motion.fragment.radial, exhaustPush);
            motion.fragment.mesh.position.y -= exhaustPush * 0.36;
          }
          motion.interactionAngle += motion.interactionSpin * frameDelta;
          motion.interactionSpin *= Math.pow(0.97, frameDelta * 60);
          fragmentSpinQuaternion.setFromAxisAngle(motion.rotationAxis, motion.spin * elapsed + motion.interactionAngle);
          motion.fragment.mesh.quaternion.copy(motion.startQuaternion).multiply(fragmentSpinQuaternion);
          motion.fragment.mesh.scale.copy(motion.startScale);
          if (motion.motionStyle === "stretch") {
            const rubber = Math.exp(-elapsed * 1.35) * Math.abs(Math.sin(elapsed * 7.5));
            motion.fragment.mesh.scale.x *= 1 + rubber * 0.85;
            motion.fragment.mesh.scale.y *= 1 - rubber * 0.3;
          } else if (motion.motionStyle === "flare") {
            motion.fragment.mesh.scale.multiplyScalar(1 - clamp(elapsed / 4) * 0.36);
          } else if (motion.motionStyle === "collapse") {
            if (runtime.chargedBreak) {
              const implosion = smoothstep(clamp(spreadTime / 0.72));
              const rebound = smoothstep(clamp((spreadTime - 0.72) / 0.63));
              motion.fragment.mesh.scale.multiplyScalar(1 - implosion * 0.78 + rebound * 0.62);
            } else {
              motion.fragment.mesh.scale.multiplyScalar(1 - smoothstep(spreadTime / 1.2) * 0.74);
            }
          }
        });

        if (runtime.variantDecoration) {
          const decorationElapsed = Math.max(0, elapsedMilliseconds / 1000);
          if (runtime.variant === "sun") {
            runtime.variantDecoration.scale.setScalar(1 + smoothstep(decorationElapsed / 1.1) * 1.1);
            runtime.variantDecoration.traverse((object) => {
              if (object instanceof THREE.Mesh && "opacity" in object.material) {
                object.material.opacity = Math.max(0, 0.62 * (1 - decorationElapsed / 1.15));
              }
            });
          } else if (runtime.variant === "saturn") {
            const ringSpread = smoothstep(decorationElapsed / 1.25);
            runtime.variantDecoration.children.forEach((segment) => {
              const angle = Number(segment.userData.ringAngle ?? 0);
              segment.position.set(
                Math.cos(angle) * ringSpread * 0.44,
                Math.sin(angle) * ringSpread * 0.18,
                Math.sin(angle * 2) * ringSpread * 0.12,
              );
              segment.rotation.x += runtime.reduceMotion ? 0 : 0.008;
            });
            runtime.variantDecoration.rotation.z += runtime.reduceMotion ? 0 : 0.006;
          } else if (runtime.variant === "blackHole") {
            const pulse = runtime.reduceMotion ? 1 : 1 + Math.sin(time * 0.009) * 0.045;
            runtime.variantDecoration.scale.setScalar(pulse);
          }
        }
        syncOuterShellFragmentBatches(runtime.outerShellFragments, runtime.fragmentBatches);
        runtime.camera.position.lerp(runtime.cameraTarget, runtime.reduceMotion ? 1 : 0.055);
        runtime.cameraLookAt.lerp(runtime.cameraLookTarget, runtime.reduceMotion ? 1 : 0.07);
        runtime.camera.lookAt(runtime.cameraLookAt);

        if (!runtime.rocketPresented && elapsedMilliseconds >= ROCKET_REVEAL_DELAY) {
          runtime.rocketPresented = true;
          runtime.mascotRoot.position.copy(runtime.mascotHome);
          runtime.mascotRoot.rotation.z = 0;
          runtime.mascotRoot.visible = !revealedRef.current;
          runtime.rocketRoot.position.copy(runtime.rocketHome);
          runtime.rocketRoot.rotation.set(0, 0, -0.2);
          runtime.rocketRoot.visible = !revealedRef.current;
          runtime.rocketReady = !revealedRef.current;
          rocketReadyCallbackRef.current();
        }
        if (runtime.rocketPresented && runtime.rocketReady && !runtime.mascotDrag) {
          const haloPulse = runtime.reduceMotion
            ? 0.72
            : (Math.sin(time * 0.0027) + 1) * 0.5;
          const beaconPulse = runtime.reduceMotion
            ? 0.82
            : Math.pow((Math.sin(time * 0.006) + 1) * 0.5, 4);
          runtime.rocketHalo.visible = true;
          runtime.rocketBeacon.visible = true;
          runtime.rocketHaloMaterial.opacity = 0.16 + haloPulse * 0.38;
          runtime.rocketHalo.scale.setScalar(0.92 + haloPulse * 0.16);
          runtime.rocketBeaconMaterial.opacity = 0.32 + beaconPulse * 0.68;
          runtime.rocketBeacon.scale.setScalar(0.82 + beaconPulse * 0.7);
          rocketIdleTarget.set(
            runtime.rocketHome.x + zeroGravityX,
            runtime.rocketHome.y + zeroGravityY,
            runtime.rocketHome.z + zeroGravityZ,
          );
          runtime.rocketRoot.position.lerp(rocketIdleTarget, runtime.reduceMotion ? 1 : 0.2);
          runtime.rocketRoot.rotation.z = -0.2 + zeroGravityTilt * 0.55;
        }
        if (elapsedMilliseconds >= FRAGMENT_SPREAD_DURATION) runtime.fragmentPhase = "floating";
      }

      if (runtime.rocketLaunchedAt !== null) {
        const elapsed = runtime.reduceMotion
          ? ROCKET_SEQUENCE_DURATION
          : time - runtime.rocketLaunchedAt;
        const launchProgress = clamp(elapsed / 720);
        const launchEase = smoothstep(launchProgress);
        runtime.rocketRoot.visible = launchProgress < 1;
        runtime.rocketRoot.position.set(
          runtime.rocketHome.x + Math.sin(launchProgress * Math.PI) * 0.34,
          runtime.rocketHome.y + launchEase * 5.4,
          runtime.rocketHome.z + launchEase * 0.34,
        );
        runtime.rocketRoot.rotation.z = -0.2 + Math.sin(launchProgress * Math.PI) * 0.12;
        runtime.rocketFlame.scale.set(1 + Math.sin(time * 0.035) * 0.18, 1.25 + Math.sin(time * 0.041) * 0.24, 1);

        const dropProgress = clamp((elapsed - 430) / 970);
        if (dropProgress > 0 && !runtime.cardRevealDispatched) {
          const dropEase = 1 - Math.pow(1 - dropProgress, 3);
          runtime.cardDropRoot.visible = true;
          runtime.cardDropRoot.position.set(
            Math.sin(dropProgress * Math.PI * 2) * (1 - dropProgress) * 0.18,
            3.05 - dropEase * 2.88,
            1.46,
          );
          runtime.cardDropRoot.rotation.set(0, 0, Math.sin(dropProgress * Math.PI * 3) * (1 - dropProgress) * 0.16);
          runtime.cardDropRoot.scale.set(
            0.14 + dropEase * 0.86,
            0.08 + dropEase * 0.92,
            1,
          );
        }
        if (elapsed >= ROCKET_SEQUENCE_DURATION && !runtime.cardRevealDispatched) {
          runtime.cardRevealDispatched = true;
          runtime.rocketRoot.visible = false;
          runtime.cardDropRoot.visible = false;
          runtime.mascotRoot.visible = true;
          cardRevealCallbackRef.current();
        }
      }

      const mascotTextureImage = runtime.mascotSprite.material.map?.image as
        | { width?: number; height?: number }
        | undefined;
      const mascotAspect = mascotTextureImage?.width && mascotTextureImage.height
        ? mascotTextureImage.width / mascotTextureImage.height
        : 0.8;
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
      if (mascotCanFloat) {
        runtime.mascotRoot.position.set(
          runtime.mascotHome.x + zeroGravityX + pullX * 0.22,
          runtime.mascotHome.y + zeroGravityY + pullY * 0.22,
          runtime.mascotHome.z + zeroGravityZ,
        );
        runtime.mascotRoot.rotation.z = zeroGravityTilt - pullX * 0.055;
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
  }, [breakThreshold, fortune, fortuneId, variant]);

  useEffect(() => {
    if (!specialCardId) return;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const previousTexture = runtime.cardMaterial.map;
    runtime.cardMaterial.map = createHiddenCommandCardTexture(hiddenCardFor(specialCardId), fortune);
    runtime.cardMaterial.needsUpdate = true;
    previousTexture?.dispose();
  }, [fortune, specialCardId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || stage <= 0) return;
    if (stage < breakThreshold) {
      const breakResponse = variantBreakResponses[runtime.variant];
      const equivalentStage = stage / breakThreshold * 5;
      const pressure = clamp(
        (equivalentStage * 0.18 + runtime.lastPressStrength * 0.22) * breakResponse.pressure,
        0,
        0.98,
      );
      const hit = runtime.impactPoint.clone().normalize();
      if (!runtime.deformations[stage - 1]) {
        runtime.deformations[stage - 1] = {
          direction: hit.clone(),
          currentDepth: 0,
          targetDepth: (0.2 + equivalentStage * 0.018) * breakResponse.deformation,
        };
      }
      const cameraStage = Math.min(
        CAMERA_STAGE_POSITIONS.length - 1,
        Math.max(1, Math.round(equivalentStage)),
      );
      runtime.cameraTarget.copy(CAMERA_STAGE_POSITIONS[cameraStage]);
      runtime.cameraTarget.x += hit.x * 0.2;
      runtime.cameraTarget.y += hit.y * 0.1;
      runtime.cameraLookTarget.set(hit.x * 0.1, 0.16 + hit.y * 0.06, 0);
      const holdMultiplier = 0.55 + runtime.lastPressStrength * 0.75;
      const squash = Math.min(
        (0.13 + pressure * 0.2) * holdMultiplier * breakResponse.squash,
        runtime.variant === "chewyCookie" ? 0.5 : 0.32,
      );
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
      if (runtime.variant === "blackHole") {
        const shrink = 1 - equivalentStage * 0.045;
        runtime.shellScaleTarget.copy(runtime.shellBaseScale).multiplyScalar(shrink);
      } else if (runtime.variant === "jupiter") {
        runtime.shellScaleTarget.set(
          runtime.shellBaseScale.x * (1 + squash * 0.54),
          runtime.shellBaseScale.y * (1 - squash * 0.28),
          runtime.shellBaseScale.z * (1 - squash * 0.08),
        );
      } else {
        runtime.shellScaleTarget.set(
          runtime.shellBaseScale.x * (1 + squash * 0.48),
          runtime.shellBaseScale.y * (1 - squash * (0.62 + Math.abs(hit.y) * 0.18)),
          runtime.shellBaseScale.z * (1 - squash * 0.18),
        );
      }
      runtime.rocketRoot.visible = false;
      return;
    }

    if (runtime.exploded) return;
    runtime.exploded = true;
    runtime.fragmentPhase = "spreading";
    runtime.rocketPresented = false;
    runtime.rocketReady = false;
    runtime.rocketRoot.visible = false;
    runtime.chargeRoot.visible = false;
    runtime.chargeReady = false;
    runtime.cardDropRoot.visible = false;
    runtime.mascotRoot.visible = false;
    if (runtime.variant === "blackHole" && runtime.variantDecoration) {
      runtime.variantDecoration.visible = false;
      runtime.fragmentBatches.surface.visible = true;
      runtime.fragmentBatches.edge.visible = true;
    }
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
    runtime.fragmentMotions = createFloatLayout(
      runtime.outerShellFragments,
      hit,
      variantMotionStyles[runtime.variant],
    ).map((target) => ({
      ...target,
      velocity: target.velocity.clone().multiplyScalar(runtime.chargedBreak ? 1.35 : 1),
      spin: target.spin * (runtime.chargedBreak ? 1.45 : 1),
      startPosition: target.fragment.mesh.position.clone(),
      startQuaternion: target.fragment.mesh.quaternion.clone(),
      startScale: target.fragment.mesh.scale.clone().multiplyScalar(target.fragmentScale),
      interactionOffset: new THREE.Vector3(),
      interactionVelocity: new THREE.Vector3(),
      interactionAngle: 0,
      interactionSpin: 0,
    }));
    runtime.fragmentFallStartedAt = performance.now();
    runtime.fragmentPhase = "spreading";
    runtime.cameraTarget.set(0, 2.05, 7.45);
    runtime.cameraLookTarget.set(0, -0.66, 0);
  }, [breakThreshold, stage, revealed]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !launchRequested) return;
    beginRocketLaunch(runtime, rocketLaunchCallbackRef.current);
  }, [launchRequested]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !revealed) return;
    runtime.rocketReady = false;
    runtime.rocketRoot.visible = false;
    runtime.cardDropRoot.visible = false;
    runtime.mascotRoot.visible = true;
    if (runtime.variantDecoration) runtime.variantDecoration.visible = false;
  }, [revealed]);

  return (
    <div ref={containerRef} className="wakppu-break-scene" aria-hidden="true">
      {!ready && <div className="wakppu-break-loading" role="status">왁뿌볼 준비 중...</div>}
    </div>
  );
}
