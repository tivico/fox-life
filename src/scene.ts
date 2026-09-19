import * as THREE from 'three';
import type { CharacterLayout } from './Character.ts';

export const characterLayout: CharacterLayout = {
  windowPosition: new THREE.Vector3(0, 0, -1.4),
  windowHeading: Math.PI,
  bounds: { minX: -1.65, maxX: 1.65, minZ: -1.15, maxZ: 1.35 },
};

export const sleepLayout: CharacterLayout = {
  ...characterLayout,
  bed: { position: new THREE.Vector3(-3.15, 0, 1.85), heading: Math.PI,
    corner: new THREE.Vector3(-1.65, 0, 1.85) },
};
export const readLayout: CharacterLayout = {
  ...sleepLayout,
  // Within the approved +/-0.25 adjustment: reserve tail clearance on departure.
  reading: { position: new THREE.Vector3(2.10, 0, -0.30), heading: Math.PI / 2 },
};

export const eatLayout: CharacterLayout = {
  ...readLayout,
  dining: { position: new THREE.Vector3(2.10, 0, 1.45), heading: Math.PI / 2 },
};

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e6df');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(8, 7, 10);
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
  // Low cutaway walls, no roof. The camera remains outside the room envelope.
  box(8.4, 0.55, 0.18, '#a6b6ac', 0, 0.275, -3.1);
  box(0.18, 0.55, 6.4, '#a6b6ac', -4.1, 0.275, 0);
  box(8.4, 0.18, 0.18, '#d6cbb9', 0, 0.09, 3.1);
  box(0.18, 0.18, 6.4, '#d6cbb9', 4.1, 0.09, 0);
  // An inset rug avoids placing an elevated surface under the feet.
  box(3.7, 0.008, 2.9, '#d4b29b', 0, -0.003, 0.35);

  // Decorative furniture only. Inner faces stay outside |x| = 2.9.
  const bedParts = [
    box(0.85, 0.26, 1.9, '#aeb998', -3.4, 0.13, 0.5),
    box(0.76, 0.22, 1.75, '#e5dfc9', -3.4, 0.37, 0.5),
    box(0.65, 0.15, 0.45, '#f2ebd6', -3.4, 0.55, -0.08),
    box(0.85, 0.65, 0.12, '#aeb998', -3.4, 0.325, -0.52),
  ];
  bedParts.forEach((part, index) => { part.name = ['BedFrame', 'Mattress', 'Pillow', 'Headboard'][index]!; });
  box(0.7, 0.72, 1.25, '#b0bcaa', 3.5, 0.36, -0.3);
  box(0.79, 0.08, 1.35, '#eee5d2', 3.5, 0.76, -0.3);
  // A small open bookshelf above the existing cabinet. The unrelated cabinet
  // and tabletop stay non-target surfaces; only the visible shelf/books read.
  const readingParts: THREE.Object3D[] = [];
  for (const z of [-0.94, 0.34]) readingParts.push(box(0.62, 0.86, 0.07, '#b0bcaa', 3.52, 1.23, z));
  for (const y of [0.84, 1.24, 1.64]) readingParts.push(box(0.62, 0.065, 1.35, '#b0bcaa', 3.52, y, -0.30));
  for (const y of [1.045, 1.445]) for (let i = 0; i < 6; i++) {
    readingParts.push(box(0.36, 0.31 - (i % 2) * 0.045, 0.105,
      ['#c99573', '#839889', '#dbcaa3'][i % 3]!, 3.42, y, -0.77 + i * 0.18));
  }
  readingParts.forEach((part, index) => { part.name = index < 5 ? 'Bookshelf' : 'ShelfBook'; });
  // Dedicated dining surface outside the central walking envelope.
  const foodParts: THREE.Object3D[] = [box(0.70, 0.08, 0.80, '#e5d8bc', 3.35, 0.62, 1.65)];
  foodParts[0]!.name = 'DiningSurface';
  box(0.22, 0.58, 0.38, '#aeb998', 3.45, 0.29, 1.65).name = 'DiningSupport';
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.12, 0), new THREE.Vector2(0.23, 0.13),
    new THREE.Vector2(0.20, 0.13), new THREE.Vector2(0.10, 0.03), new THREE.Vector2(0, 0.03),
  ], 24), new THREE.MeshStandardMaterial({ color: '#eee1c5', roughness: 1 }));
  bowl.position.set(3.25, 0.66, 1.55); bowl.name = 'FoodBowl';
  bowl.castShadow = true; room.add(bowl); foodParts.push(bowl);
  for (const [x, z] of [[3.18, 1.49], [3.31, 1.49], [3.25, 1.62]]) {
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#ce9555', roughness: 1 }));
    food.position.set(x!, 0.77, z!); food.scale.y = 0.65; food.name = 'Food';
    food.castShadow = true; room.add(food); foodParts.push(food);
  }
  // Window posts connect the raised window to the cutaway wall.
  for (const x of [-1.15, 1.15]) box(0.16, 0.95, 0.22, '#faf0dd', x, 0.475, -3);

  const windowPane = box(2.15, 1.5, 0.12, '#7bb4be', 0, 1.8, -3);
  windowPane.name = 'Window';
  windowPane.material.emissive.set('#244a50');
  const windowParts: THREE.Object3D[] = [windowPane];
  for (const x of [-1.15, 1.15]) windowParts.push(box(0.16, 1.8, 0.22, '#faf0dd', x, 1.8, -3));
  for (const y of [0.94, 2.66]) windowParts.push(box(2.46, 0.16, 0.22, '#faf0dd', 0, y, -3));
  windowParts.push(box(0.08, 1.6, 0.24, '#faf0dd', 0, 1.8, -3));
  windowParts.push(box(2.2, 0.08, 0.24, '#faf0dd', 0, 1.8, -3));
  windowParts.push(box(2.65, 0.12, 0.55, '#faf0dd', 0, 0.85, -2.95));
  return { scene, camera, windowParts, bedParts, readingParts, foodParts };
}
