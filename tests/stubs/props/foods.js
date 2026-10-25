// TEST STUB of Prop's src/props/foods.js (contract only).
import * as THREE from 'three';

const C = { onigiri: 0xf7f4ea, banana: 0xf5d76e, cupcake: 0xf2a7c3, apple: 0xe98a8a, bun: 0xf3e6d4, milk: 0xe8f0fb };
export function createFoodMesh(id) {
  const g = new THREE.Group(); g.name = 'food:' + id;
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshStandardMaterial({ color: C[id] || 0xcccccc, roughness: 1 })));
  return g;
}
