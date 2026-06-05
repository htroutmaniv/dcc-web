export type RollLogPanelLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const STORAGE_PREFIX = 'dcc-roll-log-layout:';
const PAD = 12;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 240;
export const ROLL_LOG_MIN_WIDTH = 240;
export const ROLL_LOG_MIN_HEIGHT = 140;

export function rollLogLayoutKey(gameId: string) {
  return `${STORAGE_PREFIX}${gameId}`;
}

export function loadRollLogLayout(key: string): RollLogPanelLayout | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RollLogPanelLayout;
    if (
      typeof parsed.left === 'number' &&
      typeof parsed.top === 'number' &&
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number'
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveRollLogLayout(key: string, layout: RollLogPanelLayout) {
  try {
    localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    /* ignore quota */
  }
}

export function defaultRollLogLayout(containerWidth: number, containerHeight: number): RollLogPanelLayout {
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;
  return {
    left: Math.max(PAD, containerWidth - width - PAD),
    top: Math.max(PAD, containerHeight - height - PAD),
    width,
    height,
  };
}

export function clampRollLogLayout(
  layout: RollLogPanelLayout,
  containerWidth: number,
  containerHeight: number,
): RollLogPanelLayout {
  const maxW = Math.max(ROLL_LOG_MIN_WIDTH, containerWidth - PAD * 2);
  const maxH = Math.max(ROLL_LOG_MIN_HEIGHT, containerHeight - PAD * 2);
  const width = Math.min(maxW, Math.max(ROLL_LOG_MIN_WIDTH, layout.width));
  const height = Math.min(maxH, Math.max(ROLL_LOG_MIN_HEIGHT, layout.height));
  const left = Math.min(
    Math.max(PAD, layout.left),
    Math.max(PAD, containerWidth - width - PAD),
  );
  const top = Math.min(
    Math.max(PAD, layout.top),
    Math.max(PAD, containerHeight - height - PAD),
  );
  return { left, top, width, height };
}
