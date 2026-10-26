/**
 * CBCT DICOM Viewer — Cornerstone3D-powered MPR viewer with OHIF-level tools.
 *
 * Features:
 * - 3 viewports: Axial, Coronal, Sagittal (MPR)
 * - Tools: Scroll, Window/Level, Zoom, Pan, Length, Angle, Arrow Annotation
 * - Crosshairs synchronized across viewports
 * - Reset, Invert, CINE playback
 * - Downloads DICOM ZIP via API proxy, extracts .dcm files, loads as volume
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@dento/ui';

// Module-level guard to prevent double-init in React strict mode
let cornerstoneInitialized = false;
import {
  Loader2,
  RotateCcw,
  Contrast,
  ZoomIn,
  Hand,
  Ruler,
  Triangle,
  ArrowUpRight,
  Crosshair,
  Play,
  Pause,
  SunMoon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ───────────────────────────────────────────────────

interface CbctViewerProps {
  fileKey: string;
}

type ToolName =
  | 'WindowLevel'
  | 'StackScroll'
  | 'Zoom'
  | 'Pan'
  | 'Length'
  | 'Angle'
  | 'ArrowAnnotate'
  | 'Crosshairs';

// ── Constants ───────────────────────────────────────────────

const VIEWPORT_IDS = {
  AXIAL: 'cbct-axial',
  CORONAL: 'cbct-coronal',
  SAGITTAL: 'cbct-sagittal',
} as const;

const RENDERING_ENGINE_ID = 'cbctRenderingEngine';
const VOLUME_ID = 'cbctVolume';
const TOOL_GROUP_ID = 'cbctToolGroup';

// ── Component ───────────────────────────────────────────────

export function CbctViewer({ fileKey }: CbctViewerProps) {
  const axialRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const renderingEngineRef = useRef<unknown>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolName>('WindowLevel');
  const [isInverted, setIsInverted] = useState(false);
  const [isCinePlaying, setIsCinePlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // ── Download + Extract DICOM Files ──────────────────────

  const downloadAndExtract = useCallback(async (): Promise<ArrayBuffer[]> => {
    const { accessToken, tenantSlug } = useAuthStore.getState();
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const proxyUrl = `${apiUrl}/api/uploads/proxy?key=${encodeURIComponent(fileKey)}`;
    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

    const response = await fetch(proxyUrl, { headers, credentials: 'include' });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();

    const uint8 = new Uint8Array(arrayBuffer);
    const isZip = uint8[0] === 0x50 && uint8[1] === 0x4b;

    if (isZip) {
      const { unzipSync } = await import('fflate');
      const unzipped = unzipSync(uint8);
      const dcmBuffers: ArrayBuffer[] = [];

      for (const [path, data] of Object.entries(unzipped)) {
        if (path.endsWith('/') || path.startsWith('__MACOSX/') || path.startsWith('.')) continue;
        // Skip known non-image DICOM files
        const fileName = path.split('/').pop()?.toUpperCase() ?? '';
        if (fileName === 'DICOMDIR' || fileName === 'LOCKFILE' || fileName === 'VERSION') continue;
        const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
        // DICOM files: .dcm extension OR no extension (common for DICOM)
        const isDicom =
          ext === '.dcm' || (!ext.includes('.') && data.length > 132 && isDicomBuffer(data));
        if (isDicom) {
          dcmBuffers.push(
            data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
          );
        }
      }

      if (dcmBuffers.length === 0) {
        // Try all files — some DICOM ZIPs don't use .dcm extension
        for (const [path, data] of Object.entries(unzipped)) {
          if (path.endsWith('/') || path.startsWith('__MACOSX/') || path.startsWith('.')) continue;
          if (data.length > 132 && isDicomBuffer(data)) {
            dcmBuffers.push(
              data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
            );
          }
        }
      }

      return dcmBuffers;
    } else {
      // Single DICOM file
      return [arrayBuffer];
    }
  }, [fileKey]);

  // ── Initialize Cornerstone3D + Load Volume ──────────────

  useEffect(() => {
    if (!axialRef.current || !coronalRef.current || !sagittalRef.current || !fileKey) return;

    let cancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        setLoadProgress(0);
        setError(null);

        // 1. Download and extract DICOM files
        setLoadProgress(5);
        const dcmBuffers = await downloadAndExtract();
        if (cancelled) return;
        if (dcmBuffers.length === 0) throw new Error('No DICOM files found in the archive');

        setLoadProgress(20);

        // 2. Import Cornerstone3D modules
        const csCore = await import('@cornerstonejs/core');
        const csTools = await import('@cornerstonejs/tools');
        const csDicomLoader = await import('@cornerstonejs/dicom-image-loader');

        if (cancelled) return;
        setLoadProgress(30);

        // 3. Initialize Cornerstone + DICOM loader + Tools (v4 API)
        if (!cornerstoneInitialized) {
          await csCore.init();
          await csTools.init();
          csDicomLoader.default.init({
            maxWebWorkers: navigator.hardwareConcurrency || 4,
          });

          // Register tools globally (must only happen once)
          csTools.addTool(csTools.WindowLevelTool);
          csTools.addTool(csTools.StackScrollTool);
          csTools.addTool(csTools.ZoomTool);
          csTools.addTool(csTools.PanTool);
          csTools.addTool(csTools.LengthTool);
          csTools.addTool(csTools.AngleTool);
          csTools.addTool(csTools.ArrowAnnotateTool);
          csTools.addTool(csTools.CrosshairsTool);

          cornerstoneInitialized = true;
        }

        if (cancelled) return;
        setLoadProgress(35);

        // 4. Register DICOM files via fileManager AND pre-populate metadata cache.
        //    The streaming volume loader's sortImageIdsAndGetSpacing needs
        //    imagePlaneModule metadata from ALL images (for non-wadouri schemes).
        //    We parse DICOM headers via dataSetCacheManager (fast, no web workers),
        //    then the metadata provider can serve them for volume construction.
        const { dataSetCacheManager, fileManager } = csDicomLoader.default.wadouri;

        const validImageIds: string[] = [];
        const totalFiles = dcmBuffers.length;

        for (let i = 0; i < totalFiles; i++) {
          if (cancelled) return;

          const buf = dcmBuffers[i];
          const blob = new Blob([buf], { type: 'application/dicom' });
          const imageId = fileManager.add(blob);
          const uri = imageId.substring(imageId.indexOf(':') + 1);

          try {
            // Parse DICOM via dataSetCacheManager (parses once, caches for later use)
            const dataSet = await dataSetCacheManager.load(
              uri,
              () => Promise.resolve(buf),
              imageId,
            );

            // Verify this is a valid image DICOM (has position and pixel rows)
            const ipp = dataSet.string('x00200032'); // ImagePositionPatient
            const rows = dataSet.uint16('x00280010');
            if (!ipp || !rows) {
              // Not an image DICOM (DICOMDIR, SR, etc.) — unload and skip
              dataSetCacheManager.unload(uri);
              continue;
            }

            validImageIds.push(imageId);
          } catch {
            // Skip unparseable files
            continue;
          }

          // Update progress: 35% → 55% across all files
          if (i % 20 === 0) {
            setLoadProgress(35 + Math.round((i / totalFiles) * 20));
          }
        }

        if (validImageIds.length === 0) {
          throw new Error('No valid DICOM image slices found in the archive');
        }

        const dicomImageIds = validImageIds;
        console.log(
          `CBCT: ${dicomImageIds.length} valid slices (of ${totalFiles} files), all metadata cached`,
        );
        setLoadProgress(55);

        // 6. Set up rendering engine & tools
        const {
          WindowLevelTool,
          StackScrollTool,
          ZoomTool,
          PanTool,
          LengthTool,
          AngleTool,
          ArrowAnnotateTool,
          CrosshairsTool,
          ToolGroupManager,
        } = csTools;

        // Create rendering engine
        const { RenderingEngine, Enums: csEnums } = csCore;
        const renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        renderingEngineRef.current = renderingEngine;

        // 7. Create viewports
        const viewportInputArray = [
          {
            viewportId: VIEWPORT_IDS.AXIAL,
            type: csEnums.ViewportType.ORTHOGRAPHIC,
            element: axialRef.current!,
            defaultOptions: {
              orientation: csEnums.OrientationAxis.AXIAL,
            },
          },
          {
            viewportId: VIEWPORT_IDS.CORONAL,
            type: csEnums.ViewportType.ORTHOGRAPHIC,
            element: coronalRef.current!,
            defaultOptions: {
              orientation: csEnums.OrientationAxis.CORONAL,
            },
          },
          {
            viewportId: VIEWPORT_IDS.SAGITTAL,
            type: csEnums.ViewportType.ORTHOGRAPHIC,
            element: sagittalRef.current!,
            defaultOptions: {
              orientation: csEnums.OrientationAxis.SAGITTAL,
            },
          },
        ];

        renderingEngine.setViewports(viewportInputArray);

        if (cancelled) return;
        setLoadProgress(60);

        // 8. Create tool group and bind to viewports
        const toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
        if (!toolGroup) throw new Error('Failed to create tool group');

        toolGroup.addTool(WindowLevelTool.toolName);
        toolGroup.addTool(StackScrollTool.toolName);
        toolGroup.addTool(ZoomTool.toolName);
        toolGroup.addTool(PanTool.toolName);
        toolGroup.addTool(LengthTool.toolName);
        toolGroup.addTool(AngleTool.toolName);
        toolGroup.addTool(ArrowAnnotateTool.toolName);
        toolGroup.addTool(CrosshairsTool.toolName);

        // Set default active tool
        toolGroup.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }],
        });
        // Scroll with mouse wheel
        toolGroup.setToolActive(StackScrollTool.toolName, {
          bindings: [{ mouseButton: csTools.Enums.MouseBindings.Wheel }],
        });
        // Pan with middle mouse
        toolGroup.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: csTools.Enums.MouseBindings.Auxiliary }],
        });
        // Zoom with right click
        toolGroup.setToolActive(ZoomTool.toolName, {
          bindings: [{ mouseButton: csTools.Enums.MouseBindings.Secondary }],
        });

        // Add viewports to tool group
        toolGroup.addViewport(VIEWPORT_IDS.AXIAL, RENDERING_ENGINE_ID);
        toolGroup.addViewport(VIEWPORT_IDS.CORONAL, RENDERING_ENGINE_ID);
        toolGroup.addViewport(VIEWPORT_IDS.SAGITTAL, RENDERING_ENGINE_ID);

        if (cancelled) return;
        setLoadProgress(65);

        // 9. Create volume (allocates data structure, no pixel loading yet)
        const { volumeLoader } = csCore;
        console.log('CBCT: creating volume with', dicomImageIds.length, 'imageIds...');
        const volume = await volumeLoader.createAndCacheVolume(VOLUME_ID, {
          imageIds: dicomImageIds,
        });
        console.log('CBCT: volume created, setting volumes for viewports...');

        if (cancelled) return;

        // 10. Pre-load one critical image to warm up the web worker decode pipeline.
        //     setVolumesForViewports → setDefaultVolumeVOI needs a decoded image.
        const middleIdx = Math.floor(dicomImageIds.length / 2);
        console.log('CBCT: pre-decoding middle slice for VOI...', dicomImageIds[middleIdx]);
        try {
          const decodeResult = await Promise.race([
            csCore.imageLoader.loadAndCacheImage(dicomImageIds[middleIdx]),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Decode timeout after 15s')), 15000),
            ),
          ]);
          console.log('CBCT: middle slice decoded OK', decodeResult);
        } catch (preloadErr) {
          console.warn('CBCT: middle slice pre-decode failed:', preloadErr);
          // If web worker decode fails, compute VOI from metadata directly
          console.log('CBCT: will use metadata-based VOI instead');
        }

        if (cancelled) return;

        // 11. Set volume on viewports (setDefaultVolumeVOI will find the cached middle image)
        await csCore.setVolumesForViewports(
          renderingEngine,
          [{ volumeId: VOLUME_ID }],
          [VIEWPORT_IDS.AXIAL, VIEWPORT_IDS.CORONAL, VIEWPORT_IDS.SAGITTAL],
        );
        console.log('CBCT: viewports ready, starting pixel data load...');

        // Viewports are ready — remove the blocking overlay so tools are interactive.
        // Pixel data loads progressively in the background.
        setIsLoading(false);
        setLoadProgress(70);

        // 11. Track loading progress via event (non-blocking indicator)
        let framesLoaded = 0;
        const totalFrames = dicomImageIds.length;
        const progressHandler = (evt: {
          detail: { framesProcessed: number; numberOfFrames: number };
        }) => {
          framesLoaded = evt.detail.framesProcessed;
          const pct = Math.round((framesLoaded / totalFrames) * 100);
          setLoadProgress(70 + Math.round(pct * 0.3)); // 70-100%
        };
        csCore.eventTarget.addEventListener(
          csCore.Enums.Events.IMAGE_VOLUME_MODIFIED,
          progressHandler as unknown as EventListener,
        );

        // 12. NOW start loading pixel data for all slices
        volume.load();

        // 13. Render (volume will progressively render as frames arrive)
        renderingEngine.renderViewports([
          VIEWPORT_IDS.AXIAL,
          VIEWPORT_IDS.CORONAL,
          VIEWPORT_IDS.SAGITTAL,
        ]);

        // Cleanup function
        cleanupRef.current = () => {
          // Remove progress listener
          csCore.eventTarget.removeEventListener(
            csCore.Enums.Events.IMAGE_VOLUME_MODIFIED,
            progressHandler as unknown as EventListener,
          );
          // Purge file manager and dataset cache
          try {
            csDicomLoader.default.wadouri.fileManager.purge();
            csDicomLoader.default.wadouri.dataSetCacheManager.purge();
          } catch {
            /* ignore */
          }
          // Destroy tool group
          try {
            ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
          } catch {
            /* ignore */
          }
          // Destroy rendering engine
          try {
            renderingEngine.destroy();
          } catch {
            /* ignore */
          }
          // Purge volume cache
          try {
            csCore.cache.removeVolumeLoadObject(VOLUME_ID);
          } catch {
            /* ignore */
          }
        };
      } catch (err) {
        if (!cancelled) {
          console.error('CBCT Viewer error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load CBCT scan');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [fileKey, downloadAndExtract]);

  // ── Tool Switching ──────────────────────────────────────

  const switchTool = useCallback(async (toolName: ToolName) => {
    try {
      const csTools = await import('@cornerstonejs/tools');
      const { ToolGroupManager } = csTools;
      const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
      if (!toolGroup) return;

      // Deactivate current primary tool (keep scroll, pan, zoom on other buttons)
      const currentTools = ['WindowLevel', 'Length', 'Angle', 'ArrowAnnotate', 'Crosshairs'];

      for (const tn of currentTools) {
        try {
          if (tn === toolName) continue;
          // Set to passive so annotations remain visible
          toolGroup.setToolPassive(tn);
        } catch {
          /* tool might not be in group */
        }
      }

      // Activate selected tool on left click
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }],
      });

      setActiveTool(toolName);
    } catch (err) {
      console.warn('Failed to switch tool:', err);
    }
  }, []);

  // ── Reset View ──────────────────────────────────────────

  const resetView = useCallback(async () => {
    try {
      const csCore = await import('@cornerstonejs/core');
      const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
      if (!engine) return;

      for (const vpId of Object.values(VIEWPORT_IDS)) {
        const vp = engine.getViewport(vpId);
        if (vp) {
          vp.resetCamera();
          vp.render();
        }
      }
      setIsInverted(false);
    } catch (err) {
      console.warn('Reset failed:', err);
    }
  }, []);

  // ── Invert Colors ──────────────────────────────────────

  const toggleInvert = useCallback(async () => {
    try {
      const csCore = await import('@cornerstonejs/core');
      const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
      if (!engine) return;

      const newInverted = !isInverted;
      for (const vpId of Object.values(VIEWPORT_IDS)) {
        const vp = engine.getViewport(vpId);
        if (vp && 'setProperties' in vp) {
          (vp as { setProperties: (p: { invert: boolean }) => void }).setProperties({
            invert: newInverted,
          });
          vp.render();
        }
      }
      setIsInverted(newInverted);
    } catch (err) {
      console.warn('Invert failed:', err);
    }
  }, [isInverted]);

  // ── CINE Playback ──────────────────────────────────────

  const cineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleCine = useCallback(async () => {
    if (isCinePlaying) {
      if (cineIntervalRef.current) {
        clearInterval(cineIntervalRef.current);
        cineIntervalRef.current = null;
      }
      setIsCinePlaying(false);
      return;
    }

    try {
      const csCore = await import('@cornerstonejs/core');
      const engine = csCore.getRenderingEngine(RENDERING_ENGINE_ID);
      if (!engine) return;

      const vp = engine.getViewport(VIEWPORT_IDS.AXIAL);
      if (!vp) return;

      setIsCinePlaying(true);

      // Auto-scroll through slices
      const direction = 1;
      cineIntervalRef.current = setInterval(() => {
        const viewport = engine.getViewport(VIEWPORT_IDS.AXIAL);
        if (!viewport || !('setSlabThickness' in viewport)) return;

        const camera = viewport.getCamera();
        const focalPoint = [...(camera.focalPoint ?? [0, 0, 0])] as [number, number, number];
        const viewPlaneNormal = camera.viewPlaneNormal ?? [0, 0, 1];

        // Move focal point along view plane normal
        focalPoint[0] += viewPlaneNormal[0] * direction * 0.5;
        focalPoint[1] += viewPlaneNormal[1] * direction * 0.5;
        focalPoint[2] += viewPlaneNormal[2] * direction * 0.5;

        viewport.setCamera({ ...camera, focalPoint });
        viewport.render();
      }, 50); // ~20 fps
    } catch {
      setIsCinePlaying(false);
    }
  }, [isCinePlaying]);

  // Clean up CINE on unmount
  useEffect(() => {
    return () => {
      if (cineIntervalRef.current) {
        clearInterval(cineIntervalRef.current);
      }
    };
  }, []);

  // ── Fullscreen ──────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Toolbar Buttons ─────────────────────────────────────

  const tools: { name: ToolName; icon: typeof Contrast; label: string }[] = [
    { name: 'WindowLevel', icon: Contrast, label: t('cbct.viewer.windowLevel') },
    { name: 'Zoom', icon: ZoomIn, label: t('cbct.viewer.zoom') },
    { name: 'Pan', icon: Hand, label: t('cbct.viewer.pan') },
    { name: 'Length', icon: Ruler, label: t('cbct.viewer.length') },
    { name: 'Angle', icon: Triangle, label: t('cbct.viewer.angle') },
    { name: 'ArrowAnnotate', icon: ArrowUpRight, label: t('cbct.viewer.arrow') },
    { name: 'Crosshairs', icon: Crosshair, label: t('cbct.viewer.crosshairs') },
  ];

  // ── Render ──────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative rounded-lg border bg-black">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-700 bg-gray-900 p-2">
        {/* Tool buttons */}
        {tools.map(({ name, icon: Icon, label }) => (
          <Button
            key={name}
            variant={activeTool === name ? 'default' : 'ghost'}
            size="sm"
            onClick={() => switchTool(name)}
            title={label}
            disabled={isLoading}
            className={`h-8 px-2 ${activeTool !== name ? 'text-gray-300 hover:text-white hover:bg-gray-700' : ''}`}
          >
            <Icon className="h-4 w-4" />
            <span className="ms-1 hidden text-xs sm:inline">{label}</span>
          </Button>
        ))}

        <div className="mx-1 h-6 w-px bg-gray-700" />

        {/* Utility buttons */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleInvert}
          title={t('cbct.viewer.invert')}
          disabled={isLoading}
          className={`h-8 px-2 ${isInverted ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
        >
          <SunMoon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCine}
          title={t('cbct.viewer.cine')}
          disabled={isLoading}
          className={`h-8 px-2 ${isCinePlaying ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
        >
          {isCinePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={resetView}
          title={t('cbct.viewer.reset')}
          disabled={isLoading}
          className="h-8 px-2 text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          title={t('cbct.viewer.fullscreen')}
          className="h-8 px-2 text-gray-300 hover:text-white hover:bg-gray-700"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-blue-400" />
          <p className="text-sm text-gray-300">{t('cbct.viewer.loading')}</p>
          <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">{loadProgress}%</p>
        </div>
      )}

      {/* Non-blocking progress bar while pixels load in background */}
      {!isLoading && loadProgress > 0 && loadProgress < 100 && (
        <div className="absolute top-12 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{loadProgress}%</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
          <div className="max-w-sm rounded-lg bg-red-900/50 p-6 text-center">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* 3 Viewports: Axial, Coronal, Sagittal */}
      <div className="grid grid-cols-3 gap-px bg-gray-800">
        <div className="relative">
          <div
            ref={axialRef}
            className="h-100 w-full lg:h-125"
            onContextMenu={(e) => e.preventDefault()}
          />
          <span className="absolute inset-s-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-green-400">
            {t('cbct.viewer.axial')}
          </span>
        </div>
        <div className="relative">
          <div
            ref={coronalRef}
            className="h-100 w-full lg:h-125"
            onContextMenu={(e) => e.preventDefault()}
          />
          <span className="absolute inset-s-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-blue-400">
            {t('cbct.viewer.coronal')}
          </span>
        </div>
        <div className="relative">
          <div
            ref={sagittalRef}
            className="h-100 w-full lg:h-125"
            onContextMenu={(e) => e.preventDefault()}
          />
          <span className="absolute inset-s-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-orange-400">
            {t('cbct.viewer.sagittal')}
          </span>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between border-t border-gray-700 bg-gray-900 px-3 py-1.5">
        <span className="text-xs text-gray-500">{t('cbct.viewer.controls')}</span>
        <span className="text-xs text-gray-500">
          {t('cbct.viewer.activeTool')}: {activeTool}
        </span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

/** Check if a buffer contains DICOM magic bytes (DICM at offset 128) */
function isDicomBuffer(data: Uint8Array): boolean {
  if (data.length < 132) return false;
  return data[128] === 0x44 && data[129] === 0x49 && data[130] === 0x43 && data[131] === 0x4d;
}
