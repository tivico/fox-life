import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene } from './scene';
import { createFoxVisual } from './createFoxVisual';
import foxUrl from '../assets/fox-v02/fox_v02_static.glb?url';
import './styles.css';
import './v02-review.css';

// Asset-only review; the product Character and its state/animation loop are not instantiated.
const host = document.querySelector<HTMLElement>('#app')!;
host.classList.add('v02-review');
document.title = 'Fox Life · v02 色塊與服裝審核';
host.innerHTML = `<header class="v02-toolbar">
  <div><strong>fox_v02_static · 視覺審核</strong><span id="v02-status" role="status">正在載入…</span></div>
  <nav aria-label="比較視角">
    <button data-view="room" aria-pressed="true">房間</button>
    <button data-view="front" aria-pressed="false">正面</button>
    <button data-view="three-quarter" aria-pressed="false">3/4</button>
    <button data-view="side" aria-pressed="false">側面</button>
    <button id="v02-reset">重設視角</button>
    <a href="?preview=fox">查看 v01</a>
  </nav>
  <small>左：目前程序模型　｜　右：v02 GLB　·　同尺寸基準、同光線、同步鏡頭；靜態，尚無動畫。</small>
</header><div class="v02-stage"><div class="v02-labels"><span>目前程序模型</span><span>fox_v02_static · 待 PO 核准</span></div></div>`;
const stage = host.querySelector<HTMLElement>('.v02-stage')!;
const status = host.querySelector<HTMLElement>('#v02-status')!;
let dispose = () => {};
try { dispose = start(); } catch (error) {
  status.textContent = '預覽啟動失敗，請確認 WebGL 2 後重新載入。';
  console.error(error);
}
import.meta.hot?.dispose(() => { dispose(); host.classList.remove('v02-review'); host.replaceChildren(); });

function release(root: THREE.Object3D) {
  const geometry = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (object instanceof THREE.Mesh) {
      geometry.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
    }
    if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
  });
  geometry.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
}

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label', '並排狐狸比較：拖曳同步環繞、滾輪同步縮放');
  stage.append(renderer.domElement);
  const left = createScene();
  const right = createScene();
  left.scene.add(createFoxVisual().root);
  const controls = new OrbitControls(left.camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-view]')];
  let view = 'room';
  let width = 1;
  let height = 1;
  let disposed = false;
  const frame = () => {
    const camera = left.camera;
    controls.target.set(0, view === 'room' ? .8 : .68, 0);
    if (view === 'room') camera.position.set(8, 7, 10);
    if (view === 'front') camera.position.set(0, .78, 3.15);
    if (view === 'three-quarter') camera.position.set(2.5, 1.6, 3.2);
    if (view === 'side') camera.position.set(3.15, .78, 0);
    controls.minDistance = view === 'room' ? 10 : 2;
    controls.maxDistance = view === 'room' ? 24 : 9;
    controls.minPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = view === 'room' ? Math.PI / 2.5 : Math.PI / 2;
    controls.update();
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  };
  const choose = (event: Event) => {
    view = (event.currentTarget as HTMLButtonElement).dataset.view!;
    frame();
  };
  buttons.forEach(button => button.addEventListener('click', choose));
  const resetButton = host.querySelector<HTMLButtonElement>('#v02-reset')!;
  resetButton.addEventListener('click', frame);
  frame();
  new GLTFLoader().loadAsync(foxUrl).then(gltf => {
    if (disposed) { release(gltf.scene); return; }
    gltf.scene.name = 'fox_v02_static';
    gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    right.scene.add(gltf.scene);
    status.textContent = 'v02 已載入 · 7 個純色材質 · 靜態';
  }).catch(error => {
    if (!disposed) { status.textContent = 'v02 載入失敗，請重新載入。'; console.error(error); }
  });
  const resize = () => {
    width = Math.max(2, stage.clientWidth);
    height = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(width, height);
    left.camera.aspect = Math.floor(width / 2) / height;
    left.camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    controls.update();
    right.camera.copy(left.camera);
    const half = Math.floor(width / 2);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, half, height);
    renderer.setScissor(0, 0, half, height);
    renderer.render(left.scene, left.camera);
    renderer.setViewport(half, 0, width - half, height);
    renderer.setScissor(half, 0, width - half, height);
    renderer.render(right.scene, right.camera);
  });
  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    buttons.forEach(button => button.removeEventListener('click', choose));
    resetButton.removeEventListener('click', frame);
    controls.dispose();
    release(left.scene);
    release(right.scene);
    [...left.roomTextures, ...right.roomTextures].forEach(texture => texture.dispose());
    renderer.dispose();
  };
}
