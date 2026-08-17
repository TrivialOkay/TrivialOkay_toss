import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

export const OUTER_SHELL_RADIUS = 1.605;
export const OUTER_SHELL_FRAGMENT_COUNT = 96;
const DEFORMATION_MIN_DOT = Math.cos(0.96);

export type OuterShellDeformation = {
  direction: THREE.Vector3;
  currentDepth: number;
};

export type OuterShellFragment = {
  mesh: THREE.Mesh;
  surfaceBatchId: number;
  edgeBatchId: number;
  faceIndex: number;
  shellVertexStart: number;
  shellVertexCount: number;
  homePosition: THREE.Vector3;
  radial: THREE.Vector3;
  tangent: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  targetPosition: THREE.Vector3;
  restQuaternion: THREE.Quaternion;
  targetQuaternion: THREE.Quaternion;
  targetScale: THREE.Vector3;
  broken: boolean;
  breakDirection: THREE.Vector3;
  liftSeed: number;
  twistSeed: number;
  thresholdSeed: number;
};

type OuterShellMaterials = {
  surface: THREE.Material;
  fragmentSurface: THREE.Material;
  edge: THREE.Material;
};

export type OuterShellFragmentBatches = {
  surface: THREE.BatchedMesh;
  edge: THREE.BatchedMesh;
};

function smoothstep(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function seededValue(index: number, salt: number) {
  const value = Math.sin((index + 1) * (salt + 7) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

type VoronoiCell = { center: THREE.Vector3; corners: THREE.Vector3[] };

function createSeedPoints(attempt: number) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: OUTER_SHELL_FRAGMENT_COUNT }, (_, index) => {
    const z = 1 - ((index + 0.5) / OUTER_SHELL_FRAGMENT_COUNT) * 2;
    const polarAngle = Math.acos(z);
    const warpedAngle = polarAngle * (0.72 + 0.28 * polarAngle / Math.PI);
    const radial = Math.sin(warpedAngle);
    const angle = index * goldenAngle;
    const point = new THREE.Vector3(
      Math.cos(angle) * radial,
      Math.sin(angle) * radial,
      Math.cos(warpedAngle),
    );
    const jitter = 0.025 + attempt * 0.004;
    point.add(new THREE.Vector3(
      seededValue(index, 41 + attempt) - 0.5,
      seededValue(index, 47 + attempt) - 0.5,
      seededValue(index, 53 + attempt) - 0.5,
    ).multiplyScalar(jitter));
    return point.normalize();
  });
}

function createSphericalVoronoiCells() {
  let fallback: VoronoiCell[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const seeds = createSeedPoints(attempt);
    const seedIndices = new Map<THREE.Vector3, number>();
    seeds.forEach((seed, index) => seedIndices.set(seed, index));
    const incidentVertices = seeds.map(() => [] as THREE.Vector3[]);
    const hull = new ConvexHull().setFromPoints(seeds);

    hull.faces.forEach((face) => {
      const firstEdge = face.edge;
      const faceSeeds: THREE.Vector3[] = [];
      let edge = firstEdge;
      do {
        faceSeeds.push(edge.head().point);
        edge = edge.next;
      } while (edge !== firstEdge);
      const voronoiVertex = face.normal.clone();
      const triangleCenter = faceSeeds
        .reduce((sum, seed) => sum.add(seed), new THREE.Vector3())
        .normalize();
      if (voronoiVertex.dot(triangleCenter) < 0) voronoiVertex.negate();
      voronoiVertex.normalize().multiplyScalar(OUTER_SHELL_RADIUS + 0.006);
      faceSeeds.forEach((seed) => {
        const seedIndex = seedIndices.get(seed);
        if (seedIndex !== undefined) incidentVertices[seedIndex].push(voronoiVertex.clone());
      });
    });

    const cells = seeds.map((seed, index) => {
      const tangentReference = Math.abs(seed.y) > 0.82
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);
      const tangentX = tangentReference.clone().cross(seed).normalize();
      const tangentY = seed.clone().cross(tangentX).normalize();
      const corners = incidentVertices[index].sort((a, b) => {
        const angleA = Math.atan2(a.dot(tangentY), a.dot(tangentX));
        const angleB = Math.atan2(b.dot(tangentY), b.dot(tangentX));
        return angleA - angleB;
      });
      return {
        center: seed.clone().multiplyScalar(OUTER_SHELL_RADIUS + 0.006),
        corners,
      };
    });
    fallback = cells;
    if (cells.every((cell) => cell.corners.length >= 3 && cell.corners.length <= 8)) return cells;
  }
  if (fallback.every((cell) => cell.corners.length >= 3 && cell.corners.length <= 8)) {
    return fallback;
  }
  throw new Error('Unable to create 96 spherical Voronoi cells within the 3-8 edge range.');
}

function createOuterShellGeometry(cells: VoronoiCell[]) {
  const positions: number[] = [];
  const ranges: Array<{ start: number; count: number }> = [];
  cells.forEach(({ center, corners }) => {
    const start = positions.length / 3;
    for (let corner = 0; corner < corners.length; corner += 1) {
      const next = (corner + 1) % corners.length;
      [center, corners[corner], corners[next]].forEach((point) => {
        positions.push(point.x, point.y, point.z);
      });
    }
    ranges.push({ start, count: corners.length * 3 });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const normals = new Float32Array(positions.length);
  for (let index = 0; index < positions.length; index += 3) {
    const normal = new THREE.Vector3(positions[index], positions[index + 1], positions[index + 2]).normalize();
    normals[index] = normal.x;
    normals[index + 1] = normal.y;
    normals[index + 2] = normal.z;
  }
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return { geometry, ranges };
}

function createFragmentGeometry(
  corners: THREE.Vector3[],
  center: THREE.Vector3,
  thickness: number,
) {
  const positions: number[] = [];
  const materialGroups: number[] = [];
  const centerDirection = center.clone().normalize();
  const innerCorners = corners.map((corner) => (
    corner.clone().addScaledVector(corner.clone().normalize(), -thickness)
  ));

  const addTriangle = (
    first: THREE.Vector3,
    second: THREE.Vector3,
    third: THREE.Vector3,
    materialIndex: number,
    faceOutward: boolean,
  ) => {
    const a = first.clone();
    let b = second.clone();
    let c = third.clone();
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if ((normal.dot(centerDirection) >= 0) !== faceOutward) [b, c] = [c, b];
    [a, b, c].forEach((point) => {
      const local = point.sub(center);
      positions.push(local.x, local.y, local.z);
    });
    materialGroups.push(materialIndex);
  };

  for (let corner = 1; corner < corners.length - 1; corner += 1) {
    addTriangle(corners[0], corners[corner], corners[corner + 1], 0, true);
    addTriangle(innerCorners[0], innerCorners[corner + 1], innerCorners[corner], 1, false);
  }
  for (let edge = 0; edge < corners.length; edge += 1) {
    const next = (edge + 1) % corners.length;
    addTriangle(corners[edge], innerCorners[edge], innerCorners[next], 1, true);
    addTriangle(corners[edge], innerCorners[next], corners[next], 1, true);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  materialGroups.forEach((materialIndex, triangleIndex) => {
    geometry.addGroup(triangleIndex * 3, 3, materialIndex);
  });
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function extractFragmentMaterialGeometry(source: THREE.BufferGeometry, materialIndex: number) {
  const sourcePositions = source.getAttribute('position') as THREE.BufferAttribute;
  const sourceNormals = source.getAttribute('normal') as THREE.BufferAttribute;
  const positions: number[] = [];
  const normals: number[] = [];

  source.groups.forEach((group) => {
    if (group.materialIndex !== materialIndex) return;
    for (let index = group.start; index < group.start + group.count; index += 1) {
      positions.push(sourcePositions.getX(index), sourcePositions.getY(index), sourcePositions.getZ(index));
      normals.push(sourceNormals.getX(index), sourceNormals.getY(index), sourceNormals.getZ(index));
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createFragmentBatches(
  fragments: OuterShellFragment[],
  materials: OuterShellMaterials,
): OuterShellFragmentBatches {
  const splitGeometries = fragments.map((fragment) => ({
    surface: extractFragmentMaterialGeometry(fragment.mesh.geometry, 0),
    edge: extractFragmentMaterialGeometry(fragment.mesh.geometry, 1),
  }));
  const surfaceVertexCount = splitGeometries.reduce(
    (total, item) => total + item.surface.getAttribute('position').count,
    0,
  );
  const edgeVertexCount = splitGeometries.reduce(
    (total, item) => total + item.edge.getAttribute('position').count,
    0,
  );
  const surface = new THREE.BatchedMesh(
    fragments.length,
    surfaceVertexCount,
    0,
    materials.fragmentSurface,
  );
  const edge = new THREE.BatchedMesh(
    fragments.length,
    edgeVertexCount,
    0,
    materials.edge,
  );
  surface.renderOrder = 6;
  edge.renderOrder = 6;
  surface.perObjectFrustumCulled = false;
  edge.perObjectFrustumCulled = false;

  const identity = new THREE.Matrix4();
  fragments.forEach((fragment, index) => {
    const geometries = splitGeometries[index];
    const surfaceGeometryId = surface.addGeometry(geometries.surface);
    const edgeGeometryId = edge.addGeometry(geometries.edge);
    fragment.surfaceBatchId = surface.addInstance(surfaceGeometryId);
    fragment.edgeBatchId = edge.addInstance(edgeGeometryId);
    surface.setMatrixAt(fragment.surfaceBatchId, identity);
    edge.setMatrixAt(fragment.edgeBatchId, identity);
    surface.setVisibleAt(fragment.surfaceBatchId, false);
    edge.setVisibleAt(fragment.edgeBatchId, false);
    geometries.surface.dispose();
    geometries.edge.dispose();
  });
  surface.optimize();
  edge.optimize();
  return { surface, edge };
}

export function syncOuterShellFragmentBatches(
  fragments: OuterShellFragment[],
  batches: OuterShellFragmentBatches,
) {
  fragments.forEach((fragment) => {
    fragment.mesh.updateMatrix();
    batches.surface.setMatrixAt(fragment.surfaceBatchId, fragment.mesh.matrix);
    batches.edge.setMatrixAt(fragment.edgeBatchId, fragment.mesh.matrix);
    batches.surface.setVisibleAt(fragment.surfaceBatchId, fragment.mesh.visible);
    batches.edge.setVisibleAt(fragment.edgeBatchId, fragment.mesh.visible);
  });
}

export function createOuterShell(materials: OuterShellMaterials) {
  const cells = createSphericalVoronoiCells();
  const { geometry, ranges } = createOuterShellGeometry(cells);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const basePositions = new Float32Array(positions.array as Float32Array);
  const mesh = new THREE.Mesh(geometry, materials.surface);
  mesh.renderOrder = 5;

  const fragments: OuterShellFragment[] = [];
  for (let faceIndex = 0; faceIndex < cells.length; faceIndex += 1) {
    const sourceCenter = cells[faceIndex].center;
    const radial = sourceCenter.clone().normalize();
    const corners = cells[faceIndex].corners;
    const center = corners
      .reduce((sum, corner) => sum.add(corner), new THREE.Vector3())
      .multiplyScalar(1 / corners.length);
    const randomDirection = new THREE.Vector3(
      seededValue(faceIndex, 13) - 0.5,
      seededValue(faceIndex, 17) - 0.5,
      seededValue(faceIndex, 19) - 0.5,
    ).normalize();
    const rotationAxis = radial.clone().cross(randomDirection).normalize();
    if (rotationAxis.lengthSq() < 0.01) rotationAxis.set(1, 0, 0);
    const fragmentMesh = new THREE.Mesh(
      createFragmentGeometry(corners, center, 0.012 + seededValue(faceIndex, 23) * 0.008),
      [materials.fragmentSurface, materials.edge],
    );
    fragmentMesh.position.copy(center);
    fragmentMesh.visible = false;
    fragmentMesh.renderOrder = 6;

    fragments.push({
      mesh: fragmentMesh,
      surfaceBatchId: -1,
      edgeBatchId: -1,
      faceIndex,
      shellVertexStart: ranges[faceIndex].start,
      shellVertexCount: ranges[faceIndex].count,
      homePosition: center.clone(),
      radial,
      tangent: new THREE.Vector3(),
      rotationAxis,
      targetPosition: center.clone(),
      restQuaternion: new THREE.Quaternion(),
      targetQuaternion: new THREE.Quaternion(),
      targetScale: new THREE.Vector3(0.98, 0.98, 0.98),
      broken: false,
      breakDirection: new THREE.Vector3(),
      liftSeed: seededValue(faceIndex, 29),
      twistSeed: seededValue(faceIndex, 31),
      thresholdSeed: seededValue(faceIndex, 37),
    });
  }

  const fragmentBatches = createFragmentBatches(fragments, materials);
  return { mesh, geometry, basePositions, fragments, fragmentBatches };
}

export function alignOuterShellPattern(
  geometry: THREE.BufferGeometry,
  basePositions: Float32Array,
  fragments: OuterShellFragment[],
  impactDirection: THREE.Vector3,
) {
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    impactDirection.clone().normalize(),
  );
  const point = new THREE.Vector3();
  for (let offset = 0; offset < basePositions.length; offset += 3) {
    point.set(basePositions[offset], basePositions[offset + 1], basePositions[offset + 2]);
    point.applyQuaternion(rotation);
    basePositions[offset] = point.x;
    basePositions[offset + 1] = point.y;
    basePositions[offset + 2] = point.z;
  }
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  positions.array.set(basePositions);
  positions.needsUpdate = true;
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (let index = 0; index < normals.count; index += 1) {
    point.fromBufferAttribute(normals, index).applyQuaternion(rotation).normalize();
    normals.setXYZ(index, point.x, point.y, point.z);
  }
  normals.needsUpdate = true;
  geometry.computeBoundingSphere();

  fragments.forEach((fragment) => {
    fragment.homePosition.applyQuaternion(rotation);
    fragment.radial.applyQuaternion(rotation);
    fragment.rotationAxis.applyQuaternion(rotation);
    fragment.targetPosition.applyQuaternion(rotation);
    fragment.restQuaternion.premultiply(rotation);
    fragment.targetQuaternion.copy(fragment.restQuaternion);
    fragment.mesh.position.copy(fragment.homePosition);
    fragment.mesh.quaternion.copy(fragment.restQuaternion);
  });
}

function deformSpherePointInto(
  point: THREE.Vector3,
  normal: THREE.Vector3,
  base: THREE.Vector3,
  deformations: OuterShellDeformation[],
  depthScale: number,
) {
  point.copy(base);
  normal.copy(base).normalize();
  for (const { direction, currentDepth } of deformations) {
    if (currentDepth < 0.001) continue;
    const dot = THREE.MathUtils.clamp(normal.dot(direction), -1, 1);
    if (dot < DEFORMATION_MIN_DOT) continue;
    const angle = Math.acos(dot);
    const dent = smoothstep(1 - angle / 0.88);
    const bulge = smoothstep(1 - Math.abs(angle - 0.72) / 0.24);
    const depth = currentDepth * depthScale;
    point.addScaledVector(direction, -depth * dent);
    point.addScaledVector(normal, depth * 0.24 * bulge);
    point.y -= depth * dent * 0.08;
  }
}

function deformSpherePoint(
  base: THREE.Vector3,
  deformations: OuterShellDeformation[],
  depthScale: number,
) {
  const point = new THREE.Vector3();
  deformSpherePointInto(point, new THREE.Vector3(), base, deformations, depthScale);
  return point;
}

export function updateOuterShellGeometry(
  geometry: THREE.BufferGeometry,
  basePositions: Float32Array,
  deformations: OuterShellDeformation[],
  fragments: OuterShellFragment[],
) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const base = new THREE.Vector3();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const collapsed = new THREE.Vector3();
  fragments.forEach((fragment) => {
    const firstVertex = fragment.shellVertexStart;
    collapsed.set(0, 0, 0);
    for (let offset = 0; offset < fragment.shellVertexCount; offset += 1) {
      const vertexIndex = firstVertex + offset;
      const arrayOffset = vertexIndex * 3;
      base.set(
        basePositions[arrayOffset],
        basePositions[arrayOffset + 1],
        basePositions[arrayOffset + 2],
      );
      deformSpherePointInto(point, normal, base, deformations, 0.92);
      if (fragment.broken) {
        collapsed.add(point);
        continue;
      }
      positions.setXYZ(vertexIndex, point.x, point.y, point.z);
      normal.copy(point).normalize();
      normals.setXYZ(vertexIndex, normal.x, normal.y, normal.z);
    }

    if (fragment.broken) {
      collapsed.multiplyScalar(1 / fragment.shellVertexCount);
      normal.copy(collapsed).normalize();
      for (let offset = 0; offset < fragment.shellVertexCount; offset += 1) {
        positions.setXYZ(firstVertex + offset, collapsed.x, collapsed.y, collapsed.z);
        normals.setXYZ(firstVertex + offset, normal.x, normal.y, normal.z);
      }
    }
  });

  positions.needsUpdate = true;
  normals.needsUpdate = true;
}

export function updateOuterShellFracture(
  fragments: OuterShellFragment[],
  impactDirection: THREE.Vector3,
  pressure: number,
  deformationDepth: number,
  maximumAngle = 0.72,
) {
  const impact = impactDirection.clone().normalize();
  const minimumDot = Math.cos(maximumAngle);
  fragments.forEach((fragment) => {
    const dot = THREE.MathUtils.clamp(fragment.radial.dot(impact), -1, 1);
    if (dot < minimumDot) return;
    const angle = Math.acos(dot);
    const radialProgress = smoothstep(angle / maximumAngle);
    const coherence = 1 - radialProgress;
    const threshold = 0.34 + radialProgress * 0.5 + fragment.thresholdSeed * 0.025;
    if (!fragment.broken && pressure < threshold) return;

    fragment.broken = true;
    fragment.breakDirection.copy(impact);
    const awayFromImpact = fragment.radial
      .clone()
      .multiplyScalar(fragment.radial.dot(impact))
      .sub(impact);
    if (awayFromImpact.lengthSq() < 0.0001) {
      awayFromImpact.set(0, 1, 0).cross(fragment.radial);
    }
    fragment.tangent.copy(awayFromImpact.normalize());
    fragment.rotationAxis.copy(fragment.radial).cross(fragment.tangent).normalize();
    const deformedHome = deformSpherePoint(
      fragment.homePosition,
      [{ direction: impact, currentDepth: deformationDepth }],
      0.92,
    );
    const excess = smoothstep((pressure - threshold) / 0.35);
    fragment.targetPosition
      .copy(deformedHome)
      .addScaledVector(fragment.radial, 0.012 + excess * (0.05 + coherence * 0.11))
      .addScaledVector(fragment.tangent, excess * (0.025 + coherence * 0.055));
    fragment.targetQuaternion
      .copy(fragment.restQuaternion)
      .multiply(new THREE.Quaternion().setFromAxisAngle(
        fragment.rotationAxis,
        0.025 + excess * (0.1 + coherence * 0.24),
      ));
    fragment.targetScale.setScalar(0.985 - excess * 0.018);
    fragment.mesh.visible = true;
  });
}

export function prepareOuterShellForFinalBreak(
  fragments: OuterShellFragment[],
  impactDirection: THREE.Vector3,
  deformationDepth: number,
) {
  updateOuterShellFracture(fragments, impactDirection, 1, deformationDepth, Math.PI);
  fragments.forEach((fragment) => {
    if (!fragment.broken) return;
    fragment.targetPosition
      .addScaledVector(fragment.radial, 0.14 + fragment.liftSeed * 0.12)
      .addScaledVector(fragment.tangent, 0.08 + fragment.twistSeed * 0.04);
    fragment.targetQuaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(
        fragment.rotationAxis,
        0.18 + fragment.twistSeed * 0.16,
      ),
    );
    fragment.targetScale.setScalar(0.98);
  });
}
