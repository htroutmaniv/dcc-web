import type { ComponentProps } from 'react';
import { GameSideMenu } from '../GameSideMenu';

export type GameSidebarProps = ComponentProps<typeof GameSideMenu>;

/** Sidebar wrapper — characters, dice tray, presence (Phase 4.1). */
export function GameSidebar(props: GameSidebarProps) {
  return <GameSideMenu {...props} />;
}
