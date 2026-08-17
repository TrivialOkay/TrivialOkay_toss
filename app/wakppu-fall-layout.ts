import * as THREE from "three";
import type { OuterShellFragment } from "./wakppu-outer-shell";

export type FallLayoutTarget = {
  fragment: OuterShellFragment;
  velocity: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  spin: number;
  floorY: number;
  delay: number;
};

function seededValue(index: number, salt: number) {
  const value = Math.sin((index + 1) * (salt + 5) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function createFallLayout(
  fragments: OuterShellFragment[],
  impactDirection: THREE.Vector3,
): FallLayoutTarget[] {
  const impact = impactDirection.clone().normalize();
  return fragments.map((fragment) => {
    const awayFromImpact = fragment.radial.clone().sub(impact);
    if (awayFromImpact.lengthSq() < 0.001) awayFromImpact.copy(fragment.tangent);
    awayFromImpact.normalize();
    const direction = fragment.radial
      .clone()
      .multiplyScalar(0.7)
      .addScaledVector(awayFromImpact, 0.22)
      .addScaledVector(fragment.tangent, 0.18)
      .normalize();
    const speed = 0.86 + fragment.liftSeed * 0.68;
    const velocity = direction.multiplyScalar(speed);
    velocity.y = Math.max(0.32, velocity.y + 0.42 + fragment.twistSeed * 0.24);

    return {
      fragment,
      velocity,
      rotationAxis: fragment.rotationAxis.clone().normalize(),
      spin: 1.15 + fragment.twistSeed * 1.55,
      floorY: -1.72 + fragment.liftSeed * 0.07,
      delay: seededValue(fragment.faceIndex, 97) * 0.075,
    };
  });
}
