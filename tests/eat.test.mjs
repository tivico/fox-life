import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { eatLayout, createScene } from '../src/scene.ts';
import { EAT } from '../src/eat.ts';
import { FrameClock } from '../src/FrameClock.ts';
import { bindEatInteraction } from '../src/EatInteraction.ts';

const dt=1/60;
const make=(random=()=>.4)=>new Character(eatLayout,random);
function until(c,predicate,step=dt,limit=150) {
  let t=0;while(!predicate()&&t<limit){c.update(step);t+=step;}
  assert.ok(predicate(),`${c.action}: ${c.root.position.toArray()}`);return t;
}
function neutral(c) {
  for(const name of ['EatingBowl','EatingBite','ReadingBook']) {
    const prop=c.root.getObjectByName(name);assert.equal(prop.visible,false);assert.equal(prop.scale.x,0);
  }
  for(const name of ['FoxHead','FoxArmL','FoxArmR']) assert.ok(Math.abs(c.root.getObjectByName(name).rotation.x)<.05,`${name} residual`);
  for(const [name,roll] of [['FoxArmL',-.08],['FoxArmR',.08]]) {
    const arm=c.root.getObjectByName(name);
    assert.ok(Math.abs(arm.rotation.z-roll)<1e-9,'Eat inward roll cleared');
    assert.equal(arm.position.z,0,'Eat shoulder reach cleared');
  }
  assert.deepEqual(c.root.getObjectByName('FoxVisual').position.toArray(),[0,0,0]);
  c.root.traverse(o=>{if(o.morphTargetInfluences)assert.ok(o.morphTargetInfluences.every(v=>v===0));});
}
const commands={Window:c=>c.requestWindowObserve(),Bed:c=>c.requestSleep(),Bookshelf:c=>c.requestRead(),Food:c=>c.requestEat()};
const active={Window:c=>c.state==='Observe',Bed:c=>c.sleepPhase==='sleep',Bookshelf:c=>c.readPhase==='read',Food:c=>c.eatPhase==='eat'};

test('SC-T02/04/05: three starts, three frame rates, timed player meal, no restart or queue',()=>{
  for(const step of [1/20,1/60,1/144]) for(const start of [[-1.6,0,-1],[1.6,0,1.3],[0,0,0]]) {
    const c=make();c.root.position.fromArray(start);const before=c.root.position.clone();
    assert.equal(c.requestEat(),true);assert.deepEqual(c.root.position.toArray(),before.toArray());
    assert.equal(c.action,'Walk to dining area');assert.equal(c.targetLabel,'Food');
    for(let t=0;t<.45;t+=step){assert.equal(c.requestEat(),false);c.update(step);}
    assert.ok(c.root.position.distanceTo(before)>.005||Math.abs(c.root.rotation.y)>.01);
    until(c,()=>c.eatPhase==='settle',step);
    assert.equal(c.state,'Walk');assert.equal(c.targetLabel,'DiningArea');
    assert.ok(Math.cos(c.root.rotation.y-eatLayout.dining.heading)>.999);
    const durations={settle:0,eat:0,finish:0};
    while(c.state!=='Idle') {
      const timer=c.eatElapsed,target=c.target.toArray();
      for(const command of Object.values(commands))assert.equal(command(c),false);
      assert.equal(c.eatElapsed,timer);assert.deepEqual(c.target.toArray(),target);
      durations[c.eatPhase]+=step;c.update(step);
    }
    for(const phase of Object.keys(durations)) {
      const expected=phase==='eat'?EAT.duration:EAT[phase];
      assert.ok(durations[phase]>=expected-1e-8&&durations[phase]<expected+step*2);
    }
    assert.equal(c.target,null);assert.equal(c.source,'Autonomous');assert.equal(c.eatCooldownRemaining,30);neutral(c);
    assert.equal(c.requestEat(),true,'player ignores cooldown');
  }
});

test('SC-T03: 3:1:1:1 chooser, initial walk, three-walk cap, complete autonomous meal and cooldown',()=>{
  for(const [random,target,count] of [[0,'Bed',1],[.2,'Bookshelf',1],[.4,'Food',1],[.99,'Food',3]]) {
    const c=make(()=>random);let walks=0,last='Idle';
    until(c,()=>{if(last==='Idle'&&c.state==='Walk'&&c.targetLabel==='Room')walks++;last=c.state;return ['Bed','Bookshelf','Food'].includes(c.targetLabel);});
    assert.equal(c.targetLabel,target);assert.equal(walks,count);assert.equal(c.source,'Autonomous');
  }
  let choice=.4;const c=make(()=>choice);until(c,()=>c.eatPhase==='eat');assert.equal(c.requestEat(),false);assert.equal(c.source,'Autonomous');
  until(c,()=>c.state==='Idle');neutral(c);
  for(let i=0;i<29/dt;i++){c.update(dt);assert.equal(c.eatPhase,null);}
  choice=.99;until(c,()=>c.eatPhase==='eat');
});

test('SC-T06: autonomous approach, partial smell, bite, chew and finish safely exit to all three commands',()=>{
  for(const target of ['Window','Bed','Bookshelf']) for(const [phase,time] of [['approach',0],['settle',.2],['eat',.7],['eat',3.1],['finish',.1]]) {
    let choice=.4;const c=make(()=>choice);until(c,()=>c.eatPhase===phase&&c.eatElapsed>=time);
    const before=c.root.position.clone(),arm=c.root.getObjectByName('FoxArmR'),angle=arm.rotation.x;
    const hadPose=c.root.getObjectByName('EatingBowl').visible;
    assert.equal(commands[target](c),true);assert.equal(arm.rotation.x,angle);assert.equal(c.source,'Player Command');
    for(const command of Object.values(commands))assert.equal(command(c),false);
    if(hadPose) {
      assert.equal(c.action,'Finishing meal');const exitDuration=until(c,()=>!c.eatPhase);
      assert.ok(exitDuration<=.36);neutral(c);assert.deepEqual(c.root.position.toArray(),before.toArray());
    }
    until(c,()=>active[target](c));assert.equal(c.root.getObjectByName('EatingBite').visible,false);
    until(c,()=>c.state==='Idle');for(let i=0;i<60;i++)c.update(dt);neutral(c);
  }
});

test('SC-T10: accepted Sleep/Read safe exits to Eat, player action locks, and cross-action cleanup',()=>{
  for(const [random,getPhase,phases] of [[0,c=>c.sleepPhase,['approach','settle','sleep','wake']],[.2,c=>c.readPhase,['approach','settle','read','finish']]]) {
    for(const phase of phases) {
      const c=make(()=>random);until(c,()=>getPhase(c)===phase);
      if(phase==='settle')for(let i=0;i<10;i++)c.update(dt);
      assert.equal(c.requestEat(),true);until(c,()=>c.eatPhase==='eat');
      assert.equal(c.sleepPhase,null);assert.equal(c.readPhase,null);
      assert.equal(c.root.getObjectByName('ReadingBook').visible,false);
      assert.deepEqual(c.root.getObjectByName('FoxVisual').position.toArray(),[0,0,0]);
      until(c,()=>c.state==='Idle');neutral(c);
    }
  }
  for(const target of ['Window','Bed','Bookshelf']) {
    const c=make();commands[target](c);until(c,()=>active[target](c));
    assert.equal(c.requestEat(),false);until(c,()=>c.state==='Idle');for(let i=0;i<60;i++)c.update(dt);neutral(c);
  }
});

test('SC-T07: full meal plus departure clears every furniture mesh at 20/60/144 Hz',()=>{
  const {scene}=createScene(),blockers=[];
  scene.traverse(o=>{if(o instanceof THREE.Mesh){const box=new THREE.Box3().setFromObject(o,true);if(box.max.y>.05)blockers.push({box,name:o.name});}});
  for(const step of [1/20,1/60,1/144])for(const start of [[-1.6,0,-1],[1.6,0,1.3],[0,0,0]])for(const heading of [0,Math.PI]) {
    const c=make();c.root.position.fromArray(start);c.root.rotation.y=heading;c.requestEat();let saw=false,done=false;
    for(let i=0;i<55/step;i++) {
      c.update(step);c.root.updateMatrixWorld(true);
      c.root.traverse(o=>{
        assert.ok([...o.position,...o.scale,o.rotation.x,o.rotation.y,o.rotation.z].every(Number.isFinite));
        if(o instanceof THREE.Mesh&&i%4===0){const box=new THREE.Box3().setFromObject(o,true);
          assert.ok(box.min.y>=-.005,'floor');
          for(const b of blockers)assert.ok(!box.intersectsBox(b.box),`${c.action} collision ${b.name} ${o.parent?.name} at ${c.root.position.toArray()}`);
        }
      });
      saw ||= c.state==='Eat';if(saw&&c.targetLabel==='Room'&&c.root.position.x<1.5){done=true;break;}
    }
    assert.ok(done,'autonomous departure');
  }
});

test('SC-T07: three distinct hand-to-mouth phrases, prop support, bounded blends and exact reset',()=>{
  for(const step of [1/20,1/60,1/144]) {
    const c=make();c.requestEat();until(c,()=>c.eatPhase==='settle',step);
    const arm=c.root.getObjectByName('FoxArmR'),head=c.root.getObjectByName('FoxHead');
    const bite=c.root.getObjectByName('EatingBite'),bowl=c.root.getObjectByName('EatingBowl');
    let previous=[head.rotation.x,arm.rotation.x],raised=false,phrases=0;
    while(c.state!=='Idle') {
      c.update(step);const angles=[head.rotation.x,arm.rotation.x];
      angles.forEach((a,i)=>assert.ok(Math.abs(a-previous[i])<step*10,'continuous pose'));previous=angles;
      if(c.eatPhase==='eat') {
        const high=arm.rotation.x< -1.45;if(high&&!raised)phrases++;raised=high;
        assert.equal(bowl.visible,true);assert.equal(bite.parent,arm);
        c.root.updateMatrixWorld(true);
        const torso=head.parent.children[0];
        assert.ok(!new THREE.Box3().setFromObject(bowl,true).intersectsBox(new THREE.Box3().setFromObject(torso,true)),'bowl clears torso');
        // The muzzle and cheek AABB includes empty corners. Check sampled food
        // surface vertices against the actual star-shaped head surface instead.
        if(bite.scale.x>.01) {
          const face=head.children[0],food=bite.children[0],origin=face.getWorldPosition(new THREE.Vector3());
          const side=face.material.side;face.material.side=THREE.DoubleSide;
          try {
            for(let v=0;v<food.geometry.attributes.position.count;v+=12) {
              const point=food.localToWorld(food.getVertexPosition(v,new THREE.Vector3()));
              const ray=new THREE.Raycaster(origin,point.clone().sub(origin).normalize());
              const hit=ray.intersectObject(face,false)[0];
              assert.ok(hit&&point.distanceTo(origin)>=hit.distance+.002,`bite penetrates head at ${c.eatElapsed.toFixed(3)}`);
            }
          } finally {face.material.side=side;}
        }
        const left=c.root.getObjectByName('FoxArmL');
        const hand=left.localToWorld(new THREE.Vector3(-.05,-.35,0));
        assert.ok(hand.distanceTo(bowl.localToWorld(new THREE.Vector3(-.17,.06,0)))<.12,'left paw supports bowl');
      }
    }
    assert.equal(phrases,3);neutral(c);
  }
});

test('SC-T07/10: all dining cross-action approach and departure routes keep furniture clearance',()=>{
  const {scene}=createScene(),blockers=[];
  scene.traverse(o=>{if(o instanceof THREE.Mesh){const box=new THREE.Box3().setFromObject(o,true);if(box.max.y>.05)blockers.push({box,name:o.name});}});
  for(const order of [['Food','Window','Food'],['Food','Bed','Food'],['Food','Bookshelf','Food']]) {
    const c=make();
    for(const target of order) {
      assert.equal(commands[target](c),true);let done=false;
      for(let i=0;i<50/dt;i++) {
        c.update(dt);c.root.updateMatrixWorld(true);
        // Bed contact/morph clearance is covered by the original dedicated Sleep tests.
        if((!c.sleepPhase||c.sleepPhase==='approach')&&i%4===0)c.root.traverse(o=>{
          if(o instanceof THREE.Mesh){const box=new THREE.Box3().setFromObject(o,true);
            for(const b of blockers)assert.ok(!box.intersectsBox(b.box),`${target}: ${c.action} intersects ${b.name} (${o.parent?.name})`);
          }
        });
        if(c.state==='Idle'){done=true;break;}
      }
      assert.ok(done);
    }
  }
});

// Surface samples use the rendered mesh transforms, including morph positions.
// AABBs only reject impossible candidates; they never establish penetration.
function surfacePoints(mesh) {
  const points=[],position=mesh.geometry.attributes.position,index=mesh.geometry.index;
  for(let i=0;i<position.count;i++)points.push(mesh.localToWorld(mesh.getVertexPosition(i,new THREE.Vector3())));
  const count=index?.count??position.count;
  for(let i=0;i<count;i+=3) {
    const a=points[index?index.getX(i):i],b=points[index?index.getX(i+1):i+1],c=points[index?index.getX(i+2):i+2];
    points.push(a.clone().add(b).add(c).multiplyScalar(1/3));
  }
  return points;
}
function assertOutside(points,mesh,label) {
  const box=new THREE.Box3().setFromObject(mesh,true),direction=new THREE.Vector3(1,.173,.319).normalize();
  const old=mesh.material.side;mesh.material.side=THREE.DoubleSide;
  try {
    for(const point of points) {
      if(!box.containsPoint(point))continue;
      const ray=new THREE.Raycaster(point,direction),hits=[];
      // Call the actual mesh surface routine; invisible-prop interaction overrides
      // must not turn the geometry test into a visibility-only test.
      THREE.Mesh.prototype.raycast.call(mesh,ray,hits);hits.sort((a,b)=>a.distance-b.distance);
      const distances=hits.map(h=>h.distance).filter((d,i,a)=>i===0||d-a[i-1]>1e-6);
      assert.ok(distances.length%2===0||distances[0]<.002,`${label}: surface sample inside solid`);
    }
  } finally {mesh.material.side=old;}
}

test('PO polish: bowl rim clears bib/body/limbs and each bite reaches the lower muzzle without face penetration',()=>{
  const sampleTimes=[0,.15,.35,.55,.70,.80,.90,1.05,1.25,1.65,2.50,2.60,2.70,3.00,4.75,4.85,4.95,5.25,5.80];
  for(const step of [1/20,1/60,1/144]) {
    const c=make();c.requestEat();until(c,()=>c.eatPhase==='eat',step);
    const head=c.root.getObjectByName('FoxHead'),bowl=c.root.getObjectByName('EatingBowl'),bite=c.root.getObjectByName('EatingBite');
    const arm=c.root.getObjectByName('FoxArmR'),left=c.root.getObjectByName('FoxArmL');
    const bodyMeshes=head.parent.children.filter(o=>o instanceof THREE.Mesh);
    const solids=[...bodyMeshes,...left.children.filter(o=>o instanceof THREE.Mesh),...arm.children.filter(o=>o instanceof THREE.Mesh)];
    for(const name of ['FoxLegL','FoxLegR'])solids.push(...c.root.getObjectByName(name).children);
    let peaks=0;
    for(const t of sampleTimes) {
      until(c,()=>c.eatElapsed>=t,step);c.root.updateMatrixWorld(true);
      const bowlSurface=surfacePoints(bowl.children[0]);
      for(const mesh of solids) {
        assertOutside(bowlSurface,mesh,`bowl at ${t} vs ${mesh.parent.name||'torso/bib/straps'}`);
        assertOutside(surfacePoints(mesh),bowl.children[0],`body at ${t} vs bowl solid`);
      }
      if(bite.scale.x>.01) {
        const foodSurface=surfacePoints(bite.children[0]);
        for(const mesh of head.children.filter(o=>o instanceof THREE.Mesh))assertOutside(foodSurface,mesh,`food at ${t} vs face/nose`);
        assertOutside(surfacePoints(arm.children[0]),head.children[0],`paw at ${t} vs face`);
      }
      if([.80,2.60,4.85].includes(t)) {
        peaks++;
        const mouth=head.localToWorld(new THREE.Vector3(0,-.13,.40)),food=bite.getWorldPosition(new THREE.Vector3());
        const hand=arm.localToWorld(new THREE.Vector3(.05,-.35,0));
        assert.ok(food.distanceTo(mouth)<.085,'food center within muzzle reach');
        assert.ok(hand.distanceTo(mouth)<.11,'whole paw follows food');
        assert.ok(bite.scale.x>.99,'food remains visible during mouth pause');
        assert.ok(Math.abs(head.worldToLocal(food).x)<.04,'food aligned with muzzle, not cheek');
      }
    }
    assert.equal(peaks,3);until(c,()=>c.state==='Idle',step);neutral(c);
  }
});

test('SC-T02: player food interrupts three actual autonomous walk positions',()=>{
  let seed=783;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const starts=[];
  for(const elapsed of [.3,.7,1.2]) {
    const c=make(random);until(c,()=>c.state==='Walk'&&c.targetLabel==='Room');
    for(let t=0;t<elapsed;t+=dt)c.update(dt);
    const before=c.root.position.clone();starts.push(before.toArray());assert.equal(c.requestEat(),true);
    assert.deepEqual(c.root.position.toArray(),before.toArray());until(c,()=>c.eatPhase==='eat');until(c,()=>c.state==='Idle');neutral(c);
  }
  assert.equal(new Set(starts.map(p=>p.join(','))).size,3);
});

test('SC-T12: hidden clock preserves approach, smell, eating, finish and cooldown',()=>{
  for(const phase of ['approach','settle','eat','finish',null]) {
    const c=make();c.requestEat();until(c,()=>c.eatPhase===phase);
    const snapshot=()=>[c.root.position.toArray(),c.eatElapsed,c.eatCooldownRemaining,c.root.getObjectByName('EatingBowl').scale.x];
    const before=snapshot(),clock=new FrameClock();clock.tick(1000,false);c.update(clock.tick(21000,true));clock.reset();c.update(clock.tick(31000,false));
    assert.deepEqual(snapshot(),before);
  }
});

test('SC-T08: food and designated surface only, occlusion, drag, cancel and cleanup',()=>{
  class Canvas extends EventTarget {getBoundingClientRect(){return {left:0,top:0,width:500,height:500};}}
  const canvas=new Canvas(),{scene,foodParts,readingParts,bedParts}=createScene();
  const camera=new THREE.PerspectiveCamera(45,1,.1,30);camera.position.set(0,4,6);camera.lookAt(2,0,1);camera.updateMatrixWorld();
  let hits=0;const dispose=bindEatInteraction(canvas,camera,scene,foodParts,()=>hits++);
  const event=(type,x,y)=>{const e=new Event(type);Object.assign(e,{clientX:x,clientY:y,button:0,isPrimary:true,pointerId:1});canvas.dispatchEvent(e);};
  function click(position,drag=false,cancel=false){const p=position.clone().project(camera),x=(p.x+1)*250,y=(1-p.y)*250;event('pointerdown',x,y);if(drag)event('pointermove',x+20,y);if(cancel)event('pointercancel',x,y);event('pointerup',x,y);}
  click(foodParts[1].position);assert.equal(hits,1);
  click(new THREE.Vector3(3.55,.66,1.95));assert.equal(hits,2);
  click(readingParts[6].position);click(bedParts[1].position);click(new THREE.Vector3(3.15,.8,-.3));assert.equal(hits,2);
  click(foodParts[1].position,true);click(foodParts[1].position,false,true);assert.equal(hits,2);
  const blocker=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));blocker.position.copy(foodParts[1].position).lerp(camera.position,.3);scene.add(blocker);
  click(foodParts[1].position);assert.equal(hits,2);scene.remove(blocker);
  dispose();click(foodParts[1].position);assert.equal(hits,2);
});
