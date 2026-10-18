import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Character } from '../src/Character.ts';
import { createScene, expandedHomeLayout } from '../src/scene.ts';
import { livingDurations, type LivingAction } from '../src/LivingActivity.ts';

const { scene, camera, livingRoom } = createScene({ expanded: true });
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
document.body.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
const action = document.querySelector<HTMLSelectElement>('#action')!;
const phase = document.querySelector<HTMLSelectElement>('#phase')!;
const time = document.querySelector<HTMLInputElement>('#time')!;
const label = document.querySelector<HTMLOutputElement>('#time-label')!;
let fox: Character | null = null, angle = 'side';
function focus() {
  const tidy = action.value === 'TidySofa';
  const center = tidy ? new THREE.Vector3(-2.5, .85, 7.3) : new THREE.Vector3(.35, .8, 6.35);
  controls.target.copy(center);
  const offset = angle === 'top' ? new THREE.Vector3(0, 3.2, .001)
    : angle === 'front' ? tidy ? new THREE.Vector3(-2.7, 1.9, -.8) : new THREE.Vector3(.7, 1.3, 3)
      : tidy ? new THREE.Vector3(1, 1.4, 2.7) : new THREE.Vector3(2.8, 1.2, .8);
  camera.position.copy(center).add(offset); controls.update();
}
function renderPose() {
  if (fox) {
    scene.remove(fox.root); fox.dispose();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    fox.root.traverse(object => { if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    } });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  }
  fox = new Character(expandedHomeLayout, () => .45); scene.add(fox.root);
  fox.requestLivingAction(action.value as LivingAction);
  const seconds = Number(time.value); label.value = `${seconds.toFixed(2)} 秒`;
  // Advance real navigation and action clocks, then freeze the requested frame.
  for (let frame = 0; frame < 150 * 60; frame++) {
    fox.update(1 / 60); livingRoom!.update(1 / 60, false, fox.livingActivity);
    if (fox.livingActivity?.phase === phase.value && fox.livingActivity.elapsed >= seconds) break;
    if (fox.state === 'Idle') break;
  }
  scene.updateMatrixWorld(true); renderer.render(scene, camera);
}
function changeAction() {
  time.max = String(phase.value === 'active' ? livingDurations[action.value as LivingAction] - .05 : 1.3);
  time.value = String(Math.min(Number(time.value), Number(time.max)));
  focus(); renderPose();
}
action.addEventListener('change', changeAction); phase.addEventListener('change', changeAction);
time.addEventListener('input', renderPose);
document.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(button => button.addEventListener('click', () => {
  angle = button.dataset.angle!; focus();
}));
function resize() {
  renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize(); changeAction();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
