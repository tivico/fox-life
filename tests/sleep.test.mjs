import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { sleepLayout, createScene } from '../src/scene.ts';
import { SLEEP } from '../src/sleep.ts';
import { FrameClock } from '../src/FrameClock.ts';
import { bindBedInteraction } from '../src/BedInteraction.ts';

const dt = 1 / 60;
const make = (random = () => 0.5) => new Character(sleepLayout, random);
function until(c, predicate, step = dt, seconds = 90) {
  let elapsed = 0;
  while (!predicate() && elapsed < seconds) { c.update(step); elapsed += step; }
  assert.ok(predicate(), `timed out: ${c.action}, ${c.root.position.toArray()}`);
  return elapsed;
}

test('SA-T02/04: three player starts complete settle, eight seconds sleep, wake and neutral return', () => {
  for (const start of [[-1.6,0,-1], [1.6,0,1.3], [0,0,0]]) for (const step of [1/20,1/60,1/144]) {
    const c = make(); c.root.position.fromArray(start);
    const before = c.root.position.clone();
    assert.equal(c.requestSleep(), true);
    assert.equal(c.targetLabel, 'Bed');
    assert.deepEqual(c.root.position.toArray(), before.toArray());
    until(c, () => c.sleepPhase === 'settle', step);
    assert.equal(c.state, 'Walk');
    assert.ok(Math.cos(c.root.rotation.y - Math.PI) > 0.999);
    const settle = until(c, () => c.sleepPhase === 'sleep', step);
    assert.ok(settle >= SLEEP.settle - 1e-8 && settle < SLEEP.settle + step * 2);
    assert.equal(c.state, 'Sleep');
    const sleep = until(c, () => c.sleepPhase === 'wake', step);
    assert.ok(sleep >= 8 - 1e-8 && sleep < 8 + step * 2);
    const wake = until(c, () => c.state === 'Idle', step);
    assert.ok(wake >= SLEEP.wake - 1e-8 && wake < SLEEP.wake + step * 2);
    assert.equal(c.target, null); assert.equal(c.source, 'Autonomous');
    const visual = c.root.getObjectByName('FoxVisual');
    assert.deepEqual(visual.position.toArray(), [0,0,0]);
    assert.ok(visual.quaternion.angleTo(new THREE.Quaternion()) < 1e-8);
    assert.equal(c.sleepCooldownRemaining, 45);
    until(c, () => c.root.position.x > -1.8, step);
  }
});

test('SA-T02/05: player bed interrupts Idle/Walk; active player intent rejects all repeats and cross-targets', () => {
  for (const state of ['Idle','Walk']) {
    const c=make(); until(c,()=>c.state===state);
    const position=c.root.position.clone(), heading=c.root.rotation.y;
    c.requestSleep();
    for(let i=0;i<30;i++) c.update(dt);
    assert.ok(c.root.position.distanceTo(position)>.005 || Math.abs(c.root.rotation.y-heading)>.01);
    while(c.state!=='Idle') {
      const timer=c.sleepElapsed, target=c.target;
      assert.equal(c.requestSleep(),false); assert.equal(c.requestWindowObserve(),false);
      assert.equal(c.sleepElapsed,timer); assert.deepEqual(c.target.toArray(),target.toArray());
      c.update(dt);
    }
    assert.equal(c.requestSleep(),true, 'player ignores cooldown');
  }
});

test('SA-T03: autonomous baseline, weighted eligibility, three-walk cap, cooldown and repeat source', () => {
  for(const random of [()=>0,()=>0.99]) {
    const c=make(random);
    let walks=0, last='Idle';
    until(c,()=>{
      if(c.state==='Walk' && last==='Idle' && c.targetLabel==='Room') walks++;
      last=c.state;
      return c.sleepPhase==='approach';
    });
    assert.equal(walks, random()===0 ? 1 : 3);
    assert.equal(c.source,'Autonomous');
    assert.equal(c.requestSleep(),false);
    assert.equal(c.source,'Autonomous');
    until(c,()=>c.state==='Idle');
    for(let i=0;i<44/dt;i++) {c.update(dt);assert.notEqual(c.targetLabel,'Bed');}
    until(c,()=>c.sleepPhase==='sleep');
  }
});

test('SA-T06: Window interrupts autonomous settle/sleep/wake with continuous safe exit', () => {
  for(const phase of ['approach','settle','sleep','wake']) {
    const c=make(()=>0);
    until(c,()=>c.sleepPhase===phase);
    if(phase==='settle') for(let i=0;i<15;i++) c.update(dt);
    const visual=c.root.getObjectByName('FoxVisual'), before=visual.position.clone();
    assert.equal(c.requestWindowObserve(),true);
    assert.deepEqual(visual.position.toArray(),before.toArray());
    assert.equal(c.source,'Player Command');
    assert.equal(c.requestSleep(),false);
    until(c,()=>c.state==='Observe');
    assert.deepEqual(visual.position.toArray(),[0,0,0]);
    assert.ok(c.root.position.distanceTo(sleepLayout.windowPosition)<=.035);
    const duration=until(c,()=>c.state==='Idle'); assert.ok(duration>=4 && duration<4.04);
  }
});

test('SA-T07: sampled full bed flow clears structural furniture and stays finite', () => {
  const {scene}=createScene(); scene.updateMatrixWorld(true);
  const blockers=[];
  scene.traverse(o=>{if(o instanceof THREE.Mesh){const box=new THREE.Box3().setFromObject(o, true);if(box.max.y>.05 && !['Mattress','Pillow'].includes(o.name)) blockers.push({box,name:o.name});}});
  for(const step of [1/20,1/60,1/144]) for(const start of [[-1.6,0,-1],[1.6,0,1.3],[0,0,0]]) {
    const c=make();c.root.position.fromArray(start);c.requestSleep();
    let previous=c.root.getObjectByName('FoxVisual').position.clone();
    let seenSleep=false;
    for(let i=0;i<60/step;i++) {
      c.update(step);c.root.updateMatrixWorld(true);
      const visual=c.root.getObjectByName('FoxVisual');
      assert.ok(visual.position.distanceTo(previous)<step*8, 'bounded continuous pose translation');previous.copy(visual.position);
      c.root.traverse(o=>{
        assert.ok([...o.position,...o.scale,o.rotation.x,o.rotation.y,o.rotation.z].every(Number.isFinite));
        if(o instanceof THREE.Mesh && i%3===0) {
          const box=new THREE.Box3().setFromObject(o, true);
          assert.ok(box.min.y>=-.005,'not below floor');
          for(const blocker of blockers) assert.ok(!box.intersectsBox(blocker.box), `collision ${blocker.name} ${blocker.box.min.toArray()} ${blocker.box.max.toArray()} phase ${c.sleepPhase} time ${c.sleepElapsed} rotation ${c.root.rotation.y} box ${box.min.toArray()} ${box.max.toArray()} root ${c.root.position.toArray()} mesh ${o.parent?.name}`);
        }
      });
      seenSleep ||= c.sleepPhase==='sleep';
      if(seenSleep && c.state==='Walk' && c.targetLabel==='Room' && c.root.position.x> -1.8) break;
      if(i===Math.ceil(60/step)-1) assert.fail('must leave bed');
    }
  }
});

test('SA-T07 regression: settle, sleep and wake keep fox vertices above mattress and pillow', () => {
  const {bedParts}=createScene();
  const surfaces=bedParts.filter(o=>['Mattress','Pillow'].includes(o.name)).map(o=>({name:o.name,box:new THREE.Box3().setFromObject(o,true)}));
  const v=new THREE.Vector3();
  for(const step of [1/20,1/60,1/144]) for(const interrupt of [false,true]) {
    const c=make(()=>0);
    until(c,()=>c.sleepPhase==='settle',step);
    let interrupted=false;
    while(c.sleepPhase) {
      if(interrupt && !interrupted && c.sleepPhase==='settle' && c.sleepElapsed>=.4) {
        assert.equal(c.requestWindowObserve(),true); interrupted=true;
      }
      c.update(step); c.root.updateMatrixWorld(true);
      c.root.traverse(o=>{
        if(!(o instanceof THREE.Mesh)) return;
        const positions=o.geometry.getAttribute('position');
        for(let i=0;i<positions.count;i++) {
          o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);
          for(const {name,box} of surfaces) {
            if(v.x>box.min.x+.001 && v.x<box.max.x-.001 && v.z>box.min.z+.001 && v.z<box.max.z-.001) {
              assert.ok(v.y>=box.max.y-.003, `${name}: ${c.sleepPhase}/${c.sleepElapsed.toFixed(3)} vertex ${v.toArray()} parent ${o.parent?.name} at ${o.parent?.position.toArray()} grandparent ${o.parent?.parent?.name}`);
            }
          }
        }
      });
    }
    const visual=c.root.getObjectByName('FoxVisual');
    assert.deepEqual(visual.position.toArray(),[0,0,0]);
    assert.equal(c.root.getObjectByName('FoxHead').position.x,0);
    assert.equal(c.root.getObjectByName('FoxTail').position.x,0);
  }
});

test('sleep preset: separate curled feet, distal tail clearance, stable contact and full morph reset', () => {
  const c=make(); c.requestSleep(); until(c,()=>c.sleepPhase==='sleep');
  const legs=['FoxLegL','FoxLegR'].map(name=>c.root.getObjectByName(name));
  const tail=c.root.getObjectByName('FoxTail').children[0];
  const torso=c.root.getObjectByName('FoxHead').parent.children[0];
  const v=new THREE.Vector3();
  for(let frame=0;frame<120;frame++) {
    c.update(dt); c.root.updateMatrixWorld(true);
    const boxes=legs.map(leg=>new THREE.Box3().setFromObject(leg,true));
    assert.ok(!boxes[0].intersectsBox(boxes[1]), 'feet remain separate');
    const distal=new THREE.Box3();
    for(let i=8*24;i<tail.geometry.getAttribute('position').count;i++) {
      tail.getVertexPosition(i,v).applyMatrix4(tail.matrixWorld); distal.expandByPoint(v);
    }
    assert.ok(!distal.intersectsBox(new THREE.Box3().setFromObject(torso,true)), 'tail beyond root clears torso');
    const tailBox=new THREE.Box3().setFromObject(tail,true);
    assert.ok(tailBox.min.y>=.477 && tailBox.min.y<.56, 'tail rests close to mattress');
    assert.ok(tailBox.min.x> -3.825 && tailBox.max.x< -2.975 && tailBox.max.z<1.45, 'tail stays within bed frame footprint');
    for(const leg of legs) assert.equal(leg.children[0].morphTargetInfluences[0],1);
  }
  until(c,()=>c.state==='Idle');
  for(const mesh of [tail,...legs.map(leg=>leg.children[0])]) assert.equal(mesh.morphTargetInfluences[0],0);
  assert.equal(c.root.getObjectByName('FoxTail').position.z,-.1);
  for(const name of ['FoxArmL','FoxArmR']) assert.equal(c.root.getObjectByName(name).position.z,0);
});

test('SA-T12: background does not consume approach, pose, sleep, wake or cooldown', () => {
  for(const phase of ['approach','settle','sleep','wake',null]) {
    const c=make();c.requestSleep();until(c,()=>c.sleepPhase===phase);
    const before=[c.root.position.toArray(),c.sleepElapsed,c.sleepCooldownRemaining,c.root.getObjectByName('FoxVisual').position.toArray()];
    const clock=new FrameClock();clock.tick(1000,false);c.update(clock.tick(11000,true));clock.reset();c.update(clock.tick(21000,false));
    assert.deepEqual([c.root.position.toArray(),c.sleepElapsed,c.sleepCooldownRemaining,c.root.getObjectByName('FoxVisual').position.toArray()],before);
  }
});

test('SA-T08: bed parts click, drag/occlusion/other surface rejection and listener cleanup', () => {
  class Canvas extends EventTarget {getBoundingClientRect(){return {left:0,top:0,width:400,height:400};}}
  const canvas=new Canvas(), {scene,bedParts}=createScene();
  const camera=new THREE.PerspectiveCamera(45,1,.1,30);camera.position.set(-3.4,5,.5);camera.up.set(0,0,-1);camera.lookAt(-3.4,0,.5);camera.updateMatrixWorld();
  let hits=0;const dispose=bindBedInteraction(canvas,camera,scene,bedParts,()=>hits++);
  const event=(type,x=200,y=200)=>{const e=new Event(type);Object.assign(e,{clientX:x,clientY:y,button:0,isPrimary:true,pointerId:1});canvas.dispatchEvent(e);};
  event('pointerdown');event('pointerup');assert.equal(hits,1);
  event('pointerdown');event('pointermove',230);event('pointerup');assert.equal(hits,1);
  event('pointerdown',390,390);event('pointerup',390,390);assert.equal(hits,1);
  const blocker=new THREE.Mesh(new THREE.BoxGeometry(2,.2,2));blocker.position.set(-3.4,2,.5);scene.add(blocker);
  event('pointerdown');event('pointerup');assert.equal(hits,1);scene.remove(blocker);
  dispose();event('pointerdown');event('pointerup');assert.equal(hits,1);
});




