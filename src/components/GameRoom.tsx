import { useParams } from '@tanstack/react-router';
import { useSyncGame } from '../hooks/useSyncGame';
import { PlayerList } from './PlayerList';

function GameRoom() {
    const { gameId } = useParams({ from: '/game/$gameId' });
    useSyncGame(gameId);

    return (
        <div>
            <h2 className="text-2xl">Game Room: {gameId}</h2>
            <PlayerList />
        </div>
    );
}

export default GameRoom;
