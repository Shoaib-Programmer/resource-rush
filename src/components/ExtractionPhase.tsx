import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import type { Game } from '@/types';
import { submitExtraction } from '@/lib/extractionPhase';
import { toast } from 'sonner';

interface ExtractionPhaseProps {
    game: Game;
    gameId: string;
    userId: string;
}

export function ExtractionPhase({
    game,
    gameId,
    userId,
}: ExtractionPhaseProps) {
    const [extractionAmount, setExtractionAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;
    const submissions = game.roundSubmissions?.[roundKey] ?? {};
    const hasSubmitted = userId in submissions;
    const mySubmission = submissions[userId];

    const player = game.players[userId];
    const myResources = player?.resources ?? 0;
    const isJailed = player?.isJailed ?? false;
    const globalResources = game.gameState?.globalResources ?? 0;

    // Count how many players have submitted
    const activePlayers = Object.keys(game.players).filter(
        (playerId) => !game.players[playerId]?.isJailed,
    );
    const submittedCount = Object.keys(submissions).length;

    const handleSubmit = async () => {
        const amount = parseInt(extractionAmount, 10);

        if (isNaN(amount) || amount < 0) {
            toast.error('Please enter a valid positive number');
            return;
        }

        if (amount > globalResources) {
            toast.error(
                `Cannot extract more than available global resources (${globalResources})`,
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await submitExtraction(gameId, userId, amount);
            toast.success(`Submitted extraction of ${amount} resources`);
            setExtractionAmount('');
        } catch (error) {
            console.error('Error submitting extraction:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to submit extraction',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isJailed) {
        return (
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>
                        Extraction Phase - Round {currentRound}
                    </CardTitle>
                    <CardDescription>
                        You are currently jailed and cannot participate this
                        round
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                            <span className="font-medium">Status:</span>
                            <Badge variant="destructive">Jailed</Badge>
                        </div>
                        <div className="text-center text-muted-foreground">
                            Waiting for other players to submit their
                            extractions...
                            <div className="mt-2">
                                {submittedCount} / {activePlayers.length}{' '}
                                players have submitted
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Extraction Phase - Round {currentRound}</CardTitle>
                <CardDescription>
                    Choose how many resources to extract from the global pool
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

                    {/* Submission Status */}
                    <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                                Players Submitted:
                            </span>
                            <Badge variant="secondary">
                                {submittedCount} / {activePlayers.length}
                            </Badge>
                        </div>
                    </div>

                    {hasSubmitted ? (
                        <div className="space-y-4">
                            <div className="p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-center">
                                <div className="text-green-800 dark:text-green-200 font-medium mb-2">
                                    ✓ Submission Received
                                </div>
                                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                                    {mySubmission} resources
                                </div>
                                <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                                    Waiting for other players...
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="extraction">
                                    Extraction Amount
                                </Label>
                                <Input
                                    id="extraction"
                                    type="number"
                                    min="0"
                                    max={globalResources}
                                    value={extractionAmount}
                                    onChange={(e) =>
                                        setExtractionAmount(e.target.value)
                                    }
                                    placeholder="Enter amount to extract"
                                    className="mt-2"
                                    disabled={isSubmitting}
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                    Maximum: {globalResources} resources
                                    available
                                </p>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !extractionAmount}
                                className="w-full"
                                size="lg"
                            >
                                {isSubmitting
                                    ? 'Submitting...'
                                    : 'Submit Extraction'}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
