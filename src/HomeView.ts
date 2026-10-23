import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { homeRooms, roomAt, isRoomId, type RoomId } from './HomeNavigation.ts';

export type HomeViewMode = 'follow' | 'overview' | RoomId;
// In follow mode the view leans this far from the room's centre toward the fox being followed.
export const FOLLOW_BIAS = .45;

export function createHomeView(camera: THREE.PerspectiveCamera, controls: OrbitControls, position: THREE.Vector3,
  reducedMotion: () => boolean, includeGarden = false) {
  let mode: HomeViewMode = 'follow';
  let followed = position;
  let focusedRoom = roomAt(followed);
  let transition: { target: THREE.Vector3; camera: THREE.Vector3 } | null = null;
  const lean = () => new THREE.Vector3(followed.x - homeRooms[focusedRoom].centerX, 0, followed.z - homeRooms[focusedRoom].centerZ)
    .multiplyScalar(FOLLOW_BIAS);
  function focus(next: HomeViewMode) {
    mode = next;
    focusedRoom = isRoomId(next) ? next : roomAt(followed);
    const z = next === 'overview' ? 3.2 : homeRooms[focusedRoom].centerZ;
    const x = next === 'overview' ? includeGarden ? 2.2 : 0 : homeRooms[focusedRoom].centerX;
    transition = { target: new THREE.Vector3(x, .8, z), camera: next === 'overview'
      ? includeGarden ? new THREE.Vector3(16, 15, 23) : new THREE.Vector3(12, 12, 20) : focusedRoom === 'Balcony'
        ? new THREE.Vector3(x + 7, 7.5, 10) : focusedRoom === 'Kitchen'
        ? new THREE.Vector3(x + 6.5, 7.5, z + 9.5) : focusedRoom === 'LivingRoom'
        ? new THREE.Vector3(-6, 8, z + 10) : new THREE.Vector3(8, 7, z + 10) };
    // Shift target and camera together so following keeps the room's framing, just nearer the fox.
    if (next === 'follow') { const shift = lean(); transition.target.add(shift); transition.camera.add(shift); }
  }
  const stopTransition = () => { transition = null; };
  controls.addEventListener('start', stopTransition);
  // Switch which fox the follow mode tracks; the camera glides to its room.
  function follow(next: THREE.Vector3) {
    followed = next;
    if (mode === 'follow') focus('follow');
  }
  function update(dt: number) {
    if (mode === 'follow' && focusedRoom !== roomAt(followed)) focus('follow');
    const alpha = reducedMotion() ? 1 : 1 - Math.exp(-Math.max(0, dt) * 5);
    if (!transition) {
      if (mode !== 'follow') return;
      // Drift gently with the fox inside its room, moving camera and target together so orbit and zoom stay yours.
      const desired = new THREE.Vector3(homeRooms[focusedRoom].centerX, .8, homeRooms[focusedRoom].centerZ).add(lean());
      const drift = desired.sub(controls.target).multiplyScalar(reducedMotion() ? 1 : 1 - Math.exp(-Math.max(0, dt) * 2.5));
      controls.target.add(drift); camera.position.add(drift);
      return;
    }
    const cameraAlpha = reducedMotion() ? 1 : Math.min(alpha, Math.max(0, dt) * 45 / Math.max(.001, camera.position.distanceTo(transition.camera)));
    camera.position.lerp(transition.camera, cameraAlpha);
    controls.target.lerp(transition.target, alpha);
    if (camera.position.distanceTo(transition.camera) < .005 && controls.target.distanceTo(transition.target) < .005) {
      camera.position.copy(transition.camera); controls.target.copy(transition.target); transition = null;
    }
  }
  return { focus, follow, update, reset: () => focus(mode),
    get mode() { return mode; }, get room() { return focusedRoom; },
    dispose: () => controls.removeEventListener('start', stopTransition) };
}
