import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

export function enableMeshRaycastAcceleration(mesh) {
  const geometry = mesh?.geometry;
  if (!geometry?.isBufferGeometry) return false;

  if (!geometry.boundsTree) geometry.boundsTree = new MeshBVH(geometry);
  mesh.raycast = acceleratedRaycast;
  return true;
}
