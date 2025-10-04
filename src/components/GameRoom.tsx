import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useSyncGame } from '../hooks/useSyncGame';
import { PlayerList } from './PlayerList';
import { useGameStore } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import { toast } from 'sonner';
import { ExtractionPhase } from './ExtractionPhase';
import { ActionPhase } from './ActionPhase';
import { useHostRoundProcessor } from '@/hooks/useHostRoundProcessor';
import { usePlayerRole } from '@/hooks/usePlayerRole';
import { RoleDisplay } from './RoleDisplay';
import startGame from '@/lib/startGame';
import {
    DEFAULT_X_ROUNDS,
    DEFAULT_Y_PROFIT,
    DEFAULT_STARTING_GLOBAL_RESOURCES,
    DEFAULT_RESOURCES_PER_ROUND,
    DEFAULT_STARTING_RESOURCES,
    REQUIRED_PLAYER_COUNT,
} from '@/lib/gameConstants';

function GameRoom() {
    const { gameId } = useParams({ from: '/game/$gameId' });
    useSyncGame(gameId);
    const { game, user } = useGameStore();
    const playerRole = usePlayerRole(gameId, user?.uid);

    const [showConfig, setShowConfig] = useState(false);
    const [config, setConfig] = useState({
        xRounds: DEFAULT_X_ROUNDS,
        yProfit: DEFAULT_Y_PROFIT,
        startingGlobalResources: DEFAULT_STARTING_GLOBAL_RESOURCES,
        resourcesPerRound: DEFAULT_RESOURCES_PER_ROUND,
        startingResources: DEFAULT_STARTING_RESOURCES,
    });

    const isHost =
        !!user &&
        ((game?.hostId && game.hostId === user.uid) ||
            game?.players?.[user.uid]?.isHost === true ||
            game?.creatorId === user.uid);

    // Auto-process rounds when all players submit (host only)
    useHostRoundProcessor(gameId, user?.uid, isHost);

    const playerCount = game?.players ? Object.keys(game.players).length : 0;
    const canStart =
        isHost &&
        game?.status === 'waiting' &&
        !!gameId &&
        playerCount === REQUIRED_PLAYER_COUNT;

    const handleStartGame = async () => {
        if (!canStart || !gameId) return;

        // Validate player count
        const playerCount = game?.players
            ? Object.keys(game.players).length
            : 0;
        if (playerCount !== REQUIRED_PLAYER_COUNT) {
            toast.error(
                `Cannot start game! Need exactly ${REQUIRED_PLAYER_COUNT} players (currently ${playerCount}).`,
            );
            return;
        }

        try {
            // Host-only orchestration: perform single large update
            await startGame(gameId, {
                initialGlobalResources: config.startingGlobalResources,
                xRounds: config.xRounds,
                yProfit: config.yProfit,
                resourcesPerRound: config.resourcesPerRound,
                startingResources: config.startingResources,
            });
            toast.success('Game started!');
            setShowConfig(false);
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
                    {isHost && showConfig && (
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Game Configuration</CardTitle>
                                <CardDescription>
                                    Adjust game parameters (6-player defaults
                                    loaded)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="xRounds">
                                        Rounds to Survive (X)
                                    </Label>
                                    <Input
                                        id="xRounds"
                                        type="number"
                                        value={config.xRounds}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                xRounds:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            })
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Environmentalists must survive this many
                                        rounds
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="yProfit">
                                        Profit Target (Y)
                                    </Label>
                                    <Input
                                        id="yProfit"
                                        type="number"
                                        value={config.yProfit}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                yProfit:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            })
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Exploiters need this much total profit
                                        to win
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="startingGlobalResources">
                                        Starting Global Resources
                                    </Label>
                                    <Input
                                        id="startingGlobalResources"
                                        type="number"
                                        value={config.startingGlobalResources}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                startingGlobalResources:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="resourcesPerRound">
                                        Resources Generated Per Round
                                    </Label>
                                    <Input
                                        id="resourcesPerRound"
                                        type="number"
                                        value={config.resourcesPerRound}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                resourcesPerRound:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="startingResources">
                                        Starting Resources Per Player
                                    </Label>
                                    <Input
                                        id="startingResources"
                                        type="number"
                                        value={config.startingResources}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                startingResources:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleStartGame}
                                        className="flex-1"
                                    >
                                        Start Game with These Settings
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowConfig(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {!showConfig && (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Waiting for host to start the game...
                            </div>
                            <div
                                className={`text-sm font-medium ${
                                    playerCount === REQUIRED_PLAYER_COUNT
                                        ? 'text-green-600'
                                        : playerCount > REQUIRED_PLAYER_COUNT
                                          ? 'text-red-600'
                                          : 'text-yellow-600'
                                }`}
                            >
                                Players: {playerCount}/{REQUIRED_PLAYER_COUNT}{' '}
                                {playerCount < REQUIRED_PLAYER_COUNT &&
                                    `(Need ${REQUIRED_PLAYER_COUNT} to start)`}
                                {playerCount > REQUIRED_PLAYER_COUNT &&
                                    '(Too many players!)'}
                                {playerCount === REQUIRED_PLAYER_COUNT &&
                                    '✓ Ready to start!'}
                            </div>
                        </div>
                    )}
                </>
            );
        }

        if (game.status === 'finished') {
            const winner = game.gameState?.winner;
            return (
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold">Game Over!</h2>
                    {winner && (
                        <div className="text-2xl font-semibold">
                            {winner === 'Environmentalists' &&
                                '🌍 Environmentalists Win!'}
                            {winner === 'Exploiters' && '💰 Exploiters Win!'}
                            {winner === 'Moderates' && '⚖️ Moderates Win!'}
                            {winner !== 'Environmentalists' &&
                                winner !== 'Exploiters' &&
                                winner !== 'Moderates' &&
                                `Winner: ${game.players[winner]?.name || winner}`}
                        </div>
                    )}
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
        <div className="space-y-4 p-4 md:p-6 mx-auto max-w-screen-2xl">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl">Game Room: {gameId}</h2>
                {isHost && game?.status === 'waiting' && !showConfig && (
                    <Button
                        onClick={() => setShowConfig(true)}
                        disabled={playerCount !== REQUIRED_PLAYER_COUNT}
                    >
                        {playerCount === REQUIRED_PLAYER_COUNT
                            ? 'Configure & Start Game'
                            : `Need ${REQUIRED_PLAYER_COUNT} Players (${playerCount}/${REQUIRED_PLAYER_COUNT})`}
                    </Button>
                )}
            </div>
            {renderGameContent()}
        </div>
    );
}

export default GameRoom;
