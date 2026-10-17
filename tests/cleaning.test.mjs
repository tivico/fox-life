import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { createScene, homeLayout } from '../src/scene.ts';
import { CLEAN_STORAGE } from '../src/daily.ts';
import { cleaningStroke } from '../src/cleaning.ts';

function until(fox, predicate, dt = 1 / 60, seconds = 90) {
  for (let frame = 0; frame < seconds / dt; frame++) { if (predicate()) return; fox.update(dt); }
  assert.fail(`timeout: ${fox.activityPhase}/${fox.action}`);
}
const point = object => object.getWorldPosition(new THREE.Vector3());

test('cleaning picks up and returns one full-size broom instead of spawning, shrinking or leaving a duplicate', () => {
  for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
    const fox = new Character(homeLayout, () => .45);
    const { scene } = createScene(), parked = scene.getObjectByName('RoomBroom');
    const tool = fox.root.getObjectByName('CleaningBroom');
    fox.requestClean(); const phases = [], shown = [];
    for (let frame = 0; frame < 90 / dt; frame++) {
      const before = fox.root.position.clone(); fox.update(dt); fox.root.updateMatrixWorld(true);
      assert.ok(fox.root.position.distanceTo(before) <= 1.05 * dt + 1e-8, 'bounded world movement');
      parked.visible = !fox.cleanToolInUse;
      if (phases.at(-1) !== fox.activityPhase) phases.push(fox.activityPhase);
      if (fox.cleanToolInUse) {
        assert.equal(parked.visible, false);
        assert.equal(tool.visible, true);
        assert.deepEqual(tool.scale.toArray(), [1, 1, 1], 'the broom never grows from the floor');
        assert.ok(point(parked).distanceTo(point(tool)) < .00001 || !['settle', 'finish'].includes(fox.activityPhase)
          || Math.abs(fox.root.position.distanceTo(homeLayout.leisure.storage.position)) < .04);
        if (fox.activityPhase === 'settle' && fox.activityElapsed < .3 || fox.activityPhase === 'finish' && fox.activityElapsed > .65) {
          assert.ok(point(tool).distanceTo(new THREE.Vector3().fromArray(CLEAN_STORAGE.tool)) < 1e-6, 'pickup/stow starts at the real parked position');
          assert.ok(tool.getWorldScale(new THREE.Vector3()).distanceTo(parked.getWorldScale(new THREE.Vector3())) < 1e-6);
          shown.push(fox.activityPhase);
        }
      }
      if (phases.includes('active') && fox.state === 'Idle') break;
    }
    assert.deepEqual(phases, ['approach', 'settle', 'carry', 'active', 'return', 'finish', null]);
    assert.ok(shown.includes('settle') && shown.includes('finish'));
    assert.equal(tool.visible, false); assert.equal(parked.visible, true);
    assert.ok(fox.root.position.distanceTo(homeLayout.leisure.storage.position) < .04);
    for (const name of ['FoxArmL', 'FoxArmR']) assert.equal(fox.root.getObjectByName(name).children[0].visible, true);
  }
});

test('one original paw holds the broom without replacing, stretching or moving the arm meshes', () => {
  for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
    const fox = new Character(homeLayout, () => .45); fox.requestClean(); let samples = 0;
    let planted;
    const armMeshes = ['FoxArmL', 'FoxArmR'].map(name => fox.root.getObjectByName(name).children[0]);
    const originals = armMeshes.map(mesh => ({ geometry: mesh.geometry, position: mesh.position.clone(), scale: mesh.scale.clone() }));
    for (let frame = 0; frame < 90 / dt; frame++) {
      fox.update(dt); fox.root.updateMatrixWorld(true);
      if (fox.cleanToolInUse) {
        for (let side = 0; side < 2; side++) {
          const mesh = armMeshes[side], original = originals[side];
          assert.equal(mesh.geometry, original.geometry);
          assert.equal(mesh.visible, true);
          assert.ok(mesh.scale.equals(original.scale));
          assert.ok(mesh.position.equals(original.position));
          assert.deepEqual(mesh.parent.scale.toArray(), [1, 1, 1]);
        }
      }
      if (fox.activityPhase === 'active' && fox.activityElapsed > .8) {
        const right = fox.root.getObjectByName('FoxArmR'), left = fox.root.getObjectByName('FoxArmL');
        const palm = right.localToWorld(new THREE.Vector3(.05, -.34, 0));
        assert.ok(palm.distanceTo(point(fox.root.getObjectByName('BroomGripR'))) < .001, 'broom stays in the original right paw');
        assert.ok(Math.abs(left.rotation.x) < .01, 'free arm hangs naturally');
        assert.ok(left.localToWorld(new THREE.Vector3(-.05, -.34, 0)).distanceTo(point(fox.root.getObjectByName('BroomGripR'))) > .25);
        const feet = ['FoxLegL', 'FoxLegR'].map(name => point(fox.root.getObjectByName(name)));
        planted ??= feet.map(foot => foot.clone());
        feet.forEach((foot, i) => assert.ok(foot.distanceTo(planted[i]) < .003, 'weight shift does not slide the feet'));
        samples++;
      }
      if (samples && fox.state === 'Idle') break;
    }
    assert.ok(samples > 100);
  }
});

test('pushes keep bristles on the floor; lifted recoveries and carrying never emit dust', () => {
  const fox = new Character(homeLayout, () => .45); fox.requestClean();
  let pushes = 0, recoveries = 0, carried = 0;
  let movingFrames = 0, previousPhase;
  for (let frame = 0; frame < 90 * 60; frame++) {
    fox.update(1 / 60); fox.root.updateMatrixWorld(true);
    const brush = fox.root.getObjectByName('BroomBrush');
    const box = new THREE.Box3().setFromObject(brush, true);
    const dust = fox.root.getObjectByName('CleaningDust');
    if (fox.activityPhase !== previousPhase) { movingFrames = 0; previousPhase = fox.activityPhase; }
    if (['carry', 'return'].includes(fox.activityPhase)) {
      if (++movingFrames > 20) { assert.ok(box.min.y > .18, 'clear low room edge while carried'); carried++; }
      assert.equal(dust.visible, false);
    }
    if (fox.activityPhase === 'active' && fox.activityElapsed > .7) {
      const stroke = cleaningStroke(fox.activityElapsed);
      if (stroke.pushing) { assert.ok(box.min.y >= .001 && box.min.y < .004, 'brush touches rug without sinking'); pushes++; }
      if (stroke.recovering && stroke.lift > .035) { assert.ok(box.min.y > .02); assert.equal(dust.visible, false); recoveries++; }
    }
    if (carried && fox.state === 'Idle') break;
  }
  assert.ok(pushes > 30 && recoveries > 15 && carried > 60);
});

test('three discrete pushes include pauses and lifted returns instead of continuous side-to-side oscillation', () => {
  let last = false, count = 0, pauses = 0;
  for (let time = 0; time < 8.8; time += .01) {
    const frame = cleaningStroke(time);
    if (frame.pushing && !last) count++;
    if (!frame.pushing) { assert.equal(frame.dust, 0); pauses++; }
    assert.ok(frame.lift >= 0 && frame.lift <= .065);
    last = frame.pushing;
  }
  assert.equal(count, 3); assert.ok(pauses > 400);
});

test('interruptions while carrying or sweeping return the broom before the one replacement invitation starts', () => {
  for (const phase of ['settle', 'carry', 'active', 'return', 'finish']) {
    const fox = new Character(homeLayout, () => .45);
    until(fox, () => fox.activityKind === 'Clean' && fox.activityPhase === phase &&
      (!['settle', 'active', 'finish'].includes(phase) || fox.activityElapsed > .2));
    assert.equal(fox.source, 'Autonomous'); assert.equal(fox.requestWindowObserve(), true);
    assert.equal(fox.requestPlay(), false);
    until(fox, () => fox.targetLabel === 'Window');
    assert.equal(fox.cleanToolInUse, false);
    assert.ok(fox.root.position.distanceTo(homeLayout.leisure.storage.position) < .04, 'stow first, then walk to next target');
    assert.equal(fox.root.getObjectByName('FoxArmR').children[0].visible, true);
    until(fox, () => fox.state === 'Idle');
  }
});
