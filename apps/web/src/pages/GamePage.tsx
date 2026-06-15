import { useParams } from 'react-router-dom';
import { GamePageView } from '../components/game/GamePageView';
import { useGamePageController } from '../hooks/useGamePageController';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const vm = useGamePageController(gameId);
  return <GamePageView vm={vm} />;
}
