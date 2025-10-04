import { db, ref, get, update } from '@/firebase';
import seedrandom from 'seedrandom';
import type { Game, RoundSubmission } from '@/types';
import {
    FALLBACK_VALUES,
    MODERATE_WIN_THRESHOLDS,
    EVENT_CARD_FEE_RANGE,
    getMinimumResourceThreshold,
    MAX_ARRESTS_BEFORE_ELIMINATION,
} from './gameConstants';

/**
 * EXTRACTION PHASE AND WIN/LOSS CONDITIONS
 *
 * This module handles the extraction phase of the game and determines win/loss conditions.
 * All calculations use seedrandom for deterministic randomness to prevent cheating.
 *
 * Win/Loss Conditions:
 * 1. Environmentalist Loss / Exploiter Win: globalResources <= 0
 * 2. Exploiter Win: totalExploiterProfit >= yProfit
 * 3. Player Elimination: Players with resources <= 0 or Exploiters arrested >= 3 times
 * 4. Environmentalist Win: Survive all xRounds with globalResources > 0
 * 5. Team Elimination: All Exploiters eliminated = Environmentalists win
 *                      All Environmentalists eliminated = Exploiters win
 */

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

    const updates: Record<string, unknown> = {};

    updates[`games/${gameId}/gameState/currentPhase`] = 'action';
    updates[`games/${gameId}/gameState/globalResources`] =
        result.newGlobalResources; // Already includes resources per round from calculateRoundResult
    updates[`games/${gameId}/gameState/roundFees`] = result.roundFees;

    // Randomly select one player's submission for revealedExtraction
    const playerIds = Object.keys(submissions);
    const randomIndex = Math.floor(Math.random() * playerIds.length);
    const revealedPlayerId = playerIds[randomIndex];
    updates[`games/${gameId}/gameState/revealedExtraction`] =
        submissions[revealedPlayerId];

    const MINIMUM_RESOURCE_THRESHOLD =
        getMinimumResourceThreshold(currentRound);

    Object.entries(result.playerRewards).forEach(([playerId, netReward]) => {
        const currentResources = game.players[playerId]?.resources ?? 0;
        const currentProfit = game.players[playerId]?.totalProfit ?? 0;
        const newResources = Math.max(0, currentResources + netReward);
        const newProfit = currentProfit + Math.max(0, netReward); // Only count positive gains
        const timesArrested = game.players[playerId]?.timesArrested ?? 0;

        updates[`games/${gameId}/players/${playerId}/resources`] = newResources;
        updates[`games/${gameId}/players/${playerId}/totalProfit`] = newProfit;

        if (newResources < MINIMUM_RESOURCE_THRESHOLD) {
            updates[`games/${gameId}/players/${playerId}/status`] = 'inactive';
        }

        if (timesArrested >= MAX_ARRESTS_BEFORE_ELIMINATION) {
            updates[`games/${gameId}/players/${playerId}/status`] = 'inactive';
        }
    });

    const winLossResult = checkWinLossConditions(game, result);
    if (winLossResult.gameEnded) {
        updates[`games/${gameId}/status`] = 'finished';
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
    const resourcesPerRound =
        game.config?.resourcesPerRound ?? FALLBACK_VALUES.RESOURCES_PER_ROUND;

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

    // Deduct extraction from global resources, then add resources generated per round
    const afterExtraction = Math.max(
        0,
        currentGlobalResources - totalExtraction,
    );
    const newGlobalResources = afterExtraction + resourcesPerRound;

    // Generate random resource fees for each player ("draw issue cards")
    const roundFees: Record<string, number> = {};
    Object.keys(submissions).forEach((playerId) => {
        // Generate a random fee between min and max (inclusive)
        // Using seeded Math.random() for deterministic results
        const range = EVENT_CARD_FEE_RANGE.MAX - EVENT_CARD_FEE_RANGE.MIN + 1;
        const fee =
            Math.floor(Math.random() * range) + EVENT_CARD_FEE_RANGE.MIN;
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
 * Uses seedrandom for deterministic checks to prevent cheating
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
    const yProfit = game.config?.yProfit ?? FALLBACK_VALUES.Y_PROFIT;
    const xRounds = game.config?.xRounds ?? FALLBACK_VALUES.X_ROUNDS;
    const currentRound = game.gameState?.currentRound ?? 1;
    const seed = game.gameState?.roundSeed ?? `${game}_round_${currentRound}`;

    // Initialize RNG with seed for deterministic checks
    seedrandom(seed, { global: true });

    // Calculate updated player resources
    const updatedPlayerResources: Record<string, number> = {};
    Object.entries(roundResult.playerRewards).forEach(([playerId, reward]) => {
        const currentResources = game.players[playerId]?.resources ?? 0;
        updatedPlayerResources[playerId] = Math.max(
            0,
            currentResources + reward,
        );
    });

    // 1. Check Environmentalist Loss: if (globalResources <= 0)
    if (roundResult.newGlobalResources <= 0) {
        return { gameEnded: true, winner: 'Exploiters' };
    }

    // 2. Check Exploiter Win: if (totalExploiterProfit >= yProfit)
    // Calculate total profit for Exploiters using totalProfit tracking
    let totalExploiterProfit = 0;
    Object.keys(game.players).forEach((playerId) => {
        const role = game.privatePlayerInfo?.[playerId]?.role;
        if (role === 'Exploiter') {
            const profit = game.players[playerId]?.totalProfit ?? 0;
            totalExploiterProfit += profit;
        }
    });

    if (totalExploiterProfit >= yProfit) {
        return { gameEnded: true, winner: 'Exploiters' };
    }

    // Check Moderate Win Conditions:
    // Win if: (3/4 * yProfit AND 1/2 * xRounds) OR (1/2 * yProfit AND 3/4 * xRounds)
    const moderateProfitThresholdHigh = Math.floor(
        yProfit * MODERATE_WIN_THRESHOLDS.PROFIT_HIGH,
    );
    const moderateProfitThresholdLow = Math.floor(
        yProfit * MODERATE_WIN_THRESHOLDS.PROFIT_LOW,
    );
    const moderateRoundsThresholdHigh = Math.floor(
        xRounds * MODERATE_WIN_THRESHOLDS.ROUNDS_HIGH,
    );
    const moderateRoundsThresholdLow = Math.floor(
        xRounds * MODERATE_WIN_THRESHOLDS.ROUNDS_LOW,
    );

    let totalModerateProfit = 0;
    Object.keys(game.players).forEach((playerId) => {
        const role = game.privatePlayerInfo?.[playerId]?.role;
        if (role === 'Moderate') {
            const profit = game.players[playerId]?.totalProfit ?? 0;
            totalModerateProfit += profit;
        }
    });

    // Moderate wins if they achieve balanced goals
    const condition1 =
        totalModerateProfit >= moderateProfitThresholdHigh &&
        currentRound >= moderateRoundsThresholdLow;
    const condition2 =
        totalModerateProfit >= moderateProfitThresholdLow &&
        currentRound >= moderateRoundsThresholdHigh;

    if (condition1 || condition2) {
        return { gameEnded: true, winner: 'Moderates' };
    }

    // 3. Check Player Elimination
    // Progressive minimum resource threshold: round 1 = 0, round 2 = 3, round 3 = 5, etc.
    const MINIMUM_RESOURCE_THRESHOLD =
        getMinimumResourceThreshold(currentRound);

    Object.entries(game.players).forEach(([playerId, player]) => {
        const resources = updatedPlayerResources[playerId] || 0;
        const timesArrested = player.timesArrested ?? 0;

        // Check if player is below minimum threshold
        if (resources < MINIMUM_RESOURCE_THRESHOLD) {
            // Mark player as eliminated (inactive)
            // This will be applied in the update
            player.status = 'inactive';
        }

        // Check if player has been arrested too many times
        if (timesArrested >= MAX_ARRESTS_BEFORE_ELIMINATION) {
            player.status = 'inactive';
        }
    });

    // 4. Check Environmentalist Win: if (currentRound > xRounds)
    // Note: This checks if we've completed all rounds
    if (currentRound >= xRounds) {
        // Environmentalists win if they made it through all rounds
        // and global resources are still positive
        if (roundResult.newGlobalResources > 0) {
            return { gameEnded: true, winner: 'Environmentalists' };
        } else {
            // If resources depleted on final round, Exploiters win
            return { gameEnded: true, winner: 'Exploiters' };
        }
    }

    // Check if all Exploiters are eliminated (Environmentalists win)
    const activeExploiters = Object.keys(game.players).filter((playerId) => {
        const role = game.privatePlayerInfo?.[playerId]?.role;
        const player = game.players[playerId];
        return role === 'Exploiter' && player.status !== 'inactive';
    });

    if (activeExploiters.length === 0) {
        return { gameEnded: true, winner: 'Environmentalists' };
    }

    // Check if all Environmentalists are eliminated (Exploiters win)
    const activeEnvironmentalists = Object.keys(game.players).filter(
        (playerId) => {
            const role = game.privatePlayerInfo?.[playerId]?.role;
            const player = game.players[playerId];
            return role === 'Environmentalist' && player.status !== 'inactive';
        },
    );

    if (activeEnvironmentalists.length === 0) {
        return { gameEnded: true, winner: 'Exploiters' };
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
    const maxRounds = game.config?.xRounds ?? FALLBACK_VALUES.X_ROUNDS;

    const updates: Record<string, unknown> = {};

    if (currentPhase === 'action') {
        // Move to next round or end game
        if (currentRound >= maxRounds) {
            updates[`games/${gameId}/status`] = 'finished';
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
