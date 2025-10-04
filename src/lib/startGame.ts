import { db, ref, get, update } from '@/firebase';
import type { Role } from '@/types';
import {
    DEFAULT_X_ROUNDS,
    DEFAULT_Y_PROFIT,
    DEFAULT_STARTING_GLOBAL_RESOURCES,
    DEFAULT_RESOURCES_PER_ROUND,
    DEFAULT_STARTING_RESOURCES,
    REQUIRED_PLAYER_COUNT,
    ROLE_RATIOS_SCALING,
} from './gameConstants';

export interface StartGameOptions {
    initialGlobalResources?: number;
    xRounds?: number;
    yProfit?: number;
    resourcesPerRound?: number;
    startingResources?: number;
}

function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateRoles(numPlayers: number): Role[] {
    // Ensure at least one of each primary role when possible
    if (numPlayers <= 0) return [];
    if (numPlayers === 1) return ['Moderate'];
    if (numPlayers === 2) return ['Exploiter', 'Environmentalist'];
    if (numPlayers === 3)
        return shuffle(['Exploiter', 'Environmentalist', 'Moderate']);
    if (numPlayers === 4)
        return shuffle([
            'Exploiter',
            'Environmentalist',
            'Environmentalist',
            'Moderate',
        ]);
    if (numPlayers === 5)
        return shuffle([
            'Exploiter',
            'Exploiter',
            'Environmentalist',
            'Environmentalist',
            'Moderate',
        ]);

    // 6-player setup: 2 Exploiters, 3 Environmentalists, 1 Moderate
    if (numPlayers === 6)
        return shuffle([
            'Exploiter',
            'Exploiter',
            'Environmentalist',
            'Environmentalist',
            'Environmentalist',
            'Moderate',
        ]);

    // For 7+ players: scale proportionally
    // Ratio: ~33% Exploiters, ~50% Environmentalists, ~17% Moderates
    const roles: Role[] = [];
    const numExploiters = Math.max(
        1,
        Math.floor(numPlayers * ROLE_RATIOS_SCALING.EXPLOITERS),
    );
    const numModerates = Math.max(
        1,
        Math.floor(numPlayers * ROLE_RATIOS_SCALING.MODERATES),
    );
    const numEnvironmentalists = numPlayers - numExploiters - numModerates;

    for (let i = 0; i < numExploiters; i++) roles.push('Exploiter');
    for (let i = 0; i < numEnvironmentalists; i++)
        roles.push('Environmentalist');
    for (let i = 0; i < numModerates; i++) roles.push('Moderate');

    return shuffle(roles);
}

/**
 * Orchestrate the full game start sequence as a single multi-location update.
 * This reads the current players list and writes status/config/gameState, per-player public state,
 * and privatePlayerInfo roles under games/$gameId.
 */
export async function startGame(
    gameId: string,
    options: StartGameOptions = {},
) {
    const {
        initialGlobalResources = DEFAULT_STARTING_GLOBAL_RESOURCES,
        xRounds = DEFAULT_X_ROUNDS,
        yProfit = DEFAULT_Y_PROFIT,
        resourcesPerRound = DEFAULT_RESOURCES_PER_ROUND,
        startingResources = DEFAULT_STARTING_RESOURCES,
    } = options;

    // Read players atomically before composing the update
    const playersSnap = await get(ref(db, `games/${gameId}/players`));
    if (!playersSnap.exists()) {
        throw new Error('Cannot start: no players found.');
    }
    const players: Record<string, { name?: string } | undefined> =
        playersSnap.val() ?? {};
    const playerIds = Object.keys(players);
    if (playerIds.length !== REQUIRED_PLAYER_COUNT) {
        throw new Error(
            `Need exactly ${REQUIRED_PLAYER_COUNT} players to start the game (current: ${playerIds.length}).`,
        );
    }

    // Assign roles
    const roles = generateRoles(playerIds.length);

    // Generate initial round seed for deterministic randomness
    const initialSeed = `${gameId}_round_1_${Date.now()}`;

    // Build a single multi-path update object
    const updates: Record<string, unknown> = {};

    // Game-level fields
    updates[`games/${gameId}/status`] = 'in-progress';
    updates[`games/${gameId}/config`] = {
        xRounds,
        yProfit,
        startingGlobalResources: initialGlobalResources,
        resourcesPerRound,
        startingResources,
    };
    updates[`games/${gameId}/gameState`] = {
        currentRound: 1,
        currentPhase: 'extraction',
        globalResources: initialGlobalResources,
        revealedExtraction: null,
        roundSeed: initialSeed,
    };

    // Player public state and private roles
    playerIds.forEach((uid, idx) => {
        updates[`games/${gameId}/players/${uid}/resources`] = startingResources;
        updates[`games/${gameId}/players/${uid}/totalProfit`] = 0;
        updates[`games/${gameId}/players/${uid}/timesArrested`] = 0;
        updates[`games/${gameId}/players/${uid}/isJailed`] = false;
        updates[`games/${gameId}/players/${uid}/status`] = 'active';
        updates[`games/${gameId}/privatePlayerInfo/${uid}/role`] = roles[idx];
    });

    // Execute a single multi-location update at the DB root
    await update(ref(db), updates);
}

export default startGame;
