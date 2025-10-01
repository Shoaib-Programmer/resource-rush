import { useParams } from '@tanstack/react-router';
import { useSyncGame } from '../hooks/useSyncGame';
import { PlayerList } from './PlayerList';
import { useGameStore } from '../store';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { ExtractionPhase } from './ExtractionPhase';
import { ActionPhase } from './ActionPhase';
import { useHostRoundProcessor } from '@/hooks/useHostRoundProcessor';
import { usePlayerRole } from '@/hooks/usePlayerRole';
import { RoleDisplay } from './RoleDisplay';
import startGame from '@/lib/startGame';

function GameRoom() {
    const { gameId } = useParams({ from: '/game/$gameId' });
    useSyncGame(gameId);
    const { game, user } = useGameStore();
    const playerRole = usePlayerRole(gameId, user?.uid);

    const isHost =
        !!user &&
        ((game?.hostId && game.hostId === user.uid) ||
            game?.players?.[user.uid]?.isHost === true ||
            game?.creatorId === user.uid);

    // Auto-process rounds when all players submit (host only)
    useHostRoundProcessor(gameId, user?.uid, isHost);

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

    // Render different phases based on game state
    const renderGameContent = () => {
        if (!game || !user) return null;

        if (game.status === 'waiting') {
            return (
                <>
                    <PlayerList />
                    <div className="text-sm text-muted-foreground">
                        Waiting for host to start the game...
                    </div>
                </>
            );
        }

        if (game.status === 'completed') {
            return (
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold">Game Over!</h2>
                    <PlayerList />
                    <div className="text-muted-foreground">
                        The game has ended. Check the final scores above.
                    </div>
                </div>
            );
        }

        if (game.status === 'in-progress') {
            const phase = game.gameState?.currentPhase;

            return (
                <div className="space-y-4">
                    <RoleDisplay role={playerRole} />
                    {phase === 'extraction' && (
                        <ExtractionPhase
                            game={game}
                            gameId={gameId}
                            userId={user.uid}
                        />
                    )}
                    {phase === 'action' && (
                        <ActionPhase
                            game={game}
                            gameId={gameId}
                            userId={user.uid}
                            isHost={isHost}
                        />
                    )}
                </div>
            );
        }

        return <PlayerList />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl">Game Room: {gameId}</h2>
                {canStart && (
                    <Button onClick={handleStartGame}>Start Game</Button>
                )}
            </div>
            {renderGameContent()}
        </div>
    );
}

export default GameRoom;
