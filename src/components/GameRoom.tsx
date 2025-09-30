import { useParams } from '@tanstack/react-router';
import { useSyncGame } from '../hooks/useSyncGame';
import { PlayerList } from './PlayerList';
import { useGameStore } from '../store';
import { Button } from './ui/button';
import { toast } from 'sonner';
import startGame from '@/lib/startGame';

function GameRoom() {
    const { gameId } = useParams({ from: '/game/$gameId' });
    useSyncGame(gameId);
    const { game, user } = useGameStore();

    const isHost =
        !!user &&
        ((game?.hostId && game.hostId === user.uid) ||
            game?.players?.[user.uid]?.isHost === true ||
            game?.creatorId === user.uid);

    const canStart = isHost && game?.status === 'waiting' && !!gameId;

    const handleStartGame = async () => {
        if (!canStart || !gameId) return;
        try {
            // Host-only orchestration: perform single large update
            await startGame(gameId, {
                initialGlobalResources: 1000,
                xRounds: 20,
                yProfit: 500,
                startingResources: 10,
            });
            toast.success('Game started!');
        } catch (err) {
            console.error('Failed to start game', err);
            const message =
                err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Failed to start game: ${message}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl">Game Room: {gameId}</h2>
                {canStart && (
                    <Button onClick={handleStartGame}>Start Game</Button>
                )}
            </div>
            <PlayerList />
            {game?.status && (
                <div className="text-sm text-muted-foreground">
                    Status: {game.status}
                </div>
            )}
        </div>
    );
}

export default GameRoom;
