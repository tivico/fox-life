import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUP_PARK, type LivingAction, type LivingSnapshot } from './LivingActivity.ts';
import { createTeaCup, createRemote, REMOTE_PARK } from './LivingVisual.ts';

export function createLivingRoom(scene: THREE.Scene, floor: THREE.MeshStandardMaterial, kitchen = false) {
  const room = new THREE.Group(); room.name = 'LivingRoom'; scene.add(room);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .94 }));
    return materials.get(color)!;
  };
  function box(name: string, size: [number, number, number], at: [number, number, number], color: string, radius = .035) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(n => n / 3))), material(color));
    mesh.name = name; mesh.position.fromArray(at); mesh.castShadow = true; mesh.receiveShadow = true; room.add(mesh); return mesh;
  }
  function sphere(name: string, at: [number, number, number], scale: [number, number, number], color: string) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material(color));
    mesh.name = name; mesh.position.fromArray(at); mesh.scale.fromArray(scale); mesh.castShadow = true; room.add(mesh); return mesh;
  }
  function cylinder(name: string, at: [number, number, number], radius: number, height: number, color: string) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), material(color));
    mesh.name = name; mesh.position.fromArray(at); mesh.castShadow = true; mesh.receiveShadow = true; room.add(mesh); return mesh;
  }
  const base = box('LivingRoomFloor', [8.4, .3, 6.4], [0, -.15, 6.4], '#c2b5a3'); base.material = floor;
  const carpet = box('LivingRoomRug', [4.7, .008, 3.8], [0, -.003, 6.3], '#a8b29a');
  const pixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const edge = Math.min(x, y, 127 - x, 127 - y);
    const border = edge > 5 && edge < 8 || edge > 11 && edge < 13;
    const weave = (x + y) % 2 ? 3 : -3;
    const color = border ? [229, 222, 190] : [151, 167, 132];
    pixels.set([...color.map(channel => channel + weave), 255], (y * 128 + x) * 4);
  }
  const textile = new THREE.DataTexture(pixels, 128, 128); textile.colorSpace = THREE.SRGBColorSpace;
  textile.magFilter = THREE.LinearFilter; textile.minFilter = THREE.LinearMipmapLinearFilter;
  textile.generateMipmaps = true; textile.needsUpdate = true;
  carpet.material.map = textile; carpet.material.color.set('#ffffff'); carpet.material.roughness = 1;
  for (const x of [-2.85, 2.85]) {
    box('RoomDivider', [2.7, 1.5, .18], [x, .75, 3.2], '#b7bba5');
    box('DividerCap', [2.7, .08, .25], [x, 1.54, 3.2], '#e9e2cb');
  }
  for (const x of [-1.48, 1.48]) box('DoorwayPost', [.12, 1.64, .25], [x, .82, 3.2], '#eee3cc');
  box('DoorwayThreshold', [2.84, .006, .23], [0, -.004, 3.2], '#d8c5a1');
  box('LivingLeftWall', [.18, .9, 6.3], [-4.1, .45, 6.4], '#c1b4a2');
  box('LivingWallCap', [.24, .08, 6.3], [-4.1, .94, 6.4], '#e9e2cb');
  if (kitchen) box('LivingRightEdge', [.18, .18, 4.45], [4.1, .09, 5.475], '#d6cbb9');
  else box('LivingRightEdge', [.18, .18, 6.3], [4.1, .09, 6.4], '#d6cbb9');
  box('LivingFrontEdge', [8.4, .18, .18], [0, .09, 9.5], '#d6cbb9');

  const loungeParts: THREE.Object3D[] = [];
  const sofaStart = room.children.length;
  const sofa = (name: string, size: [number, number, number], at: [number, number, number], color: string, radius = .1) => {
    const mesh = box(name, size, at, color, radius); loungeParts.push(mesh); return mesh;
  };
  for (const x of [-1.8, 1.8]) for (const z of [8.2, 9.0]) box('SofaFoot', [.12, .22, .12], [x, .11, z], '#99795c');
  sofa('SofaBase', [4.0, .32, 1.18], [0, .33, 8.65], '#8e9e83');
  sofa('SofaBack', [4.0, .95, .25], [0, .8, 9.14], '#9daa8b');
  for (const x of [-1.98, 1.98]) sofa('SofaArm', [.28, .65, 1.25], [x, .64, 8.65], '#a6b396');
  for (const x of [-1.2, 0, 1.2]) sofa('SofaCushion', [1.14, .22, .95], [x, .59, 8.57], '#bac6a7');
  const pillow = sofa('SofaPillow', [.65, .55, .24], [-1.32, .99, 8.94], '#ddc0a0'); pillow.rotation.z = -.18;
  const pillow2 = sofa('SofaPillow', [.6, .5, .24], [1.28, .96, 8.12], '#e8dfc6'); pillow2.rotation.z = .17;
  const throwBlanket = sofa('SofaThrow', [.72, .035, .94], [.97, .72, 8.53], '#bd8d77', .012);
  for (let i = 0; i < 8; i++) {
    const stitch = box('ThrowStitch', [.012, .006, .83], [.68 + i * .08, .743, 8.53], '#dcb9a1');
    stitch.position.sub(throwBlanket.position); throwBlanket.add(stitch);
  }
  const sofaGroup = new THREE.Group(); sofaGroup.name = 'LivingSofa';
  for (const part of room.children.slice(sofaStart)) { part.position.z -= 8.65; sofaGroup.add(part); }
  sofaGroup.rotation.y = -Math.PI / 2; sofaGroup.position.set(-3.28, 0, 6.4); room.add(sofaGroup);
  const blanketRestZ = throwBlanket.position.z;

  // The cup and book share the TV cabinet; keep the floor clear of a coffee table.
  box('LivingBook', [.33, .055, .45], [2.73, .7675, 5.97], '#b07d65');
  box('LivingBookPages', [.31, .024, .42], [2.73, .795, 5.97], '#f0e4c9');
  const saucer = cylinder('LivingCupSaucer', [CUP_PARK.x, .75, CUP_PARK.z], .13, .025, '#e9d9bc');
  const parkedCup = createTeaCup(); parkedCup.name = 'ParkedTeaCup'; parkedCup.position.copy(CUP_PARK); room.add(parkedCup);
  const parkedRemote = createRemote(); parkedRemote.name = 'ParkedRemote'; parkedRemote.position.copy(REMOTE_PARK); room.add(parkedRemote);

  cylinder('FloorLampFoot', [-3.3, .045, 9.0], .3, .09, '#aa8b64');
  cylinder('FloorLampStem', [-3.3, .95, 9.0], .035, 1.8, '#a9916a');
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.27, .43, .48, 24), material('#efdfb7'));
  shade.name = 'LivingLampShade'; shade.position.set(-3.3, 1.95, 9.0); room.add(shade);
  shade.material.emissive.set('#b28b4f'); shade.material.emissiveIntensity = .24;
  cylinder('LivingPlantPot', [1.5, .23, 9.05], .28, .46, '#c29975');
  cylinder('LivingPlantStem', [1.5, .77, 9.05], .025, .7, '#73845e');
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    const leaf = sphere('PlantLeaf', [1.5 + Math.cos(angle) * .2, .65 + i * .1, 9.05 + Math.sin(angle) * .2], [.13, .28, .08], i % 2 ? '#99aa78' : '#788f65');
    leaf.rotation.set(Math.sin(angle) * .6, angle, Math.cos(angle) * .6);
  }
  const cabinetStart = room.children.length;
  box('LivingSideboard', [.65, .58, 1.8], [-3.46, .32, 5.7], '#ad8868');
  box('LivingSideboardTop', [.74, .075, 1.9], [-3.46, .65, 5.7], '#d8bc98');
  for (const z of [5.27, 6.13]) {
    box('LivingCabinetDoor', [.025, .43, .8], [-3.12, .34, z], '#bb9d79');
    sphere('LivingCabinetKnob', [-3.09, .38, z], [.03, .03, .03], '#96794e');
  }
  for (let i = 0; i < 4; i++) box('LivingRecord', [.45, .065, .64], [-3.45, .73 + i * .065, 5.33], ['#728c7e', '#bd8e77', '#e2c898', '#8b9673'][i]!);
  const frame = box('LivingPictureFrame', [.06, .72, .57], [-3.43, 1.08, 6.25], '#96795a'); frame.rotation.z = .07;
  box('LivingPicturePaper', [.012, .6, .45], [-3.391, 1.08, 6.25], '#f0e4ca');
  sphere('LivingPictureSun', [-3.381, 1.15, 6.25], [.008, .13, .13], '#c9ab70');
  const cabinet = new THREE.Group(); cabinet.name = 'LivingCabinet';
  for (const part of room.children.slice(cabinetStart)) { part.position.x += 3.46; part.position.z -= 5.7; cabinet.add(part); }
  cabinet.rotation.y = -Math.PI / 2; cabinet.position.set(3, 0, 3.7); room.add(cabinet);

  const tvStart = room.children.length;
  box('TVStand', [1.95, .69, .9], [0, .39, .15], '#b2916d');
  for (const x of [-.7, .7]) box('TVStandLeg', [.09, .14, .36], [x, .07, 0], '#90724f');
  for (const x of [-.47, .47]) {
    box('TVStandDoor', [.88, .51, .025], [x, .39, .6125], '#c6a782');
    sphere('TVStandHandle', [x, .42, .638], [.025, .025, .02], '#90724f');
  }
  box('TVFoot', [.55, .035, .3], [0, .61, .025], '#535e54');
  box('TVNeck', [.13, .18, .1], [0, .7, -.025], '#535e54');
  box('Television', [1.8, 1.08, .12], [0, 1.31, 0], '#525c53', .055);
  box('TVScreen', [1.63, .89, .012], [0, 1.34, .068], '#34443c', .015);
  const program = new THREE.Group(); program.name = 'TVProgram';
  const sky = box('TVProgramSky', [1.59, .85, .004], [0, 1.34, .078], '#b7d2c7', .001); program.add(sky);
  const hill = sphere('TVProgramHill', [-.31, .91, .083], [.75, .3, .006], '#8aab7f'); program.add(hill);
  const hill2 = sphere('TVProgramHill', [.47, .97, .086], [.7, .27, .006], '#a9bb86'); program.add(hill2);
  for (const object of [hill, hill2]) {
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      positions.setX(i, (THREE.MathUtils.clamp(positions.getX(i) * object.scale.x + object.position.x, -.79, .79) - object.position.x) / object.scale.x);
      positions.setY(i, (Math.max(.925, positions.getY(i) * object.scale.y + object.position.y) - object.position.y) / object.scale.y);
    }
    object.geometry.computeVertexNormals();
  }
  const sun = sphere('TVProgramSun', [.45, 1.53, .088], [.105, .105, .005], '#e8ce8e'); program.add(sun);
  const clouds = [-.48, .1].map((x, i) => {
    const cloud = sphere('TVProgramCloud', [x, 1.56 - i * .14, .09], [.15, .045, .005], '#f4ecd8'); program.add(cloud); return cloud;
  });
  const tv = new THREE.Group(); tv.name = 'LivingTelevision';
  for (const part of room.children.slice(tvStart)) {
    if (!part.name.startsWith('TVStand')) part.position.y += .16;
    tv.add(part);
  }
  program.position.y += .16;
  tv.add(program); tv.position.set(3.13, 0, 6.65); tv.rotation.y = -Math.PI / 2; room.add(tv);
  program.visible = false;
  program.traverse(object => { if (object instanceof THREE.Mesh) {
    const original = object.material as THREE.MeshStandardMaterial;
    object.material = new THREE.MeshBasicMaterial({ color: original.color }); object.castShadow = false; object.receiveShadow = false;
  } });

  const radio = new THREE.Group(); radio.name = 'LivingRadio';
  const radioStart = room.children.length;
  box('RadioCase', [.52, .31, .22], [3.1, .9, 3.74], '#c19b70');
  for (const x of [2.95, 3.23]) {
    const speaker = cylinder('RadioSpeaker', [x, .9, 3.861], .08, .012, '#6a705c'); speaker.rotation.x = Math.PI / 2;
  }
  const radioLight = sphere('RadioLight', [3.1, 1.005, 3.865], [.024, .012, .012], '#e1c795');
  for (const part of room.children.slice(radioStart)) radio.add(part); room.add(radio);
  const notes = new THREE.Group(); notes.name = 'RadioNotes'; room.add(notes);
  for (let i = 0; i < 3; i++) {
    const note = new THREE.Group(); note.position.set(2.9 + i * .18, 1.27 + i * .12, 3.77);
    const dot = sphere('MusicNote', [0, 0, 0], [.04, .025, .018], '#a4865e'); note.add(dot);
    const stem = box('MusicStem', [.012, .13, .018], [.035, .055, 0], '#a4865e', .003); note.add(stem); notes.add(note);
  }
  notes.traverse(object => { if (object instanceof THREE.Mesh) object.raycast = () => {}; });
  const mat = box('ExerciseMat', [1.75, .008, 1.35], [.35, .007, 6.35], '#d1b594', .003);
  mat.castShadow = false;
  const collect = (object: THREE.Object3D) => {
    const parts: THREE.Object3D[] = [];
    object.traverse(part => { if (part instanceof THREE.Mesh) {
      parts.push(part);
      part.raycast = function(raycaster, hits) {
        let ancestor: THREE.Object3D | null = this;
        while (ancestor?.visible) ancestor = ancestor.parent;
        if (!ancestor) THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
      };
    } }); return parts;
  };
  const livingParts: Record<LivingAction, THREE.Object3D[]> = {
    WatchTV: [...collect(tv), ...collect(parkedRemote)],
    SofaRest: loungeParts.filter(part => !['SofaPillow', 'SofaThrow'].includes(part.name)),
    Tea: [saucer, ...collect(parkedCup)], Exercise: [mat], Music: collect(radio),
    TidySofa: [pillow, pillow2, ...collect(throwBlanket)],
  };
  let tidyTime = 0, wasTidying = false, tidyBlend = 0;
  const update = (dt: number, reducedMotion: boolean, activity: LivingSnapshot | null) => {
    const tvOn = activity?.kind === 'WatchTV' && (activity.phase === 'active' && activity.elapsed >= .25
      || activity.phase === 'finish' && activity.motionTime >= .25 && activity.pose > .8);
    program.visible = tvOn;
    parkedRemote.visible = !(activity?.kind === 'WatchTV' && activity.pose > .55);
    parkedCup.visible = !(activity?.kind === 'Tea' && activity.phase !== 'approach');
    if (tvOn && !reducedMotion) clouds.forEach((cloud, i) => { cloud.position.x = [-.48, .1][i]! + Math.sin(activity.motionTime * .3 + i) * .1; });
    const listening = activity?.kind === 'Music' && activity.phase === 'active';
    notes.visible = listening && !reducedMotion;
    (radioLight.material as THREE.MeshStandardMaterial).emissive.set(listening ? '#ac8c43' : '#000000');
    if (notes.visible) notes.children.forEach((note, i) => { note.position.y = 1.27 + i * .12 + Math.sin(activity!.motionTime * 2 + i) * .04; });
    const tidying = activity?.kind === 'TidySofa' && activity.phase === 'active';
    if (tidying) { tidyTime = activity.motionTime; tidyBlend = Math.min(1, tidyTime / 7); }
    if (tidying || wasTidying) {
      pillow2.position.y = .96 + (tidying ? Math.max(0, Math.sin(tidyTime * Math.PI * 1.3)) * .045 : 0);
      pillow2.rotation.z = .17 * (1 - tidyBlend);
      throwBlanket.scale.z = 1 - .32 * tidyBlend;
      throwBlanket.position.z = blanketRestZ + .12 * tidyBlend;
    }
    wasTidying = tidying;
    void dt;
  };
  update(0, false, null);
  scene.updateMatrixWorld(true);
  return { loungeParts, livingParts, update, textures: [textile] };
}
