import { useEffect, useRef } from 'react';
import { Circle, Group, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { TacticalMapToken } from '../../types/map';

export const TOKEN_RADIUS_FACTOR = 0.285;

export function MapTokenChip({
  token,
  cell,
  draggable,
  clickable,
  isActiveTurn,
  mapGroupRef,
  allowMapPan,
  onMove,
  onClick,
}: {
  token: TacticalMapToken;
  cell: number;
  draggable: boolean;
  clickable: boolean;
  isActiveTurn: boolean;
  mapGroupRef: React.RefObject<Konva.Group | null>;
  allowMapPan: boolean;
  onMove: (x: number, y: number) => void;
  onClick?: () => void;
}) {
  const r = cell * TOKEN_RADIUS_FACTOR;
  const groupRef = useRef<Konva.Group>(null);
  const draggingRef = useRef(false);
  const isDead = Boolean(token.isDead);
  const displayLabel = isDead ? `${token.label} (dead)` : token.label;
  const activeStroke = '#c9a227';

  useEffect(() => {
    if (draggingRef.current) return;
    groupRef.current?.position({ x: token.x * cell, y: token.y * cell });
  }, [token.x, token.y, cell]);

  return (
    <Group
      ref={groupRef}
      draggable={draggable}
      onClick={(e) => {
        if (!clickable || !onClick) return;
        e.cancelBubble = true;
        onClick();
      }}
      onTap={(e) => {
        if (!clickable || !onClick) return;
        e.cancelBubble = true;
        onClick();
      }}
      onDragStart={(e) => {
        draggingRef.current = true;
        mapGroupRef.current?.draggable(false);
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        draggingRef.current = false;
        if (allowMapPan) mapGroupRef.current?.draggable(true);
        const nx = e.target.x() / cell;
        const ny = e.target.y() / cell;
        onMove(nx, ny);
      }}
    >
      {isActiveTurn && (
        <>
          <Circle
            x={0}
            y={0}
            radius={r + 7}
            stroke="rgba(201, 162, 39, 0.4)"
            strokeWidth={3}
            listening={false}
          />
          <Circle
            x={0}
            y={0}
            radius={r + 3}
            stroke={activeStroke}
            strokeWidth={3}
            listening={false}
          />
        </>
      )}
      <Circle
        x={0}
        y={0}
        radius={r}
        fill={isDead ? '#4a4a4a' : token.color}
        opacity={isDead ? 0.65 : 1}
        stroke={
          isActiveTurn
            ? activeStroke
            : isDead
              ? '#888'
              : token.kind === 'monster'
                ? '#3a1010'
                : '#1a1510'
        }
        strokeWidth={isActiveTurn ? 3 : 2}
        dash={isDead ? [4, 3] : undefined}
        listening={clickable || draggable}
      />
      {isDead && (
        <>
          <Line
            points={[-r * 0.55, -r * 0.55, r * 0.55, r * 0.55]}
            stroke="#e8e0d0"
            strokeWidth={2}
            listening={false}
          />
          <Line
            points={[-r * 0.55, r * 0.55, r * 0.55, -r * 0.55]}
            stroke="#e8e0d0"
            strokeWidth={2}
            listening={false}
          />
        </>
      )}
      <Text
        x={-r}
        y={-r - 10}
        width={r * 2}
        text={displayLabel}
        fontSize={8}
        fill={isDead ? '#b0a898' : '#f8f4ea'}
        align="center"
        listening={false}
      />
    </Group>
  );
}
