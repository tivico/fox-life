import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene } from './scene';
import { Character } from './Character';
import { bindWindowInteraction } from './WindowInteraction';
import { createDebugPanel } from './DebugPanel';
import './styles.css';

const host = document.querySelector<HTMLElement>('#app')!;
try {
  start();
} catch (error) {
  console.error(error);
  host.textContent = '無法啟動 3D 場景。請確認瀏覽器支援 WebGL 2 並啟用硬體加速，詳細資訊請查看 Console。';
}

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label', '3D 房間：拖曳環繞、滾輪縮放、點擊窗戶');
  host.append(renderer.domElement);
  const { scene, camera, windowPane, windowParts } = createScene();
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
  const character = new Character();
  scene.add(character.root);
  let windowHits = 0;
  const unbind = bindWindowInteraction(renderer.domElement, camera, scene, windowParts, () => {
    windowHits++;
    windowPane.material.color.set(windowHits % 2 ? '#e8c779' : '#7bb4be');
  });
  const debug = createDebugPanel(host, () => controls.reset());
  let width = 0;
  let height = 0;
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  let previous = performance.now();
  let debugElapsed = 0;
  renderer.setAnimationLoop((now: number) => {
    // Pause simulation while hidden; cap resume delta to prevent jumps.
    const dt = document.hidden ? 0 : Math.min(Math.max((now - previous) / 1000, 0), 0.05);
    previous = now;
    character.update(dt);
    controls.update();
    renderer.render(scene, camera);
    debugElapsed += dt;
    if (debugElapsed >= 0.1) {
      debug.update(character, windowHits, width, height);
      debugElapsed = 0;
    }
  });
  import.meta.hot?.dispose(() => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    unbind();
    controls.dispose();
    debug.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach(material => materials.add(material));
      }
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  });
}
