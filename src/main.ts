import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene, readLayout } from './scene';
import { bindReadInteraction } from './ReadInteraction';
import { bindBedInteraction } from './BedInteraction';
import { Character } from './Character.ts';
import { bindWindowInteraction } from './WindowInteraction';
import { createDebugPanel } from './DebugPanel';
import { FrameClock } from './FrameClock.ts';
import { createPerformanceSample } from './PerformanceSample';
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
  renderer.domElement.setAttribute('aria-label', '3D 房間：拖曳環繞、滾輪縮放、點窗戶、床或書架');
  host.append(renderer.domElement);
  const { scene, camera, windowParts, bedParts, readingParts } = createScene();
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
  const character = new Character(readLayout);
  scene.add(character.root);
  let windowHits = 0;
  let bedHits = 0;
  let readHits = 0;
  const unbindRead = bindReadInteraction(renderer.domElement, camera, scene, readingParts, () => {
    readHits++;
    character.requestRead();
    debug.update(character, windowHits, width, height, bedHits, readHits);
  });
  const unbindBed = bindBedInteraction(renderer.domElement, camera, scene, bedParts, () => {
    bedHits++;
    character.requestSleep();
    debug.update(character, windowHits, width, height, bedHits, readHits);
  });
  const unbind = bindWindowInteraction(renderer.domElement, camera, scene, windowParts, () => {
    windowHits++;
    character.requestWindowObserve();
    debug.update(character, windowHits, width, height, bedHits, readHits);
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
  const frameClock = new FrameClock();
  const performanceSample = createPerformanceSample(host, renderer);
  const visibilityChanged = () => {
    frameClock.reset();
    if (document.hidden) performanceSample?.frame(performance.now(), true, character.state);
  };
  document.addEventListener('visibilitychange', visibilityChanged);
  renderer.setAnimationLoop((now: number) => {
    const dt = frameClock.tick(now, document.hidden);
    performanceSample?.frame(now, document.hidden, character.state);
    if (document.hidden) return;
    character.update(dt);
    controls.update();
    renderer.render(scene, camera);
    debug.update(character, windowHits, width, height, bedHits, readHits);
  });
  import.meta.hot?.dispose(() => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibilityChanged);
    performanceSample?.dispose();
    unbind();
    unbindBed();
    unbindRead();
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
