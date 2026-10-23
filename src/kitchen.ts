import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { kitchenMotion, type KitchenAction, type KitchenSnapshot } from './KitchenActivity.ts';

export function createKitchen(scene: THREE.Scene) {
  const room = new THREE.Group(); room.name = 'Kitchen'; scene.add(room);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .88 }));
    return materials.get(color)!;
  };
  const add = (name: string, geometry: THREE.BufferGeometry, at: number[], color: string) => {
    const mesh = new THREE.Mesh(geometry, material(color)); mesh.name = name; mesh.position.fromArray(at);
    mesh.castShadow = mesh.receiveShadow = true; room.add(mesh); return mesh;
  };
  const box = (name: string, size: [number, number, number], at: number[], color: string) =>
    add(name, new RoundedBoxGeometry(...size, 2, Math.min(.025, ...size.map(n => n / 3))), at, color);
  const cylinder = (name: string, radius: number, height: number, at: number[], color: string) =>
    add(name, new THREE.CylinderGeometry(radius, radius, height, 24), at, color);
  const sphere = (name: string, scale: number[], at: number[], color: string) => {
    const mesh = add(name, new THREE.SphereGeometry(1, 16, 10), at, color); mesh.scale.fromArray(scale); return mesh;
  };
  box('KitchenFloor', [5, .30, 6.4], [6.7, -.15, 6.4], '#cbbba4');
  const tilePixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const grout = x % 32 < 1 || y % 32 < 1;
    const color = grout ? [197, 189, 166] : ((x < 32) !== (y < 32)) ? [220, 212, 187] : [237, 229, 207];
    tilePixels.set([...color, 255], (y * 64 + x) * 4);
  }
  const tiles = new THREE.DataTexture(tilePixels, 64, 64); tiles.colorSpace = THREE.SRGBColorSpace;
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(5, 6.4); tiles.needsUpdate = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.96, 6.36), new THREE.MeshStandardMaterial({ map: tiles, roughness: 1 }));
  floor.name = 'KitchenTiles'; floor.rotation.x = -Math.PI / 2; floor.position.set(6.7, .001, 6.4); floor.receiveShadow = true; room.add(floor);
  box('KitchenBackWall', [5, 1.55, .14], [6.7, .775, 3.26], '#c3c6af');
  box('KitchenBackCap', [5, .07, .20], [6.7, 1.57, 3.26], '#eee4cd');
  box('KitchenPartition', [.14, 1.5, 4.45], [4.13, .75, 5.475], '#c5c6ac');
  box('KitchenPartitionCap', [.21, .07, 4.45], [4.13, 1.535, 5.475], '#eee4cd');
  for (const z of [7.70, 9.18]) box('KitchenDoorPost', [.12, 1.65, .12], [4.13, .825, z], '#e9dfc7');
  box('KitchenDoorThreshold', [.20, .006, 1.36], [4.13, -.004, 8.44], '#c5ac8a');
  box('KitchenDoorReturn', [.14, 1.5, .35], [4.13, .75, 9.425], '#c5c6ac');
  box('KitchenSideEdge', [.16, .35, 6.3], [9.12, .175, 6.4], '#c5c6ac');
  box('KitchenFrontEdge', [5, .18, .16], [6.7, .09, 9.5], '#d6cbb9');

  const stationParts: Record<KitchenAction, THREE.Object3D[]> = { ChopVegetables: [], CookSoup: [], BakeCookies: [] };
  const collectSince = (start: number, kind: KitchenAction) => stationParts[kind].push(...room.children.slice(start));
  for (const [index, kind] of (['ChopVegetables', 'CookSoup', 'BakeCookies'] as const).entries()) {
    const start = room.children.length, x = 5.25 + index * 1.4;
    box('KitchenCounter', [1.34, .43, .82], [x, .245, 4.10], '#a5b298');
    box('KitchenCountertop', [1.39, .065, .90], [x, .485, 4.10], '#dbc49d');
    for (const dx of [-.33, .33]) {
      box('KitchenCabinetDoor', [.62, .34, .025], [x + dx, .25, 4.526], '#b6c1a5');
      sphere('KitchenCabinetKnob', [.023, .023, .018], [x + dx, .33, 4.546], '#937957');
    }
    collectSince(start, kind);
  }
  const prepStart = room.children.length;
  box('ChoppingBoard', [.70, .025, .42], [5.25, .530, 4.35], '#b6956b');
  const carrot = cylinder('WholeCarrot', .033, .30, [5.25, .575, 4.40], '#d19855'); carrot.rotation.z = Math.PI / 2;
  const slices = Array.from({ length: 6 }, (_, i) => {
    const slice = cylinder('CarrotSlice', .033, .032, [5.03, .575, 4.23 + i * .055], '#dcaa67');
    slice.rotation.z = Math.PI / 2; slice.visible = false; return slice;
  });
  const knife = new THREE.Group(); knife.name = 'KitchenKnife';
  const handle = box('KnifeHandle', [.045, .045, .14], [0, 0, 0], '#8a7252'); knife.add(handle);
  const blade = box('KnifeBlade', [.014, .055, .22], [0, .025, -.19], '#b9c5ba'); knife.add(blade); room.add(knife);
  const vegetableBowl = cylinder('VegetableBowl', .18, .12, [5.63, .58, 3.92], '#d4b38a');
  for (let i = 0; i < 4; i++) sphere('KitchenVegetable', [.08, .08, .08], [5.53 + i % 2 * .13, .67 + Math.floor(i / 2) * .035, 3.91 + Math.floor(i / 2) * .07], i % 2 ? '#c38a63' : '#8e9c66');
  collectSince(prepStart, 'ChopVegetables'); stationParts.ChopVegetables.push(vegetableBowl);

  const soupStart = room.children.length;
  box('KitchenHob', [.70, .025, .58], [6.65, .53, 4.12], '#596c60');
  const burner = cylinder('SoupBurner', .21, .018, [6.65, .555, 4.16], '#8d7156');
  const pot = cylinder('SoupPot', .20, .06, [6.65, .595, 4.16], '#be9f78');
  cylinder('SoupSurface', .183, .006, [6.65, .628, 4.16], '#d7b674');
  for (const side of [-1, 1]) box('SoupPotHandle', [.13, .03, .07], [6.65 + side * .23, .605, 4.16], '#8f7957');
  for (let i = 0; i < 5; i++) sphere('SoupVegetable', [.025, .008, .02], [6.65 + Math.sin(i * 2) * .12, .633, 4.16 + Math.cos(i * 2) * .12], i % 2 ? '#9daa70' : '#d49655');
  const spoon = new THREE.Group(); spoon.name = 'KitchenSpoon'; room.add(spoon);
  const spoonShaft = cylinder('SpoonHandle', .010, 1, [0, 0, 0], '#a4875e'); spoon.add(spoonShaft);
  const spoonBowl = sphere('SpoonBowl', [.055, .016, .075], [0, 0, 0], '#b59b71'); spoon.add(spoonBowl);
  collectSince(soupStart, 'CookSoup'); stationParts.CookSoup.push(pot);

  const ovenStart = room.children.length, ovenX = 8.05;
  // Open cavity: the cookies are actual geometry behind the window.
  box('OvenBack', [.98, .58, .07], [ovenX, .82, 3.74], '#626f62');
  for (const dx of [-.465, .465]) box('OvenSide', [.05, .58, .72], [ovenX + dx, .82, 4.08], '#d1baa0');
  for (const y of [.55, 1.09]) box('OvenCase', [.98, .055, .72], [ovenX, y, 4.08], '#d1baa0');
  box('OvenControls', [.98, .13, .04], [ovenX, .60, 4.46], '#c5ae90');
  for (const dx of [-.445, .445]) box('OvenWindowFrame', [.07, .39, .04], [ovenX + dx, .85, 4.46], '#737a68');
  box('OvenHandle', [.70, .04, .05], [ovenX, 1.04, 4.50], '#8d7758');
  const glass = box('OvenGlass', [.81, .36, .014], [ovenX, .85, 4.47], '#a4b2a1');
  glass.material = new THREE.MeshStandardMaterial({ color: '#adbcaa', transparent: true, opacity: .13, depthWrite: false }); glass.castShadow = false;
  const knob = cylinder('OvenKnob', .045, .045, [ovenX - .18, .60, 4.50], '#7a8269'); knob.rotation.x = Math.PI / 2;
  const knobMark = box('OvenKnobMark', [.008, .027, .008], [ovenX - .18, .615, 4.526], '#f1e5c7');
  const light = sphere('OvenIndicator', [.025, .025, .012], [ovenX + .22, .60, 4.49], '#b4b68b');
  const tray = box('CookieTray', [.75, .025, .48], [ovenX, .71, 4.10], '#8f9684');
  const cookieMaterial = new THREE.MeshStandardMaterial({ color: '#e1cda1', roughness: .95 });
  for (let i = 0; i < 6; i++) {
    const cookie = cylinder('OvenCookie', .077, .035, [ovenX - .23 + i % 3 * .23, .744, 3.98 + Math.floor(i / 3) * .23], '#e1cda1'); cookie.material = cookieMaterial;
    for (let dot = 0; dot < 3; dot++) sphere('ChocolateChip', [.012, .008, .012], [cookie.position.x + Math.sin(dot * 2) * .04, .765, cookie.position.z + Math.cos(dot * 2) * .04], '#8d7052');
  }
  collectSince(ovenStart, 'BakeCookies'); stationParts.BakeCookies.push(tray);

  box('KitchenShelf', [3.75, .065, .30], [6.65, 1.35, 3.52], '#bba17c');
  for (let i = 0; i < 5; i++) {
    const x = 5.15 + i * .35;
    cylinder('KitchenJar', .09, .21, [x, 1.49, 3.51], i % 2 ? '#d7b38a' : '#eee0bd');
    cylinder('KitchenJarLid', .10, .035, [x, 1.61, 3.51], '#967c58');
  }
  for (let i = 0; i < 3; i++) box('KitchenRecipeBook', [.08, .30, .20], [7.38 + i * .11, 1.53, 3.52], ['#8b9d80', '#c5967c', '#d8c398'][i]!);
  box('KitchenSinkCabinet', [.70, .67, 1.20], [8.72, .355, 7.40], '#a7b398');
  box('KitchenSinkTop', [.78, .06, 1.30], [8.72, .72, 7.40], '#dfd2b5');
  box('KitchenSink', [.52, .015, .65], [8.70, .758, 7.40], '#7f9b91');
  const faucet = new THREE.Mesh(new THREE.TorusGeometry(.13, .021, 8, 20, Math.PI), material('#a4ad97'));
  faucet.name = 'KitchenFaucet'; faucet.position.set(8.87, .91, 7.38); faucet.rotation.y = Math.PI / 2; room.add(faucet);
  box('KitchenFridge', [.72, 1.70, 1.05], [8.68, .85, 8.83], '#e0d8bd');
  box('KitchenFridgeDoor', [.035, 1.08, .96], [8.30, 1.12, 8.83], '#e9dfc4');
  box('KitchenFreezerDoor', [.035, .44, .96], [8.30, .34, 8.83], '#d9d2b6');
  box('KitchenFridgeHandle', [.045, .38, .045], [8.26, 1.07, 9.17], '#9d9477');
  box('FridgeNote', [.006, .20, .18], [8.277, 1.40, 8.77], '#d5ab7c');
  cylinder('BreakfastTableTop', .56, .065, [6.95, .75, 8.48], '#d3b68d');
  cylinder('BreakfastTableLeg', .075, .70, [6.95, .365, 8.48], '#a68b66');
  for (const x of [6.15, 7.74]) {
    box('BreakfastStoolSeat', [.44, .08, .44], [x, .40, 8.48], '#b7c0a2');
    for (const dx of [-.14, .14]) for (const dz of [-.14, .14]) box('BreakfastStoolLeg', [.055, .36, .055], [x + dx, .18, 8.48 + dz], '#ab9370');
  }
  box('BreakfastNapkin', [.36, .008, .40], [6.92, .788, 8.48], '#eee3c7');
  cylinder('BreakfastPlate', .17, .025, [6.92, .805, 8.48], '#e4dcc3');
  sphere('BreakfastBread', [.13, .065, .09], [6.92, .85, 8.48], '#bf9764');
  cylinder('KitchenMug', .07, .14, [7.22, .85, 8.37], '#9baa90');
  const steam = new THREE.Group(); steam.name = 'KitchenSteam'; room.add(steam);
  const steamMaterial = new THREE.MeshBasicMaterial({ color: '#fff8df', transparent: true, opacity: .20, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 6), steamMaterial); puff.raycast = () => {}; steam.add(puff);
  }
  // Click only visible surfaces, including nested utensils and transparent fronts.
  const kitchenParts = Object.fromEntries(Object.entries(stationParts).map(([kind, objects]) => {
    const parts: THREE.Object3D[] = [];
    for (const object of objects) object.traverse(part => { if (part instanceof THREE.Mesh && !parts.includes(part)) {
      part.raycast = function(raycaster, hits) {
        let ancestor: THREE.Object3D | null = this; while (ancestor?.visible) ancestor = ancestor.parent;
        if (!ancestor) THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
      }; parts.push(part);
    } }); return [kind, parts];
  })) as Record<KitchenAction, THREE.Object3D[]>;
  let wasBaking = false;
  const update = (dt: number, reducedMotion: boolean, activity: KitchenSnapshot | null) => {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const chop = kitchenMotion(activity, 'ChopVegetables'), soup = kitchenMotion(activity, 'CookSoup');
    knife.position.copy(chop.right);
    const tip = new THREE.Vector3(6.65 + Math.sin(soup.t * 1.5) * .07 * soup.p, .641, 4.16 + Math.cos(soup.t * 1.5) * .07 * soup.p);
    spoonShaft.position.copy(soup.right).add(tip).multiplyScalar(.5); spoonShaft.scale.y = soup.right.distanceTo(tip);
    spoonShaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(soup.right).normalize()); spoonBowl.position.copy(tip);
    const chopping = activity?.kind === 'ChopVegetables';
    if (chopping) {
      const count = Math.min(6, Math.max(0, Math.floor((activity.motionTime - .15) / 1.3)));
      slices.forEach((slice, i) => { slice.visible = i < count; });
      carrot.visible = count < 6; carrot.scale.y = Math.max(.01, 1 - count / 6); carrot.position.x = 5.25 - count * .025;
    }
    const cooking = activity?.kind === 'CookSoup' && activity.phase === 'active';
    burner.material.emissive.set(cooking ? '#b66e35' : '#000000'); burner.material.emissiveIntensity = .5;
    steam.visible = cooking;
    steam.children.forEach((puff, i) => {
      const rise = reducedMotion ? i / 6 : (soup.t * .35 + i / 6) % 1;
      puff.position.set(6.65 + Math.sin(i * 2 + (reducedMotion ? 0 : soup.t)) * .07, .74 + rise * .43, 4.16 + Math.cos(i * 2) * .07);
      puff.scale.setScalar(.5 + rise);
    });
    const baking = activity?.kind === 'BakeCookies';
    if (baking && !wasBaking) cookieMaterial.color.set('#e1cda1');
    const heating = baking && activity.phase === 'active' && activity.motionTime >= 1.2 && activity.motionTime < 10.5;
    if (baking) cookieMaterial.color.copy(new THREE.Color('#e1cda1')).lerp(new THREE.Color('#bc8a4f'), THREE.MathUtils.smootherstep(activity.motionTime, 1.2, 10.5));
    light.material.emissive.set(heating ? '#df9e52' : '#000000'); light.material.emissiveIntensity = .7;
    knobMark.rotation.z = baking ? -.7 * activity.pose : 0;
    wasBaking = baking;
  };
  update(.001, true, null); scene.updateMatrixWorld(true);
  return { kitchenParts, update, textures: [tiles] };
}
