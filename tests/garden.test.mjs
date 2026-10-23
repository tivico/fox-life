import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { createScene, gardenHomeLayout, expandedHomeLayout } from '../src/scene.ts';
import { homeRooms, roomAt } from '../src/HomeNavigation.ts';
import { createHomeView } from '../src/HomeView.ts';
import { gardenActions, gardenDurations, CAN_PARK } from '../src/GardenActivity.ts';
import { LifeJournal, roomActions, lifePresentation } from '../src/life.ts';
import { bindWindowInteraction } from '../src/WindowInteraction.ts';

function until(fox, predicate, dt = .05, sample = () => {}, seconds = 150) {
  for (let i = 0; i < seconds / dt; i++) { fox.update(dt); sample(); if (predicate()) return; }
  assert.fail(`${fox.action} stalled at ${fox.root.position.toArray()}`);
}
function doorway(fox) {
  if (fox.root.position.x > 3.6 && fox.root.position.x < 4.65) assert.ok(Math.abs(fox.root.position.z - 2.6) < .20, 'use the open garden doorway');
  if (fox.root.position.z > 2.9 && fox.root.position.z < 3.5 && fox.root.position.x < 4.2) assert.ok(Math.abs(fox.root.position.x) < .35, 'use the living room doorway');
}

test('all three rooms connect through actual doorways at 20/60/144 Hz without teleporting or phantom room moments', () => {
  const rooms = ['Bedroom', 'LivingRoom', 'Balcony'];
  for (const dt of [.05, 1 / 60, 1 / 144]) for (const from of rooms) for (const to of rooms) {
    if (from === to) continue;
    const fox = new Character(gardenHomeLayout, () => .45), journal = new LifeJournal();
    fox.root.position.set(homeRooms[from].centerX, 0, homeRooms[from].centerZ);
    let previous = fox.root.position.clone(); assert.equal(fox.requestRoomVisit(to), true);
    until(fox, () => fox.state === 'Observe', dt, () => {
      doorway(fox); journal.observe(fox);
      assert.ok(fox.root.position.distanceTo(previous) <= 1.05 * dt + 1e-6); previous.copy(fox.root.position);
    });
    assert.equal(roomAt(fox.root.position), to); assert.equal(journal.entries[0].kind, to);
    assert.equal(fox.requestRoomVisit(from), false); until(fox, () => fox.state === 'Idle', dt); fox.dispose();
  }
});

test('garden actions complete, record once, return the watering can and preserve original shoulder sockets across frame rates', () => {
  for (const dt of [.05, 1 / 60, 1 / 144]) for (const kind of gardenActions) {
    const { scene, balcony } = createScene({ expanded: true, garden: true });
    const fox = new Character(gardenHomeLayout, () => .45), journal = new LifeJournal(); scene.add(fox.root);
    assert.equal(fox.requestGardenAction(kind), true); assert.equal(fox.requestSleep(), false);
    let active = 0, wet = false;
    until(fox, () => fox.state === 'Idle', dt, () => {
      doorway(fox); balcony.update(dt, false, fox.gardenActivity); journal.observe(fox);
      wet ||= scene.getObjectByName('GardenWaterDrops').visible;
      if (fox.gardenActivity?.phase === 'active') {
        active += dt; assert.equal(roomAt(fox.root.position), 'Balcony');
        assert.deepEqual(roomActions(fox), [...gardenActions]); assert.equal(lifePresentation(fox).active, kind);
        if (kind === 'WaterPlants') assert.equal(balcony.parkedCan.visible, false);
      }
      for (const [name, sign] of [['FoxArmL', -1], ['FoxArmR', 1]]) assert.deepEqual(fox.root.getObjectByName(name).position.toArray(), [sign * .22, .82, 0]);
    });
    assert.ok(active >= gardenDurations[kind] - dt); assert.equal(journal.entries.filter(entry => entry.kind === kind).length, 1);
    assert.equal(balcony.parkedCan.visible, true); assert.ok(balcony.parkedCan.position.equals(CAN_PARK));
    assert.equal(fox.root.getObjectByName('HeldGardenCan').visible, false);
    assert.equal(scene.getObjectByName('GardenWaterDrops').visible, false);
    if (kind === 'WaterPlants') assert.ok(wet, 'water leaves the actual can spout'); fox.dispose();
  }
  const historical = new Character(expandedHomeLayout); assert.equal(historical.requestGardenAction('WaterPlants'), false); historical.dispose();
});

test('all garden phases safely put the can away before leaving for another room or invitation', () => {
  for (const kind of gardenActions) for (const phase of ['settle', 'active', 'finish']) for (const next of ['Bedroom', 'LivingRoom', 'Read']) {
    const index = gardenActions.indexOf(kind), fox = new Character(gardenHomeLayout, () => (11.5 + index) / 17);
    until(fox, () => fox.gardenActivity?.kind === kind && fox.gardenActivity.phase === phase && fox.gardenActivity.elapsed > .35, .05, () => {}, 600);
    assert.equal(fox.source, 'Autonomous');
    assert.equal(next === 'Read' ? fox.requestRead() : fox.requestRoomVisit(next), true);
    until(fox, () => !fox.gardenActivity, .05, () => {
      if (fox.root.position.x < 4.2) assert.equal(fox.root.getObjectByName('HeldGardenCan').visible, false);
    });
    assert.equal(fox.root.getObjectByName('HeldGardenCan').visible, false);
    until(fox, () => fox.state === 'Idle'); fox.dispose();
  }
});

function meshHitsBox(mesh, box) {
  const triangle = new THREE.Triangle(), g = mesh.geometry;
  for (let i = 0; i < (g.index?.count ?? g.attributes.position.count); i += 3) {
    for (const [offset, point] of [[0, triangle.a], [1, triangle.b], [2, triangle.c]]) mesh.getVertexPosition(g.index ? g.index.getX(i + offset) : i + offset, point).applyMatrix4(mesh.matrixWorld);
    if (box.intersectsTriangle(triangle)) return true;
  }
  return false;
}

test('garden poses clear the ground, door frames, rails, planter and bench through preparation and recovery', () => {
  const { scene, balcony } = createScene({ expanded: true, garden: true });
  const names = ['FlowerPlanter', 'FlowerPlanterRim', 'GardenBenchSeat', 'GardenBenchBack', 'GardenBenchLeg', 'GardenCanPost', 'GardenDoorPost', 'GardenDoorLintel', 'BalconyRailPost', 'DiningSurface', 'Bookshelf', 'RoomDivider'];
  const blockers = []; scene.updateMatrixWorld(true);
  scene.traverse(object => { if (object instanceof THREE.Mesh && names.includes(object.name)) blockers.push({ name: object.name, box: new THREE.Box3().setFromObject(object, true).expandByScalar(-.008) }); });
  for (const kind of gardenActions) {
    const fox = new Character(gardenHomeLayout, () => .45); scene.add(fox.root); fox.requestGardenAction(kind); let frame = 0;
    until(fox, () => fox.state === 'Idle', .05, () => {
      balcony.update(.05, false, fox.gardenActivity);
      if (frame++ % 2) return;
      fox.root.updateMatrixWorld(true);
      fox.root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        let ancestor = object; while (ancestor?.visible) ancestor = ancestor.parent; if (ancestor) return;
        const box = new THREE.Box3().setFromObject(object, true);
        assert.ok(box.min.y > -.015, `${kind}/${fox.gardenActivity?.phase}: ${object.parent?.name} below floor`);
        for (const blocker of blockers) if (box.intersectsBox(blocker.box)) assert.ok(!meshHitsBox(object, blocker.box), `${kind}/${fox.gardenActivity?.phase}: ${object.parent?.name} hit ${blocker.name}`);
      });
      if (kind === 'GardenRest' && fox.gardenActivity?.phase === 'active') {
        const head = fox.root.getObjectByName('FoxHead');
        const torso = head.parent.children.find(object => object instanceof THREE.Mesh && object.geometry.type === 'LatheGeometry');
        const base = new THREE.Box3().setFromObject(torso, true).min;
        assert.ok(base.y >= .532 && base.y < .56 && base.z > 1.30 - .15, 'the seat supports the body without floating');
      }
    }); scene.remove(fox.root); fox.dispose();
  }
});

test('camera follows garden crossings, manual selection stays independent and reduced motion focuses immediately', () => {
  const camera = new THREE.PerspectiveCamera(); camera.position.set(8, 7, 10);
  const controls = new THREE.EventDispatcher(); controls.target = new THREE.Vector3(0, .8, 0);
  const position = new THREE.Vector3(5, 0, 2.6); let reduced = false;
  const view = createHomeView(camera, controls, position, () => reduced, true);
  view.focus('Balcony'); for (let i = 0; i < 180; i++) view.update(1 / 60);
  assert.ok(Math.abs(controls.target.x - 6.7) < .01); assert.ok(Math.abs(controls.target.z) < .01);
  view.focus('LivingRoom'); position.set(6, 0, 0); view.update(.05); assert.equal(view.room, 'LivingRoom');
  reduced = true; view.focus('follow'); view.update(.05); assert.equal(view.room, 'Balcony'); assert.equal(controls.target.x, 6.7);
  view.dispose();
});

test('garden clocks, carried can and particles remain frozen at zero delta', () => {
  const { scene, balcony } = createScene({ expanded: true, garden: true });
  const fox = new Character(gardenHomeLayout, () => .45); scene.add(fox.root); fox.requestGardenAction('WaterPlants');
  until(fox, () => fox.gardenActivity?.phase === 'active' && fox.gardenActivity.elapsed > 1.5, .05, () => balcony.update(.05, false, fox.gardenActivity));
  const before = JSON.stringify(fox.gardenActivity), can = fox.root.getObjectByName('HeldGardenCan').position.clone(), wings = balcony.butterfly.position.clone();
  fox.update(0); balcony.update(0, false, fox.gardenActivity);
  assert.equal(JSON.stringify(fox.gardenActivity), before); assert.ok(can.equals(fox.root.getObjectByName('HeldGardenCan').position)); assert.ok(wings.equals(balcony.butterfly.position)); fox.dispose();
});

function insideSurface(point, mesh) {
  const local = mesh.worldToLocal(point.clone());
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  if (!mesh.geometry.boundingBox.containsPoint(local)) return false;
  const ray = new THREE.Ray(local, new THREE.Vector3(.873, .361, .327).normalize());
  const positions = mesh.geometry.attributes.position, index = mesh.geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3(), distances = [];
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    a.fromBufferAttribute(positions, index ? index.getX(i) : i);
    b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2);
    if (ray.intersectTriangle(a, b, c, false, hit)) {
      const distance = hit.distanceTo(local);
      if (distance > 1e-5 && !distances.some(value => Math.abs(value - distance) < 1e-5)) distances.push(distance);
    }
  }
  return distances.length % 2 === 1;
}

test('garden poses keep rendered shoulders attached, hands outside the head and the distal tail outside the body', () => {
  for (const kind of gardenActions) {
    const fox = new Character(gardenHomeLayout, () => .45); fox.requestGardenAction(kind);
    const arms = ['FoxArmL', 'FoxArmR'].map(name => fox.root.getObjectByName(name).children[0]);
    const head = fox.root.getObjectByName('FoxHead').children[0];
    const torso = head.parent.parent.children.find(object => object instanceof THREE.Mesh && object.geometry.type === 'LatheGeometry');
    const tail = fox.root.getObjectByName('FoxTail').children[0]; let frame = 0;
    until(fox, () => fox.state === 'Idle', 1 / 60, () => {
      if (!fox.gardenActivity || frame++ % 3) return;
      fox.root.updateMatrixWorld(true);
      for (const [index, mesh] of arms.entries()) {
        const rest = mesh.geometry.attributes.armRestPosition;
        const socket = new THREE.Vector3(index ? .05 : -.05, 0, 0), ring = new THREE.Vector3(); let count = 0;
        for (let i = 0; i < rest.count; i++) {
          const point = mesh.getVertexPosition(i, new THREE.Vector3());
          const armPoint = point.clone().multiply(mesh.scale).add(mesh.position);
          assert.ok(armPoint.distanceTo(socket) < .41, 'original arm length is preserved');
          if (Math.abs(rest.getY(i) - .5) < .001) { ring.add(armPoint); count++; }
          if (rest.getY(i) < -.2 && i % 2 === 0) assert.ok(!insideSurface(point.applyMatrix4(mesh.matrixWorld), head), `${kind}/${fox.gardenActivity.phase}@${fox.gardenActivity.elapsed.toFixed(2)}: arm ${index}, vertex ${i} enters head at ${head.worldToLocal(point.clone()).toArray().map(n => n.toFixed(3))}`);
        }
        assert.ok(count > 10 && ring.divideScalar(count).distanceTo(socket) < .02, 'rendered shoulder joins the torso');
      }
      for (let i = 6 * 24; i < tail.geometry.attributes.position.count; i += 2) {
        const point = tail.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(tail.matrixWorld);
        for (const surface of [head, torso]) assert.ok(!insideSurface(point, surface), `${kind}/${fox.gardenActivity.phase}: tail enters body`);
      }
    }); fox.dispose();
  }
});

test('garden furniture clicks dispatch the correct invitation and reject dragging, occlusion and hidden cans', () => {
  const { scene, balcony } = createScene({ expanded: true, garden: true });
  class Canvas extends EventTarget { getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 500 }; } }
  for (const [kind, name] of [['WaterPlants', 'GardenSoil'], ['WatchButterflies', 'ButterflyFlowerPot'], ['GardenRest', 'GardenBenchSeat']]) {
    const canvas = new Canvas(), object = scene.getObjectByName(name), point = object.getWorldPosition(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 30); camera.position.copy(point).add(new THREE.Vector3(0, 3, .3)); camera.lookAt(point); camera.updateMatrixWorld();
    const received = [], unbinders = Object.entries(balcony.gardenParts).map(([action, parts]) => bindWindowInteraction(canvas, camera, scene, parts, () => received.push(action)));
    const emit = (type, x = 250) => { const event = new Event(type); Object.assign(event, { clientX: x, clientY: 250, button: 0, isPrimary: true, pointerId: 1 }); canvas.dispatchEvent(event); };
    emit('pointerdown'); emit('pointerup'); assert.deepEqual(received, [kind]);
    emit('pointerdown'); emit('pointermove', 280); emit('pointerup'); assert.equal(received.length, 1);
    const occluder = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5)); occluder.position.copy(point).lerp(camera.position, .5); scene.add(occluder);
    emit('pointerdown'); emit('pointerup'); assert.equal(received.length, 1);
    scene.remove(occluder); unbinders.forEach(unbind => unbind()); emit('pointerdown'); emit('pointerup'); assert.equal(received.length, 1);
  }
  const raycaster = new THREE.Raycaster(new THREE.Vector3(6, 3, -1.59), new THREE.Vector3(0, -1, 0));
  balcony.parkedCan.visible = false; scene.updateMatrixWorld(true);
  assert.equal(raycaster.intersectObject(balcony.parkedCan, true).length, 0);
});

test('ten minutes of autonomous life visit all three spaces and perform garden actions without stranded props', () => {
  let seed = 42;
  const fox = new Character(gardenHomeLayout, () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296));
  const rooms = new Set(), actions = new Set(); let previous = fox.root.position.clone();
  for (let i = 0; i < 600 * 20; i++) {
    fox.update(.05); rooms.add(roomAt(fox.root.position)); doorway(fox);
    assert.ok(fox.root.position.toArray().every(Number.isFinite));
    assert.ok(fox.root.position.distanceTo(previous) < .06); previous.copy(fox.root.position);
    if (fox.gardenActivity?.phase === 'active') actions.add(fox.gardenActivity.kind);
    if (!fox.gardenActivity) assert.equal(fox.root.getObjectByName('HeldGardenCan').visible, false);
  }
  assert.deepEqual([...rooms].sort(), ['Balcony', 'Bedroom', 'LivingRoom']);
  assert.ok(actions.size >= 2, 'autonomous life includes varied garden moments'); fox.dispose();
});
