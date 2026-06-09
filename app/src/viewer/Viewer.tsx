import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MeshPayload } from "../worker/cad.worker";

interface SceneState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group;
  resize: () => void;
  frame: number;
}

export function Viewer({ mesh }: { mesh: MeshPayload | null }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState | null>(null);

  // One-time scene setup.
  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1d23);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(40, 30, 40);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 8, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(30, 40, 20);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-30, 10, -20);
    scene.add(fill);

    const grid = new THREE.GridHelper(60, 12, 0x3a3f4b, 0x2a2e36);
    scene.add(grid);

    // Z is "up" in the CAD model; rotate the model group so it sits on the grid.
    const model = new THREE.Group();
    model.rotation.x = -Math.PI / 2;
    scene.add(model);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);

    const state: SceneState = {
      renderer,
      scene,
      camera,
      controls,
      model,
      resize,
      frame: 0,
    };
    stateRef.current = state;

    const animate = () => {
      state.frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(state.frame);
      window.removeEventListener("resize", resize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, []);

  // Rebuild the displayed geometry whenever a new mesh arrives.
  useEffect(() => {
    const state = stateRef.current;
    if (!state || !mesh) return;

    // Clear previous model contents.
    for (const child of [...state.model.children]) {
      state.model.remove(child);
      const obj = child as THREE.Mesh | THREE.LineSegments;
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(mesh.vertices, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

    const surface = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0xb46cc4,
        metalness: 0.1,
        roughness: 0.55,
        flatShading: false,
      }),
    );
    state.model.add(surface);

    if (mesh.edges.length > 0) {
      const edgeGeom = new THREE.BufferGeometry();
      edgeGeom.setAttribute("position", new THREE.BufferAttribute(mesh.edges, 3));
      const lines = new THREE.LineSegments(
        edgeGeom,
        new THREE.LineBasicMaterial({ color: 0x20232a }),
      );
      state.model.add(lines);
    }
  }, [mesh]);

  return <div ref={mountRef} className="viewer" />;
}
