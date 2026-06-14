import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MeshPayload } from "../worker/cad.worker";

type ViewKind = "iso" | "front" | "top";

/** Camera directions per view preset (three.js space: Y up). */
const VIEW_DIRS: Record<ViewKind, THREE.Vector3> = {
  iso: new THREE.Vector3(1, 0.75, 1).normalize(),
  front: new THREE.Vector3(0, 0.3, 1).normalize(),
  top: new THREE.Vector3(0, 1, 0.0001).normalize(),
};

interface SceneState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group;
  grid: THREE.GridHelper;
  resize: () => void;
  frame: number;
}

const cssColor = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
};

export function Viewer({
  mesh,
  theme,
  accent,
}: {
  mesh: MeshPayload | null;
  theme: string;
  accent: string | null;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  /** Frame the model: aim at its center, back the camera off by its size. */
  const frameModel = (dir?: THREE.Vector3) => {
    const s = stateRef.current;
    if (!s) return;
    const box = new THREE.Box3().setFromObject(s.model);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const fov = (s.camera.fov * Math.PI) / 180;
    const dist = (radius / Math.tan(fov / 2)) * 1.35;
    const d =
      dir ?? s.camera.position.clone().sub(s.controls.target).normalize();
    s.controls.target.copy(center);
    s.camera.position.copy(center.clone().add(d.multiplyScalar(dist)));
    s.camera.updateProjectionMatrix();
  };

  const setView = (kind: ViewKind) => frameModel(VIEW_DIRS[kind].clone());

  const toggleRotate = () => {
    const s = stateRef.current;
    if (!s) return;
    s.controls.autoRotate = !s.controls.autoRotate;
    setAutoRotate(s.controls.autoRotate);
  };

  /** Render one fresh frame, then save the canvas as a PNG. */
  const capturePng = () => {
    const s = stateRef.current;
    if (!s) return;
    s.renderer.render(s.scene, s.camera);
    s.renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `everyday-knob-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // One-time scene setup.
  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(40, 30, 40);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotateSpeed = 2.5;
    controls.target.set(0, 8, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(30, 40, 20);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-30, 10, -20);
    scene.add(fill);

    const grid = new THREE.GridHelper(60, 12, cssColor("--grid-1", "#3a3f4b"), cssColor("--grid-2", "#2a2e36"));
    scene.add(grid);

    // Z is "up" in the CAD model; rotate the model group so it sits on the grid.
    const model = new THREE.Group();
    model.rotation.x = -Math.PI / 2;
    scene.add(model);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    // Track the container itself (not the window) so layout changes —
    // mobile orientation, panel resizes — are picked up too.
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    scene.background = cssColor("--viewer-bg", "#1a1d23");

    const state: SceneState = {
      renderer,
      scene,
      camera,
      controls,
      model,
      grid,
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
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, []);

  // Viewer keyboard shortcuts: F = fit, 1/2/3 = views, 0 = auto-rotate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key) {
        case "f":
        case "F":
          frameModel();
          break;
        case "1":
          setView("iso");
          break;
        case "2":
          setView("front");
          break;
        case "3":
          setView("top");
          break;
        case "0":
          toggleRotate();
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recolor the scene (background, grid) and the knob surface when the theme or
  // accent color changes. CSS vars are the single source of truth.
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.scene.background = cssColor("--viewer-bg", "#1a1d23");
    s.scene.remove(s.grid);
    s.grid.geometry.dispose();
    (s.grid.material as THREE.Material).dispose();
    const grid = new THREE.GridHelper(60, 12, cssColor("--grid-1", "#3a3f4b"), cssColor("--grid-2", "#2a2e36"));
    s.scene.add(grid);
    s.grid = grid;

    const knob = cssColor("--accent", "#b46cc4");
    for (const child of s.model.children) {
      const mat = (child as THREE.Mesh).material;
      if (mat instanceof THREE.MeshStandardMaterial) mat.color = knob;
    }
  }, [theme, accent]);

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
        color: cssColor("--accent", "#b46cc4"),
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

  return (
    <div className="viewer" role="region" aria-label="3Dプレビュー">
      <div ref={mountRef} className="viewer__canvas" />
      <div className="viewer__tools">
        <button title="全体が収まるようにフィット" onClick={() => frameModel()}>
          ⛶ フィット
        </button>
        <button title="斜めから" onClick={() => setView("iso")}>
          斜め
        </button>
        <button title="正面から" onClick={() => setView("front")}>
          正面
        </button>
        <button title="真上から" onClick={() => setView("top")}>
          上
        </button>
        <button
          title="自動回転"
          className={autoRotate ? "is-active" : undefined}
          onClick={toggleRotate}
        >
          ⟳ 回転
        </button>
        <button title="表示中のビューをPNG保存" onClick={capturePng}>
          📷 PNG
        </button>
      </div>
    </div>
  );
}
