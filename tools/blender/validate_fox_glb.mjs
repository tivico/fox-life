// Run from the repository root: node tools/blender/validate_fox_glb.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const file = process.argv[2] ?? 'assets/fox-v01/fox_v01.glb';
const data = fs.readFileSync(file);
if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) {
  throw Error('Invalid GLB header');
}
const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8'));
const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
const meshes = [];
gltf.scene.traverse(object => {
  if (!object.isMesh) return;
  if (![...object.geometry.attributes.position.array].every(Number.isFinite)) throw Error('Non-finite positions');
  meshes.push({ name: object.name, vertices: object.geometry.attributes.position.count,
    triangles: (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3,
    vertexColors: object.material.vertexColors });
});
const box = new THREE.Box3().setFromObject(gltf.scene);
const size = box.getSize(new THREE.Vector3()).toArray();
if (meshes.length !== 6 || Math.abs(size[1] - 1.3) > .002 || Math.abs(box.min.y) > .002) {
  throw Error('Unexpected contents, height or ground origin (validator targets default HEIGHT=1.30)');
}
if (json.images?.length || json.cameras?.length || json.skins?.length || gltf.animations.length) throw Error('Unexpected textures/studio/rig');
if (json.nodes.some(node => /Cube|Floor|Camera|Key|Fill|Rim/.test(node.name))) throw Error('Unrelated objects exported');
if (!meshes.find(mesh => mesh.name === 'Fox_Body_Continuous')?.vertexColors) throw Error('Body palette missing');
const result = { status: 'passed', loader: `Three.js ${THREE.REVISION} GLTFLoader.parseAsync`,
  sha256: crypto.createHash('sha256').update(data).digest('hex'), bytes: data.length,
  sizeXYZ: size, meshes, triangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0),
  externalImages: 0, animations: 0, materials: json.materials.map(material => material.name) };
fs.writeFileSync(file.replace(/\.glb$/, '_three_validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
