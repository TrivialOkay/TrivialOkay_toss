import * as THREE from "three";
import type { OuterShellFragment } from "./wakppu-outer-shell";

export type FloatLayoutTarget = {
  fragment: OuterShellFragment;
  velocity: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  spin: number;
  bobAmplitude: number;
  bobSpeed: number;
  orbitPhase: number;
  delay: number;
  fragmentScale: number;
  motionStyle: FragmentMotionStyle;
};

export type FragmentMotionStyle =
  | "stretch"
  | "crumble"
  | "flare"
  | "plate"
  | "dust"
  | "shear"
  | "chunk"
  | "orbit"
  | "collapse";

function seededValue(index: number, salt: number) {
  const value = Math.sin((index + 1) * (salt + 5) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function createFloatLayout(
  fragments: OuterShellFragment[],
  impactDirection: THREE.Vector3,
  motionStyle: FragmentMotionStyle,
): FloatLayoutTarget[] {
  const impact = impactDirection.clone().normalize();
  const profiles: Record<FragmentMotionStyle, {
    radial: number;
    away: number;
    tangent: number;
    speed: [number, number];
    spin: [number, number];
    bob: [number, number];
    scale: number;
    maxDelay: number;
  }> = {
    stretch: { radial: 0.42, away: 0.12, tangent: 0.46, speed: [0.24, 0.46], spin: [0.16, 0.38], bob: [0.08, 0.16], scale: 1.08, maxDelay: 0.08 },
    crumble: { radial: 0.82, away: 0.24, tangent: 0.1, speed: [0.72, 1.18], spin: [1.4, 2.5], bob: [0.025, 0.07], scale: 0.58, maxDelay: 0.22 },
    flare: { radial: 1, away: 0.18, tangent: 0.08, speed: [1.05, 1.7], spin: [0.8, 1.7], bob: [0.02, 0.06], scale: 0.74, maxDelay: 0.03 },
    plate: { radial: 0.68, away: 0.22, tangent: 0.16, speed: [0.42, 0.76], spin: [0.3, 0.82], bob: [0.035, 0.09], scale: 1, maxDelay: 0.1 },
    dust: { radial: 0.76, away: 0.2, tangent: 0.28, speed: [0.62, 1.02], spin: [0.9, 1.8], bob: [0.04, 0.1], scale: 0.7, maxDelay: 0.14 },
    shear: { radial: 0.24, away: 0.1, tangent: 0.92, speed: [0.68, 1.08], spin: [0.55, 1.15], bob: [0.05, 0.11], scale: 0.86, maxDelay: 0.08 },
    chunk: { radial: 0.58, away: 0.2, tangent: 0.12, speed: [0.28, 0.5], spin: [0.16, 0.46], bob: [0.035, 0.08], scale: 1.16, maxDelay: 0.16 },
    orbit: { radial: 0.18, away: 0.08, tangent: 1, speed: [0.44, 0.72], spin: [0.48, 0.92], bob: [0.055, 0.12], scale: 0.72, maxDelay: 0.1 },
    collapse: { radial: -0.72, away: 0, tangent: 0.28, speed: [0.38, 0.64], spin: [1.2, 2.2], bob: [0.03, 0.07], scale: 0.62, maxDelay: 0.04 },
  };
  const profile = profiles[motionStyle];
  return fragments.map((fragment) => {
    const awayFromImpact = fragment.radial.clone().sub(impact);
    if (awayFromImpact.lengthSq() < 0.001) awayFromImpact.copy(fragment.tangent);
    awayFromImpact.normalize();
    const direction = fragment.radial
      .clone()
      .multiplyScalar(profile.radial)
      .addScaledVector(awayFromImpact, profile.away)
      .addScaledVector(fragment.tangent, profile.tangent)
      .normalize();
    const speed = profile.speed[0] + fragment.liftSeed * (profile.speed[1] - profile.speed[0]);
    const velocity = direction.multiplyScalar(speed);
    velocity.y += (fragment.twistSeed - 0.5) * 0.22;

    return {
      fragment,
      velocity,
      rotationAxis: fragment.rotationAxis.clone().normalize(),
      spin: profile.spin[0] + fragment.twistSeed * (profile.spin[1] - profile.spin[0]),
      bobAmplitude: profile.bob[0] + seededValue(fragment.faceIndex, 73) * (profile.bob[1] - profile.bob[0]),
      bobSpeed: 0.7 + seededValue(fragment.faceIndex, 83) * 0.9,
      orbitPhase: seededValue(fragment.faceIndex, 89) * Math.PI * 2,
      delay: seededValue(fragment.faceIndex, 97) * profile.maxDelay,
      fragmentScale: profile.scale,
      motionStyle,
    };
  });
}
