import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene, characterLayout } from './scene';
import { createFoxVisual } from './createFoxVisual';
import foxUrl from '../assets/fox-v01/fox_v01.glb?url';
import './styles.css';
import './asset-preview.css';

const host = document.querySelector<HTMLElement>('#app')!;
document.title = 'Fox Life · 狐狸造型預覽';
host.innerHTML = `<aside class="asset-review" aria-label="狐狸造型預覽">
  <span class="eyebrow">FOX LIFE · ASSET REVIEW</span>
  <h1>新狐狸，回到小家</h1>
  <p>在房間裡看看比例、顏色與輪廓。</p>
  <p id="asset-status" role="status">正在載入新狐狸…</p>
  <fieldset><legend>比較造型</legend>
    <button type="button" data-model="new" aria-pressed="true" disabled>新狐狸 GLB</button>
    <button type="button" data-model="old" aria-pressed="false" disabled>目前程序模型</button>
  </fieldset>
  <fieldset><legend>靜態站位</legend>
    <button type="button" data-position="center" aria-pressed="true" disabled>房間中央</button>
    <button type="button" data-position="bed" aria-pressed="false" disabled>床邊</button>
    <button type="button" data-position="window" aria-pressed="false" disabled>窗前</button>
  </fieldset>
  <p class="hint">拖曳環繞 · 滾輪縮放<br>兩個模型使用相同站位與鏡頭。</p>
  <button type="button" id="asset-reset">重設鏡頭</button>
  <p>這是靜態造型預覽，尚無走路或 Observe 動畫。</p>
  <a href="./">返回原本的互動場景</a>
</aside>`;

const status = host.querySelector<HTMLElement>('#asset-status')!;
let cleanup = () => {};
try {
  cleanup = start();
} catch (error) {
  status.textContent = '無法啟動 3D 預覽，請確認 WebGL 2／硬體加速並重新載入。';
  console.error(error);
}
import.meta.hot?.dispose(() => { cleanup(); host.replaceChildren(); });

function release(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
    }
    if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
}

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label', '狐狸靜態預覽：拖曳環繞、滾輪縮放');
  host.prepend(renderer.domElement);
  const { scene, camera } = createScene();
  // Match main.ts exactly: original room target, limits, lighting and framing.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.8, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 10;
  controls.maxDistance = 24;
  controls.minPolarAngle = Math.PI / 8;
  controls.maxPolarAngle = Math.PI / 2.5;
  controls.update();
  controls.saveState();
  const actor = new THREE.Group();
  scene.add(actor);
  const oldFox = createFoxVisual().root;
  oldFox.visible = false;
  actor.add(oldFox); // Do not call animate: both comparison models remain in neutral pose.
  let disposed = false;
  let newFox: THREE.Group | undefined;
  const reset = () => controls.reset();
  const resetButton = host.querySelector<HTMLButtonElement>('#asset-reset')!;
  resetButton.addEventListener('click', reset);
  const modelButtons = [...host.querySelectorAll<HTMLButtonElement>('[data-model]')];
  const positionButtons = [...host.querySelectorAll<HTMLButtonElement>('[data-position]')];
  const onModel = (event: Event) => {
    if (!newFox) return;
    const button = event.currentTarget as HTMLButtonElement;
    const useNew = button.dataset.model === 'new';
    newFox.visible = useNew;
    oldFox.visible = !useNew;
    modelButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    status.textContent = useNew ? '新狐狸 GLB · 高 1.30 m · 靜態' : '目前程序模型 · 靜態對照';
  };
  const onPosition = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    actor.position.set(0, 0, 0);
    actor.rotation.y = 0;
    if (button.dataset.position === 'bed') actor.position.set(-2.25, 0, 0.5);
    if (button.dataset.position === 'window') {
      actor.position.copy(characterLayout.windowPosition);
      actor.rotation.y = characterLayout.windowHeading;
    }
    positionButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  };
  modelButtons.forEach(b => b.addEventListener('click', onModel));
  positionButtons.forEach(b => b.addEventListener('click', onPosition));
  new GLTFLoader().loadAsync(foxUrl).then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    newFox = gltf.scene;
    newFox.traverse(object => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    actor.add(newFox); // GLB already uses meters, ground origin, +Y up and +Z forward.
    [...modelButtons, ...positionButtons].forEach(b => { b.disabled = false; });
    status.textContent = '新狐狸 GLB · 高 1.30 m · 靜態';
  }).catch(error => {
    if (disposed) return;
    status.textContent = '新狐狸載入失敗，請重新載入頁面。';
    console.error('Fox GLB preview load failed', error);
  });
  const resize = () => {
    const width = host.clientWidth;
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    controls.update();
    renderer.render(scene, camera);
  });
  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    resetButton.removeEventListener('click', reset);
    modelButtons.forEach(b => b.removeEventListener('click', onModel));
    positionButtons.forEach(b => b.removeEventListener('click', onPosition));
    controls.dispose();
    release(scene);
    renderer.dispose();
    renderer.domElement.remove();
  };
}
