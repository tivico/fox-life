import * as THREE from 'three';

export type RoomId = 'Bedroom' | 'LivingRoom';
export interface WalkArea { minX: number; maxX: number; minZ: number; maxZ: number }
export const homeRooms = {
  Bedroom: { label: '臥室', centerZ: 0, walk: { minX: -1.65, maxX: 1.65, minZ: -1.15, maxZ: 1.35 } },
  LivingRoom: { label: '客廳', centerZ: 6.4, walk: { minX: -1.65, maxX: 1.35, minZ: 4.9, maxZ: 7.0 } },
} as const;

export function roomAt(position: THREE.Vector3): RoomId {
  return position.z < 3.2 ? 'Bedroom' : 'LivingRoom';
}

// Cross the open doorway along its center. Furniture stays outside both walking areas.
export function homeRoute(from: THREE.Vector3, to: THREE.Vector3, bedCorner?: THREE.Vector3, goingToBed = false) {
  const points: THREE.Vector3[] = [];
  const leavingBedroom = roomAt(from) === 'Bedroom';
  const enteringBedroom = roomAt(to) === 'Bedroom';
  if (leavingBedroom && from.x < -1.8 && bedCorner) points.push(bedCorner.clone());
  if (leavingBedroom !== enteringBedroom) {
    const doorway = [new THREE.Vector3(0, 0, 1.2), new THREE.Vector3(0, 0, 2.2),
      new THREE.Vector3(0, 0, 4.2), new THREE.Vector3(0, 0, 5)];
    points.push(...(leavingBedroom ? doorway : doorway.reverse()));
  }
  if (goingToBed && bedCorner && (!leavingBedroom || from.x >= -1.8)) points.push(bedCorner.clone());
  return points.filter(point => point.distanceTo(from) > .08 && point.distanceTo(to) > .08);
}
