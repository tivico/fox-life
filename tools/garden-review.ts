import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Character } from '../src/Character.ts';
import { createScene, gardenHomeLayout } from '../src/scene.ts';
import { gardenDurations, type GardenAction } from '../src/GardenActivity.ts';

const { scene, camera, balcony } = createScene({ expanded: true, garden: true });
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
  const center = action.value === 'WaterPlants' ? new THREE.Vector3(6, .7, -1.6)
    : action.value === 'GardenRest' ? new THREE.Vector3(7.5, .9, 1.1) : new THREE.Vector3(7.9, .8, -.2);
  controls.target.copy(center);
  const offset = angle === 'top' ? new THREE.Vector3(0, 3.8, .001)
    : angle === 'front' ? new THREE.Vector3(.6, 1.5, -3.6) : new THREE.Vector3(3.3, 1.8, -.7);
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
  fox = new Character(gardenHomeLayout, () => .45); scene.add(fox.root);
  fox.requestGardenAction(action.value as GardenAction);
  const seconds = Number(time.value); label.value = `${seconds.toFixed(2)} 秒`;
  for (let frame = 0; frame < 150 * 60; frame++) {
    fox.update(1 / 60); balcony!.update(1 / 60, false, fox.gardenActivity);
    if (fox.gardenActivity?.phase === phase.value && fox.gardenActivity.elapsed >= seconds) break;
    if (fox.state === 'Idle') break;
  }
  scene.updateMatrixWorld(true); renderer.render(scene, camera);
}
function changeAction() {
  time.max = String(phase.value === 'active' ? gardenDurations[action.value as GardenAction] - .05 : 1.45);
  time.value = String(Math.min(Number(time.value), Number(time.max)));
  focus(); renderPose();
}
action.addEventListener('change', changeAction); phase.addEventListener('change', changeAction); time.addEventListener('input', renderPose);
document.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(button => button.addEventListener('click', () => { angle = button.dataset.angle!; focus(); }));
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); changeAction();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
