import { db, ref, get, update } from '@/firebase';
import type { Game, VoteData } from '@/types';

/**
 * Investigate a player to see their extraction for the current round
 */
export async function investigatePlayer(
    gameId: string,
    investigatorId: string,
    targetPlayerId: string,
): Promise<number | null> {
    const gameRef = ref(db, `games/${gameId}`);
    const gameSnap = await get(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game: Game = gameSnap.val();
    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;

    // Validate game is in action phase
    if (game.gameState?.currentPhase !== 'action') {
        throw new Error('Can only investigate during action phase');
    }

    // Check if investigator is jailed
    if (game.players[investigatorId]?.isJailed) {
        throw new Error('Cannot investigate while jailed');
    }

    // Check if target exists
    if (!game.players[targetPlayerId]) {
        throw new Error('Target player not found');
    }

    // Get the target's submission
    const submission = game.roundSubmissions?.[roundKey]?.[targetPlayerId];

    // Record the investigation in game state
    const updates: Record<string, unknown> = {};
    updates[`games/${gameId}/gameState/investigations/${investigatorId}`] =
        targetPlayerId;
    await update(ref(db), updates);

    return submission ?? null;
}

/**
 * Nominate a player for arrest (starts a vote)
 */
export async function nominatePlayerForArrest(
    gameId: string,
    nominatorId: string,
    targetPlayerId: string,
): Promise<void> {
    const gameRef = ref(db, `games/${gameId}`);
    const gameSnap = await get(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game: Game = gameSnap.val();

    // Validate game is in action phase
    if (game.gameState?.currentPhase !== 'action') {
        throw new Error('Can only vote during action phase');
    }

    // Check if nominator is jailed
    if (game.players[nominatorId]?.isJailed) {
        throw new Error('Cannot nominate while jailed');
    }

    // Check if there's already an active vote
    if (game.gameState?.currentVote && !game.gameState.currentVote.resolved) {
        throw new Error('There is already an active vote');
    }

    // Check if target exists
    if (!game.players[targetPlayerId]) {
        throw new Error('Target player not found');
    }

    // Cannot nominate yourself
    if (nominatorId === targetPlayerId) {
        throw new Error('Cannot nominate yourself');
    }

    // Create new vote
    const voteData: VoteData = {
        nominatedBy: nominatorId,
        targetPlayer: targetPlayerId,
        votesFor: [],
        votesAgainst: [],
        resolved: false,
    };

    const updates: Record<string, unknown> = {};
    updates[`games/${gameId}/gameState/currentVote`] = voteData;
    await update(ref(db), updates);
}

/**
 * Cast a vote for or against the current nomination
 */
export async function castVote(
    gameId: string,
    voterId: string,
    voteFor: boolean,
): Promise<void> {
    const gameRef = ref(db, `games/${gameId}`);
    const gameSnap = await get(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game: Game = gameSnap.val();

    // Check if there's an active vote
    if (!game.gameState?.currentVote || game.gameState.currentVote.resolved) {
        throw new Error('No active vote');
    }

    // Check if voter is jailed
    if (game.players[voterId]?.isJailed) {
        throw new Error('Cannot vote while jailed');
    }

    const currentVote = game.gameState.currentVote;

    // Check if already voted
    if (
        currentVote.votesFor.includes(voterId) ||
        currentVote.votesAgainst.includes(voterId)
    ) {
        throw new Error('You have already voted');
    }

    // Add vote
    const updates: Record<string, unknown> = {};
    if (voteFor) {
        updates[`games/${gameId}/gameState/currentVote/votesFor`] = [
            ...currentVote.votesFor,
            voterId,
        ];
    } else {
        updates[`games/${gameId}/gameState/currentVote/votesAgainst`] = [
            ...currentVote.votesAgainst,
            voterId,
        ];
    }

    await update(ref(db), updates);

    // Check if all players have voted
    await checkAndResolveVote(gameId);
}

/**
 * Check if all players have voted and resolve the vote if so
 */
async function checkAndResolveVote(gameId: string): Promise<void> {
    const gameRef = ref(db, `games/${gameId}`);
    const gameSnap = await get(gameRef);

    if (!gameSnap.exists()) return;

    const game: Game = gameSnap.val();
    const currentVote = game.gameState?.currentVote;

    if (!currentVote || currentVote.resolved) return;

    // Count active (non-jailed) players
    const activePlayers = Object.keys(game.players).filter(
        (playerId) => !game.players[playerId]?.isJailed,
    );

    const totalVotes =
        currentVote.votesFor.length + currentVote.votesAgainst.length;

    // All active players have voted
    if (totalVotes >= activePlayers.length) {
        const votesPassed =
            currentVote.votesFor.length > currentVote.votesAgainst.length;

        const updates: Record<string, unknown> = {};
        updates[`games/${gameId}/gameState/currentVote/resolved`] = true;

        if (votesPassed) {
            // Arrest the target player
            const targetId = currentVote.targetPlayer;
            const currentArrests = game.players[targetId]?.timesArrested ?? 0;

            updates[`games/${gameId}/players/${targetId}/isJailed`] = true;
            updates[`games/${gameId}/players/${targetId}/timesArrested`] =
                currentArrests + 1;
        }

        await update(ref(db), updates);
    }
}

/**
 * Replant resources (convert personal resources to global resources)
 */
export async function replantResources(
    gameId: string,
    playerId: string,
    amount: number,
): Promise<void> {
    const gameRef = ref(db, `games/${gameId}`);
    const gameSnap = await get(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game: Game = gameSnap.val();

    // Validate game is in action phase
    if (game.gameState?.currentPhase !== 'action') {
        throw new Error('Can only replant during action phase');
    }

    // Check if player is jailed
    if (game.players[playerId]?.isJailed) {
        throw new Error('Cannot replant while jailed');
    }

    // Check player has enough resources
    const playerResources = game.players[playerId]?.resources ?? 0;
    if (playerResources < amount) {
        throw new Error('Insufficient resources');
    }

    if (amount <= 0) {
        throw new Error('Amount must be positive');
    }

    // Transfer resources
    const currentGlobal = game.gameState?.globalResources ?? 0;
    const updates: Record<string, unknown> = {};
    updates[`games/${gameId}/players/${playerId}/resources`] =
        playerResources - amount;
    updates[`games/${gameId}/gameState/globalResources`] =
        currentGlobal + amount;

    await update(ref(db), updates);
}

/**
 * Get the extraction amount for a specific player (used after investigation)
 */
export function getPlayerExtraction(
    game: Game,
    playerId: string,
    round?: number,
): number | null {
    const targetRound = round ?? game.gameState?.currentRound ?? 1;
    const roundKey = `round_${targetRound}`;
    return game.roundSubmissions?.[roundKey]?.[playerId] ?? null;
}

/**
 * Check if a player has already investigated someone this round
 */
export function hasInvestigatedThisRound(
    game: Game,
    playerId: string,
): boolean {
    return !!game.gameState?.investigations?.[playerId];
}

/**
 * Get who a player investigated this round
 */
export function getInvestigationTarget(
    game: Game,
    playerId: string,
): string | null {
    return game.gameState?.investigations?.[playerId] ?? null;
}

/**
 * Clear vote and investigation data when moving to next round
 */
export async function clearActionPhaseData(gameId: string): Promise<void> {
    const updates: Record<string, unknown> = {};
    updates[`games/${gameId}/gameState/currentVote`] = null;
    updates[`games/${gameId}/gameState/investigations`] = null;
    await update(ref(db), updates);
}
