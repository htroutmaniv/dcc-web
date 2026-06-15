import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { computeMapGridDimensions, type MapGridPreset } from '@dcc-web/shared';
import {
  clampViewport,
  computeFitView,
  getMinScale,
  zoomViewAtPoint,
} from './map-viewport-math';

export function useTacticalMapViewport({
  containerRef,
  mapGroupRef,
  mapId,
  gridPreset,
  cell,
  drawing,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mapGroupRef: React.RefObject<Konva.Group | null>;
  mapId: string;
  gridPreset: MapGridPreset;
  cell: number;
  drawing: boolean;
}) {
  const panningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastViewKeyRef = useRef(`${mapId}:${gridPreset}`);

  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const viewRef = useRef({ scale: 1, position: { x: 0, y: 0 } });
  viewRef.current = { scale, position };

  const { cols: gridCols, rows: gridRows, gridW, gridH } = useMemo(
    () =>
      computeMapGridDimensions(
        gridPreset,
        cell,
        Math.max(viewport.width, 1),
        Math.max(viewport.height, 1),
      ),
    [gridPreset, cell, viewport.width, viewport.height],
  );

  const applyView = useCallback(
    (nextScale: number, nextPos: { x: number; y: number }) => {
      const clamped = clampViewport(
        nextScale,
        nextPos,
        viewport.width,
        viewport.height,
        gridW,
        gridH,
      );
      viewRef.current = { scale: clamped.scale, position: clamped.pos };
      setScale(clamped.scale);
      setPosition(clamped.pos);
    },
    [viewport.width, viewport.height, gridW, gridH],
  );

  const zoomAtPoint = useCallback(
    (anchor: { x: number; y: number }, factor: number) => {
      const { scale: s, position: p } = viewRef.current;
      const next = zoomViewAtPoint(
        anchor,
        factor,
        s,
        p,
        viewport.width,
        viewport.height,
        gridW,
        gridH,
      );
      viewRef.current = { scale: next.scale, position: next.pos };
      setScale(next.scale);
      setPosition(next.pos);
    },
    [viewport.width, viewport.height, gridW, gridH],
  );

  const fitToView = useCallback(() => {
    const fit = computeFitView(viewport.width, viewport.height, gridW, gridH);
    setScale(fit.scale);
    setPosition(fit.pos);
  }, [viewport.width, viewport.height, gridW, gridH]);

  useEffect(() => {
    if (panningRef.current) return;
    const g = mapGroupRef.current;
    if (!g) return;
    g.position({ x: position.x, y: position.y });
    g.scale({ x: scale, y: scale });
  }, [position.x, position.y, scale, mapGroupRef]);

  useEffect(() => {
    mapGroupRef.current?.draggable(!drawing);
  }, [drawing, mapGroupRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setViewport({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const viewKey = `${mapId}:${gridPreset}`;
    if (lastViewKeyRef.current !== viewKey) {
      lastViewKeyRef.current = viewKey;
      fitToView();
    }
  }, [mapId, gridPreset, fitToView]);

  useEffect(() => {
    const { scale: s, position: p } = viewRef.current;
    const clamped = clampViewport(s, p, viewport.width, viewport.height, gridW, gridH);
    if (clamped.scale !== s || clamped.pos.x !== p.x || clamped.pos.y !== p.y) {
      setScale(clamped.scale);
      setPosition(clamped.pos);
    }
  }, [viewport.width, viewport.height, gridW, gridH]);

  const trackPointer = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) lastPointerRef.current = pos;
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    lastPointerRef.current = pointer;
    const delta = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
    zoomAtPoint(pointer, delta);
  };

  const zoomBy = (factor: number) => {
    const anchor = lastPointerRef.current ?? {
      x: viewport.width / 2,
      y: viewport.height / 2,
    };
    zoomAtPoint(anchor, factor);
  };

  const handleMapPanStart = () => {
    panningRef.current = true;
  };

  const handleMapPanEnd = (e: KonvaEventObject<DragEvent>) => {
    panningRef.current = false;
    applyView(scale, { x: e.target.x(), y: e.target.y() });
  };

  const minScale = getMinScale(viewport.width, viewport.height, gridW, gridH);
  const canZoomOut = scale > minScale + 0.001;

  return {
    viewport,
    scale,
    position,
    gridCols,
    gridRows,
    gridW,
    gridH,
    fitToView,
    trackPointer,
    handleWheel,
    zoomBy,
    handleMapPanStart,
    handleMapPanEnd,
    canZoomOut,
  };
}
