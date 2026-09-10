import * as THREE from 'three';

export type CharacterState = 'Idle' | 'Walk';

export class Character {
  readonly root = new THREE.Group();
  state: CharacterState = 'Idle';
  private readonly body = new THREE.Group();
  private readonly feet: THREE.Mesh[] = [];
  // All targets leave clearance for the character inside the 8 × 6 room.
  private readonly route = [
    new THREE.Vector3(2.6, 0, 1.6), new THREE.Vector3(2.4, 0, -1.6),
    new THREE.Vector3(-2.6, 0, -1.6), new THREE.Vector3(-2.6, 0, 1.6),
  ];
  private targetIndex = 0;
  private idleRemaining = 2;
  private elapsed = 0;
  private readonly direction = new THREE.Vector3();

  constructor() {
    this.root.name = 'Character';
    this.root.add(this.body);
    const material = new THREE.MeshStandardMaterial({ color: '#ca8055', roughness: 0.9 });
    const cream = new THREE.MeshStandardMaterial({ color: '#fff0d4', roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: '#343d38' });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.4, 4, 12), material);
    torso.position.y = 0.65;
    this.body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), cream);
    head.position.set(0, 1.22, 0.03);
    this.body.add(head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 8), material);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.2, 0.46); // Local +Z is forward.
    this.body.add(nose);
    for (const x of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), dark);
      eye.position.set(x, 1.32, 0.34);
      this.body.add(eye);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.32), dark);
      foot.position.set(x, 0.12, 0.08);
      this.feet.push(foot);
      this.root.add(foot);
    }
    this.root.traverse(object => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
  }

  get target() { return this.route[this.targetIndex]!; }

  update(dt: number) {
    this.elapsed += dt;
    if (this.state === 'Idle') {
      this.idleRemaining -= dt;
      if (this.idleRemaining <= 0) this.state = 'Walk';
    } else {
      this.direction.subVectors(this.target, this.root.position);
      const distance = this.direction.length();
      const step = Math.min(1.1 * dt, distance);
      if (distance > 0) {
        this.root.rotation.y = Math.atan2(this.direction.x, this.direction.z);
        this.root.position.addScaledVector(this.direction, step / distance);
      }
      if (distance <= step) {
        this.root.position.copy(this.target);
        this.targetIndex = (this.targetIndex + 1) % this.route.length;
        this.state = 'Idle';
        this.idleRemaining = 2;
      }
    }
    const walking = this.state === 'Walk';
    this.body.position.y = walking ? Math.abs(Math.sin(this.elapsed * 9)) * 0.05 : Math.sin(this.elapsed * 2) * 0.015;
    this.feet.forEach((foot, index) => {
      foot.rotation.x = walking ? Math.sin(this.elapsed * 9 + index * Math.PI) * 0.4 : 0;
    });
  }
}
