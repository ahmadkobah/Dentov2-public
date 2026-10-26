/**
 * Scan Detail Page — View scan metadata, download ZIP, and view 3D model inline.
 *
 * Uses Three.js directly for full 3D rendering:
 * - Fetches file through API proxy (avoids CORS with R2)
 * - Downloads ZIP → decompresses client-side, or loads raw model file
 * - Parses ALL model files (STL/PLY/OBJ) and adds them to a single scene
 * - OrbitControls for rotate, zoom, pan
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type * as THREE from 'three';
import { useParams, useNavigate } from 'react-router-dom';
import { useScanDetail, useDeleteScan } from '../hooks/useScan.js';
import { useGetDownloadUrl } from '@/features/uploads/hooks/useResolvedUrl.js';
import { useAuthStore } from '@/stores/auth.store.js';
import { formatDate } from '@/lib/date.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  toast,
  Separator,
} from '@dento/ui';
import {
  ArrowLeft,
  Trash2,
  Download,
  Loader2,
  Eye,
  EyeOff,
  RotateCw,
  RotateCcw,
  Maximize2,
  Grid3X3,
  Camera,
  Maximize,
  Minimize,
  Sun,
  Moon,
  Layers,
  Ruler,
} from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Helpers ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  uploaded: 'outline',
  ready: 'default',
  error: 'destructive',
};

const TYPE_LABELS: Record<string, string> = {
  full_arch: 'Full Arch',
  upper_arch: 'Upper Arch',
  lower_arch: 'Lower Arch',
  bite_registration: 'Bite Registration',
  single_tooth: 'Single Tooth',
  other: 'Other',
};

// ── Info Row ────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

// ── Viewer Toolbar Button ──────────────────────────────────

function ViewerToolBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center justify-center rounded-md p-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        active ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ── 3D Viewer Component ────────────────────────────────────

function ScanViewer3D({ fileKey }: { fileKey: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Three.js refs (populated by loadModel)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rendererRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meshesRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const measureGroupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const measurePointsRef = useRef<any[]>([]);
  const sceneCenterRef = useRef<[number, number, number]>([0, 0, 0]);
  const sceneSizeRef = useRef(1);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [darkBg, setDarkBg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flatShading, setFlatShading] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measureDist, setMeasureDist] = useState<number | null>(null);

  const { t } = useTranslation();

  // ── Load model ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !fileKey) return;

    let cancelled = false;

    async function loadModel() {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Download file through API proxy (avoids CORS)
        const { accessToken, tenantSlug } = useAuthStore.getState();
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const proxyUrl = `${apiUrl}/api/uploads/proxy?key=${encodeURIComponent(fileKey)}`;
        const headers: Record<string, string> = {};
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
        if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

        const response = await fetch(proxyUrl, { headers, credentials: 'include' });
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        // 2. Extract files from ZIP or wrap raw file
        const uint8 = new Uint8Array(arrayBuffer);
        const isZip = uint8[0] === 0x50 && uint8[1] === 0x4b;

        const modelExtensions = ['.stl', '.ply', '.obj'];
        const fileBuffers: { name: string; buffer: ArrayBuffer }[] = [];

        if (isZip) {
          const { unzipSync } = await import('fflate');
          const unzipped = unzipSync(uint8);
          if (cancelled) return;

          for (const [path, data] of Object.entries(unzipped)) {
            if (path.endsWith('/') || path.startsWith('__MACOSX/') || path.startsWith('.'))
              continue;
            const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
            if (!modelExtensions.includes(ext)) continue;
            const fileName = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
            fileBuffers.push({
              name: fileName,
              buffer: data.buffer.slice(
                data.byteOffset,
                data.byteOffset + data.byteLength,
              ) as ArrayBuffer,
            });
          }
        } else {
          const keyName = fileKey.substring(fileKey.lastIndexOf('/') + 1);
          fileBuffers.push({ name: keyName, buffer: arrayBuffer });
        }

        if (fileBuffers.length === 0) throw new Error('No 3D model files found');
        if (cancelled) return;

        // 3. Import Three.js + loaders
        const THREE = await import('three');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
        const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js');
        const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');

        if (cancelled || !containerRef.current) return;
        threeRef.current = THREE;

        // 4. Create scene, camera, renderer
        const container = containerRef.current;
        container.innerHTML = '';

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);

        const width = container.clientWidth;
        const height = container.clientHeight || 500;
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(1, 2, 3);
        scene.add(dirLight1);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight2.position.set(-1, -1, -2);
        scene.add(dirLight2);

        // Measurement group (added to scene, markers rendered on top)
        const measureGroup = new THREE.Group();
        scene.add(measureGroup);
        measureGroupRef.current = measureGroup;

        // Part colors (subtle differentiation for multi-file scans)
        const partColors = [0xc8c8c8, 0xa8d8ea, 0xf8b4b4, 0xb8e6b0, 0xe8d4a0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meshes: any[] = [];

        // 5. Parse each file and add to scene
        const stlLoader = new STLLoader();
        const plyLoader = new PLYLoader();
        const objLoader = new OBJLoader();

        for (let i = 0; i < fileBuffers.length; i++) {
          const file = fileBuffers[i];
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

          const partMaterial = new THREE.MeshPhongMaterial({
            color: partColors[i % partColors.length],
            specular: 0x444444,
            shininess: 30,
            side: THREE.DoubleSide,
          });

          try {
            if (ext === '.stl') {
              const geometry = stlLoader.parse(file.buffer);
              geometry.computeVertexNormals();
              const mesh = new THREE.Mesh(geometry, partMaterial);
              scene.add(mesh);
              meshes.push(mesh);
            } else if (ext === '.ply') {
              const geometry = plyLoader.parse(file.buffer);
              geometry.computeVertexNormals();
              const mesh = new THREE.Mesh(geometry, partMaterial);
              scene.add(mesh);
              meshes.push(mesh);
            } else if (ext === '.obj') {
              const text = new TextDecoder().decode(file.buffer);
              const obj = objLoader.parse(text);
              obj.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  (child as THREE.Mesh).material = partMaterial;
                  meshes.push(child);
                }
              });
              scene.add(obj);
            }
          } catch (e) {
            console.warn(`Failed to parse ${file.name}:`, e);
          }
        }

        meshesRef.current = meshes;

        // 6. Fit camera to entire scene
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();

        camera.position.copy(center);
        camera.position.z += size * 1.2;
        camera.near = size / 100;
        camera.far = size * 100;
        camera.updateProjectionMatrix();

        controls.target.copy(center);
        controls.update();
        controls.saveState();

        sceneCenterRef.current = [center.x, center.y, center.z];
        sceneSizeRef.current = size;

        // Store refs for toolbar interactions
        sceneRef.current = scene;
        cameraRef.current = camera;
        controlsRef.current = controls;
        rendererRef.current = renderer;

        // 7. Animation loop
        let animId: number;
        function animate() {
          animId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        // 8. Resize handling
        const resizeObserver = new ResizeObserver(() => {
          const w = container.clientWidth;
          const h = container.clientHeight || 500;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        });
        resizeObserver.observe(container);

        setIsLoading(false);

        // Cleanup function
        cleanupRef.current = () => {
          cancelAnimationFrame(animId);
          resizeObserver.disconnect();
          controls.dispose();
          renderer.dispose();
          scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              mesh.geometry.dispose();
              if (Array.isArray(mesh.material))
                mesh.material.forEach((m: THREE.Material) => m.dispose());
              else (mesh.material as THREE.Material).dispose();
            }
          });
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load 3D scan');
          setIsLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [fileKey]);

  // ── Measurement click handler ───────────────────────────
  useEffect(() => {
    if (!measuring) return;
    const canvas = rendererRef.current?.domElement as HTMLCanvasElement | undefined;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      const THREE = threeRef.current;
      if (!THREE || !cameraRef.current || !measureGroupRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(meshesRef.current, true);
      if (intersects.length === 0) return;

      const point = intersects[0].point.clone();
      const markerSize = sceneSizeRef.current * 0.005;

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(markerSize),
        new THREE.MeshBasicMaterial({ color: 0xff4444, depthTest: false }),
      );
      sphere.position.copy(point);
      sphere.renderOrder = 999;
      measureGroupRef.current.add(sphere);

      if (measurePointsRef.current.length === 0) {
        measurePointsRef.current = [point];
      } else {
        // Second point — draw line and compute distance
        const p1 = measurePointsRef.current[0];
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, point]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xff4444, depthTest: false });
        const line = new THREE.Line(lineGeo, lineMat);
        line.renderOrder = 999;
        measureGroupRef.current.add(line);

        setMeasureDist(Math.round(p1.distanceTo(point) * 100) / 100);
        measurePointsRef.current = [];
        setMeasuring(false);
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.style.cursor = 'crosshair';

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.style.cursor = '';
    };
  }, [measuring]);

  // ── Fullscreen change listener ──────────────────────────
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // ── Toolbar Callbacks ──────────────────────────────────
  const setViewPreset = useCallback(
    (dir: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom') => {
      const THREE = threeRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!THREE || !camera || !controls) return;

      const [cx, cy, cz] = sceneCenterRef.current;
      const d = sceneSizeRef.current * 1.2;
      const center = new THREE.Vector3(cx, cy, cz);
      const pos = center.clone();

      switch (dir) {
        case 'front':
          pos.z += d;
          break;
        case 'back':
          pos.z -= d;
          break;
        case 'left':
          pos.x -= d;
          break;
        case 'right':
          pos.x += d;
          break;
        case 'top':
          pos.y += d;
          break;
        case 'bottom':
          pos.y -= d;
          break;
      }

      camera.position.copy(pos);
      camera.up.set(0, dir === 'bottom' ? -1 : 1, 0);
      controls.target.copy(center);
      controls.update();
    },
    [],
  );

  const toggleWireframe = useCallback(() => {
    setWireframe((prev) => {
      const next = !prev;
      meshesRef.current.forEach((mesh) => {
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m: { wireframe: boolean }) => (m.wireframe = next));
        else mat.wireframe = next;
      });
      return next;
    });
  }, []);

  const toggleFlatShading = useCallback(() => {
    setFlatShading((prev) => {
      const next = !prev;
      meshesRef.current.forEach((mesh) => {
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach(
            (m: { flatShading: boolean; needsUpdate: boolean }) => (
              (m.flatShading = next),
              (m.needsUpdate = true)
            ),
          );
        } else {
          mat.flatShading = next;
          mat.needsUpdate = true;
        }
        mesh.geometry.computeVertexNormals();
      });
      return next;
    });
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => {
      const next = !prev;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = next;
        controlsRef.current.autoRotateSpeed = 2;
      }
      return next;
    });
  }, []);

  const resetView = useCallback(() => {
    controlsRef.current?.reset();
    setAutoRotate(false);
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  }, []);

  const zoomToFit = useCallback(() => {
    const THREE = threeRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const scene = sceneRef.current;
    if (!THREE || !camera || !controls || !scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();

    camera.position.copy(center);
    camera.position.z += size * 1.2;
    camera.up.set(0, 1, 0);
    controls.target.copy(center);
    controls.update();
  }, []);

  const toggleBackground = useCallback(() => {
    setDarkBg((prev) => {
      const next = !prev;
      const THREE = threeRef.current;
      if (THREE && sceneRef.current) {
        sceneRef.current.background = new THREE.Color(next ? 0x1a1a2e : 0xf5f5f5);
      }
      return next;
    });
  }, []);

  const takeScreenshot = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scan-screenshot.png';
    a.click();
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const clearMeasurement = useCallback(() => {
    const group = measureGroupRef.current;
    if (group) {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    }
    measurePointsRef.current = [];
    setMeasureDist(null);
  }, []);

  const toggleMeasure = useCallback(() => {
    setMeasuring((prev) => {
      if (!prev) clearMeasurement();
      return !prev;
    });
  }, [clearMeasurement]);

  // ── View preset data ──
  const viewPresets: {
    dir: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
    label: string;
  }[] = [
    { dir: 'front', label: t('scans.viewer.front') },
    { dir: 'back', label: t('scans.viewer.back') },
    { dir: 'left', label: t('scans.viewer.left') },
    { dir: 'right', label: t('scans.viewer.right') },
    { dir: 'top', label: t('scans.viewer.top') },
    { dir: 'bottom', label: t('scans.viewer.bottom') },
  ];

  // ── Render ──────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className={`relative ${isFullscreen ? 'flex h-screen flex-col bg-background' : ''}`}
    >
      {/* Toolbar */}
      {!isLoading && !error && (
        <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 bg-muted/30 p-1.5">
          {/* View Presets */}
          <div className="flex items-center gap-0.5">
            <span className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wider">
              {t('scans.viewer.views')}
            </span>
            {viewPresets.map((vp) => (
              <button
                key={vp.dir}
                type="button"
                onClick={() => setViewPreset(vp.dir)}
                title={vp.label}
                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors"
              >
                {vp.label}
              </button>
            ))}
          </div>

          <div className="bg-border mx-1 h-6 w-px" />

          {/* Display toggles */}
          <ViewerToolBtn
            icon={Grid3X3}
            label={t('scans.viewer.wireframe')}
            active={wireframe}
            onClick={toggleWireframe}
          />
          <ViewerToolBtn
            icon={Layers}
            label={t('scans.viewer.flatShading')}
            active={flatShading}
            onClick={toggleFlatShading}
          />
          <ViewerToolBtn
            icon={RotateCw}
            label={t('scans.viewer.autoRotate')}
            active={autoRotate}
            onClick={toggleAutoRotate}
          />

          <div className="bg-border mx-1 h-6 w-px" />

          {/* Measurement */}
          <ViewerToolBtn
            icon={Ruler}
            label={t('scans.viewer.measure')}
            active={measuring}
            onClick={toggleMeasure}
          />
          {measureDist !== null && (
            <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
              {measureDist} mm
            </span>
          )}

          <div className="bg-border mx-1 h-6 w-px" />

          {/* Actions */}
          <ViewerToolBtn icon={RotateCcw} label={t('scans.viewer.resetView')} onClick={resetView} />
          <ViewerToolBtn icon={Maximize2} label={t('scans.viewer.zoomFit')} onClick={zoomToFit} />
          <ViewerToolBtn
            icon={Camera}
            label={t('scans.viewer.screenshot')}
            onClick={takeScreenshot}
          />
          <ViewerToolBtn
            icon={isFullscreen ? Minimize : Maximize}
            label={isFullscreen ? t('scans.viewer.exitFullscreen') : t('scans.viewer.fullscreen')}
            onClick={handleFullscreen}
          />
          <ViewerToolBtn
            icon={darkBg ? Sun : Moon}
            label={darkBg ? t('scans.viewer.lightBg') : t('scans.viewer.darkBg')}
            onClick={toggleBackground}
          />
        </div>
      )}

      {/* Canvas wrapper */}
      <div className="relative">
        {isLoading && (
          <div className="bg-muted/50 absolute inset-0 z-10 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-muted-foreground text-sm">{t('scans.viewer.loading')}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 text-destructive flex items-center justify-center rounded-lg p-8">
            <span className="text-sm">{error}</span>
          </div>
        )}
        <div
          ref={containerRef}
          className={isFullscreen ? 'border-0' : 'rounded-b-lg border'}
          style={{ width: '100%', height: isFullscreen ? 'calc(100vh - 44px)' : '500px' }}
        />
      </div>

      {/* Controls hint */}
      {!isLoading && !error && !isFullscreen && (
        <p className="text-muted-foreground mt-1 text-center text-[11px]">
          {t('scans.viewer.controls')}
        </p>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function ScanDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const getDownloadUrl = useGetDownloadUrl();

  const { data: scan, isLoading, isError } = useScanDetail(id);
  const deleteMutation = useDeleteScan();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('scans.toast.deleted'));
      navigate('/scans');
    } catch {
      toast.error(t('scans.toast.deleteFailed'));
    }
  }, [id, deleteMutation, navigate]);

  const handleDownload = useCallback(async () => {
    if (!scan?.fileKey) return;
    try {
      setIsDownloading(true);
      const url = await getDownloadUrl(scan.fileKey);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scan.scanNumber}.zip`;
      a.click();
    } catch {
      toast.error(t('scans.toast.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  }, [scan, getDownloadUrl]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !scan) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate('/scans')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <p className="text-muted-foreground mt-4">{t('scans.error.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={scan.scanNumber}
        description={`${TYPE_LABELS[scan.scanType] ?? scan.scanType} — ${t('scans.detail.subtitle')}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/scans')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('common.back')}
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="me-2 h-4 w-4" />
            )}
            {t('scans.action.download')}
          </Button>
          <Button
            variant={showViewer ? 'default' : 'outline'}
            onClick={() => setShowViewer(!showViewer)}
          >
            {showViewer ? <EyeOff className="me-2 h-4 w-4" /> : <Eye className="me-2 h-4 w-4" />}
            {showViewer ? t('scans.action.hideViewer') : t('scans.action.viewModel')}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            {t('common.delete')}
          </Button>
        </div>
      </PageHeader>

      {/* 3D Viewer */}
      {showViewer && scan.fileKey && (
        <Card>
          <CardHeader>
            <CardTitle>{t('scans.viewer.title')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ScanViewer3D fileKey={scan.fileKey} />
          </CardContent>
        </Card>
      )}

      {/* Scan Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('scans.detail.scanInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label={t('scans.col.scanNumber')} value={scan.scanNumber} />
            <Separator />
            <InfoRow
              label={t('scans.col.status')}
              value={
                <Badge variant={STATUS_COLORS[scan.status] ?? 'outline'} className="capitalize">
                  {scan.status}
                </Badge>
              }
            />
            <Separator />
            <InfoRow
              label={t('scans.col.type')}
              value={TYPE_LABELS[scan.scanType] ?? scan.scanType}
            />
            <Separator />
            <InfoRow label={t('scans.form.scannerModel')} value={scan.scannerModel} />
            <Separator />
            <InfoRow
              label={t('scans.col.date')}
              value={scan.scanDate ? formatDate(scan.scanDate) : undefined}
            />
            <Separator />
            <InfoRow label={t('scans.detail.notes')} value={scan.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('scans.detail.fileInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label={t('scans.col.size')} value={`${scan.fileSizeMB?.toFixed(1)} MB`} />
            <Separator />
            <InfoRow
              label={t('scans.detail.originalSize')}
              value={scan.originalSizeMB ? `${scan.originalSizeMB?.toFixed(1)} MB` : undefined}
            />
            <Separator />
            <InfoRow label={t('scans.detail.fileCount')} value={scan.fileCount} />
            <Separator />
            <InfoRow
              label={t('scans.col.formats')}
              value={scan.formats?.length ? scan.formats.join(', ').toUpperCase() : undefined}
            />
            <Separator />
            <InfoRow
              label={t('scans.col.patient')}
              value={
                scan.patient
                  ? `${scan.patient.firstName?.en ?? ''} ${scan.patient.lastName?.en ?? ''}`.trim()
                  : undefined
              }
            />
            <Separator />
            <InfoRow
              label={t('scans.form.doctor')}
              value={
                scan.doctor
                  ? `${scan.doctor.firstName ?? ''} ${scan.doctor.lastName ?? ''}`.trim()
                  : undefined
              }
            />
            <Separator />
            <InfoRow label={t('scans.detail.created')} value={formatDate(scan.createdAt)} />
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('scans.confirm.deleteTitle')}
        description={t('scans.confirm.deleteDesc', { number: scan.scanNumber })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
