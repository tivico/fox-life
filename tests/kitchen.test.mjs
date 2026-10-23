import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { createScene, kitchenHomeLayout, gardenHomeLayout } from '../src/scene.ts';
import { homeRooms, roomAt } from '../src/HomeNavigation.ts';
import { kitchenActions, kitchenDurations } from '../src/KitchenActivity.ts';
import { LifeJournal, roomActions } from '../src/life.ts';
import { bindWindowInteraction } from '../src/WindowInteraction.ts';

function until(fox, predicate, dt = .05, sample = () => {}, seconds = 180) {
  for (let i = 0; i < seconds / dt; i++) { fox.update(dt); sample(); if (predicate()) return; }
  assert.fail(`${fox.action} stalled at ${fox.root.position.toArray()}`);
}
function doorway(fox) {
  const { x, z } = fox.root.position;
  if (x > 3.6 && x < 4.65) assert.ok(Math.abs(z - (z < 3.2 ? 2.6 : 8.44)) < .20, 'use an actual east doorway');
  if (z > 2.9 && z < 3.5 && x < 4.2) assert.ok(Math.abs(x) < .35, 'use the bedroom/living doorway');
}
function meshHitsBox(mesh, box) {
  const triangle = new THREE.Triangle(), geometry = mesh.geometry;
  for (let i = 0; i < (geometry.index?.count ?? geometry.attributes.position.count); i += 3) {
    for (const [offset, point] of [[0, triangle.a], [1, triangle.b], [2, triangle.c]]) mesh.getVertexPosition(geometry.index ? geometry.index.getX(i + offset) : i + offset, point).applyMatrix4(mesh.matrixWorld);
    if (box.intersectsTriangle(triangle)) return true;
  } return false;
}
function insideSurface(point, mesh) {
  const local = mesh.worldToLocal(point.clone());
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  if (!mesh.geometry.boundingBox.containsPoint(local)) return false;
  const ray = new THREE.Ray(local, new THREE.Vector3(.873, .361, .327).normalize());
  const positions = mesh.geometry.attributes.position, index = mesh.geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3(), distances = [];
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    a.fromBufferAttribute(positions, index ? index.getX(i) : i); b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1); c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2);
    if (ray.intersectTriangle(a, b, c, false, hit)) {
      const d = hit.distanceTo(local); if (d > 1e-5 && !distances.some(value => Math.abs(value - d) < 1e-5)) distances.push(d);
    }
  } return distances.length % 2 === 1;
}

test('four rooms connect through the physical doors at 20/60/144 Hz and historical homes reject the kitchen', () => {
  for (const dt of [.05, 1 / 60, 1 / 144]) for (const from of Object.keys(homeRooms)) for (const to of Object.keys(homeRooms)) {
    if (from === to) continue;
    const fox = new Character(kitchenHomeLayout, () => .45), journal = new LifeJournal();
    fox.root.position.set(homeRooms[from].centerX, 0, homeRooms[from].centerZ); let previous = fox.root.position.clone();
    assert.equal(fox.requestRoomVisit(to), true);
    until(fox, () => fox.state === 'Observe', dt, () => {
      doorway(fox); journal.observe(fox); assert.ok(fox.root.position.distanceTo(previous) < 1.05 * dt + 1e-6); previous.copy(fox.root.position);
    });
    assert.equal(roomAt(fox.root.position), to); assert.equal(journal.entries[0].kind, to); fox.dispose();
  }
  const fox = new Character(gardenHomeLayout);
  assert.equal(fox.requestKitchenAction('CookSoup'), false); assert.equal(fox.requestRoomVisit('Kitchen'), false); fox.dispose();
});

test('three cooking actions finish full clocks, drive visible food changes, record once and leave appliances off', () => {
  for (const dt of [.05, 1 / 60, 1 / 144]) for (const kind of kitchenActions) {
    const { scene, kitchen } = createScene({ expanded: true, garden: true, kitchen: true });
    const fox = new Character(kitchenHomeLayout, () => .45), journal = new LifeJournal(); scene.add(fox.root); fox.requestKitchenAction(kind);
    assert.equal(fox.requestSleep(), false); let active = 0, effect = false;
    until(fox, () => fox.state === 'Idle', dt, () => {
      kitchen.update(dt, false, fox.kitchenActivity); journal.observe(fox);
      if (fox.kitchenActivity?.phase === 'active') {
        active += dt; assert.deepEqual(roomActions(fox), [...kitchenActions]);
        effect ||= kind === 'ChopVegetables' ? scene.getObjectByName('CarrotSlice').visible : kind === 'CookSoup' ? scene.getObjectByName('KitchenSteam').visible : scene.getObjectByName('OvenIndicator').material.emissive.getHex() !== 0;
      }
    });
    assert.ok(active >= kitchenDurations[kind] - dt); assert.ok(effect); assert.equal(journal.entries.filter(entry => entry.kind === kind).length, 1);
    assert.equal(scene.getObjectByName('KitchenSteam').visible, false); assert.equal(scene.getObjectByName('SoupBurner').material.emissive.getHex(), 0);
    assert.equal(scene.getObjectByName('OvenIndicator').material.emissive.getHex(), 0); fox.dispose();
  }
});

test('cooking approaches, gestures and departures clear real furniture and retain attached arms outside the head', () => {
  const { scene, kitchen } = createScene({ expanded: true, garden: true, kitchen: true }); scene.updateMatrixWorld(true);
  const names = ['KitchenCounter', 'KitchenCountertop', 'KitchenBackWall', 'KitchenPartition', 'KitchenDoorPost', 'KitchenDoorReturn', 'KitchenSinkCabinet', 'KitchenSinkTop', 'KitchenFridge', 'BreakfastTableTop', 'BreakfastStoolSeat', 'TVStand', 'Television', 'LivingSideboard', 'RoomDivider', 'DiningSurface', 'Bookshelf', 'OvenSide', 'OvenCase', 'OvenControls'];
  const blockers = []; scene.traverse(o => { if (o instanceof THREE.Mesh && names.includes(o.name)) blockers.push({name:o.name,box:new THREE.Box3().setFromObject(o,true).expandByScalar(-.008)}); });
  for (const start of [[0, 0, 0], [6.7, 0, 0], [-1.4, 0, 7]]) for (const kind of kitchenActions) {
    const fox = new Character(kitchenHomeLayout, () => .45); fox.root.position.fromArray(start); scene.add(fox.root); fox.requestKitchenAction(kind);
    const head = fox.root.getObjectByName('FoxHead').children[0]; let frame = 0;
    const sample = () => {
      kitchen.update(.05, false, fox.kitchenActivity); if (frame++ % 3) return; scene.updateMatrixWorld(true);
      fox.root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        let ancestor = object; while (ancestor?.visible) ancestor = ancestor.parent; if (ancestor) return;
        const box = new THREE.Box3().setFromObject(object, true); assert.ok(box.min.y >= -.015);
        for (const blocker of blockers) if (box.intersectsBox(blocker.box)) assert.ok(!meshHitsBox(object, blocker.box), `${fox.action}@${fox.kitchenActivity?.elapsed.toFixed(2)} ${object.parent.name} hits ${blocker.name} at ${fox.root.position.toArray()}`);
      });
      for (const [index, name] of ['FoxArmL', 'FoxArmR'].entries()) {
        const arm = fox.root.getObjectByName(name), mesh = arm.children[0], rest = mesh.geometry.attributes.armRestPosition;
        assert.deepEqual(arm.position.toArray(), [index ? .22 : -.22, .82, 0]);
        const socket = new THREE.Vector3(index ? .05 : -.05, 0, 0), ring = new THREE.Vector3(); let count = 0;
        for (let i = 0; i < rest.count; i += 2) {
          const point = mesh.getVertexPosition(i, new THREE.Vector3());
          const local = point.clone().multiply(mesh.scale).add(mesh.position); assert.ok(local.distanceTo(socket) < .41);
          if (Math.abs(rest.getY(i) - .5) < .001) { ring.add(local); count++; }
          if (rest.getY(i) < -.2) assert.ok(!insideSurface(point.applyMatrix4(mesh.matrixWorld), head), `${fox.action}@${fox.kitchenActivity?.elapsed.toFixed(2)}: ${name} enters head`);
        }
        assert.ok(count > 5 && ring.divideScalar(count).distanceTo(socket) < .02);
      }
    };
    until(fox, () => fox.state === 'Idle', .05, sample);
    fox.requestRoomVisit('Bedroom'); until(fox, () => fox.state === 'Idle', .05, sample);
    scene.remove(fox.root); fox.dispose();
  }
});

test('autonomous cooking safely finishes each phase before a replacement and zero time freezes food and utensils', () => {
  for (const kind of kitchenActions) for (const phase of ['settle', 'active', 'finish', 'retreat']) {
    const { scene, kitchen } = createScene({ expanded: true, garden: true, kitchen: true });
    const fox = new Character(kitchenHomeLayout, () => (14.5 + kitchenActions.indexOf(kind)) / 20); scene.add(fox.root);
    until(fox, () => fox.kitchenActivity?.kind === kind && fox.kitchenActivity.phase === phase && fox.kitchenActivity.elapsed > .5, .05, () => kitchen.update(.05, false, fox.kitchenActivity), 600);
    assert.equal(fox.source, 'Autonomous');
    const snapshot = JSON.stringify(fox.kitchenActivity), knife = scene.getObjectByName('KitchenKnife').position.clone();
    fox.update(0); kitchen.update(0, false, fox.kitchenActivity); assert.equal(JSON.stringify(fox.kitchenActivity), snapshot); assert.ok(knife.equals(scene.getObjectByName('KitchenKnife').position));
    assert.equal(fox.requestGardenAction('WaterPlants'), true);
    until(fox, () => !fox.kitchenActivity, .05, () => kitchen.update(.05, false, fox.kitchenActivity));
    assert.equal(scene.getObjectByName('KitchenSteam').visible, false); assert.equal(scene.getObjectByName('OvenIndicator').material.emissive.getHex(), 0);
    until(fox, () => fox.state === 'Idle'); fox.dispose();
  }
});

test('kitchen furniture dispatches its own action, rejects occlusion and dragging, and detaches cleanly', () => {
  const { scene, kitchen } = createScene({ expanded: true, garden: true, kitchen: true });
  class Canvas extends EventTarget { getBoundingClientRect() { return {left:0,top:0,width:500,height:500}; } }
  for (const [kind, name] of [['ChopVegetables', 'ChoppingBoard'], ['CookSoup', 'SoupSurface'], ['BakeCookies', 'OvenControls']]) {
    const canvas = new Canvas(), point = scene.getObjectByName(name).getWorldPosition(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 30); camera.position.copy(point).add(new THREE.Vector3(0, 1, 2)); camera.lookAt(point); camera.updateMatrixWorld();
    const received = [], unbinders = Object.entries(kitchen.kitchenParts).map(([action, parts]) => bindWindowInteraction(canvas, camera, scene, parts, () => received.push(action)));
    const emit = (type, x = 250) => { const event = new Event(type); Object.assign(event,{clientX:x,clientY:250,button:0,isPrimary:true,pointerId:1}); canvas.dispatchEvent(event); };
    emit('pointerdown'); emit('pointerup'); assert.deepEqual(received, [kind]);
    emit('pointerdown'); emit('pointermove', 280); emit('pointerup'); assert.equal(received.length, 1);
    const occluder = new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5)); occluder.position.copy(point).lerp(camera.position,.5); scene.add(occluder);
    emit('pointerdown'); emit('pointerup'); assert.equal(received.length, 1); scene.remove(occluder);
    unbinders.forEach(unbind=>unbind()); emit('pointerdown'); emit('pointerup'); assert.equal(received.length, 1);
  }
});

test('twenty minutes of autonomous life use four rooms and cooking without stuck tools', () => {
  let seed = 42; const fox = new Character(kitchenHomeLayout, () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296));
  const rooms = new Set(), actions = new Set(); let previous = fox.root.position.clone();
  for (let i = 0; i < 1200 * 20; i++) {
    fox.update(.05); rooms.add(roomAt(fox.root.position)); doorway(fox);
    assert.ok(fox.root.position.distanceTo(previous) < .06); previous.copy(fox.root.position);
    if (fox.kitchenActivity?.phase === 'active') actions.add(fox.kitchenActivity.kind);
  }
  assert.deepEqual([...rooms].sort(), Object.keys(homeRooms).sort()); assert.ok(actions.size >= 2, 'autonomous cooking has variety'); fox.dispose();
});
