import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { Game } from '@/types';
import { advancePhase } from '@/lib/extractionPhase';
import { toast } from 'sonner';
import { useState } from 'react';

interface RevealPhaseProps {
    game: Game;
    gameId: string;
    userId: string;
    isHost: boolean;
}

export function RevealPhase({
    game,
    gameId,
    userId,
    isHost,
}: RevealPhaseProps) {
    const [isAdvancing, setIsAdvancing] = useState(false);

    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;
    const submissions = game.roundSubmissions?.[roundKey] ?? {};
    const totalExtraction = game.gameState?.revealedExtraction ?? 0;
    const globalResources = game.gameState?.globalResources ?? 0;

    const player = game.players[userId];
    const myResources = player?.resources ?? 0;
    const mySubmission = submissions[userId] ?? 0;

    const handleAdvance = async () => {
        setIsAdvancing(true);
        try {
            await advancePhase(gameId, userId);
            toast.success('Moving to action phase...');
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
                <CardTitle>Reveal Phase - Round {currentRound}</CardTitle>
                <CardDescription>See what everyone extracted</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Total Extraction */}
                    <div className="p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                        <div className="text-blue-800 dark:text-blue-200 font-medium mb-2">
                            Total Resources Extracted This Round
                        </div>
                        <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                            {totalExtraction}
                        </div>
                    </div>

                    {/* Resource Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">
                                Your Resources
                            </div>
                            <div className="text-2xl font-bold">
                                {myResources}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                (extracted {mySubmission} this round)
                            </div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">
                                Global Resources Remaining
                            </div>
                            <div className="text-2xl font-bold">
                                {globalResources}
                            </div>
                        </div>
                    </div>

                    {/* Individual Submissions */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm">
                            Extractions by Player:
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(submissions).map(
                                ([playerId, amount]) => {
                                    const playerName =
                                        game.players[playerId]?.name ??
                                        'Unknown';
                                    const isMe = playerId === userId;
                                    return (
                                        <div
                                            key={playerId}
                                            className="flex justify-between items-center p-3 bg-muted rounded-lg"
                                        >
                                            <span className="font-medium">
                                                {playerName}
                                                {isMe && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="ml-2"
                                                    >
                                                        You
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="text-lg font-bold">
                                                {amount}
                                            </span>
                                        </div>
                                    );
                                },
                            )}
                        </div>
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
                                : 'Continue to Action Phase →'}
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
