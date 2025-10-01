import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import type { Game } from '@/types';
import { advancePhase } from '@/lib/extractionPhase';
import { toast } from 'sonner';
import { useState } from 'react';

interface ActionPhaseProps {
    game: Game;
    gameId: string;
    userId: string;
    isHost: boolean;
}

export function ActionPhase({
    game,
    gameId,
    userId,
    isHost,
}: ActionPhaseProps) {
    const [isAdvancing, setIsAdvancing] = useState(false);

    const currentRound = game.gameState?.currentRound ?? 1;
    const maxRounds = game.config?.xRounds ?? 20;
    const globalResources = game.gameState?.globalResources ?? 0;

    const player = game.players[userId];
    const myResources = player?.resources ?? 0;

    const handleAdvance = async () => {
        setIsAdvancing(true);
        try {
            await advancePhase(gameId, userId);
            if (currentRound >= maxRounds) {
                toast.success('Game completed!');
            } else {
                toast.success('Moving to next round...');
            }
        } catch (error) {
            console.error('Error advancing phase:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to advance phase',
            );
        } finally {
            setIsAdvancing(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Action Phase - Round {currentRound}</CardTitle>
                <CardDescription>
                    Players can take special actions (Coming soon: voting,
                    arrests, etc.)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Resource Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">
                                Your Resources
                            </div>
                            <div className="text-2xl font-bold">
                                {myResources}
                            </div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">
                                Global Resources
                            </div>
                            <div className="text-2xl font-bold">
                                {globalResources}
                            </div>
                        </div>
                    </div>

                    {/* Round Progress */}
                    <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                                Round Progress:
                            </span>
                            <span className="text-sm font-bold">
                                {currentRound} / {maxRounds}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                    width: `${(currentRound / maxRounds) * 100}%`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Placeholder for future actions */}
                    <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                        <p className="mb-2">🚧 Actions Coming Soon 🚧</p>
                        <p className="text-sm">
                            Future features: Vote to arrest players,
                            environmental events, special abilities
                        </p>
                    </div>

                    {/* Host Controls */}
                    {isHost && (
                        <Button
                            onClick={handleAdvance}
                            disabled={isAdvancing}
                            className="w-full"
                            size="lg"
                        >
                            {isAdvancing
                                ? 'Advancing...'
                                : currentRound >= maxRounds
                                  ? 'End Game'
                                  : 'Continue to Next Round →'}
                        </Button>
                    )}

                    {!isHost && (
                        <div className="text-center text-muted-foreground">
                            Waiting for host to continue...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
