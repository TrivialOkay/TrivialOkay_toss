"use client";

/* eslint-disable react/no-unknown-property -- React Three Fiber JSX uses Three.js properties. */

import { ContactShadows, Line, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Box3, DoubleSide, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3, type Group, type Material, type Mesh } from "three";

export type BallKind = "ceramic" | "crystal" | "mochi" | "dubai" | "butter_rice_cake" | "brick_cake" | "slice_cake";

type FortuneBallProps = {
  fortune: string;
  aside: string;
  ballKind: BallKind;
  onReveal: () => void;
};

type FragmentSpec = {
  position: [number, number, number];
  velocity: [number, number, number];
  spin: [number, number, number];
};

type DeviceTilt = {
  x: number;
  y: number;
  kickX: number;
  kickY: number;
};

type DeviceTiltRef = MutableRefObject<DeviceTilt>;

type CrackImpact = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
};

const crackBranches: Array<{ stage: number; points: Array<[number, number, number]> }> = [
  { stage: 1, points: [[0, 0, 0], [0.035, 0.018, 0], [0.075, 0.006, 0], [0.12, 0.055, 0], [0.18, 0.04, 0]] },
  { stage: 1, points: [[0, 0, 0], [-0.025, 0.04, 0], [-0.07, 0.06, 0], [-0.09, 0.13, 0]] },
  { stage: 1, points: [[0, 0, 0], [-0.03, -0.035, 0], [-0.015, -0.09, 0], [-0.075, -0.145, 0]] },
  { stage: 2, points: [[0.018, 0.01, 0], [0.065, -0.035, 0], [0.11, -0.025, 0], [0.16, -0.085, 0], [0.22, -0.07, 0]] },
  { stage: 2, points: [[-0.035, 0.035, 0], [-0.095, 0.02, 0], [-0.14, 0.065, 0], [-0.2, 0.045, 0]] },
  { stage: 3, points: [[-0.025, -0.04, 0], [-0.09, -0.075, 0], [-0.135, -0.13, 0], [-0.205, -0.145, 0]] },
  { stage: 3, points: [[0.045, 0.02, 0], [0.075, 0.085, 0], [0.13, 0.12, 0], [0.14, 0.2, 0]] },
];

const fragmentSpecs: FragmentSpec[] = Array.from({ length: 16 }, (_, index) => {
  const angle = index * 2.399963;
  const y = 1 - (index / 15) * 2;
  const radius = Math.sqrt(1 - y * y);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  return {
    position: [x, y, z],
    velocity: [x * (1.8 + (index % 3) * 0.35), y * 1.8 + 2.1, z * (1.8 + ((index + 1) % 3) * 0.35)],
    spin: [2.2 + (index % 4), -3.4 + index * 0.45, 1.8 - (index % 3)],
  };
});

const angularKinds = new Set<BallKind>(["butter_rice_cake", "brick_cake", "slice_cake"]);

// 파편이 Arena 벽에 부딪히지 않고 시야 안에 떨어지도록 초기 속도를 눌러 준다.
// 중력이 세지면 낙하 시간이 짧아져 덜 퍼지므로 그만큼 값을 올려 잡았다.
const SPREAD = 0.68; // 수평
const LIFT = 0.9; // 수직 — 프레임 위로 솟구쳤다 돌아오는 것 방지

// 무게감: 중력을 키우고 반발을 줄여 툭 떨어져 눌러앉게 한다.
const GRAVITY = -9.4;
// 손가락으로 밀었을 때 방향 전환이 바로 느껴지도록 회전 임펄스를 넉넉히 준다.
const TORQUE = 2.1;
const WAKPPU_ASSET_VERSION = "20260813-seamless-2";

function modelPath(kind: BallKind, broken = false) {
  return `/models/wakppu/${kind}${broken ? "-broken" : ""}.glb?v=${WAKPPU_ASSET_VERSION}`;
}

function clamp(value: number, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function useDeviceTilt() {
  const tilt = useRef<DeviceTilt>({ x: 0, y: 0, kickX: 0, kickY: 0 });
  const permissionRequested = useRef(false);

  useEffect(() => {
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    let previousAcceleration: { x: number; y: number } | null = null;

    function orient(event: DeviceOrientationEvent) {
      if (event.beta == null || event.gamma == null) return;
      baseBeta ??= event.beta;
      baseGamma ??= event.gamma;
      tilt.current.x = clamp((event.gamma - baseGamma) / 24);
      tilt.current.y = clamp((baseBeta - event.beta) / 24);
    }

    function move(event: DeviceMotionEvent) {
      const acceleration = event.accelerationIncludingGravity;
      if (acceleration?.x == null || acceleration.y == null) return;
      if (previousAcceleration) {
        tilt.current.kickX = clamp((acceleration.x - previousAcceleration.x) / 5.5);
        tilt.current.kickY = clamp((previousAcceleration.y - acceleration.y) / 5.5);
      }
      previousAcceleration = { x: acceleration.x, y: acceleration.y };
    }

    window.addEventListener("deviceorientation", orient, true);
    window.addEventListener("devicemotion", move, true);
    let animationFrame = 0;
    function decayKick() {
      tilt.current.kickX *= 0.88;
      tilt.current.kickY *= 0.88;
      animationFrame = window.requestAnimationFrame(decayKick);
    }
    animationFrame = window.requestAnimationFrame(decayKick);
    return () => {
      window.removeEventListener("deviceorientation", orient, true);
      window.removeEventListener("devicemotion", move, true);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const requestPermission = useCallback(() => {
    if (permissionRequested.current) return;
    permissionRequested.current = true;
    const requests: Array<Promise<string>> = [];
    if (typeof DeviceOrientationEvent !== "undefined") {
      const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
      if (orientation.requestPermission) requests.push(orientation.requestPermission());
    }
    if (typeof DeviceMotionEvent !== "undefined") {
      const motion = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };
      if (motion.requestPermission) requests.push(motion.requestPermission());
    }
    void Promise.allSettled(requests);
  }, []);

  return { tilt, requestPermission };
}

function useTiltPhysics(body: MutableRefObject<RapierRigidBody | null>, tilt: DeviceTiltRef, strength = 1) {
  useFrame((_, delta) => {
    const current = tilt.current;
    if (Math.abs(current.x) + Math.abs(current.y) + Math.abs(current.kickX) + Math.abs(current.kickY) < 0.025) return;
    const frame = Math.min(delta, 0.034);
    body.current?.applyImpulse({
      x: (current.x * 3.4 + current.kickX * 4.8) * frame * strength,
      y: (current.y * 2.7 + current.kickY * 3.8) * frame * strength,
      z: 0,
    }, true);
    body.current?.applyTorqueImpulse({
      x: current.y * 0.018 * strength,
      y: current.x * 0.022 * strength,
      z: -current.x * 0.012 * strength,
    }, true);
  });
}

function texturePath(kind: BallKind) {
  return `/textures/wakppu/${kind}-interior.webp`;
}

function playBreakFeedback() {
  navigator.vibrate?.(35);
  try {
    const context = new AudioContext();
    const duration = 0.18;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const fade = 1 - index / samples.length;
      samples[index] = (Math.random() * 2 - 1) * fade * fade;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 920;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.14, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    source.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // 브라우저가 Web Audio를 막아도 파괴 동작은 그대로 진행한다.
  }
}

function InteriorReveal({ kind, damage }: { kind: BallKind; damage: number }) {
  const sourceTexture = useTexture(texturePath(kind));
  const texture = useMemo(() => {
    const copy = sourceTexture.clone();
    copy.colorSpace = SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [sourceTexture]);
  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  if (damage < 62) return null;
  const progress = Math.min(1, (damage - 62) / 32);
  const scale = 0.12 + progress * 0.88;
  const z = angularKinds.has(kind) ? 1.015 : 1.085;

  return (
    <group position={[0.16, 0.12, z]} scale={scale} rotation={[0, 0, -0.12]}>
      <mesh position={[0, 0, -0.012]}>
        <ringGeometry args={[0.285, 0.365, 9]} />
        <meshStandardMaterial color="#382416" roughness={1} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.305, 9]} />
        <meshStandardMaterial map={texture} roughness={0.72} metalness={0.02} />
      </mesh>
    </group>
  );
}

function Ball({ kind, damage, onDamage, tilt }: { kind: BallKind; damage: number; onDamage: (amount: number) => void; tilt: DeviceTiltRef }) {
  const body = useRef<RapierRigidBody>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const { scene } = useGLTF(modelPath(kind));
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      if (/opening[_-]?seam|torus/i.test(child.name)) child.visible = false;
    });
    return copy;
  }, [scene]);
  useTiltPhysics(body, tilt, 1.35);
  // 각진 종류는 cuboid 콜라이더라 구르지 않고 버티므로 회전력을 더 준다.
  const torque = angularKinds.has(kind) ? TORQUE * 1.45 : TORQUE;

  function spin(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const { clientX, clientY } = event.nativeEvent;
    pointer.current = { x: clientX, y: clientY };
    (event.nativeEvent.target as Element).setPointerCapture?.(event.pointerId);
    body.current?.applyTorqueImpulse({ x: -0.75 * torque, y: 1.15 * torque, z: 0.35 * torque }, true);
    body.current?.applyImpulse({ x: 0, y: 0.45, z: 0 }, true);
    onDamage(12);
  }

  function drag(event: ThreeEvent<PointerEvent>) {
    if (!pointer.current) return;
    event.stopPropagation();
    const { clientX, clientY } = event.nativeEvent;
    const dx = clientX - pointer.current.x;
    const dy = clientY - pointer.current.y;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    body.current?.applyTorqueImpulse({ x: dy * 0.018 * torque, y: dx * 0.02 * torque, z: -dx * 0.009 * torque }, true);
    body.current?.applyImpulse({ x: dx * 0.052, y: -dy * 0.052, z: 0.035 }, true);
    pointer.current = { x: clientX, y: clientY };
    onDamage(Math.min(9, (Math.abs(dx) + Math.abs(dy)) * 0.12));
  }

  return (
    <RigidBody
      ref={body}
      colliders={angularKinds.has(kind) ? "cuboid" : "ball"}
      position={[0, 0.28, 0]}
      mass={1.25}
      restitution={0.24}
      friction={0.38}
      linearDamping={0.08}
      angularDamping={0.24}
      canSleep={false}
    >
      <group
        onPointerDown={spin}
        onPointerMove={drag}
        onPointerUp={(event) => {
          (event.nativeEvent.target as Element).releasePointerCapture?.(event.pointerId);
          pointer.current = null;
        }}
        onPointerCancel={() => { pointer.current = null; }}
      >
        <primitive object={model} scale={1.08} />
        <InteriorReveal kind={kind} damage={damage} />
      </group>
    </RigidBody>
  );
}

function Debris({ kind }: { kind: BallKind }) {
  const colors: Record<BallKind, string> = {
    ceramic: "#d7c7a9",
    crystal: "#c9b7ff",
    mochi: "#f3d4c9",
    dubai: "#6c3c22",
    butter_rice_cake: "#f0d68a",
    brick_cake: "#8b3f32",
    slice_cake: "#f1c878",
  };

  return fragmentSpecs.slice(0, 7).map((fragment, index) => (
    <RigidBody
      key={`debris-${index}`}
      colliders="hull"
      position={[fragment.position[0] * 0.22, 0.28 + fragment.position[1] * 0.18, fragment.position[2] * 0.22]}
      linearVelocity={[
        fragment.velocity[0] * 1.42 * SPREAD,
        (fragment.velocity[1] * 1.16 + 0.9) * LIFT,
        fragment.velocity[2] * 1.42 * SPREAD,
      ]}
      angularVelocity={fragment.spin}
      restitution={0.28}
      friction={0.9}
      linearDamping={0.3}
    >
      <mesh castShadow scale={[0.07 + (index % 3) * 0.018, 0.045 + (index % 2) * 0.02, 0.055]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={colors[kind]} roughness={0.86} />
      </mesh>
    </RigidBody>
  ));
}

type LoadedFragment = {
  geometry: Mesh["geometry"];
  material: Material | Material[];
  position: [number, number, number];
  rotation: [number, number, number];
};

function FragmentPiece({ piece, fragment, tilt }: { piece: LoadedFragment; fragment: FragmentSpec; tilt: DeviceTiltRef }) {
  const body = useRef<RapierRigidBody>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useTiltPhysics(body, tilt, 0.62);

  function grab(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    pointer.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
    (event.nativeEvent.target as Element).setPointerCapture?.(event.pointerId);
    body.current?.applyImpulse({ x: 0, y: 0.16, z: 0.035 }, true);
  }

  function drag(event: ThreeEvent<PointerEvent>) {
    if (!pointer.current) return;
    event.stopPropagation();
    const dx = event.nativeEvent.clientX - pointer.current.x;
    const dy = event.nativeEvent.clientY - pointer.current.y;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    body.current?.applyImpulse({ x: dx * 0.028, y: -dy * 0.028, z: 0.025 }, true);
    body.current?.applyTorqueImpulse({ x: dy * 0.012, y: dx * 0.014, z: -dx * 0.008 }, true);
    pointer.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
  }

  return (
    <RigidBody
      ref={body}
      colliders="hull"
      position={piece.position}
      rotation={piece.rotation}
      linearVelocity={[
        (fragment.velocity[0] + fragment.position[0] * 0.8) * SPREAD,
        (fragment.velocity[1] + 0.8) * LIFT,
        (fragment.velocity[2] + fragment.position[2] * 0.8) * SPREAD,
      ]}
      angularVelocity={fragment.spin}
      restitution={0.2}
      friction={0.86}
      linearDamping={0.3}
    >
      <mesh
        castShadow
        geometry={piece.geometry}
        material={piece.material}
        scale={1.08}
        onPointerDown={grab}
        onPointerMove={drag}
        onPointerUp={(event) => {
          (event.nativeEvent.target as Element).releasePointerCapture?.(event.pointerId);
          pointer.current = null;
        }}
        onPointerCancel={() => { pointer.current = null; }}
      />
    </RigidBody>
  );
}

function Fragments({ kind, tilt }: { kind: BallKind; tilt: DeviceTiltRef }) {
  const { scene } = useGLTF(modelPath(kind, true));
  const pieces = useMemo(() => {
    const loaded: LoadedFragment[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      if (!(child as Mesh).isMesh) return;
      const mesh = child as Mesh;
      const geometry = mesh.geometry.clone();
      const bounds = new Box3().setFromBufferAttribute(geometry.attributes.position);
      const center = bounds.getCenter(new Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
      loaded.push({
        geometry,
        material: mesh.material,
        position: [mesh.position.x + center.x, mesh.position.y + center.y + 0.28, mesh.position.z + center.z],
        rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
      });
    });
    return loaded;
  }, [scene]);

  return pieces.map((piece, index) => {
    const fragment = fragmentSpecs[index % fragmentSpecs.length];
    return (
      <FragmentPiece
        key={index}
        piece={piece}
        fragment={fragment}
        tilt={tilt}
      />
    );
  });
}

/**
 * 실제로 접힌 종이 한 장. 평면을 "앞면 → 둥근 접힘 → 뒷면" 경로를 따라 휘어서
 * 크리스를 진짜 곡면으로 만든다. 상자를 겹쳐 쌓는 것과 달리 접힌 부분이 빛을
 * 부드럽게 받아 종이처럼 보이고, 뒷면을 앞면보다 짧게 잡아 열린 단면이 드러난다.
 */
function useFoldedPaper(width: number, front: number, back: number, radius: number, curl: number) {
  const geometry = useMemo(() => {
    const bend = Math.PI * radius;
    const total = front + bend + back;
    const paper = new PlaneGeometry(width, total, 16, 64);
    const position = paper.attributes.position;

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const s = total / 2 - position.getY(index); // 앞면 위 끝에서 0으로 시작하는 경로 길이
      let y: number;
      let z: number;

      if (s <= front) {
        y = front - s;
        z = radius;
      } else if (s <= front + bend) {
        const a = ((s - front) / bend) * Math.PI; // 0 → π, 아래로 볼록한 반원
        y = -Math.sin(a) * radius;
        z = Math.cos(a) * radius;
      } else {
        y = s - front - bend;
        z = -radius;
      }

      // 손으로 접은 종이의 미세한 휨. 접힌 쪽은 뻣뻣하고 자유단으로 갈수록 말린다.
      const away = Math.min(1, Math.abs(y) / front);
      z += Math.cos((x / (width / 2)) * 1.35) * curl * (0.25 + 0.75 * away);
      position.setXYZ(index, x, y, z);
    }

    position.needsUpdate = true;
    paper.computeVertexNormals();
    return paper;
  }, [width, front, back, radius, curl]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function FortuneNote3D({ tilt, onPull }: { tilt: DeviceTiltRef; onPull: () => void }) {
  const body = useRef<RapierRigidBody>(null);
  const pointer = useRef<{ startX: number; startY: number } | null>(null);
  const home = useMemo(() => ({ x: 0, y: -0.08, z: 0.92 }), []);
  const outer = useFoldedPaper(0.78, 0.56, 0.42, 0.05, 0.026);
  const inner = useFoldedPaper(0.68, 0.48, 0.34, 0.036, 0.018);

  useFrame(() => {
    if (pointer.current) return;
    body.current?.setNextKinematicTranslation({
      x: home.x + tilt.current.x * 0.11,
      y: home.y + tilt.current.y * 0.07,
      z: home.z,
    });
  });

  function grab(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    pointer.current = { startX: event.nativeEvent.clientX, startY: event.nativeEvent.clientY };
    (event.nativeEvent.target as Element).setPointerCapture?.(event.pointerId);
  }

  function drag(event: ThreeEvent<PointerEvent>) {
    if (!pointer.current) return;
    event.stopPropagation();
    const dx = event.nativeEvent.clientX - pointer.current.startX;
    const dy = event.nativeEvent.clientY - pointer.current.startY;
    const distance = Math.hypot(dx, dy);
    body.current?.setNextKinematicTranslation({
      x: home.x + clamp(dx / 105, -1.45, 1.45),
      y: home.y + clamp(-dy / 92, -0.18, 1.72),
      z: home.z + Math.min(distance / 210, 0.44),
    });
    if (distance >= 74 || dy <= -58) onPull();
  }

  function release(event: ThreeEvent<PointerEvent>) {
    (event.nativeEvent.target as Element).releasePointerCapture?.(event.pointerId);
    pointer.current = null;
  }

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[home.x, home.y, home.z]}
      rotation={[0.1, 0.08, -0.09]}
      restitution={0.12}
      friction={0.7}
    >
      {/* 종이는 접힘(y≈-0.05)에서 위(y≈0.56)로 뻗으므로 콜라이더도 그 중심에 맞춘다 */}
      <CuboidCollider args={[0.4, 0.33, 0.09]} position={[0, 0.255, 0]} />
      <group
        onPointerDown={grab}
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={() => { pointer.current = null; }}
      >
        {/* 바깥 장 — 종이 특유의 은은한 광택(sheen)까지 준다 */}
        <mesh castShadow receiveShadow geometry={outer}>
          <meshPhysicalMaterial
            color="#fdf6e2"
            roughness={0.95}
            metalness={0}
            sheen={0.5}
            sheenRoughness={0.85}
            sheenColor="#fff6de"
            side={DoubleSide}
          />
        </mesh>
        {/* 안쪽 한 겹 — 조금 작고 그늘져서 여러 번 접힌 두께가 보인다 */}
        <mesh castShadow geometry={inner} position={[0.012, -0.026, 0]} rotation={[0, 0, -0.05]}>
          <meshStandardMaterial color="#eee0bb" roughness={0.97} metalness={0} side={DoubleSide} />
        </mesh>
        {/* 접힌 등을 따라 잡히는 얇은 그늘 */}
        <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.78, 12, 1, true, 0, Math.PI]} />
          <meshBasicMaterial color="#c9b48a" transparent opacity={0.28} side={DoubleSide} />
        </mesh>
        {/* 앞면에 인쇄된 운세가 두 줄 비친다.
            휘어진 앞면(y=0.2에서 z≈0.064, y=0.1에서 z≈0.060)보다 살짝 앞에 둬야 묻히지 않는다. */}
        {[{ y: 0.2, z: 0.069, x: -0.02, w: 0.34 }, { y: 0.1, z: 0.065, x: 0.04, w: 0.22 }].map((line) => (
          <mesh key={line.y} position={[line.x, line.y, line.z]} rotation={[0, 0, -0.02]}>
            <planeGeometry args={[line.w, 0.018]} />
            <meshBasicMaterial color="#c4422a" transparent opacity={0.42} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
}

// 카메라가 보는 범위(z=0 기준 가로 반폭 ≈ 2.3~2.5)보다 바닥이 좁아서
// 조각이 가장자리로 굴러 떨어져 화면 밖으로 사라지던 문제를 막는 보이지 않는 상자.
// 벽 안쪽 면은 x ±2.0, z ±1.5 — 어떤 화면 비율에서도 시야 안에 머문다.
function Arena() {
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid" position={[0, -1.06, 0]}>
        <mesh receiveShadow scale={[4.6, 0.5, 3.6]}>
          <boxGeometry />
          <meshStandardMaterial color="#f7efd9" transparent opacity={0.02} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" includeInvisible>
        <mesh visible={false} position={[-2.15, 1.1, 0]} scale={[0.3, 4.4, 3.6]}><boxGeometry /></mesh>
        <mesh visible={false} position={[2.15, 1.1, 0]} scale={[0.3, 4.4, 3.6]}><boxGeometry /></mesh>
        <mesh visible={false} position={[0, 1.1, -1.65]} scale={[4.6, 4.4, 0.3]}><boxGeometry /></mesh>
        <mesh visible={false} position={[0, 1.1, 1.65]} scale={[4.6, 4.4, 0.3]}><boxGeometry /></mesh>
      </RigidBody>
    </>
  );
}

function Scene({ kind, damage, broken, pulled, onDamage, onPull, tilt }: { kind: BallKind; damage: number; broken: boolean; pulled: boolean; onDamage: (amount: number) => void; onPull: () => void; tilt: DeviceTiltRef }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.55, 5.3], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      shadows
      onCreated={({ gl }) => { gl.domElement.style.touchAction = "none"; }}
    >
      <ambientLight intensity={1.35} />
      <directionalLight castShadow position={[3, 5, 4]} intensity={2.7} shadow-mapSize={[512, 512]} />
      <pointLight position={[-3, 1, 2]} intensity={6} color="#fff0bc" distance={7} />
      <Suspense fallback={null}>
        <Physics gravity={[0, GRAVITY, 0]} timeStep="vary">
          {broken ? (
            <>
              <Fragments kind={kind} tilt={tilt} />
              <Debris kind={kind} />
              {!pulled && <FortuneNote3D tilt={tilt} onPull={onPull} />}
            </>
          ) : <Ball kind={kind} damage={damage} onDamage={onDamage} tilt={tilt} />}
          <Arena />
        </Physics>
      </Suspense>
      <ContactShadows position={[0, -0.72, 0]} opacity={0.32} scale={4.5} blur={2.2} far={3.4} frames={1} />
    </Canvas>
  );
}

export function FortuneBall({ fortune, aside, ballKind, onReveal }: FortuneBallProps) {
  const [damage, setDamage] = useState(0);
  const [pulled, setPulled] = useState(false);
  const broken = damage >= 100;
  const announced = useRef(false);
  const feedbackPlayed = useRef(false);
  const { tilt, requestPermission } = useDeviceTilt();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<HTMLElement>(null);
  const slipX = useMotionValue(0);
  const slipY = useMotionValue(0);
  const displayDamage = Math.min(100, Math.round(damage));
  const hint = useMemo(() => {
    if (pulled) return "오늘의 운세 발견";
    if (broken) return "파편을 밀거나 쪽지를 잡아당기기";
    if (damage >= 68) return "거의 다 깨졌음!";
    if (damage >= 28) return "금이 가는 중...";
    return "톡톡 누르거나 문질러서 깨기";
  }, [pulled, broken, damage]);

  useEffect(() => {
    boundsRef.current = rootRef.current?.closest<HTMLElement>(".phone-surface") ?? null;
  }, []);

  useEffect(() => {
    useGLTF.preload(modelPath(ballKind, true));
  }, [ballKind]);

  useEffect(() => {
    if (!pulled || announced.current) return;
    announced.current = true;
    onReveal();
  }, [pulled, onReveal]);

  function addDamage(amount: number) {
    if (broken) return;
    setDamage((value) => {
      const next = Math.min(100, value + amount);
      if (next >= 100 && value < 100 && !feedbackPlayed.current) {
        feedbackPlayed.current = true;
        playBreakFeedback();
      }
      return next;
    });
  }

  // 키보드로 꺼낼 때만 쪽지를 위로 밀어 올린다. 포인터로 끌어낼 때는
  // 사용자가 이미 위치를 잡고 있으므로 건드리면 드래그와 충돌한다.
  function pullSlip() {
    setPulled(true);
    animate(slipY, -72, reduceMotion
      ? { duration: 0.15 }
      : { type: "spring", stiffness: 220, damping: 24 });
  }

  const revealPulledSlip = useCallback(() => {
    setPulled(true);
  }, []);

  function returnSlip() {
    const options = reduceMotion
      ? { duration: 0.15 }
      : { type: "spring" as const, stiffness: 260, damping: 26 };
    animate(slipX, 0, options);
    animate(slipY, 0, options);
  }

  return (
    <div
      ref={rootRef}
      className={`fortune-ball ${broken ? "is-broken" : ""}`}
      onPointerDownCapture={requestPermission}
      role="button"
      tabIndex={0}
      aria-label={pulled
        ? `오늘의 운세: ${fortune}`
        : broken
          ? "부서진 왁뿌볼 안에 운세 쪽지가 있습니다. 끌어당기거나 엔터 키로 꺼내세요."
          : `${hint}. 엔터 또는 스페이스 키로도 깰 수 있습니다.`}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (pulled) return;
        if (broken) pullSlip();
        else addDamage(22);
      }}
    >
      <div className="fortune-ball-canvas" aria-hidden="true">
        <Scene
          kind={ballKind}
          damage={damage}
          broken={broken}
          pulled={pulled}
          onDamage={addDamage}
          onPull={revealPulledSlip}
          tilt={tilt}
        />
      </div>

      <AnimatePresence>
        {pulled && (
          <motion.div
            className="fortune-slip-drag"
            style={{ x: slipX, y: slipY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.22 }}
            drag
            dragConstraints={boundsRef}
            dragElastic={reduceMotion ? 0 : 0.16}
            dragMomentum={!reduceMotion}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 26, power: 0.32, timeConstant: 220 }}
            whileDrag={reduceMotion ? { scale: 1.02 } : { scale: 1.035, rotate: -1.2 }}
            onDoubleClick={returnSlip}
          >
            <motion.div
              className="fortune-slip"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.18, scaleY: 0.26, rotate: -7 }}
              animate={{ opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 }}
              transition={reduceMotion
                ? { duration: 0.15 }
                : { duration: 1.05, ease: [0.22, 0.72, 0.2, 1] }}
            >
              <span>오늘의 하찮은 운세</span>
              <strong>{fortune}</strong>
              <small>{aside.replaceAll("\n", " ")}</small>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fortune-ball-guide" aria-live="polite">
        <span>{hint}</span>
        {!broken && <i><b style={{ width: `${displayDamage}%` }} /></i>}
      </div>
    </div>
  );
}
