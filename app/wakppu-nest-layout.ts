import * as THREE from "three";
import type { OuterShellFragment } from "./wakppu-outer-shell";

export type NestLayoutTarget = {
  fragment: OuterShellFragment;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  arcHeight: number;
  arcSide: number;
  delay: number;
};

type NestRing = {
  count: number;
  radiusX: number;
  radiusZ: number;
  height: number;
  scale: number;
  inwardTilt: number;
};

const NEST_RINGS: NestRing[] = [
  { count: 28, radiusX: 1.63, radiusZ: 1.08, height: -1.02, scale: 1.08, inwardTilt: 0.42 },
  { count: 26, radiusX: 1.32, radiusZ: 0.86, height: -1.23, scale: 1.0, inwardTilt: 0.31 },
  { count: 24, radiusX: 0.99, radiusZ: 0.64, height: -1.4, scale: 0.92, inwardTilt: 0.2 },
  { count: 18, radiusX: 0.54, radiusZ: 0.36, height: -1.52, scale: 0.84, inwardTilt: 0.08 },
];

function seededValue(index: number, salt: number) {
  const value = Math.sin((index + 1) * (salt + 5) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function fragmentRadius(fragment: OuterShellFragment) {
  fragment.mesh.geometry.computeBoundingSphere();
  return fragment.mesh.geometry.boundingSphere?.radius ?? 0;
}

/**
 * Builds a deterministic, layered bowl from the existing 96 opal fragments.
 * Larger pieces become the protective outer lip while smaller pieces fill the
 * lower center, so every break produces the same readable nest silhouette.
 */
export function createNestLayout(fragments: OuterShellFragment[]): NestLayoutTarget[] {
  const ordered = [...fragments].sort((a, b) => fragmentRadius(b) - fragmentRadius(a));
  const targets: NestLayoutTarget[] = [];
  let fragmentOffset = 0;

  NEST_RINGS.forEach((ring, ringIndex) => {
    const ringFragments = ordered.slice(fragmentOffset, fragmentOffset + ring.count);
    fragmentOffset += ring.count;
    ringFragments.forEach((fragment, index) => {
      const stagger = ringIndex % 2 === 0 ? 0 : Math.PI / ring.count;
      const angle = (index / ring.count) * Math.PI * 2 + stagger;
      const radiusJitter = (seededValue(fragment.faceIndex, 61) - 0.5) * 0.12;
      const heightJitter = (seededValue(fragment.faceIndex, 67) - 0.5) * 0.07;
      const x = Math.cos(angle) * (ring.radiusX + radiusJitter);
      const z = Math.sin(angle) * (ring.radiusZ + radiusJitter * 0.65);
      const position = new THREE.Vector3(x, ring.height + heightJitter, z);

      const targetNormal = new THREE.Vector3(
        -Math.cos(angle) * ring.inwardTilt,
        1,
        -Math.sin(angle) * ring.inwardTilt,
      ).normalize();
      const sourceNormal = fragment.radial.clone().applyQuaternion(fragment.restQuaternion.clone().invert()).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(sourceNormal, targetNormal);
      const twist = angle + (seededValue(fragment.faceIndex, 71) - 0.5) * 0.9;
      quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(targetNormal, twist));

      const sizeJitter = 0.92 + seededValue(fragment.faceIndex, 73) * 0.17;
      targets.push({
        fragment,
        position,
        quaternion,
        scale: new THREE.Vector3().setScalar(ring.scale * sizeJitter),
        arcHeight: 0.32 + ringIndex * 0.11 + seededValue(fragment.faceIndex, 79) * 0.36,
        arcSide: (seededValue(fragment.faceIndex, 83) - 0.5) * 0.7,
        delay: seededValue(fragment.faceIndex, 89) * 0.18,
      });
    });
  });

  return targets;
}
