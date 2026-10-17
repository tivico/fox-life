import * as THREE from 'three';

/** Small authored props and bounded room motion; no changes to movement or target geometry. */
export function createRoomAtmosphere(scene: THREE.Scene) {
  const details = new THREE.Group(); details.name = 'RoomAtmosphere'; scene.add(details);
  const wood = new THREE.MeshStandardMaterial({ color: '#9d7756', roughness: .95 });
  const cream = new THREE.MeshStandardMaterial({ color: '#f3e7cd', roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#66775d', roughness: .95 });
  const brass = new THREE.MeshStandardMaterial({ color: '#bc9a66', roughness: .7 });
  function mesh(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Group = details) {
    const object = new THREE.Mesh(geometry, material); object.name = name; object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }
  function box(name: string, dimensions: [number, number, number], at: [number, number, number], material: THREE.Material, parent = details) {
    const object = mesh(name, new THREE.BoxGeometry(...dimensions), material, parent); object.position.fromArray(at); return object;
  }
  const clock = new THREE.Group(); clock.name = 'MantelClock'; clock.position.set(-2.35, 1.055, -2.76); details.add(clock);
  const clockCase = mesh('ClockCase', new THREE.CylinderGeometry(.245, .245, .15, 32), wood, clock);
  clockCase.rotation.x = Math.PI / 2;
  const face = mesh('ClockFace', new THREE.CylinderGeometry(.211, .211, .012, 32), cream, clock);
  face.rotation.x = Math.PI / 2; face.position.z = .081;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const tick = box('ClockHourMark', [.014, i % 3 ? .021 : .036, .008],
      [Math.sin(a) * .177, Math.cos(a) * .177, .091], dark, clock); tick.rotation.z = -a;
  }
  function hand(name: string, length: number, thickness: number) {
    const pivot = new THREE.Group(); pivot.name = name; pivot.position.z = .108; clock.add(pivot);
    box('ClockHand', [thickness, length, .012], [0, length / 2 - .025, 0], dark, pivot); return pivot;
  }
  const hour = hand('ClockHourHand', .113, .019), minute = hand('ClockMinuteHand', .16, .012);
  const pin = mesh('ClockPin', new THREE.SphereGeometry(.021, 10, 6), brass, clock); pin.position.z = .12;
  box('ClockPlinth', [.38, .055, .2], [0, -.263, 0], wood, clock);
  for (const [i, x] of [1.77, 2.32].entries()) {
    box('LittlePictureFrame', [.32, .39, .035], [x, .6, -2.97], wood);
    box('LittlePicturePaper', [.265, .335, .008], [x, .6, -2.946], cream);
    const leaf = mesh('LittlePictureLeaf', new THREE.SphereGeometry(1, 10, 8), dark);
    leaf.scale.set(.054, .105, .005); leaf.position.set(x, .61, -2.936); leaf.rotation.z = i ? -.4 : .4;
    box('LittlePictureStem', [.009, .19, .008], [x, .56, -2.935], brass);
  }
  const fringe = new THREE.InstancedMesh(new THREE.BoxGeometry(.018, .004, .12), cream, 62);
  fringe.name = 'RugFringe'; fringe.receiveShadow = true; details.add(fringe);
  const placement = new THREE.Matrix4();
  for (let side = 0; side < 2; side++) for (let i = 0; i < 31; i++)
    fringe.setMatrixAt(side * 31 + i, placement.makeTranslation(-1.73 + i * .115, -.002, side ? 1.82 : -1.12));
  fringe.instanceMatrix.needsUpdate = true;
  const linen = new THREE.MeshStandardMaterial({ color: '#b88c74', roughness: 1 });
  const napkin = box('FoldedLinenNapkin', [.13, .014, .25], [3.59, .672, 1.41], linen);
  napkin.rotation.y = -.12;
  for (let i = 0; i < 3; i++) box('NapkinStitch', [.004, .002, .21], [3.56 + i * .025, .681, 1.41], cream);
  for (const [i, color] of ['#bf866b', '#7f9477', '#dfc28d'].entries()) {
    const yarn = mesh('BasketYarn', new THREE.SphereGeometry(.08, 12, 8), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    yarn.position.set(2.51 + i * .1, .535 + (i % 2) * .025, -2.67);
  }
  const vase = mesh('SillFlowerVase', new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(.09, 0), new THREE.Vector2(.105, .08),
    new THREE.Vector2(.065, .2), new THREE.Vector2(.06, .23), new THREE.Vector2(.045, .23),
    new THREE.Vector2(.05, .2), new THREE.Vector2(.07, .03), new THREE.Vector2(0, .03),
  ], 16), new THREE.MeshStandardMaterial({ color: '#bb8c74', roughness: 1 }));
  vase.position.set(.78, .92, -2.81);
  for (let i = 0; i < 3; i++) {
    const flower = new THREE.Group(); flower.position.set(.78 + (i - 1) * .062, 1.1, -2.81 + i * .015); details.add(flower);
    const stem = mesh('DriedFlowerStem', new THREE.CylinderGeometry(.006, .006, .24 + i * .035, 6), dark, flower);
    stem.position.y = .08; stem.rotation.z = (i - 1) * -.14;
    const color = new THREE.MeshStandardMaterial({ color: ['#d3af64', '#ead7b0', '#c59474'][i], roughness: 1 });
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * Math.PI * 2, petal = mesh('DriedFlowerPetal', new THREE.SphereGeometry(1, 8, 6), color, flower);
      petal.position.set(Math.cos(a) * .032, .22 + i * .017 + Math.sin(a) * .032, 0);
      petal.scale.set(.032, .032, .012);
    }
    const center = mesh('DriedFlowerHeart', new THREE.SphereGeometry(.021, 8, 6), brass, flower);
    center.position.set(0, .22 + i * .017, .013);
  }
  for (const y of [1.045, 1.445]) for (let i = 0; i < 6; i++) for (const offset of [-.09, .09]) {
    box('BookSpineFoil', [.008, .009, .072], [3.236, y + offset, -.77 + i * .18], brass);
  }
  const sunlight = new THREE.MeshBasicMaterial({ color: '#fff0c6', transparent: true, opacity: .065, depthWrite: false });
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const patch = mesh('AfternoonLight', new THREE.PlaneGeometry(.72, .54), sunlight);
    patch.rotation.set(-Math.PI / 2, 0, -.32); patch.position.set(-.3 + i * .82 + j * .19, .002, -1.8 + j * .62);
    patch.castShadow = patch.receiveShadow = false; patch.raycast = () => {};
  }
  const steamMaterial = new THREE.MeshBasicMaterial({ color: '#fff8e7', transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide });
  const steam = new THREE.Group(); steam.name = 'TeaSteam'; steam.position.set(3.53, .87, 1.91); details.add(steam);
  for (let i = 0; i < 3; i++) {
    const wisp = mesh('SteamWisp', new THREE.SphereGeometry(1, 8, 6), steamMaterial, steam);
    wisp.castShadow = false; wisp.raycast = () => {};
  }
  const leaves: Array<{ object: THREE.Object3D; z: number }> = [];
  const curtains: Array<{ object: THREE.Object3D; z: number }> = [];
  scene.traverse(object => {
    if (object.name === 'PlantLeaf') leaves.push({ object, z: object.rotation.z });
    if (object.name === 'LinenCurtain') curtains.push({ object, z: object.rotation.z });
  });
  let elapsed = 0;
  const update = (dt: number, reducedMotion = false) => {
    elapsed += Number.isFinite(dt) ? Math.max(0, Math.min(dt, .05)) : 0;
    const t = reducedMotion ? 0 : elapsed;
    leaves.forEach(({ object, z }, i) => { object.rotation.z = z + Math.sin(t * .75 + i * .6) * (reducedMotion ? 0 : .025); });
    curtains.forEach(({ object, z }, i) => { object.rotation.z = z + Math.sin(t * .55 + i * .18) * (reducedMotion ? 0 : .004); });
    hour.rotation.z = -Math.PI * 2 * (10 + 10 / 60 + elapsed / 3600) / 12;
    minute.rotation.z = -Math.PI * 2 * (10 + elapsed / 60) / 60;
    steam.visible = !reducedMotion;
    steam.children.forEach((wisp, i) => {
      const u = (t * .24 + i / 3) % 1;
      wisp.position.set(Math.sin(u * 7 + i) * .025, u * .27, Math.cos(u * 6 + i) * .015);
      const envelope = Math.sin(u * Math.PI);
      wisp.scale.set(.016 * envelope, .047 * envelope, .012 * envelope);
    });
  };
  update(0);
  return { update };
}
