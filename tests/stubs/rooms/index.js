// TEST STUB of Prop's src/rooms/index.js (contract only).
import * as THREE from 'three';

export const ROOM_IDS = ['living', 'kitchen', 'bathroom'];
const WALL = { living: 0xf3e9f2, kitchen: 0xf6efe2, bathroom: 0xe4eef7 };
const FLOOR = { living: 0xe6dbe9, kitchen: 0xeadfcf, bathroom: 0xd5e3ef };

export function createRoom(id) {
  const group = new THREE.Group(); group.name = 'room:' + id;
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), m(FLOOR[id])); floor.rotation.x = -Math.PI / 2; floor.position.z = 0.5; group.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), m(WALL[id])); wall.position.set(0, 4.5, -3); group.add(wall);
  const room = { group, petSpot: new THREE.Vector3(0, 0, 0), lights: [], dropZones: {}, update() {}, dispose() { group.traverse((o) => o.geometry?.dispose()); } };
  if (id === 'kitchen') { const t = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1), m(0xd9c7b0)); t.position.set(-2.6, 0.8, -2.2); group.add(t); }
  if (id === 'bathroom') {
    const toilet = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.7, 24), m(0xffffff)); bowl.position.y = 0.35; toilet.add(bowl);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.35), m(0xffffff)); tank.position.set(0, 0.95, -0.5); toilet.add(tank);
    toilet.position.set(2.1, 0, -0.4); group.add(toilet);
    room.dropZones.toilet = { position: new THREE.Vector3(2.1, 0.9, -0.4), radius: 1.0 };
    room.toiletSeat = new THREE.Vector3(2.1, 0.45, -0.3);
    let spin = 0;
    room.flush = () => { spin = 1.2; return 1.2; };
    room.update = (dt) => { if (spin > 0) { spin -= dt; tank.rotation.z = Math.sin(spin * 20) * 0.04; } };
  }
  return room;
}
