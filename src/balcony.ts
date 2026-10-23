import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CAN_PARK, type GardenAction, type GardenSnapshot } from './GardenActivity.ts';
import { createWateringCan, gardenPour } from './GardenVisual.ts';

export function createBalcony(scene: THREE.Scene) {
  const room = new THREE.Group(); room.name = 'Balcony'; scene.add(room);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .92 }));
    return materials.get(color)!;
  };
  function box(name: string, size: [number, number, number], at: [number, number, number], color: string) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, Math.min(.035, ...size.map(n => n / 3))), material(color));
    mesh.name = name; mesh.position.fromArray(at); mesh.castShadow = mesh.receiveShadow = true; room.add(mesh); return mesh;
  }
  function sphere(name: string, at: [number, number, number], scale: [number, number, number], color: string) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material(color));
    mesh.name = name; mesh.position.fromArray(at); mesh.scale.fromArray(scale); mesh.castShadow = true; room.add(mesh); return mesh;
  }
  function cylinder(name: string, at: [number, number, number], radius: number, height: number, color: string) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .85, height, 16), material(color));
    mesh.name = name; mesh.position.fromArray(at); mesh.castShadow = mesh.receiveShadow = true; room.add(mesh); return mesh;
  }
  box('BalconyFloor', [5, .3, 6.4], [6.7, -.15, 0], '#c4b49c');
  for (let z = -3.05; z < 3.1; z += .28) box('DeckPlank', [4.92, .016, .263], [6.7, -.005, z], z % .56 < .28 ? '#d8c6a6' : '#d1bf9f');
  box('BalconyBackRail', [4.95, .10, .15], [6.7, 1.02, -3.08], '#b2bca1');
  box('BalconySideRail', [.15, .10, 6.2], [9.1, 1.02, 0], '#b2bca1');
  box('BalconyFrontEdge', [5, .20, .18], [6.7, .10, 3.1], '#c4b49c');
  for (let x = 4.45; x < 9.1; x += .43) box('BalconyRailPost', [.065, .95, .065], [x, .5, -3.08], '#c4cbb2');
  for (let z = -2.8; z < 3.05; z += .43) box('BalconyRailPost', [.065, .95, .065], [9.1, .5, z], '#c4cbb2');
  for (const z of [1.80, 3.16]) box('GardenDoorPost', [.13, 2.1, .13], [4.13, 1.05, z], '#e6dfc9');
  box('GardenDoorLintel', [.15, .12, 1.5], [4.13, 2.10, 2.48], '#e6dfc9');
  box('GardenDoorTrack', [.16, .006, 1.28], [4.13, -.004, 2.48], '#b4b9a4');
  const glass = box('GardenDoorGlass', [.025, 1.75, .93], [4.13, 1.15, 1.25], '#bdd3c8');
  glass.material = new THREE.MeshStandardMaterial({ color: '#b8d3ca', transparent: true, opacity: .18, depthWrite: false, roughness: .15 });
  glass.castShadow = false;
  for (const x of [4.55, 8.9]) box('GardenFramePost', [.10, 2.45, .10], [x, 1.225, -2.92], '#d6c5a2');
  box('GardenFrameBeam', [4.55, .13, .13], [6.7, 2.43, -2.92], '#d6c5a2');
  const northGardenStart = room.children.length;
  box('FlowerPlanter', [2.4, .30, .68], [6, .17, -2.35], '#b48d70');
  box('FlowerPlanterRim', [2.48, .07, .76], [6, .32, -2.35], '#d2ad87');
  box('GardenSoil', [2.28, .008, .60], [6, .36, -2.35], '#75624a');
  const leaves: THREE.Mesh[] = [];
  function flowers(x: number, z: number, count: number) {
    for (let i = 0; i < count; i++) {
      const px = x + Math.sin(i * 4.4) * .36, pz = z + Math.cos(i * 3.2) * .14, y = .65 + i % 3 * .13;
      cylinder('FlowerStem', [px, y / 2 + .18, pz], .012, y - .36, '#71875b');
      for (const sign of [-1, 1]) {
        const leaf = sphere('GardenLeaf', [px + sign * .09, y - .13, pz], [.13, .045, .07], '#8b9e70');
        leaf.rotation.z = sign * .35; leaves.push(leaf);
      }
      sphere('FlowerCenter', [px, y, pz], [.045, .045, .045], '#bf9d56');
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5;
        sphere('GardenPetal', [px + Math.cos(angle) * .065, y + Math.sin(angle) * .065, pz], [.055, .05, .025], i % 2 ? '#e9cfad' : '#c9a4ad');
      }
    }
  }
  flowers(5.45, -2.35, 5); flowers(6.55, -2.35, 5);
  const waterPlants = room.children.slice(northGardenStart);
  const butterflyStart = room.children.length;
  cylinder('ButterflyFlowerPot', [8.55, .23, -.45], .30, .46, '#c7ad87');
  flowers(8.55, -.45, 4);
  const butterflyFlowers = room.children.slice(butterflyStart);
  const bench = new THREE.Group(); bench.name = 'GardenBench';
  const benchStart = room.children.length;
  box('GardenBenchSeat', [2.1, .16, .9], [7.5, .46, 1.75], '#b5bfa3');
  box('GardenBenchBack', [2.1, .65, .14], [7.5, .88, 2.17], '#b9c5ac');
  for (const x of [6.65, 8.35]) for (const z of [1.45, 2.02]) box('GardenBenchLeg', [.09, .40, .09], [x, .20, z], '#9c8865');
  for (const part of room.children.slice(benchStart)) bench.add(part); room.add(bench);
  box('GardenCanPost', [.07, .68, .07], [5.59, .34, -1.59], '#ad9471');
  box('GardenCanHook', [.30, .04, .09], [5.73, .67, -1.49], '#8b937e');
  const parkedCan = createWateringCan(); parkedCan.name = 'ParkedGardenCan'; parkedCan.position.copy(CAN_PARK); parkedCan.rotation.y = Math.PI; room.add(parkedCan);
  const butterfly = new THREE.Group(); butterfly.name = 'GardenButterfly'; room.add(butterfly);
  const wings = [-1, 1].map(side => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material('#dcbb84'));
    wing.scale.set(.14, .015, .10); wing.position.x = side * .10; butterfly.add(wing); return wing;
  });
  const insect = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), material('#766d53')); insect.scale.z = 2.3; butterfly.add(insect);
  butterfly.traverse(object => { if (object instanceof THREE.Mesh) object.raycast = () => {}; });
  const water = new THREE.Group(); water.name = 'GardenWaterDrops'; room.add(water);
  const dropGeometry = new THREE.SphereGeometry(.012, 6, 4), dropMaterial = material('#a5c7c1');
  for (let i = 0; i < 18; i++) { const drop = new THREE.Mesh(dropGeometry, dropMaterial); drop.scale.y = 1.7; drop.raycast = () => {}; water.add(drop); }
  const collect = (object: THREE.Object3D) => { const parts: THREE.Object3D[] = []; object.traverse(part => { if (part instanceof THREE.Mesh) parts.push(part); }); return parts; };
  const gardenParts: Record<GardenAction, THREE.Object3D[]> = {
    WaterPlants: [...waterPlants, ...collect(parkedCan)], WatchButterflies: butterflyFlowers, GardenRest: collect(bench),
  };
  let time = 0;
  const update = (dt: number, reducedMotion: boolean, activity: GardenSnapshot | null) => {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (!reducedMotion) time += Math.min(dt, .05);
    parkedCan.visible = !(activity?.kind === 'WaterPlants' && activity.pose > 0);
    butterfly.position.set(8.25 + Math.sin(time * .6) * .3, 1.25 + Math.sin(time * 1.1) * .14, -.5 + Math.cos(time * .5) * .35);
    wings.forEach((wing, i) => { wing.rotation.z = reducedMotion ? 0 : Math.sin(time * 11) * (i ? 1 : -1) * .65; });
    leaves.forEach((leaf, i) => { leaf.rotation.x = reducedMotion ? 0 : Math.sin(time * 1.2 + i) * .045; });
    water.visible = activity?.kind === 'WaterPlants' && activity.phase === 'active' && gardenPour(activity) > .3;
    const tip = scene.getObjectByName('HeldGardenCan')?.getObjectByName('WaterSpoutTip');
    if (water.visible && tip) {
      const origin = tip.getWorldPosition(new THREE.Vector3());
      water.children.forEach((drop, i) => {
        const fall = reducedMotion ? i / water.children.length : (activity!.motionTime * 1.4 + i / water.children.length) % 1;
        drop.position.copy(origin).add(new THREE.Vector3(Math.sin(i * 2.4) * fall * .045, (.365 - origin.y) * fall, -fall * .045));
      });
    } else water.visible = false;
  };
  update(.001, true, null); scene.updateMatrixWorld(true);
  return { gardenParts, update, butterfly, parkedCan };
}
