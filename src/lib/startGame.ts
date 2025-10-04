import { db, ref, get, update } from '@/firebase';
import type { Role } from '@/types';

export interface StartGameOptions {
    initialGlobalResources?: number; // default 714 (6-player: 6 * 17 * 7)
    xRounds?: number; // default 17 (6-player: 5 + 6*2)
    yProfit?: number; // default 408 (6-player: 2 * 17 * 12)
    resourcesPerRound?: number; // default 18 (6-player: 6 * 3)
    startingResources?: number; // default 10
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
    const numExploiters = Math.max(1, Math.floor(numPlayers * 0.33));
    const numModerates = Math.max(1, Math.floor(numPlayers * 0.17));
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
        initialGlobalResources = 714, // 6 * 17 * 7
        xRounds = 17, // 5 + 6*2
        yProfit = 408, // 2 * 17 * 12
        resourcesPerRound = 18, // 6 * 3
        startingResources = 10,
    } = options;

    // Read players atomically before composing the update
    const playersSnap = await get(ref(db, `games/${gameId}/players`));
    if (!playersSnap.exists()) {
        throw new Error('Cannot start: no players found.');
    }
    const players: Record<string, { name?: string } | undefined> =
        playersSnap.val() ?? {};
    const playerIds = Object.keys(players);
    if (playerIds.length !== 6) {
        throw new Error(
            `Need exactly 6 players to start the game (current: ${playerIds.length}).`,
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
