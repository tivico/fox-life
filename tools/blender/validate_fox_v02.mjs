import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const path = 'assets/fox-v02/fox_v02_static.glb';
const bytes = fs.readFileSync(path);
assert.equal(bytes.readUInt32LE(0), 0x46546c67);
assert.equal(bytes.readUInt32LE(4), 2);
assert.equal(bytes.readUInt32LE(8), bytes.length);
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
const names = ['Orange_Fur', 'Cream_Fur', 'Green_Overalls', 'Dark_Paws', 'Eyes', 'Nose', 'Buttons'];
assert.deepEqual(json.materials.map(m => m.name).sort(), [...names].sort());
assert.equal(json.images?.length ?? 0, 0);
assert.equal(json.textures?.length ?? 0, 0);
assert.equal(json.animations?.length ?? 0, 0);
assert.equal(json.skins?.length ?? 0, 0);
assert.equal(json.cameras?.length ?? 0, 0);
for (const mat of json.materials) {
  assert.equal(mat.pbrMetallicRoughness.metallicFactor, 0);
  assert.ok(mat.pbrMetallicRoughness.roughnessFactor >= .85);
  assert.ok(!mat.extensions, 'Only core PBR material parameters');
}
for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
  assert.ok(!('COLOR_0' in primitive.attributes), 'No blended vertex colors');
  assert.ok('NORMAL' in primitive.attributes);
}
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
let triangles = 0;
gltf.scene.traverse(obj => {
  if (!obj.isMesh) return;
  assert.ok(!obj.material.vertexColors);
  assert.ok([...obj.geometry.attributes.position.array].every(Number.isFinite));
  triangles += (obj.geometry.index?.count ?? obj.geometry.attributes.position.count) / 3;
});
const bounds = new THREE.Box3().setFromObject(gltf.scene);
assert.ok(Math.abs(bounds.min.y) < .002);
assert.ok(Math.abs(bounds.max.y - 1.3) < .002);
assert.ok(triangles < 20000, 'Static asset budget below 20k triangles');
const originals = JSON.parse(fs.readFileSync('docs/evidence/fox-v02/preserved-before.json', 'utf8'));
for (const [file, hash] of Object.entries(originals)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, `Preserved: ${file}`);
}
const report = { result: 'passed', date: new Date().toISOString(), loader: `Three.js ${THREE.REVISION} GLTFLoader`,
  bytes: bytes.length, triangles, materials: json.materials.map(m => ({name: m.name, pbr: m.pbrMetallicRoughness})),
  vertexColors: false, textures: 0, rig: false, animations: 0,
  sizeXYZ: bounds.getSize(new THREE.Vector3()).toArray(), preserved: Object.keys(originals),
  sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
fs.writeFileSync('docs/evidence/fox-v02/glb-validation.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
