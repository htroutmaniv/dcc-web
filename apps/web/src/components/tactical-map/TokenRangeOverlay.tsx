import { Circle, Group } from 'react-konva';

export function TokenRangeOverlay({
  x,
  y,
  cell,
  lightRadiusCells,
  movementRadiusCells,
}: {
  x: number;
  y: number;
  cell: number;
  lightRadiusCells?: number;
  movementRadiusCells?: number;
}) {
  return (
    <Group x={x} y={y} listening={false}>
      {movementRadiusCells != null && movementRadiusCells > 0 && (
        <Circle
          x={0}
          y={0}
          radius={movementRadiusCells * cell}
          fill="rgba(96, 165, 250, 0.07)"
          stroke="rgba(96, 165, 250, 0.55)"
          strokeWidth={2}
          dash={[8, 5]}
        />
      )}
      {lightRadiusCells != null && lightRadiusCells > 0 && (
        <Circle
          x={0}
          y={0}
          radius={lightRadiusCells * cell}
          fill="rgba(255, 193, 90, 0.1)"
          stroke="rgba(255, 193, 90, 0.4)"
          strokeWidth={1.5}
        />
      )}
    </Group>
  );
}
