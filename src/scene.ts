import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e6df');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(10, 9, 12);
  scene.add(new THREE.HemisphereLight('#fff5e3', '#7b8980', 2.5));
  const sunlight = new THREE.DirectionalLight('#fff0d6', 3);
  sunlight.position.set(3, 8, 5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunlight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  sunlight.shadow.normalBias = 0.04;
  scene.add(sunlight);

  const room = new THREE.Group();
  scene.add(room);
  function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    room.add(mesh);
    return mesh;
  }
  box(8.4, 0.3, 6.4, '#c2b5a3', 0, -0.15, 0);
  // Cutaway walls keep the placeholder visible throughout a full orbit.
  box(8.4, 0.55, 0.18, '#a6b6ac', 0, 0.275, -3.1);
  box(0.18, 0.55, 6.4, '#a6b6ac', -4.1, 0.275, 0);
  box(8.4, 0.18, 0.18, '#d6cbb9', 0, 0.09, 3.1);
  box(0.18, 0.18, 6.4, '#d6cbb9', 4.1, 0.09, 0);
  box(3.5, 0.025, 2.7, '#d9c6b5', 0, 0.0125, 0);

  const windowPane = box(2.15, 1.5, 0.12, '#7bb4be', 0, 1.8, -3);
  windowPane.name = 'Window';
  windowPane.material.emissive.set('#244a50');
  const windowParts: THREE.Object3D[] = [windowPane];
  for (const x of [-1.15, 1.15]) windowParts.push(box(0.16, 1.8, 0.22, '#faf0dd', x, 1.8, -3));
  for (const y of [0.94, 2.66]) windowParts.push(box(2.46, 0.16, 0.22, '#faf0dd', 0, y, -3));
  windowParts.push(box(0.08, 1.6, 0.24, '#faf0dd', 0, 1.8, -3));
  windowParts.push(box(2.2, 0.08, 0.24, '#faf0dd', 0, 1.8, -3));
  box(2.65, 0.12, 0.55, '#faf0dd', 0, 0.85, -2.95);
  return { scene, camera, windowPane, windowParts };
}
