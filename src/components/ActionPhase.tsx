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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

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
        <Card className="mx-auto w-full max-w-screen-2xl">
            <CardHeader>
                <CardTitle>Action Phase - Round {currentRound}</CardTitle>
                <CardDescription>
                    Players can take special actions (Coming soon: voting,
                    arrests, etc.)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Round Results */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="text-sm">
                                    Revealed
                                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                        {revealedExtraction}
                                    </div>
                                </div>
                                <div className="text-sm">
                                    Your Fee
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        -{myFee}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resource Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="text-xs text-muted-foreground">
                                    Your Resources
                                </div>
                                <div className="text-2xl font-bold">
                                    {myResources}
                                </div>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="text-xs text-muted-foreground">
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
                                <span className="text-xs font-medium">
                                    Progress
                                </span>
                                <span className="text-xs font-bold">
                                    {currentRound} / {maxRounds}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div
                                    className="bg-primary h-3 rounded-full transition-all"
                                    style={{
                                        width: `${(currentRound / maxRounds) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Issue Card / Fee Display */}
                    {myFee > 0 && (
                        <div className="px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2 text-sm">
                            <span className="text-base">🎴</span>
                            <span className="font-medium text-red-900 dark:text-red-100">
                                Issue
                            </span>
                            <span className="text-red-800 dark:text-red-300">
                                Fee charged: <strong>{myFee}</strong> resources
                                this round.
                            </span>
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

                            {/* Action Buttons in responsive grid to reduce scrolling */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">
                                    Available Actions
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                    {/* Investigate Action */}
                                    <section className="rounded-lg border p-4 h-full">
                                        <div className="mb-1 font-medium">
                                            🔍 Investigate a Player
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Discover how many resources a player
                                            extracted this round
                                        </p>
                                        {hasInvestigated ? (
                                            <div className="text-sm text-muted-foreground">
                                                ✓ You investigated{' '}
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
                                                    <Select
                                                        value={
                                                            selectedInvestigateTarget
                                                        }
                                                        onValueChange={
                                                            setSelectedInvestigateTarget
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full mt-1">
                                                            <SelectValue placeholder="-- Choose a player --" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {otherPlayers.map(
                                                                ({
                                                                    id,
                                                                    name,
                                                                }) => (
                                                                    <SelectItem
                                                                        key={id}
                                                                        value={
                                                                            id
                                                                        }
                                                                    >
                                                                        {name}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
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
                                    </section>

                                    {/* Vote to Arrest */}
                                    <section className="rounded-lg border p-4 h-full">
                                        <div className="mb-1 font-medium">
                                            ⚖️ Vote to Arrest
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Nominate a player for arrest or vote
                                            on active nomination
                                        </p>
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
                                                                    (
                                                                        currentVote.votesFor ??
                                                                        []
                                                                    ).length
                                                                }
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <Badge variant="secondary">
                                                                Against:{' '}
                                                                {
                                                                    (
                                                                        currentVote.votesAgainst ??
                                                                        []
                                                                    ).length
                                                                }
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                {!(
                                                    currentVote.votesFor ?? []
                                                ).includes(userId) &&
                                                !(
                                                    currentVote.votesAgainst ??
                                                    []
                                                ).includes(userId) ? (
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
                                                {(currentVote.votesFor ?? [])
                                                    .length >
                                                (currentVote.votesAgainst ?? [])
                                                    .length
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
                                                    <Select
                                                        value={
                                                            selectedNominateTarget
                                                        }
                                                        onValueChange={
                                                            setSelectedNominateTarget
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full mt-1">
                                                            <SelectValue placeholder="-- Choose a player --" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {otherPlayers.map(
                                                                ({
                                                                    id,
                                                                    name,
                                                                }) => (
                                                                    <SelectItem
                                                                        key={id}
                                                                        value={
                                                                            id
                                                                        }
                                                                    >
                                                                        {name}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
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
                                    </section>

                                    {/* Replant Resources */}
                                    <section className="rounded-lg border p-4 h-full">
                                        <div className="mb-1 font-medium">
                                            🌱 Replant Resources
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Convert your personal resources back
                                            to the global pool
                                        </p>
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
                                    </section>
                                </div>
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
