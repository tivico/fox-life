import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { readLayout, createScene } from '../src/scene.ts';
import { READ } from '../src/read.ts';
import { FrameClock } from '../src/FrameClock.ts';
import { bindClickInteraction } from '../src/ClickInteraction.ts';

const dt=1/60;
const make=(random=()=>.3)=>new Character(readLayout,random);
function until(c,predicate,step=dt,limit=120) {
  let time=0;
  while(!predicate() && time<limit) {c.update(step);time+=step;}
  assert.ok(predicate(),`${c.action} at ${c.root.position.toArray()}`);
  return time;
}
function neutral(c) {
  const book=c.root.getObjectByName('ReadingBook');
  assert.equal(book.visible,false);
  assert.equal(book.scale.x,0);
  assert.deepEqual(c.root.getObjectByName('FoxVisual').position.toArray(),[0,0,0]);
  assert.ok(Math.abs(c.root.getObjectByName('FoxHead').rotation.x)<.05,'head no longer held down');
  for(const name of ['FoxArmL','FoxArmR']) assert.ok(Math.abs(c.root.getObjectByName(name).rotation.x)<.05,'arms no longer holding book');
  c.root.traverse(o=>{if(o instanceof THREE.Mesh && o.morphTargetInfluences) assert.ok(o.morphTargetInfluences.every(v=>v===0));});
}

test('SB-T02/04/05: three starts and frame rates, complete timed player Read with strict dedupe',()=>{
  for(const step of [1/20,1/60,1/144]) for(const start of [[-1.6,0,-1],[1.6,0,1.3],[0,0,0]]) {
    const c=make(); c.root.position.fromArray(start); const before=c.root.position.clone();
    assert.equal(c.requestRead(),true); assert.deepEqual(c.root.position.toArray(),before.toArray());
    assert.equal(c.action,'Walk to reading area'); assert.equal(c.source,'Player Command');
    for(let i=0;i<Math.ceil(.45/step);i++) c.update(step);
    assert.ok(c.root.position.distanceTo(before)>.005 || Math.abs(c.root.rotation.y)>.01);
    until(c,()=>c.readPhase==='settle',step);
    assert.equal(c.state,'Walk'); assert.ok(Math.cos(c.root.rotation.y-readLayout.reading.heading)>.999);
    const durations={settle:0,read:0,finish:0}; let previous=c.readPhase;
    while(c.state!=='Idle') {
      const timer=c.readElapsed, target=c.target.toArray();
      assert.equal(c.requestRead(),false); assert.equal(c.requestSleep(),false); assert.equal(c.requestWindowObserve(),false);
      assert.equal(c.readElapsed,timer); assert.deepEqual(c.target.toArray(),target);
      durations[previous]+=step; c.update(step); previous=c.readPhase;
    }
    for(const phase of ['settle','read','finish']) {
      const expected=phase==='read'?READ.duration:READ[phase];
      assert.ok(durations[phase]>=expected-1e-8 && durations[phase]<expected+step*2,`${phase}: ${durations[phase]}`);
    }
    assert.equal(c.target,null);assert.equal(c.source,'Autonomous');assert.equal(c.readCooldownRemaining,30);neutral(c);
    assert.equal(c.requestRead(),true,'player bypasses cooldown');
  }
});

test('SB-T03: first full walk, 3:1:1 candidates, three-walk cap and independent cooldowns',()=>{
  for(const [random,expected,walkCount] of [[0,'Bed',1],[.3,'Bookshelf',1],[.99,'Bookshelf',3]]) {
    const c=make(()=>random);let walks=0,last='Idle';
    until(c,()=>{if(last==='Idle'&&c.state==='Walk'&&c.targetLabel==='Room')walks++;last=c.state;return ['Bed','Bookshelf'].includes(c.targetLabel);});
    assert.equal(c.targetLabel,expected);assert.equal(walks,walkCount);assert.equal(c.source,'Autonomous');
  }
  const c=make();until(c,()=>c.readPhase==='read');assert.equal(c.requestRead(),false);assert.equal(c.source,'Autonomous');
  until(c,()=>c.state==='Idle');
  for(let i=0;i<29/dt;i++){c.update(dt);assert.notEqual(c.targetLabel,'Bookshelf');}
  until(c,()=>c.readPhase==='read');
});

test('SB-T06: autonomous approach/open/read/finish safely exit to Window or Bed',()=>{
  for(const target of ['Window','Bed']) for(const phase of ['approach','settle','read','finish']) {
    const c=make();until(c,()=>c.readPhase===phase);
    if(phase==='settle') for(let i=0;i<10;i++) c.update(dt);
    if(phase==='read') until(c,()=>c.readElapsed>=3.4);
    const before=c.root.position.clone(),book=c.root.getObjectByName('ReadingBook'),scale=book.scale.x;
    assert.equal(target==='Window'?c.requestWindowObserve():c.requestSleep(),true);
    assert.deepEqual(c.root.position.toArray(),before.toArray()); assert.equal(book.scale.x,scale);
    assert.equal(c.source,'Player Command');assert.equal(c.requestRead(),false);
    if(scale>0) {
      assert.equal(c.action,'Putting book away');
      until(c,()=>!c.readPhase);neutral(c);
      assert.deepEqual(c.root.position.toArray(),before.toArray(),'root stays anchored until neutral');
    }
    until(c,()=>target==='Window'?c.state==='Observe':c.sleepPhase==='sleep');
    assert.equal(book.visible,false);
    until(c,()=>c.state==='Idle');
  }
});

test('SB-T10: autonomous Sleep exits safely to Read; active player Sleep/Observe rejects Bookshelf',()=>{
  for(const phase of ['approach','settle','sleep','wake']) {
    const c=make(()=>0);until(c,()=>c.sleepPhase===phase);
    if(phase==='settle')for(let i=0;i<15;i++)c.update(dt);
    assert.equal(c.requestRead(),true);until(c,()=>c.readPhase==='read');
    assert.equal(c.sleepPhase,null);
    assert.deepEqual(c.root.getObjectByName('FoxVisual').position.toArray(),[0,0,0]);
    assert.equal(c.root.getObjectByName('ReadingBook').visible,true);
    until(c,()=>c.state==='Idle');neutral(c);
  }
  for(const target of ['Bed','Window']) {
    const c=make();target==='Bed'?c.requestSleep():c.requestWindowObserve();
    until(c,()=>target==='Bed'?c.sleepPhase==='sleep':c.state==='Observe');
    assert.equal(c.requestRead(),false);until(c,()=>c.state==='Idle');assert.equal(c.requestRead(),true);
  }
});

test('SB-T07: full Read and departure envelope clears furniture across starts, headings and rates',()=>{
  const {scene}=createScene();const blockers=[];
  scene.traverse(o=>{if(o instanceof THREE.Mesh){const box=new THREE.Box3().setFromObject(o,true);if(box.max.y>.05)blockers.push({box,name:o.name});}});
  for(const step of [1/20,1/60,1/144]) for(const start of [[-1.6,0,-1],[1.6,0,1.3],[0,0,0]]) for(const heading of [0,Math.PI]) {
    const c=make();c.root.position.fromArray(start);c.root.rotation.y=heading;c.requestRead();let sawRead=false,done=false;
    for(let i=0;i<50/step;i++) {
      c.update(step);c.root.updateMatrixWorld(true);
      c.root.traverse(o=>{
        assert.ok([...o.position,...o.scale,o.rotation.x,o.rotation.y,o.rotation.z].every(Number.isFinite));
        if(o instanceof THREE.Mesh && i%4===0){const box=new THREE.Box3().setFromObject(o,true);
          assert.ok(box.min.y>=-.005,'floor clearance');
          for(const b of blockers)assert.ok(!box.intersectsBox(b.box),`${c.action} collision ${b.name} root=${c.root.position.toArray()} mesh=${o.parent?.name}`);
        }
      });
      sawRead ||= c.state==='Read';
      if(sawRead&&c.targetLabel==='Room'&&c.root.position.x<1.5){done=true;break;}
    }
    assert.ok(done,'returns to autonomous walking');
  }
});

test('SB-T07: page turn, supported book, bounded pose transitions and no Read residue',()=>{
  for(const step of [1/20,1/60,1/144]) {
    const c=make();c.requestRead();until(c,()=>c.readPhase==='settle',step);
    const head=c.root.getObjectByName('FoxHead'),arms=['FoxArmL','FoxArmR'].map(n=>c.root.getObjectByName(n));
    const book=c.root.getObjectByName('ReadingBook'),page=c.root.getObjectByName('ReadingPage');
    let previous=[head.rotation.x,...arms.map(a=>a.rotation.x)],sawTurn=false;
    while(c.state!=='Idle') {
      c.update(step);const angles=[head.rotation.x,...arms.map(a=>a.rotation.x)];
      angles.forEach((a,i)=>assert.ok(Math.abs(a-previous[i])<step*8,'smooth pose blend'));previous=angles;
      if(c.readPhase==='read') {
        assert.ok(head.rotation.x>.35&&head.rotation.x<.42);assert.ok(arms.every(a=>a.rotation.x< -1.2 && a.rotation.x> -1.35));
        assert.equal(book.visible,true);sawTurn ||= page.rotation.z>1&&page.rotation.z<2;
        c.root.updateMatrixWorld(true);
        const headBox=new THREE.Box3().setFromObject(head.children[0],true);
        assert.ok(!new THREE.Box3().setFromObject(page,true).intersectsBox(headBox),'turning page clears lowered head');
        const torso=head.parent.children[0];
        assert.ok(!new THREE.Box3().setFromObject(book,true).intersectsBox(new THREE.Box3().setFromObject(torso,true)),'book clears chest');
        for(const arm of arms){const hand=arm.localToWorld(new THREE.Vector3(arm.position.x<0?-.05:.05,-.35,0));
          assert.ok(hand.distanceTo(book.localToWorld(new THREE.Vector3(arm.position.x<0?-.24:.24,0,0)))<.11,'hands support book edges');}
      }
    }
    assert.ok(sawTurn);neutral(c);
  }
});

test('SB-T02: Read takes priority from three actual autonomous walking positions',()=>{
  let seed=817;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const starts=[];
  for(const elapsed of [.4,1.2,2.0]) {
    const c=make(random);until(c,()=>c.state==='Walk'&&c.targetLabel==='Room');
    for(let t=0;t<elapsed;t+=dt)c.update(dt);
    if(c.state!=='Walk') { until(c,()=>c.state==='Walk'&&c.targetLabel==='Room'); for(let i=0;i<12;i++)c.update(dt); }
    const before=c.root.position.clone(),oldTarget=c.target;
    starts.push(before.toArray());assert.equal(c.requestRead(),true);
    assert.equal(c.source,'Player Command');assert.equal(c.targetLabel,'Bookshelf');assert.ok(c.target.distanceTo(oldTarget)>.1);
    assert.deepEqual(c.root.position.toArray(),before.toArray());until(c,()=>c.readPhase==='read');until(c,()=>c.state==='Idle');neutral(c);
  }
  assert.equal(new Set(starts.map(p=>p.join(','))).size,3);
});

test('SB-T12: hidden foreground clock does not consume approach, open, read, finish or cooldown',()=>{
  for(const phase of ['approach','settle','read','finish',null]) {
    const c=make();c.requestRead();until(c,()=>c.readPhase===phase);
    const snapshot=()=>[c.root.position.toArray(),c.readElapsed,c.readCooldownRemaining,c.sleepCooldownRemaining,c.root.getObjectByName('ReadingBook').scale.x];
    const before=snapshot(),clock=new FrameClock();clock.tick(1000,false);c.update(clock.tick(21000,true));clock.reset();c.update(clock.tick(31000,false));
    assert.deepEqual(snapshot(),before);
  }
});

test('SB-T08: only visible shelf/books hit; unrelated cabinet, occlusion, drag, cancel and dispose reject',()=>{
  class Canvas extends EventTarget {getBoundingClientRect(){return {left:0,top:0,width:500,height:500};}}
  const canvas=new Canvas(),{scene,readingParts}=createScene();
  const camera=new THREE.PerspectiveCamera(45,1,.1,30);camera.position.set(0,1.2,-.3);camera.lookAt(3.5,1.2,-.3);camera.updateMatrixWorld();
  let hits=0;const dispose=bindClickInteraction(canvas,camera,scene,readingParts,()=>hits++);
  const event=(type,x,y)=>{const e=new Event(type);Object.assign(e,{clientX:x,clientY:y,button:0,isPrimary:true,pointerId:1});canvas.dispatchEvent(e);};
  function click(position,drag=false,cancel=false){const point=position.clone().project(camera),x=(point.x+1)*250,y=(1-point.y)*250;event('pointerdown',x,y);if(drag)event('pointermove',x+20,y);if(cancel)event('pointercancel',x,y);event('pointerup',x,y);}
  const book=readingParts.find(p=>p.name==='ShelfBook');
  click(book.position);assert.equal(hits,1);
  click(readingParts[2].position);assert.equal(hits,2);
  click(new THREE.Vector3(3.14,.4,-.3));assert.equal(hits,2,'cabinet not a Read target');
  click(book.position,true);click(book.position,false,true);assert.equal(hits,2);
  const blocker=new THREE.Mesh(new THREE.BoxGeometry(.3,2,2));blocker.position.set(2,1,-.3);scene.add(blocker);
  click(book.position);assert.equal(hits,2);scene.remove(blocker);
  dispose();click(book.position);assert.equal(hits,2);
});
