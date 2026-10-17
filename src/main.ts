import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene, homeLayout } from './scene';
import { bindEatInteraction } from './EatInteraction';
import { bindReadInteraction } from './ReadInteraction';
import { bindBedInteraction } from './BedInteraction';
import { Character } from './Character.ts';
import { bindWindowInteraction } from './WindowInteraction';
import { createDebugPanel } from './DebugPanel';
import { FrameClock } from './FrameClock.ts';
import { createPerformanceSample } from './PerformanceSample';
import { createLifePanel } from './LifePanel';
import type { LifeAction } from './life.ts';
import { HomeAudio, AUDIO_KEY, LEGACY_AUDIO_KEY, audioPreferences } from './HomeAudio.ts';
import { homeAudioAssets } from './audioAssets.ts';
import { createSoundPanel } from './SoundPanel.ts';
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
  renderer.domElement.setAttribute('aria-label', '3D 房間：拖曳環繞、滾輪縮放、點窗戶、床、書架、餐碗、掃帚或毛線球');
  host.append(renderer.domElement);
  const { scene, camera, windowParts, bedParts, readingParts, foodParts, cleanParts, playParts, roomTextures, atmosphere } = createScene();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  const character = new Character(homeLayout);
  scene.add(character.root);
  const storedBroom = scene.getObjectByName('RoomBroom')!;
  let windowHits = 0;
  let bedHits = 0;
  let readHits = 0;
  let eatHits = 0;
  const request = (action: LifeAction) => {
    const accepted = action === 'Window' ? character.requestWindowObserve() :
      action === 'Bed' ? character.requestSleep() : action === 'Bookshelf' ? character.requestRead() :
      action === 'Food' ? character.requestEat() : action === 'Clean' ? character.requestClean() : character.requestPlay();
    life.commandResult(action, accepted);
  };
  const life = createLifePanel(host, character, request, () => controls.reset(), () => resize());
  let savedAudio: unknown;
  try { savedAudio = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? localStorage.getItem(LEGACY_AUDIO_KEY) ?? 'null'); } catch { /* Use quiet defaults. */ }
  const audio = new HomeAudio(audioPreferences(savedAudio), homeAudioAssets);
  const soundPanel = createSoundPanel(host, audio);
  const unbindClean = bindWindowInteraction(renderer.domElement, camera, scene, cleanParts, () => request('Clean'));
  const unbindPlay = bindWindowInteraction(renderer.domElement, camera, scene, playParts, () => request('Play'));
  const unbindEat = bindEatInteraction(renderer.domElement, camera, scene, foodParts, () => {
    eatHits++;
    request('Food');
    debug.update(character, windowHits, width, height, bedHits, readHits, eatHits);
  });
  const unbindRead = bindReadInteraction(renderer.domElement, camera, scene, readingParts, () => {
    readHits++;
    request('Bookshelf');
    debug.update(character, windowHits, width, height, bedHits, readHits, eatHits);
  });
  const unbindBed = bindBedInteraction(renderer.domElement, camera, scene, bedParts, () => {
    bedHits++;
    request('Bed');
    debug.update(character, windowHits, width, height, bedHits, readHits, eatHits);
  });
  const unbind = bindWindowInteraction(renderer.domElement, camera, scene, windowParts, () => {
    windowHits++;
    request('Window');
    debug.update(character, windowHits, width, height, bedHits, readHits, eatHits);
  });
  const debug = createDebugPanel(host);
  let width = 0;
  let height = 0;
  const resize = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    camera.aspect = width / Math.max(height, 1);
    // Keep the home above the invitation dock and fit its width on narrow screens.
    camera.zoom = Math.min(1, camera.aspect / 1.25);
    camera.setViewOffset(width, height, 0, host.classList.contains('quiet-mode') ? 0 : Math.min(100, height * 0.14), width, height);
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
    life.update();
    if (document.hidden) audio.pause();
    else void audio.resumeVisible();
    soundPanel.update();
    if (document.hidden) performanceSample?.frame(performance.now(), true, character.state);
  };
  document.addEventListener('visibilitychange', visibilityChanged);
  renderer.setAnimationLoop((now: number) => {
    const dt = frameClock.tick(now, document.hidden);
    performanceSample?.frame(now, document.hidden, character.state);
    if (document.hidden) return;
    character.update(dt);
    atmosphere.update(dt, reducedMotion.matches);
    storedBroom.visible = !character.cleanToolInUse;
    life.update();
    controls.update();
    const right = camera.matrixWorld.elements;
    audio.update(character, dt, (character.root.position.x * right[0]! + character.root.position.z * right[2]!) / 4);
    soundPanel.update();
    renderer.render(scene, camera);
    debug.update(character, windowHits, width, height, bedHits, readHits, eatHits);
  });
  import.meta.hot?.dispose(() => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibilityChanged);
    performanceSample?.dispose();
    unbind();
    unbindBed();
    unbindRead();
    unbindEat();
    unbindClean();
    unbindPlay();
    controls.dispose();
    debug.dispose();
    life.dispose();
    soundPanel.dispose();
    audio.dispose();
    character.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach(material => materials.add(material));
      }
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    roomTextures.forEach(texture => texture.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  });
}
