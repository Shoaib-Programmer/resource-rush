import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import type { Game } from '@/types';
import { advancePhase } from '@/lib/extractionPhase';
import {
    investigatePlayer,
    nominatePlayerForArrest,
    castVote,
    replantResources,
    hasInvestigatedThisRound,
    getInvestigationTarget,
} from '@/lib/actionPhase';
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
    const [selectedInvestigateTarget, setSelectedInvestigateTarget] =
        useState('');
    const [investigationResult, setInvestigationResult] = useState<
        number | null
    >(null);
    const [selectedNominateTarget, setSelectedNominateTarget] = useState('');
    const [replantAmount, setReplantAmount] = useState('');

    const currentRound = game.gameState?.currentRound ?? 1;
    const maxRounds = game.config?.xRounds ?? 20;
    const globalResources = game.gameState?.globalResources ?? 0;
    const revealedExtraction = game.gameState?.revealedExtraction ?? 0;
    const roundFees = game.gameState?.roundFees ?? {};
    const currentVote = game.gameState?.currentVote;

    const player = game.players[userId];
    const myResources = player?.resources ?? 0;
    const myFee = roundFees[userId] ?? 0;
    const isJailed = player?.isJailed ?? false;

    const hasInvestigated = hasInvestigatedThisRound(game, userId);
    const investigatedPlayer = getInvestigationTarget(game, userId);

    // Get list of other players
    const otherPlayers = Object.entries(game.players)
        .filter(([id]) => id !== userId)
        .map(([id, p]) => ({ id, name: p.name }));

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

    const handleInvestigate = async () => {
        if (!selectedInvestigateTarget) {
            toast.error('Please select a player to investigate');
            return;
        }

        try {
            const result = await investigatePlayer(
                gameId,
                userId,
                selectedInvestigateTarget,
            );
            setInvestigationResult(result);
            const targetName =
                game.players[selectedInvestigateTarget]?.name ?? 'Player';
            toast.success(
                `Investigation complete! ${targetName} extracted ${result ?? 'unknown'} resources`,
            );
        } catch (error) {
            console.error('Investigation error:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to investigate',
            );
        }
    };

    const handleNominate = async () => {
        if (!selectedNominateTarget) {
            toast.error('Please select a player to nominate');
            return;
        }

        try {
            await nominatePlayerForArrest(
                gameId,
                userId,
                selectedNominateTarget,
            );
            const targetName =
                game.players[selectedNominateTarget]?.name ?? 'Player';
            toast.success(
                `Nominated ${targetName} for arrest! Voting has begun.`,
            );
            setSelectedNominateTarget('');
        } catch (error) {
            console.error('Nomination error:', error);
            toast.error(
                error instanceof Error ? error.message : 'Failed to nominate',
            );
        }
    };

    const handleVote = async (voteFor: boolean) => {
        try {
            await castVote(gameId, userId, voteFor);
            toast.success(`Vote cast ${voteFor ? 'for' : 'against'} arrest`);
        } catch (error) {
            console.error('Vote error:', error);
            toast.error(
                error instanceof Error ? error.message : 'Failed to cast vote',
            );
        }
    };

    const handleReplant = async () => {
        const amount = parseInt(replantAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid positive amount');
            return;
        }

        try {
            await replantResources(gameId, userId, amount);
            toast.success(`Replanted ${amount} resources to the global pool`);
            setReplantAmount('');
        } catch (error) {
            console.error('Replant error:', error);
            toast.error(
                error instanceof Error ? error.message : 'Failed to replant',
            );
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
                    {/* Round Results */}
                    <div className="p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h3 className="font-semibold mb-4 text-blue-900 dark:text-blue-100">
                            Round {currentRound} Results
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                    Revealed Extraction
                                </div>
                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                    {revealedExtraction}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                    Your Fee
                                </div>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    -{myFee}
                                </div>
                            </div>
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

                    {/* Issue Card / Fee Display */}
                    {myFee > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                                🎴 Issue Card
                            </h4>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                You've been charged a fee of{' '}
                                <strong>{myFee}</strong> resources this round.
                                This has been automatically deducted.
                            </p>
                        </div>
                    )}

                    {/* Jailed Status */}
                    {isJailed && (
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                🔒 You are jailed
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                You cannot perform actions this round.
                            </p>
                        </div>
                    )}

                    {!isJailed && (
                        <>
                            <Separator />

                            {/* Action Buttons */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">
                                    Available Actions
                                </h3>

                                {/* Investigate Action */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            🔍 Investigate a Player
                                        </CardTitle>
                                        <CardDescription>
                                            Discover how many resources a player
                                            extracted this round
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {hasInvestigated ? (
                                            <div className="text-sm text-muted-foreground">
                                                ✓ You already investigated{' '}
                                                <strong>
                                                    {game.players[
                                                        investigatedPlayer!
                                                    ]?.name ?? 'a player'}
                                                </strong>{' '}
                                                this round
                                                {investigationResult !==
                                                    null && (
                                                    <span>
                                                        {' '}
                                                        - they extracted{' '}
                                                        <strong>
                                                            {
                                                                investigationResult
                                                            }
                                                        </strong>{' '}
                                                        resources
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor="investigate-target">
                                                        Select Player
                                                    </Label>
                                                    <select
                                                        id="investigate-target"
                                                        value={
                                                            selectedInvestigateTarget
                                                        }
                                                        onChange={(e) =>
                                                            setSelectedInvestigateTarget(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full mt-1 p-2 border rounded-md bg-background"
                                                    >
                                                        <option value="">
                                                            -- Choose a player
                                                            --
                                                        </option>
                                                        {otherPlayers.map(
                                                            ({ id, name }) => (
                                                                <option
                                                                    key={id}
                                                                    value={id}
                                                                >
                                                                    {name}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </div>
                                                <Button
                                                    onClick={handleInvestigate}
                                                    disabled={
                                                        !selectedInvestigateTarget
                                                    }
                                                    className="w-full"
                                                >
                                                    Investigate
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Vote to Arrest */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            ⚖️ Vote to Arrest
                                        </CardTitle>
                                        <CardDescription>
                                            Nominate a player for arrest or vote
                                            on active nomination
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {currentVote &&
                                        !currentVote.resolved ? (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-muted rounded-lg">
                                                    <p className="text-sm mb-2">
                                                        <strong>
                                                            {
                                                                game.players[
                                                                    currentVote
                                                                        .nominatedBy
                                                                ]?.name
                                                            }
                                                        </strong>{' '}
                                                        nominated{' '}
                                                        <strong>
                                                            {
                                                                game.players[
                                                                    currentVote
                                                                        .targetPlayer
                                                                ]?.name
                                                            }
                                                        </strong>{' '}
                                                        for arrest
                                                    </p>
                                                    <div className="flex gap-4 text-xs">
                                                        <div>
                                                            <Badge variant="default">
                                                                For:{' '}
                                                                {
                                                                    currentVote
                                                                        .votesFor
                                                                        .length
                                                                }
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <Badge variant="secondary">
                                                                Against:{' '}
                                                                {
                                                                    currentVote
                                                                        .votesAgainst
                                                                        .length
                                                                }
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                {!currentVote.votesFor.includes(
                                                    userId,
                                                ) &&
                                                !currentVote.votesAgainst.includes(
                                                    userId,
                                                ) ? (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() =>
                                                                handleVote(true)
                                                            }
                                                            variant="default"
                                                            className="flex-1"
                                                        >
                                                            Vote For Arrest
                                                        </Button>
                                                        <Button
                                                            onClick={() =>
                                                                handleVote(
                                                                    false,
                                                                )
                                                            }
                                                            variant="outline"
                                                            className="flex-1"
                                                        >
                                                            Vote Against
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground text-center">
                                                        ✓ You have voted
                                                    </div>
                                                )}
                                            </div>
                                        ) : currentVote &&
                                          currentVote.resolved ? (
                                            <div className="text-sm text-muted-foreground">
                                                Vote resolved:{' '}
                                                {currentVote.votesFor.length >
                                                currentVote.votesAgainst.length
                                                    ? `${game.players[currentVote.targetPlayer]?.name} was arrested`
                                                    : 'Arrest was rejected'}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor="nominate-target">
                                                        Select Player to
                                                        Nominate
                                                    </Label>
                                                    <select
                                                        id="nominate-target"
                                                        value={
                                                            selectedNominateTarget
                                                        }
                                                        onChange={(e) =>
                                                            setSelectedNominateTarget(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full mt-1 p-2 border rounded-md bg-background"
                                                    >
                                                        <option value="">
                                                            -- Choose a player
                                                            --
                                                        </option>
                                                        {otherPlayers.map(
                                                            ({ id, name }) => (
                                                                <option
                                                                    key={id}
                                                                    value={id}
                                                                >
                                                                    {name}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </div>
                                                <Button
                                                    onClick={handleNominate}
                                                    disabled={
                                                        !selectedNominateTarget
                                                    }
                                                    className="w-full"
                                                >
                                                    Nominate for Arrest
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Replant Resources */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            🌱 Replant Resources
                                        </CardTitle>
                                        <CardDescription>
                                            Convert your personal resources back
                                            to the global pool
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div>
                                                <Label htmlFor="replant-amount">
                                                    Amount (Max: {myResources})
                                                </Label>
                                                <Input
                                                    id="replant-amount"
                                                    type="number"
                                                    min="1"
                                                    max={myResources}
                                                    value={replantAmount}
                                                    onChange={(e) =>
                                                        setReplantAmount(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Enter amount"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleReplant}
                                                disabled={
                                                    !replantAmount ||
                                                    myResources === 0
                                                }
                                                className="w-full"
                                                variant="outline"
                                            >
                                                Replant Resources
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />
                        </>
                    )}

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
