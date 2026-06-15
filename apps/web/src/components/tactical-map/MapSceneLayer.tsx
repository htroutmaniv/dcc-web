import { Circle, Group, Image as KonvaImage, Line, Rect } from 'react-konva';
import type { MapDrawing, MapDrawTool } from '@dcc-web/shared';

export function MapSceneLayer({
  mapImage,
  imageX,
  imageY,
  imageW,
  imageH,
  gridCols,
  gridRows,
  gridW,
  gridH,
  cell,
  drawings,
  drawTool,
  drawColor,
  drawStrokeWidth,
  draftPoints,
  previewShape,
  drawing,
}: {
  mapImage: HTMLImageElement | null;
  imageX: number;
  imageY: number;
  imageW: number;
  imageH: number;
  gridCols: number;
  gridRows: number;
  gridW: number;
  gridH: number;
  cell: number;
  drawings: MapDrawing[];
  drawTool: MapDrawTool;
  drawColor: string;
  drawStrokeWidth: number;
  draftPoints: number[];
  previewShape: { x: number; y: number; width: number; height: number } | null;
  drawing: boolean;
}) {
  return (
    <>
      <Group listening={false}>
        {mapImage && (
          <KonvaImage
            image={mapImage}
            x={imageX}
            y={imageY}
            width={imageW}
            height={imageH}
            listening={false}
          />
        )}
      </Group>
      <Group listening={false}>
        {Array.from({ length: gridCols + 1 }, (_, i) => (
          <Line
            key={`v${i}`}
            points={[i * cell, 0, i * cell, gridH]}
            stroke="rgba(201, 162, 39, 0.12)"
            strokeWidth={1}
            listening={false}
          />
        ))}
        {Array.from({ length: gridRows + 1 }, (_, i) => (
          <Line
            key={`h${i}`}
            points={[0, i * cell, gridW, i * cell]}
            stroke="rgba(201, 162, 39, 0.12)"
            strokeWidth={1}
            listening={false}
          />
        ))}
      </Group>

      {drawings.map((d) => {
        if (d.tool === 'freehand') {
          return (
            <Line
              key={d.id}
              points={d.points.map((v, i) => (i % 2 === 0 ? v * cell : v * cell))}
              stroke={d.color}
              strokeWidth={d.strokeWidth}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          );
        }
        if (d.tool === 'rect') {
          return (
            <Rect
              key={d.id}
              x={d.x * cell}
              y={d.y * cell}
              width={d.width * cell}
              height={d.height * cell}
              stroke={d.color}
              strokeWidth={d.strokeWidth}
              listening={false}
            />
          );
        }
        return (
          <Circle
            key={d.id}
            x={(d.x + d.width / 2) * cell}
            y={(d.y + d.height / 2) * cell}
            radius={(Math.max(d.width, d.height) / 2) * cell}
            stroke={d.color}
            strokeWidth={d.strokeWidth}
            listening={false}
          />
        );
      })}
      {draftPoints.length > 0 && drawTool === 'freehand' && (
        <Line
          points={draftPoints.map((v, i) => (i % 2 === 0 ? v * cell : v * cell))}
          stroke={drawColor}
          strokeWidth={drawStrokeWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {draftPoints.length > 0 && drawTool === 'erase' && (
        <Line
          points={draftPoints.map((v, i) => (i % 2 === 0 ? v * cell : v * cell))}
          stroke="rgba(255, 120, 120, 0.85)"
          strokeWidth={drawStrokeWidth * cell * 1.5}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {previewShape && drawTool === 'rect' && (
        <Rect
          {...previewShape}
          stroke={drawColor}
          strokeWidth={drawStrokeWidth}
          dash={[6, 4]}
          listening={false}
        />
      )}
      {previewShape && drawTool === 'circle' && (
        <Circle
          x={previewShape.x + previewShape.width / 2}
          y={previewShape.y + previewShape.height / 2}
          radius={Math.max(previewShape.width, previewShape.height) / 2}
          stroke={drawColor}
          strokeWidth={drawStrokeWidth}
          dash={[6, 4]}
          listening={false}
        />
      )}

      <Rect
        x={0}
        y={0}
        width={gridW}
        height={gridH}
        fill="rgba(0,0,0,0.002)"
        listening={!drawing}
      />
    </>
  );
}
