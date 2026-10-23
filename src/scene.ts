import * as THREE from 'three';
import type { CharacterLayout } from './Character.ts';
import { dressRoom } from './roomDetails.ts';
import { CLEAN_STORAGE } from './daily.ts';
import { createLivingRoom } from './livingRoom.ts';
import { createBalcony } from './balcony.ts';
import { createKitchen } from './kitchen.ts';

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
export const homeLayout: CharacterLayout = {
  ...eatLayout,
  leisure: { clean: new THREE.Vector3(-.65, 0, .15), play: new THREE.Vector3(.65, 0, .55), heading: .25,
    storage: { position: new THREE.Vector3().fromArray(CLEAN_STORAGE.position),
      tool: new THREE.Vector3().fromArray(CLEAN_STORAGE.tool), heading: CLEAN_STORAGE.heading } },
};

export const expandedHomeLayout: CharacterLayout = {
  ...homeLayout, connectedRooms: true,
  leisure: { ...homeLayout.leisure!, play: new THREE.Vector3(.65, 0, 6.2) },
};

export const gardenHomeLayout: CharacterLayout = { ...expandedHomeLayout, balcony: true };
export const kitchenHomeLayout: CharacterLayout = { ...gardenHomeLayout, kitchen: true };
// The second fox sleeps on the pillow by the wall; the aisle-side approach and bed corner are shared.
export const companionLayout: CharacterLayout = {
  ...kitchenHomeLayout,
  bed: { ...kitchenHomeLayout.bed!, position: new THREE.Vector3(-3.95, 0, 1.85) },
};

export function createScene({ expanded = false, garden = false, kitchen = false } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e6df');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(8, 7, 10);
  scene.add(new THREE.HemisphereLight('#fff5e3', '#7b8980', 1.9));
  const sunlight = new THREE.DirectionalLight('#fff0d6', 2.7);
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
  // Extend the sleeping alcove outward so the double bed retains the clear aisle.
  const floor = box(9.2, 0.3, 6.4, '#c2b5a3', -.4, -0.15, 0);
  // Low cutaway walls, no roof. The camera remains outside the room envelope.
  box(9.2, 0.9, 0.18, '#a6b6ac', -.4, 0.45, -3.1);
  box(0.18, 0.9, 6.4, '#a6b6ac', -4.9, 0.45, 0);
  if (!expanded) box(9.2, 0.18, 0.18, '#d6cbb9', -.4, 0.09, 3.1);
  else box(.8, .18, .18, '#d6cbb9', -4.6, .09, 3.1);
  if (garden) box(0.18, 0.18, 5.05, '#d6cbb9', 4.1, 0.09, -.675);
  else box(0.18, 0.18, 6.4, '#d6cbb9', 4.1, 0.09, 0);
  // An inset rug avoids placing an elevated surface under the feet.
  const rug = box(3.7, 0.008, 2.9, '#d4b29b', 0, -0.003, 0.35);

  // Keep the existing sleeping berth and foot approach on the aisle side.
  const bedParts = [
    box(1.65, 0.26, 1.9, '#aeb998', -3.8, 0.13, 0.5),
    box(1.56, 0.22, 1.75, '#e5dfc9', -3.8, 0.37, 0.5),
    box(0.65, 0.15, 0.45, '#f2ebd6', -3.4, 0.55, -0.08),
    box(1.65, 0.65, 0.12, '#aeb998', -3.8, 0.325, -0.52),
    box(0.65, 0.15, 0.45, '#f2ebd6', -4.2, 0.55, -0.08),
  ];
  bedParts.forEach((part, index) => { part.name = ['BedFrame', 'Mattress', 'Pillow', 'Headboard', 'Pillow'][index]!; });
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
  const details = dressRoom(scene, { floor: floor.material, rug: rug.material,
    mattress: bedParts[1]!.material, window: windowPane.material });
  foodParts.push(...details.diningDetails);
  const living = expanded ? createLivingRoom(scene, floor.material, kitchen) : null;
  const balcony = garden ? createBalcony(scene) : null;
  const cookingRoom = kitchen ? createKitchen(scene) : null;
  if (expanded) {
    // The live home's former yarn invitation is now exercise; historical previews keep their prop.
    const yarn = scene.getObjectByName('RoomYarn')!;
    const yarnGeometries = new Set<THREE.BufferGeometry>(), yarnMaterials = new Set<THREE.Material>();
    yarn.traverse(object => { if (object instanceof THREE.Mesh) {
      yarnGeometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => yarnMaterials.add(material));
    } });
    yarn.removeFromParent(); yarnGeometries.forEach(geometry => geometry.dispose()); yarnMaterials.forEach(material => material.dispose());
    sunlight.shadow.camera.bottom = -12;
    if (garden || kitchen) sunlight.shadow.camera.right = 15;
    sunlight.shadow.camera.far = 35;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.updateProjectionMatrix();
  }
  // Nested tool groups have world positions even before the first render/query.
  scene.updateMatrixWorld(true);
  return { scene, camera, windowParts, bedParts, readingParts, foodParts,
    cleanParts: details.cleanParts, playParts: living?.livingParts.Exercise ?? details.playParts, roomTextures: [...details.textures, ...(living?.textures ?? []), ...(cookingRoom?.textures ?? [])],
    atmosphere: details.atmosphere, loungeParts: living?.loungeParts ?? [], livingRoom: living, balcony, kitchen: cookingRoom };
}
