import * as THREE from 'three';

export type RoomId = 'Bedroom' | 'LivingRoom' | 'Balcony' | 'Kitchen';
export interface WalkArea { minX: number; maxX: number; minZ: number; maxZ: number }
export const homeRooms = {
  Bedroom: { label: '臥室', centerX: 0, centerZ: 0, walk: { minX: -1.65, maxX: 1.65, minZ: -1.15, maxZ: 1.35 } },
  LivingRoom: { label: '客廳', centerX: 0, centerZ: 6.4, walk: { minX: -1.65, maxX: 1.35, minZ: 4.9, maxZ: 7.0 } },
  Balcony: { label: '陽台花園', centerX: 6.7, centerZ: 0, walk: { minX: 5.5, maxX: 7.8, minZ: -.55, maxZ: .20 } },
  Kitchen: { label: '廚房', centerX: 6.7, centerZ: 6.4, walk: { minX: 5.5, maxX: 7.1, minZ: 5.9, maxZ: 6.7 } },
} as const;
export function isRoomId(value: unknown): value is RoomId { return typeof value === 'string' && Object.hasOwn(homeRooms, value); }

export function roomAt(position: THREE.Vector3): RoomId {
  return position.x > 4.2 ? position.z < 3.2 ? 'Balcony' : 'Kitchen' : position.z < 3.2 ? 'Bedroom' : 'LivingRoom';
}

// Cross the open doorway along its center. Furniture stays outside both walking areas.
export function homeRoute(from: THREE.Vector3, to: THREE.Vector3, bedCorner?: THREE.Vector3, goingToBed = false): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const source = roomAt(from), destination = roomAt(to);
  const kitchenDoor = [new THREE.Vector3(1.1, 0, 7.8), new THREE.Vector3(2.2, 0, 8.44),
    new THREE.Vector3(3.6, 0, 8.44), new THREE.Vector3(4.8, 0, 8.44), new THREE.Vector3(5.25, 0, 8.44), new THREE.Vector3(5.25, 0, 6.4)];
  if (source === 'Kitchen' && destination !== 'Kitchen') {
    return [...kitchenDoor.map(point => point.clone()).reverse(), ...homeRoute(kitchenDoor[0]!, to, bedCorner, goingToBed)];
  }
  if (source !== 'Kitchen' && destination === 'Kitchen') {
    return [...homeRoute(from, kitchenDoor[0]!, bedCorner), ...kitchenDoor];
  }
  if (source === 'Kitchen' && destination === 'Kitchen') return [];
  const leavingBedroom = source === 'Bedroom';
  if (leavingBedroom && from.x < -1.8 && bedCorner) points.push(bedCorner.clone());
  const gardenDoor = [new THREE.Vector3(1.2, 0, 2.6), new THREE.Vector3(2.7, 0, 2.6),
    new THREE.Vector3(3.5, 0, 2.6), new THREE.Vector3(4.8, 0, 2.6), new THREE.Vector3(5.3, 0, 2.6), new THREE.Vector3(5.3, 0, .1)];
  if (source === 'Balcony' && destination !== 'Balcony') {
    points.push(...gardenDoor.map(point => point.clone()).reverse(), new THREE.Vector3(0, 0, 2.6));
  }
  if ((source === 'LivingRoom') !== (destination === 'LivingRoom')) {
    const doorway = [new THREE.Vector3(0, 0, 1.2), new THREE.Vector3(0, 0, 2.2),
      new THREE.Vector3(0, 0, 4.2), new THREE.Vector3(0, 0, 5)];
    points.push(...(source !== 'LivingRoom' ? doorway : doorway.reverse()));
  }
  if (source !== 'Balcony' && destination === 'Balcony') points.push(...gardenDoor);
  if (source === 'Balcony' && destination === 'Balcony' && from.z > .8) points.push(new THREE.Vector3(5.3, 0, .1));
  if (goingToBed && bedCorner && (!leavingBedroom || from.x >= -1.8)) points.push(bedCorner.clone());
  return points.filter(point => point.distanceTo(from) > .08 && point.distanceTo(to) > .08);
}
