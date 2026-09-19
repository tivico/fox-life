import * as THREE from 'three';

export function bindEatInteraction(
  canvas: HTMLCanvasElement, camera: THREE.Camera, scene: THREE.Scene,
  foodParts: THREE.Object3D[], onHit: () => void,
) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let press: { id: number; x: number; y: number; dragged: boolean } | undefined;
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) { press = undefined; return; }
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
  };
  const move = (event: PointerEvent) => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) press.dragged = true;
  };
  const cancel = () => { press = undefined; };
  const up = (event: PointerEvent) => {
    const start = press;
    press = undefined;
    if (!start || start.id !== event.pointerId || start.dragged || event.button !== 0) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    // Test the nearest visible surface so a character/wall can occlude the dining target.
    const hit = raycaster.intersectObjects(scene.children, true)[0];
    if (hit && foodParts.includes(hit.object)) onHit();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel);
  };
}
