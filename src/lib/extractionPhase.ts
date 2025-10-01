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

    // Calculate round result using deterministic randomness
    const result = calculateRoundResult(game, submissions, seed);

    // Prepare updates
    const updates: Record<string, unknown> = {};

    // Update game state to action phase (skip reveal phase)
    updates[`games/${gameId}/gameState/currentPhase`] = 'action';
    updates[`games/${gameId}/gameState/globalResources`] =
        result.newGlobalResources;
    updates[`games/${gameId}/gameState/roundFees`] = result.roundFees;

    // Randomly select one player's submission for revealedExtraction
    const playerIds = Object.keys(submissions);
    const randomIndex = Math.floor(Math.random() * playerIds.length);
    const revealedPlayerId = playerIds[randomIndex];
    updates[`games/${gameId}/gameState/revealedExtraction`] =
        submissions[revealedPlayerId];

    // Update player resources (extraction + fees)
    Object.entries(result.playerRewards).forEach(([playerId, netReward]) => {
        const currentResources = game.players[playerId]?.resources ?? 0;
        updates[`games/${gameId}/players/${playerId}/resources`] = Math.max(
            0,
            currentResources + netReward,
        );
    });

    // Check win/loss conditions
    const winLossResult = checkWinLossConditions(game, result);
    if (winLossResult.gameEnded) {
        updates[`games/${gameId}/status`] = 'completed';
        updates[`games/${gameId}/gameState/winner`] = winLossResult.winner;
    }

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
    roundFees: Record<string, number>;
} {
    // Initialize RNG with seed for deterministic randomness
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

    // Generate random resource fees for each player ("draw issue cards")
    const roundFees: Record<string, number> = {};
    Object.keys(submissions).forEach((playerId) => {
        // Generate a random fee between 0 and 10 (inclusive)
        // Using seeded Math.random() for deterministic results
        const fee = Math.floor(Math.random() * 11); // 0-10
        roundFees[playerId] = fee;
    });

    // Apply fees to player rewards (subtract fees)
    Object.keys(playerRewards).forEach((playerId) => {
        playerRewards[playerId] -= roundFees[playerId];
    });

    return {
        totalExtraction,
        newGlobalResources,
        playerRewards,
        roundFees,
    };
}

/**
 * Check for win/loss conditions after round processing
 */
function checkWinLossConditions(
    game: Game,
    roundResult: {
        totalExtraction: number;
        newGlobalResources: number;
        playerRewards: Record<string, number>;
        roundFees: Record<string, number>;
    },
): { gameEnded: boolean; winner?: string } {
    const yProfit = game.config?.yProfit ?? 500;
    const maxRounds = game.config?.xRounds ?? 20;
    const currentRound = game.gameState?.currentRound ?? 1;

    // Check if any player reached the profit target
    for (const [playerId, reward] of Object.entries(
        roundResult.playerRewards,
    )) {
        const currentResources = game.players[playerId]?.resources ?? 0;
        const newTotal = currentResources + reward;

        if (newTotal >= yProfit) {
            return { gameEnded: true, winner: playerId };
        }
    }

    // Check if global resources are depleted
    if (roundResult.newGlobalResources <= 0) {
        // Game ends, but no winner (stalemate)
        return { gameEnded: true };
    }

    // Check if this was the last round
    if (currentRound >= maxRounds) {
        // Find player with most resources
        let maxResources = -1;
        let winner: string | undefined;

        for (const [playerId, reward] of Object.entries(
            roundResult.playerRewards,
        )) {
            const currentResources = game.players[playerId]?.resources ?? 0;
            const newTotal = currentResources + reward;

            if (newTotal > maxResources) {
                maxResources = newTotal;
                winner = playerId;
            }
        }

        return { gameEnded: true, winner };
    }

    return { gameEnded: false };
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

    if (currentPhase === 'action') {
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
            updates[`games/${gameId}/gameState/roundFees`] = null;
            updates[`games/${gameId}/gameState/currentVote`] = null;
            updates[`games/${gameId}/gameState/investigations`] = null;

            // Release jailed players (they serve 1 round)
            Object.keys(game.players).forEach((playerId) => {
                if (game.players[playerId]?.isJailed) {
                    updates[`games/${gameId}/players/${playerId}/isJailed`] =
                        false;
                }
            });
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
        roundFees: Record<string, number>;
    },
): boolean {
    const currentRound = game.gameState?.currentRound ?? 1;
    const roundKey = `round_${currentRound}`;
    const submissions = game.roundSubmissions?.[roundKey] ?? {};
    const seed = game.gameState?.roundSeed ?? `${game}_round_${currentRound}`;

    const clientResult = calculateRoundResult(game, submissions, seed);

    // Compare results
    const rewardsMatch = Object.keys(clientResult.playerRewards).every(
        (playerId) =>
            clientResult.playerRewards[playerId] ===
            hostResult.playerRewards[playerId],
    );

    const feesMatch = Object.keys(clientResult.roundFees).every(
        (playerId) =>
            clientResult.roundFees[playerId] === hostResult.roundFees[playerId],
    );

    return (
        clientResult.totalExtraction === hostResult.totalExtraction &&
        clientResult.newGlobalResources === hostResult.newGlobalResources &&
        rewardsMatch &&
        feesMatch
    );
}
