import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { homeRooms, roomAt, type RoomId } from './HomeNavigation.ts';

export type HomeViewMode = 'follow' | 'overview' | RoomId;

export function createHomeView(camera: THREE.PerspectiveCamera, controls: OrbitControls, position: THREE.Vector3,
  reducedMotion: () => boolean) {
  let mode: HomeViewMode = 'follow';
  let focusedRoom = roomAt(position);
  let transition: { target: THREE.Vector3; camera: THREE.Vector3 } | null = null;
  function focus(next: HomeViewMode) {
    mode = next;
    focusedRoom = next === 'Bedroom' || next === 'LivingRoom' ? next : roomAt(position);
    const z = next === 'overview' ? 3.2 : homeRooms[focusedRoom].centerZ;
    transition = { target: new THREE.Vector3(0, .8, z), camera: next === 'overview'
      ? new THREE.Vector3(12, 12, 20) : focusedRoom === 'LivingRoom'
        ? new THREE.Vector3(-6, 8, z + 10) : new THREE.Vector3(8, 7, z + 10) };
  }
  const stopTransition = () => { transition = null; };
  controls.addEventListener('start', stopTransition);
  function update(dt: number) {
    if (mode === 'follow' && focusedRoom !== roomAt(position)) focus('follow');
    if (!transition) return;
    const alpha = reducedMotion() ? 1 : 1 - Math.exp(-Math.max(0, dt) * 5);
    const cameraAlpha = reducedMotion() ? 1 : Math.min(alpha, Math.max(0, dt) * 45 / Math.max(.001, camera.position.distanceTo(transition.camera)));
    camera.position.lerp(transition.camera, cameraAlpha);
    controls.target.lerp(transition.target, alpha);
    if (camera.position.distanceTo(transition.camera) < .005 && controls.target.distanceTo(transition.target) < .005) {
      camera.position.copy(transition.camera); controls.target.copy(transition.target); transition = null;
    }
  }
  return { focus, update, reset: () => focus(mode),
    get mode() { return mode; }, get room() { return focusedRoom; },
    dispose: () => controls.removeEventListener('start', stopTransition) };
}
