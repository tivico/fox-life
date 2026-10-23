import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createBroom, createYarnBall } from './dailyVisual.ts';
import { CLEAN_STORAGE } from './daily.ts';
import { createRoomAtmosphere } from './RoomAtmosphere.ts';

// Pure data textures also work in the Node geometry regressions, without a DOM.
function pattern(width: number, height: number, pixel: (x: number, y: number) => number[]) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    data.set([...pixel(x, y), 255], (y * width + x) * 4);
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function dressRoom(scene: THREE.Scene, surfaces: {
  floor: THREE.MeshStandardMaterial; rug: THREE.MeshStandardMaterial;
  mattress: THREE.MeshStandardMaterial; window: THREE.MeshStandardMaterial;
}) {
  surfaces.floor.color.set('#ffffff');
  surfaces.floor.map = pattern(256, 256, (x, y) => {
    const row = Math.floor(y / 24);
    const seam = y % 24 < 1 || (x + (row % 3) * 77) % 156 < 1;
    const grain = Math.sin(x * .15 + Math.sin(y * .23)) * 1.5 + Math.sin(y * 4.1 + x * .12) * 1.2;
    const tone = (row % 3 - 1) * 3 + grain;
    return seam ? [171, 148, 117] : [211 + tone, 188 + tone, 151 + tone];
  });
  surfaces.rug.color.set('#ffffff');
  surfaces.rug.map = pattern(256, 192, (x, y) => {
    const edge = Math.min(x, 255 - x, y, 191 - y);
    const weave = (x % 3 === 0 ? -5 : 0) + (y % 3 === 0 ? 3 : 0);
    const diamond = Math.abs((x % 48) - 24) + Math.abs((y % 48) - 24);
    const cream = edge < 7 || (edge > 13 && edge < 17) || (edge > 25 && diamond < 7);
    return (cream ? [229, 212, 177] : [182, 117, 91]).map(v => v + weave);
  });
  surfaces.mattress.color.set('#ffffff');
  surfaces.mattress.map = pattern(96, 192, (x, y) => {
    if (y > 153) return [231, 224, 203];
    const seam = x % 24 < 1 || y % 24 < 1;
    const alternate = (Math.floor(x / 24) + Math.floor(y / 24)) % 2;
    return seam ? [199, 203, 171] : alternate ? [149, 165, 128] : [216, 216, 181];
  });
  surfaces.window.color.set('#ffffff');
  surfaces.window.emissive.set('#6c938e');
  surfaces.window.emissiveIntensity = .15;
  surfaces.window.map = pattern(192, 144, (x, y) => {
    const u = x / 192, v = y / 144;
    if (v < .16 + Math.sin(u * 10) * .06) return [113, 143, 112];
    if (v < .29 + Math.sin(u * 7 + 1.5) * .10) return [151, 174, 139];
    if ((u - .73) ** 2 + (v - .75) ** 2 < .009) return [249, 223, 157];
    return [162 + v * 13, 196 + v * 10, 191 + v * 6];
  });

  const decor = new THREE.Group();
  decor.name = 'HomeDetails';
  scene.add(decor);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .94 }));
    return materials.get(color)!;
  }
  const sphereGeometry = new THREE.SphereGeometry(1, 12, 8);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  function mesh(name: string, geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) {
    const part = new THREE.Mesh(geometry, material(color));
    part.name = name;
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    decor.add(part);
    return part;
  }
  function box(name: string, w: number, h: number, d: number, color: string, x: number, y: number, z: number, radius = .035) {
    return mesh(name, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), color, x, y, z);
  }
  function sphere(name: string, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const part = mesh(name, sphereGeometry, color, x, y, z);
    part.scale.set(sx, sy, sz);
    return part;
  }
  function cylinder(name: string, color: string, x: number, y: number, z: number, r: number, height: number) {
    const part = mesh(name, cylinderGeometry, color, x, y, z);
    part.scale.set(r, height, r);
    return part;
  }
  function plant(x: number, z: number, scale: number, potColor: string) {
    mesh('TerracottaPot', new THREE.CylinderGeometry(.23 * scale, .17 * scale, .34 * scale, 16), potColor, x, .17 * scale, z);
    cylinder('PotRim', potColor, x, .32 * scale, z, .25 * scale, .065 * scale);
    cylinder('PotSoil', '#6f644b', x, .355 * scale, z, .205 * scale, .008);
    cylinder('PlantStem', '#6e8051', x, .68 * scale, z, .026 * scale, .66 * scale);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const leaf = sphere('PlantLeaf', ['#6e8857', '#91a36a', '#a4ae78'][i % 3]!,
        x + Math.cos(a) * .19 * scale, (.55 + i * .075) * scale, z + Math.sin(a) * .19 * scale,
        .12 * scale, .27 * scale, .075 * scale);
      leaf.rotation.set(Math.sin(a) * .6, a, Math.cos(a) * -.6);
    }
  }

  // Wainscot trim and a soft plaster cap retain the open dollhouse silhouette.
  box('BackWallCap', 9.15, .08, .24, '#e9e2cb', -.4, .94, -3.1);
  box('LeftWallCap', .16, .08, 6.3, '#e9e2cb', -4.9, .94, 0);
  box('BackSkirting', 8.8, .09, .04, '#ddd9bf', -.4, .08, -2.99);
  box('LeftSkirting', .025, .09, 6.0, '#ddd9bf', -4.84, .08, 0);
  for (let x = -4.5; x < 4; x += .65) box('WallPanel', .025, .69, .025, '#9eae93', x, .46, -2.99, .005);
  for (let z = -2.6; z < 3; z += .65) box('WallPanel', .025, .69, .025, '#9eae93', -4.84, .46, z, .005);

  // Linen curtains frame the window without entering its clickable glass.
  const rod = cylinder('CurtainRail', '#988365', 0, 2.84, -2.91, .035, 3.68);
  rod.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    sphere('CurtainFinial', '#b99b70', side * 1.88, 2.84, -2.91, .075, .075, .075);
    for (let fold = 0; fold < 5; fold++) {
      const x = side * (1.35 + fold * .095);
      box('LinenCurtain', .125, 1.79 + (fold % 2) * .035, .09, fold % 2 ? '#e7dbc1' : '#f4e7cc', x, 1.87, -2.81 + (fold % 2) * .05, .04);
    }
    box('CurtainTie', .52, .09, .15, '#bfa680', side * 1.54, 1.59, -2.72);
  }

  // A small dresser of found treasures, safely behind all walking anchors.
  box('KeepsakeDresser', 1.45, .6, .53, '#b18b68', -2.73, .36, -2.6, .055);
  box('DresserTop', 1.54, .08, .6, '#dcc29a', -2.73, .7, -2.6);
  for (const y of [.22, .46]) {
    box('DresserDrawer', 1.3, .19, .03, '#c5a47c', -2.73, y, -2.316);
    sphere('BrassKnob', '#9e8254', -2.73, y, -2.28, .04, .04, .035);
  }
  // Framed pressed-leaf artwork; all pieces face into the house.
  box('KeepsakeFrame', .5, .61, .055, '#9a7858', -2.94, 1.08, -2.65);
  box('PaperInFrame', .42, .52, .015, '#f2e5c9', -2.94, 1.08, -2.614, .005);
  const pressedLeaf = sphere('PressedLeaf', '#9aab75', -2.94, 1.1, -2.6, .09, .16, .008);
  pressedLeaf.rotation.z = -.4;
  cylinder('ButtonDish', '#e8d4ad', -2.37, .765, -2.55, .15, .04);
  cylinder('FoundButton', '#88a9a2', -2.37, .796, -2.55, .085, .02);
  for (const dx of [-.025, .025]) for (const dz of [-.025, .025]) cylinder('ButtonHole', '#537976', -2.37 + dx, .808, -2.55 + dz, .012, .002);
  plant(-3.59, -1.88, .77, '#bf8567');
  plant(3.45, -2.39, 1.1, '#d2b17f');

  // A bedside lamp and a stack of well-loved books.
  cylinder('BedsideTable', '#c6aa80', -3.43, .48, -1.04, .29, .08);
  cylinder('BedsideTableLeg', '#9c8260', -3.43, .23, -1.04, .065, .45);
  cylinder('LampFoot', '#e4c08d', -3.43, .55, -1.04, .12, .06);
  cylinder('LampStem', '#b79767', -3.43, .76, -1.04, .025, .4);
  const shade = mesh('BedsideLampshade', new THREE.CylinderGeometry(.16, .26, .3, 20), '#f5dfaa', -3.43, 1.02, -1.04);
  const lampMaterial = material('#f5dfaa');
  lampMaterial.emissive.set('#edb957'); lampMaterial.emissiveIntensity = .35;
  shade.material = lampMaterial;
  const glow = new THREE.PointLight('#ffd492', 1.3, 2.8, 2);
  glow.position.set(-3.43, .93, -1.04); decor.add(glow);

  // Books live on top of the existing shelf, away from the reading pose.
  for (let i = 0; i < 3; i++) {
    const book = box('StackedBook', .44 - i * .035, .065, .6 - i * .04, ['#b77d61', '#dbc5a1', '#8e9f84'][i]!, 3.51, 1.72 + i * .07, -.42 + i * .035, .012);
    book.rotation.y = (i - 1) * .12;
  }
  // The dining corner has a tiny ceramic cup, without blocking the food target.
  cylinder('CupSaucer', '#d9c6a4', 3.53, .675, 1.91, .13, .025);
  cylinder('TeaCup', '#c69a78', 3.53, .765, 1.91, .085, .16);
  cylinder('TeaSurface', '#745d43', 3.53, .849, 1.91, .068, .003);
  const handle = mesh('CupHandle', new THREE.TorusGeometry(.052, .017, 6, 12), '#c69a78', 3.63, .78, 1.91);
  handle.rotation.y = Math.PI / 2;
  // A woven hamper fills the rear corner with a soft domestic silhouette.
  cylinder('WovenHamper', '#bda57d', 2.63, .23, -2.67, .3, .45);
  for (const y of [.12, .24, .36, .46]) {
    const rim = mesh('HamperWeave', new THREE.TorusGeometry(.3, .018, 4, 20), '#d6c29b', 2.63, y, -2.67);
    rim.rotation.x = Math.PI / 2;
  }
  sphere('HamperLinen', '#e1dac0', 2.63, .46, -2.67, .27, .11, .27);
  const broom = createBroom(); broom.name = 'RoomBroom'; broom.position.fromArray(CLEAN_STORAGE.tool); broom.scale.setScalar(.76); decor.add(broom);
  const yarn = createYarnBall(); yarn.name = 'RoomYarn'; yarn.position.set(3.51, 1.81, .12); decor.add(yarn);
  const parts = (group: THREE.Group) => {
    const meshes: THREE.Object3D[] = [];
    group.traverse(part => { if (part instanceof THREE.Mesh) {
      part.castShadow = true; meshes.push(part);
      part.raycast = function(raycaster, hits) {
        if (group.visible) THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
      };
    } });
    return meshes;
  };
  const atmosphere = createRoomAtmosphere(scene);
  return { cleanParts: parts(broom), playParts: parts(yarn), atmosphere,
    diningDetails: decor.children.filter(part => ['CupSaucer', 'TeaCup', 'TeaSurface', 'CupHandle'].includes(part.name)),
    textures: [surfaces.floor.map, surfaces.rug.map, surfaces.mattress.map, surfaces.window.map] };
}
