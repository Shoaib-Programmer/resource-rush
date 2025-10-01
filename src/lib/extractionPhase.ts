import { db, ref, get, update } from '@/firebase';
import seedrandom from 'seedrandom';
import type { Game, RoundSubmission } from '@/types';

/**
 * Submit a player's extraction amount for the current round
 */
export async function submitExtraction(
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
    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;

    // Validate that the game is in extraction phase
    if (game.gameState?.currentPhase !== 'extraction') {
        throw new Error('Game is not in extraction phase');
    }

    // Validate that the player is not jailed
    const player = game.players[playerId];
    if (player?.isJailed) {
        throw new Error('Cannot submit: player is jailed');
    }

    // Submit the extraction
    const updates: Record<string, unknown> = {};
    updates[`games/${gameId}/roundSubmissions/${roundKey}/${playerId}`] =
        amount;

    await update(ref(db), updates);
}

/**
 * Check if all active players have submitted their extractions
 */
export function checkAllPlayersSubmitted(game: Game): boolean {
    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;
    const submissions = game.roundSubmissions?.[roundKey] ?? {};

    // Count active (non-jailed) players
    const activePlayers = Object.keys(game.players).filter(
        (playerId) => !game.players[playerId]?.isJailed,
    );

    const submittedPlayers = Object.keys(submissions);

    return (
        activePlayers.length > 0 &&
        submittedPlayers.length === activePlayers.length
    );
}

/**
 * Process the round (host-side calculation with deterministic randomness)
 * All clients can verify this calculation using the same seed
 */
export async function processRound(
    gameId: string,
    hostId: string,
): Promise<void> {
    const gameRef = ref(db, `games/${gameId}`);
    const gameSnap = await get(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game: Game = gameSnap.val();

    // Verify the caller is the host
    const actualHostId = game.hostId ?? game.creatorId;
    if (actualHostId !== hostId) {
        throw new Error('Only the host can process the round');
    }

    // Verify all players have submitted
    if (!checkAllPlayersSubmitted(game)) {
        throw new Error('Not all players have submitted');
    }

    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;
    const submissions = game.roundSubmissions?.[roundKey] ?? {};
    const seed = game.gameState?.roundSeed ?? `${gameId}_round_${currentRound}`;

    // Calculate total extraction using deterministic randomness
    const result = calculateRoundResult(game, submissions, seed);

    // Prepare updates
    const updates: Record<string, unknown> = {};

    // Update game state to reveal phase
    updates[`games/${gameId}/gameState/currentPhase`] = 'reveal';
    updates[`games/${gameId}/gameState/revealedExtraction`] =
        result.totalExtraction;
    updates[`games/${gameId}/gameState/globalResources`] =
        result.newGlobalResources;

    // Update player resources
    Object.entries(result.playerRewards).forEach(([playerId, reward]) => {
        const currentResources = game.players[playerId]?.resources ?? 0;
        updates[`games/${gameId}/players/${playerId}/resources`] =
            currentResources + reward;
    });

    await update(ref(db), updates);
}

/**
 * Calculate the round result using deterministic randomness
 * This function can be called by any client to verify the host's calculation
 */
export function calculateRoundResult(
    game: Game,
    submissions: RoundSubmission,
    seed: string,
): {
    totalExtraction: number;
    newGlobalResources: number;
    playerRewards: Record<string, number>;
} {
    // Initialize RNG with seed for deterministic randomness
    // This can be used for future random events/modifiers
    seedrandom(seed, { global: true });
    const currentGlobalResources = game.gameState?.globalResources ?? 0;

    // Calculate total extraction
    let totalExtraction = 0;
    const playerRewards: Record<string, number> = {};

    Object.entries(submissions).forEach(([playerId, amount]) => {
        totalExtraction += amount;
        // For now, player gets exactly what they extracted
        // You can add random events or modifiers here using Math.random()
        // which will be deterministic based on the seed above
        playerRewards[playerId] = amount;
    });

    // Deduct from global resources
    const newGlobalResources = Math.max(
        0,
        currentGlobalResources - totalExtraction,
    );

    return {
        totalExtraction,
        newGlobalResources,
        playerRewards,
    };
}

/**
 * Move to the next phase or round
 */
export async function advancePhase(
    gameId: string,
    hostId: string,
): Promise<void> {
    const gameRef = ref(db, `games/${gameId}`);
    const gameSnap = await get(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game: Game = gameSnap.val();

    // Verify the caller is the host
    const actualHostId = game.hostId ?? game.creatorId;
    if (actualHostId !== hostId) {
        throw new Error('Only the host can advance the phase');
    }

    const currentPhase = game.gameState?.currentPhase;
    const currentRound = game.gameState?.currentRound ?? 1;
    const maxRounds = game.config?.xRounds ?? 20;

    const updates: Record<string, unknown> = {};

    if (currentPhase === 'reveal') {
        // Move to action phase
        updates[`games/${gameId}/gameState/currentPhase`] = 'action';
    } else if (currentPhase === 'action') {
        // Move to next round or end game
        if (currentRound >= maxRounds) {
            updates[`games/${gameId}/status`] = 'completed';
        } else {
            const nextRound = currentRound + 1;
            const nextSeed = `${gameId}_round_${nextRound}_${Date.now()}`;

            updates[`games/${gameId}/gameState/currentRound`] = nextRound;
            updates[`games/${gameId}/gameState/currentPhase`] = 'extraction';
            updates[`games/${gameId}/gameState/roundSeed`] = nextSeed;
            updates[`games/${gameId}/gameState/revealedExtraction`] = null;
        }
    }

    await update(ref(db), updates);
}

/**
 * Verify the host's calculation (any client can call this)
 */
export function verifyRoundCalculation(
    game: Game,
    hostResult: {
        totalExtraction: number;
        newGlobalResources: number;
        playerRewards: Record<string, number>;
    },
): boolean {
    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;
    const submissions = game.roundSubmissions?.[roundKey] ?? {};
    const seed = game.gameState?.roundSeed ?? `${game}_round_${currentRound}`;

    const clientResult = calculateRoundResult(game, submissions, seed);

    // Compare results
    return (
        clientResult.totalExtraction === hostResult.totalExtraction &&
        clientResult.newGlobalResources === hostResult.newGlobalResources &&
        Object.keys(clientResult.playerRewards).every(
            (playerId) =>
                clientResult.playerRewards[playerId] ===
                hostResult.playerRewards[playerId],
        )
    );
}
