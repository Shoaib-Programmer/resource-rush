import { db, ref, get, update } from '@/firebase';

export type Role = 'Exploiter' | 'Environmentalist' | 'Moderate';

export interface StartGameOptions {
    initialGlobalResources?: number; // default 1000
    xRounds?: number; // default 20
    yProfit?: number; // default 500
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

    // For 4+: 1 Exploiter, 1 Environmentalist, rest Moderates, and add an extra Environmentalist for every 3 players
    const roles: Role[] = ['Exploiter', 'Environmentalist'];
    let remaining = numPlayers - roles.length;
    const extraEnv = Math.floor(numPlayers / 3) - 1; // already added 1 env
    for (let i = 0; i < extraEnv && remaining > 0; i++, remaining--) {
        roles.push('Environmentalist');
    }
    while (remaining-- > 0) roles.push('Moderate');
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
        initialGlobalResources = 1000,
        xRounds = 20,
        yProfit = 500,
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
    if (playerIds.length < 2) {
        throw new Error('Need at least 2 players to start the game.');
    }

    // Assign roles
    const roles = generateRoles(playerIds.length);

    // Build a single multi-path update object
    const updates: Record<string, unknown> = {};

    // Game-level fields
    updates[`games/${gameId}/status`] = 'in-progress';
    updates[`games/${gameId}/config`] = { xRounds, yProfit };
    updates[`games/${gameId}/gameState`] = {
        currentRound: 1,
        globalResources: initialGlobalResources,
        revealedExtraction: null,
    };

    // Player public state and private roles
    playerIds.forEach((uid, idx) => {
        updates[`games/${gameId}/players/${uid}/resources`] = startingResources;
        updates[`games/${gameId}/players/${uid}/timesArrested`] = 0;
        updates[`games/${gameId}/players/${uid}/isJailed`] = false;
        updates[`games/${gameId}/players/${uid}/status`] = 'active';
        updates[`games/${gameId}/privatePlayerInfo/${uid}/role`] = roles[idx];
    });

    // Execute a single multi-location update at the DB root
    await update(ref(db), updates);
}

export default startGame;
