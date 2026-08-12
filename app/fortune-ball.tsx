"use client";

/* eslint-disable react/no-unknown-property -- React Three Fiber JSX uses Three.js properties. */

import { ContactShadows, Line, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { BallCollider, CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Box3, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3, type Group, type Material, type Mesh } from "three";

export type BallKind = "ceramic" | "crystal" | "mochi" | "dubai" | "butter_bar" | "butter_rice_cake" | "brick_cake" | "slice_cake";

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
  seed: number;
};

type CrackPath = {
  startStage: number;
  weight: "primary" | "secondary";
  points: Array<[number, number, number]>;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createCrackPaths(seed: number): CrackPath[] {
  const random = seededRandom(seed);
  const paths: CrackPath[] = [];
  const branchCount = 9;
  const angleOffset = random() * Math.PI * 2;

  for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
    const startStage = branchIndex < 4 ? 1 : branchIndex < 7 ? 2 : 3;
    let angle = angleOffset + branchIndex * (Math.PI * 2 / branchCount) + (random() - 0.5) * 0.55;
    const length = 0.46 + random() * 0.25;
    const steps = 17 + Math.floor(random() * 7);
    const points: Array<[number, number, number]> = [[0, 0, 0.001]];
    let x = 0;
    let y = 0;

    for (let stepIndex = 1; stepIndex <= steps; stepIndex += 1) {
      const stepLength = length / steps * (0.72 + random() * 0.56);
      angle += (random() - 0.5) * 0.34;
      x += Math.cos(angle) * stepLength;
      y += Math.sin(angle) * stepLength;
      points.push([x, y, 0.001]);

      if ((stepIndex === 5 || stepIndex === 10 || stepIndex === 15) && random() > 0.34) {
        const progress = stepIndex / steps;
        const offshootStage = Math.max(startStage, progress > 0.6 ? 3 : progress > 0.34 ? 2 : 1);
        let offshootAngle = angle + (random() > 0.5 ? 1 : -1) * (0.62 + random() * 0.72);
        const offshootSteps = 4 + Math.floor(random() * 4);
        const offshootLength = length * (0.14 + random() * 0.2);
        const offshoot: Array<[number, number, number]> = [[x, y, 0.0015]];
        let offshootX = x;
        let offshootY = y;
        for (let offshootIndex = 0; offshootIndex < offshootSteps; offshootIndex += 1) {
          offshootAngle += (random() - 0.5) * 0.62;
          const offshootStep = offshootLength / offshootSteps * (0.72 + random() * 0.5);
          offshootX += Math.cos(offshootAngle) * offshootStep;
          offshootY += Math.sin(offshootAngle) * offshootStep;
          offshoot.push([offshootX, offshootY, 0.0015]);
        }
        paths.push({ startStage: offshootStage, weight: "secondary", points: offshoot });
      }
    }
    paths.push({ startStage, weight: "primary", points });
  }

  return paths;
}

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

const angularKinds = new Set<BallKind>(["butter_bar", "butter_rice_cake", "brick_cake", "slice_cake"]);

// 무게감: 중력을 키우고 반발을 줄여 툭 떨어져 눌러앉게 한다.
const GRAVITY = -9.4;
// 손가락으로 밀었을 때 방향 전환이 바로 느껴지도록 회전 임펄스를 넉넉히 준다.
const TORQUE = 2.1;
const WAKPPU_ASSET_VERSION = "20260813-physical-jelly-1";

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

function playBreakFeedback() {
  navigator.vibrate?.([12, 20, 8]);
  try {
    const context = new AudioContext();
    const duration = 0.26;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / context.sampleRate;
      const crackA = Math.exp(-time * 80);
      const crackB = time > 0.075 ? Math.exp(-(time - 0.075) * 95) * 0.64 : 0;
      const crackC = time > 0.15 ? Math.exp(-(time - 0.15) * 110) * 0.42 : 0;
      samples[index] = (Math.random() * 2 - 1) * (crackA + crackB + crackC);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 1250;
    filter.Q.value = 0.45;
    gain.gain.setValueAtTime(0.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    source.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // 브라우저가 Web Audio를 막아도 파괴 동작은 그대로 진행한다.
  }
}

function playCrunchFeedback(intensity = 0.5) {
  navigator.vibrate?.(intensity > 0.7 ? 9 : 5);
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const duration = 0.085 + intensity * 0.085;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    const teeth = 3 + Math.round(intensity * 3);

    for (let index = 0; index < samples.length; index += 1) {
      const time = index / context.sampleRate;
      let envelope = 0;
      for (let tooth = 0; tooth < teeth; tooth += 1) {
        const start = tooth * duration / (teeth + 0.8);
        if (time >= start) envelope += Math.exp(-(time - start) * (95 + tooth * 16));
      }
      const grain = Math.sin(time * Math.PI * 2 * (165 + intensity * 90)) * 0.22;
      samples[index] = ((Math.random() * 2 - 1) * 0.78 + grain) * envelope;
    }

    const source = context.createBufferSource();
    const lowpass = context.createBiquadFilter();
    const bandpass = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3400 + intensity * 1800;
    bandpass.type = "bandpass";
    bandpass.frequency.value = 820 + intensity * 720;
    bandpass.Q.value = 0.7;
    gain.gain.setValueAtTime(0.018 + intensity * 0.026, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(lowpass).connect(bandpass).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    source.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Web Audio를 지원하지 않거나 자동 재생이 제한돼도 조작은 그대로 진행함.
  }
}

const crackColors: Record<BallKind, { shadow: string; edge: string }> = {
  ceramic: { shadow: "#24160e", edge: "#f0d9b5" },
  crystal: { shadow: "#241b39", edge: "#d9c9ff" },
  mochi: { shadow: "#5e3935", edge: "#ffe1d8" },
  dubai: { shadow: "#160b07", edge: "#b77747" },
  butter_bar: { shadow: "#351b08", edge: "#ffd48b" },
  butter_rice_cake: { shadow: "#473213", edge: "#ffe5a0" },
  brick_cake: { shadow: "#2d160a", edge: "#f2d6a4" },
  slice_cake: { shadow: "#4a2c10", edge: "#ffe2a0" },
};

function CrackMark({ kind, damage, impact, scale }: { kind: BallKind; damage: number; impact: CrackImpact; scale: number }) {
  const paths = useMemo(() => createCrackPaths(impact.seed), [impact.seed]);
  const colors = crackColors[kind];
  const damageProgress = clamp((damage - 28) / 66, 0, 1);

  return (
    <group position={impact.position} quaternion={impact.quaternion} scale={scale}>
      {paths.map((path, pathIndex) => {
        const threshold = path.startStage === 1 ? 0 : path.startStage === 2 ? 0.3 : 0.68;
        if (damageProgress < threshold) return null;
        const growth = clamp((damageProgress - threshold) / Math.max(0.01, 1 - threshold), 0, 1);
        const pointCount = Math.max(3, Math.ceil(path.points.length * (0.3 + growth * 0.7)));
        const points = path.points.slice(0, pointCount).map(([x, y, z]) => [
          x,
          y,
          angularKinds.has(kind) ? z : z - (x * x + y * y) * 0.52,
        ] as [number, number, number]);
        const split = Math.max(2, Math.floor(points.length * 0.62));
        const nearPoints = points.slice(0, split + 1);
        const farPoints = points.slice(Math.max(0, split - 1));
        const primary = path.weight === "primary";
        return (
          <group key={pathIndex}>
            <Line
              points={nearPoints}
              color={colors.shadow}
              lineWidth={primary ? 0.72 : 0.34}
              transparent
              opacity={primary ? 0.86 : 0.62}
              depthTest
              depthWrite={false}
              renderOrder={3}
              raycast={() => null}
            />
            <Line
              points={nearPoints.map(([x, y, z]) => [x - 0.0014, y + 0.0011, z + 0.0007] as [number, number, number])}
              color={colors.edge}
              lineWidth={primary ? 0.18 : 0.11}
              transparent
              opacity={primary ? 0.26 : 0.15}
              depthTest
              depthWrite={false}
              renderOrder={4}
              raycast={() => null}
            />
            {farPoints.length > 1 && (
              <Line
                points={farPoints}
                color={colors.shadow}
                lineWidth={primary ? 0.42 : 0.2}
                transparent
                opacity={primary ? 0.62 : 0.4}
                depthTest
                depthWrite={false}
                renderOrder={3}
                raycast={() => null}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

function CrackMarks({ kind, damage, impacts }: { kind: BallKind; damage: number; impacts: CrackImpact[] }) {
  if (damage < 28 || impacts.length === 0) return null;
  const stage = damage >= 78 ? 3 : damage >= 52 ? 2 : 1;
  const visibleImpacts = stage === 1 ? impacts.slice(0, 1) : impacts.slice(0, 2);

  return visibleImpacts.map((impact, impactIndex) => (
    <CrackMark
      key={`${impact.seed}-${impactIndex}`}
      kind={kind}
      damage={damage}
      impact={impact}
      scale={impactIndex === 0 ? 1.08 : 0.88}
    />
  ));
}

function SurfaceChips({ kind, damage, impacts }: { kind: BallKind; damage: number; impacts: CrackImpact[] }) {
  if (damage < 45 || impacts.length === 0) return null;
  const colors = crackColors[kind];
  const progress = clamp((damage - 45) / 50, 0, 1);
  const visibleImpacts = damage >= 72 ? impacts.slice(0, 2) : impacts.slice(0, 1);
  const shardCount = damage >= 82 ? 7 : damage >= 64 ? 5 : 3;

  return visibleImpacts.map((impact, impactIndex) => (
    <group
      key={`chip-${impact.seed}-${impactIndex}`}
      position={impact.position}
      quaternion={impact.quaternion}
      scale={impactIndex === 0 ? 1 : 0.78}
    >
      <mesh position={[0, 0, 0.006]} renderOrder={2} raycast={() => null}>
        <circleGeometry args={[0.085 + progress * 0.055, 7]} />
        <meshStandardMaterial color={colors.shadow} roughness={0.96} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {Array.from({ length: shardCount }, (_, shardIndex) => {
        const angle = (shardIndex / shardCount) * Math.PI * 2 + (impact.seed % 19) * 0.07;
        const radius = 0.07 + (shardIndex % 3) * 0.018 + progress * 0.035;
        const lift = 0.016 + progress * (0.025 + (shardIndex % 2) * 0.012);
        const size = 0.026 + (shardIndex % 3) * 0.008;
        return (
          <mesh
            key={shardIndex}
            position={[Math.cos(angle) * radius, Math.sin(angle) * radius, lift]}
            rotation={[angle * 0.23, progress * (0.45 + shardIndex * 0.11), angle]}
            scale={[1.25, 0.72, 0.32 + progress * 0.34]}
            raycast={() => null}
          >
            <tetrahedronGeometry args={[size, 0]} />
            <meshStandardMaterial
              color={shardIndex % 3 === 0 ? colors.edge : colors.shadow}
              roughness={0.72}
            />
          </mesh>
        );
      })}
    </group>
  ));
}

function Ball({ kind, damage, onDamage, tilt }: { kind: BallKind; damage: number; onDamage: (amount: number) => void; tilt: DeviceTiltRef }) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const deformation = useRef({ target: new Vector3(1, 1, 1), velocity: new Vector3() });
  const impactHold = useRef(0);
  const [crackImpacts, setCrackImpacts] = useState<CrackImpact[]>([]);
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
  const softness = kind === "mochi" ? 0.38 : angularKinds.has(kind) ? 0.08 : 0.16;

  useFrame((_, delta) => {
    if (!visual.current) return;
    const frame = Math.min(delta, 0.034);
    if (!pointer.current && impactHold.current > 0) {
      impactHold.current -= frame;
      if (impactHold.current <= 0) deformation.current.target.set(1, 1, 1);
    }
    const scale = visual.current.scale;
    const { target, velocity } = deformation.current;
    const damping = Math.exp(-18 * frame);
    for (const axis of ["x", "y", "z"] as const) {
      velocity[axis] = (velocity[axis] + (target[axis] - scale[axis]) * 230 * frame) * damping;
      scale[axis] += velocity[axis] * frame;
    }
  });

  function setSquash(x: number, y: number, z: number) {
    deformation.current.target.set(
      1 + (x - 1) * softness,
      1 + (y - 1) * softness,
      1 + (z - 1) * softness,
    );
  }

  function releaseSquash() {
    deformation.current.target.set(1, 1, 1);
  }

  function registerCrack(event: ThreeEvent<PointerEvent>) {
    if (!visual.current) return;
    visual.current.updateWorldMatrix(true, false);
    event.object.updateWorldMatrix(true, false);

    const worldNormal = event.face
      ? event.face.normal.clone().transformDirection(event.object.matrixWorld)
      : event.ray.direction.clone().negate();
    const groupQuaternion = visual.current.getWorldQuaternion(new Quaternion()).invert();
    const localNormal = worldNormal.applyQuaternion(groupQuaternion).normalize();
    const localPosition = visual.current.worldToLocal(event.point.clone()).addScaledVector(localNormal, 0.018);
    const rotation = new Quaternion()
      .setFromUnitVectors(new Vector3(0, 0, 1), localNormal)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), localPosition.x * 4.7 + localPosition.y * 3.1));
    const impact: CrackImpact = {
      position: [localPosition.x, localPosition.y, localPosition.z],
      quaternion: [rotation.x, rotation.y, rotation.z, rotation.w],
      seed: (
        Math.floor((localPosition.x + 2) * 10000) * 73856093
        ^ Math.floor((localPosition.y + 2) * 10000) * 19349663
        ^ Math.floor((localPosition.z + 2) * 10000) * 83492791
      ) >>> 0,
    };

    setCrackImpacts((current) => {
      if (current.length === 0) return [impact];
      if (damage < 40) return current;
      const first = new Vector3(...current[0].position);
      if (first.distanceTo(localPosition) < 0.18) return current;
      return [current[0], impact];
    });
  }

  function spin(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const { clientX, clientY } = event.nativeEvent;
    pointer.current = { x: clientX, y: clientY };
    setSquash(1.09, 0.86, 1.07);
    (event.nativeEvent.target as Element).setPointerCapture?.(event.pointerId);
    registerCrack(event);
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
    const horizontal = Math.min(1, Math.abs(dx) / 26);
    const vertical = Math.min(1, Math.abs(dy) / 26);
    setSquash(1 + horizontal * 0.14 - vertical * 0.055, 1 + vertical * 0.13 - horizontal * 0.075, 0.95);
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
      onCollisionEnter={() => {
        if (pointer.current) return;
        setSquash(1.07, 0.89, 1.055);
        impactHold.current = 0.075;
      }}
    >
      <group
        ref={visual}
        onPointerDown={spin}
        onPointerMove={drag}
        onPointerUp={(event) => {
          (event.nativeEvent.target as Element).releasePointerCapture?.(event.pointerId);
          pointer.current = null;
          releaseSquash();
        }}
        onPointerCancel={() => {
          pointer.current = null;
          releaseSquash();
        }}
      >
        <primitive object={model} scale={1.08} />
        <CrackMarks kind={kind} damage={damage} impacts={crackImpacts} />
        <SurfaceChips kind={kind} damage={damage} impacts={crackImpacts} />
      </group>
    </RigidBody>
  );
}

type LoadedFragment = {
  geometry: Mesh["geometry"];
  material: Material | Material[];
  position: [number, number, number];
  rotation: [number, number, number];
};

function FragmentPiece({ piece, fragment, tilt, index }: { piece: LoadedFragment; fragment: FragmentSpec; tilt: DeviceTiltRef; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [released, setReleased] = useState(false);
  useTiltPhysics(body, tilt, 0.62);

  useEffect(() => {
    const delay = 100 + index * 45;
    const timer = window.setTimeout(() => setReleased(true), delay);
    return () => window.clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (!released) return;
    body.current?.setLinvel({
      x: 0,
      y: -0.035,
      z: 0,
    }, true);
    body.current?.setAngvel({
      x: fragment.spin[0] * 0.025,
      y: fragment.spin[1] * 0.018,
      z: fragment.spin[2] * 0.025,
    }, true);
  }, [fragment, index, released]);

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
      type={released ? "dynamic" : "fixed"}
      colliders="hull"
      position={piece.position}
      rotation={piece.rotation}
      restitution={0.03}
      friction={0.94}
      linearDamping={0.5}
      angularDamping={0.82}
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
        index={index}
      />
    );
  });
}

// Blender로 모델링한 한 장짜리 포춘쿠키 쪽지. 앞뒤 잎이 둥근 접힘으로 이어지고
// 자유단 길이와 휨이 조금씩 다르다. scripts/fortune-note.py 로 다시 만들 수 있다.
function JellyCore({ kind, tilt }: { kind: BallKind; tilt: DeviceTiltRef }) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const sourceColorMap = useTexture(`/textures/wakppu/${kind}-interior.webp`);
  const sourceNormalMap = useTexture(`/textures/wakppu/${kind}-interior-normal.webp`);
  const colorMap = useMemo(() => {
    const texture = sourceColorMap.clone();
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1.35, 1.35);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, [sourceColorMap]);
  const normalMap = useMemo(() => {
    const texture = sourceNormalMap.clone();
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1.35, 1.35);
    texture.needsUpdate = true;
    return texture;
  }, [sourceNormalMap]);
  const previousVelocity = useRef(new Vector3());
  const wobble = useRef({ compression: 0, velocity: -2.8, lean: 0, leanVelocity: 0.9 });
  useTiltPhysics(body, tilt, 0.62);

  function excite(compression = 0.24, lean = 0.45) {
    wobble.current.velocity -= compression * 9.5;
    wobble.current.leanVelocity += lean;
  }

  useFrame((state, delta) => {
    if (!visual.current || !body.current) return;
    const frame = Math.min(delta, 0.032);
    const current = wobble.current;
    const velocity = body.current.linvel();
    const lastVelocity = previousVelocity.current;
    const verticalImpulse = velocity.y - lastVelocity.y;

    if (verticalImpulse > 0.72) {
      current.velocity -= Math.min(3.2, verticalImpulse * 0.48);
      current.leanVelocity += (velocity.x - velocity.z) * 0.025;
    }
    lastVelocity.set(velocity.x, velocity.y, velocity.z);

    current.velocity += (-92 * current.compression - 12.5 * current.velocity) * frame;
    current.compression += current.velocity * frame;
    current.compression = clamp(current.compression, -0.28, 0.32);

    current.leanVelocity += (-58 * current.lean - 9.5 * current.leanVelocity) * frame;
    current.lean += current.leanVelocity * frame;
    current.lean = clamp(current.lean, -0.22, 0.22);

    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const stretch = Math.min(0.13, speed * 0.016);
    const verticalScale = clamp(1 + current.compression + stretch, 0.68, 1.42);
    const volumeScale = 1 / Math.sqrt(verticalScale);
    const residual = Math.min(0.055, Math.abs(current.velocity) * 0.018);
    const ripple = Math.sin(state.clock.elapsedTime * 15.5) * residual;
    const mochiScale = kind === "mochi" ? 0.93 : 1;

    visual.current.scale.set(
      volumeScale * (1 + ripple),
      verticalScale * mochiScale,
      volumeScale * (1 - ripple),
    );
    visual.current.rotation.x = current.lean * 0.42;
    visual.current.rotation.z = -current.lean * 0.7;
  });

  function poke(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const direction = event.point.clone().normalize();
    body.current?.applyImpulse({ x: direction.x * 0.38, y: 0.72, z: direction.z * 0.38 }, true);
    body.current?.applyTorqueImpulse({ x: -direction.z * 0.22, y: 0.16, z: direction.x * 0.22 }, true);
    excite(0.28, direction.x * 0.7 + 0.35);
  }

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[0, 0.28, 0]}
      mass={0.72}
      restitution={0.42}
      friction={0.78}
      linearDamping={0.34}
      angularDamping={0.46}
      canSleep={false}
      onCollisionEnter={() => excite(0.2, -wobble.current.lean * 0.8 + 0.24)}
    >
      <BallCollider args={[0.52]} />
      <group ref={visual}>
        <mesh castShadow receiveShadow onPointerDown={poke}>
          <sphereGeometry args={[0.57, 36, 24]} />
          <meshPhysicalMaterial
            map={colorMap}
            normalMap={normalMap}
            normalScale={[0.18, 0.18]}
            roughness={kind === "dubai" ? 0.34 : 0.24}
            metalness={0}
            transmission={0.08}
            thickness={0.52}
            ior={1.42}
            clearcoat={0.82}
            clearcoatRoughness={0.1}
          />
        </mesh>
      </group>
    </RigidBody>
  );
}

const NOTE_ASSET_VERSION = "20260813-folded-reference-2";
const NOTE_MODEL = `/models/fortune-note.glb?v=${NOTE_ASSET_VERSION}`;
const NOTE_SCALE = 0.8;

function useFortuneNoteModel() {
  const { scene } = useGLTF(NOTE_MODEL);
  return useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return copy;
  }, [scene]);
}

function FortuneNote3D({ tilt, onPull }: { tilt: DeviceTiltRef; onPull: () => void }) {
  const body = useRef<RapierRigidBody>(null);
  const pointer = useRef<{ startX: number; startY: number } | null>(null);
  const home = useMemo(() => ({ x: 0, y: -0.08, z: 0.92 }), []);
  const model = useFortuneNoteModel();

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
      {/* 새 접힌 쪽지 GLB의 반크기 약 0.428×0.475×0.012에 NOTE_SCALE을 반영한 콜라이더. */}
      <CuboidCollider args={[0.35, 0.39, 0.04]} />
      <group
        onPointerDown={grab}
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={() => { pointer.current = null; }}
      >
        <primitive object={model} scale={NOTE_SCALE} />
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
              {!angularKinds.has(kind) && <JellyCore kind={kind} tilt={tilt} />}
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
  const [crackPulse, setCrackPulse] = useState(0);
  const [pulled, setPulled] = useState(false);
  const broken = damage >= 100;
  const damageRef = useRef(0);
  const announced = useRef(false);
  const feedbackPlayed = useRef(false);
  const lastCrunchAt = useRef(0);
  const { tilt, requestPermission } = useDeviceTilt();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<HTMLElement>(null);
  const slipX = useMotionValue(0);
  const slipY = useMotionValue(0);
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
    useGLTF.preload(NOTE_MODEL);
    if (!angularKinds.has(ballKind)) {
      useTexture.preload(`/textures/wakppu/${ballKind}-interior.webp`);
      useTexture.preload(`/textures/wakppu/${ballKind}-interior-normal.webp`);
    }
  }, [ballKind]);

  useEffect(() => {
    if (crackPulse === 0 || broken || reduceMotion) return;
    canvasRef.current?.animate([
      { transform: "translate3d(0,0,0) rotate(0)" },
      { transform: "translate3d(-2px,1px,0) rotate(-.25deg)", offset: 0.24 },
      { transform: "translate3d(2px,-1px,0) rotate(.22deg)", offset: 0.5 },
      { transform: "translate3d(-1px,0,0) rotate(-.1deg)", offset: 0.74 },
      { transform: "translate3d(0,0,0) rotate(0)" },
    ], {
      duration: 150,
      easing: "cubic-bezier(.36,.07,.19,.97)",
    });
  }, [crackPulse, broken, reduceMotion]);

  useEffect(() => {
    if (!pulled || announced.current) return;
    announced.current = true;
    onReveal();
  }, [pulled, onReveal]);

  function addDamage(amount: number) {
    const value = damageRef.current;
    if (value >= 100) return;
    const next = Math.min(100, value + amount);
    damageRef.current = next;
    setDamage(next);

    const now = performance.now();
    if (next < 100 && now - lastCrunchAt.current > 72) {
      lastCrunchAt.current = now;
      const damageWeight = clamp(next / 100, 0.18, 0.92);
      const inputWeight = clamp(amount / 12, 0.2, 1);
      playCrunchFeedback(0.25 + damageWeight * 0.42 + inputWeight * 0.28);
    }

    if (next < 100 && [28, 52, 78].some((threshold) => value < threshold && next >= threshold)) {
      setCrackPulse((pulse) => pulse + 1);
      playCrunchFeedback(next >= 78 ? 0.92 : next >= 52 ? 0.75 : 0.58);
    }
    if (next >= 100 && !feedbackPlayed.current) {
      feedbackPlayed.current = true;
      playBreakFeedback();
    }
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
      <div ref={canvasRef} className="fortune-ball-canvas" aria-hidden="true">
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
      </div>
    </div>
  );
}
