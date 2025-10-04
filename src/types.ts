export type Role = 'Exploiter' | 'Environmentalist' | 'Moderate';
export type GamePhase = 'extraction' | 'reveal' | 'action';

export interface Player {
    name: string;
    isHost?: boolean;
    resources?: number;
    totalProfit?: number; // Track total profit for win conditions
    timesArrested?: number;
    isJailed?: boolean;
    status?: 'active' | 'inactive';
}

export interface VoteData {
    nominatedBy: string; // player who started the vote
    targetPlayer: string; // player being voted against
    votesFor: string[]; // array of player IDs who voted for arrest
    votesAgainst: string[]; // array of player IDs who voted against
    resolved: boolean; // whether the vote has been resolved
}

export interface GameState {
    currentRound: number;
    currentPhase?: GamePhase;
    globalResources: number;
    revealedExtraction: number | null;
    roundSeed?: string; // Deterministic seed for the current round
    roundFees?: Record<string, number>; // playerId -> resource fee for this round
    currentVote?: VoteData | null; // current active vote
    investigations?: {
        [investigatorId: string]: string; // investigatorId -> targetPlayerId (who they investigated)
    };
    winner?: string; // Winner of the game (e.g., 'Environmentalists', 'Exploiters', or a player ID)
}

export interface GameConfig {
    xRounds: number; // Total number of rounds
    yProfit: number; // Target profit to win
    startingGlobalResources: number; // Starting global resources
    resourcesPerRound: number; // Resources generated each round
    startingResources: number; // Resources each player starts with
}

export interface RoundSubmission {
    [playerId: string]: number; // playerId -> extraction amount
}

export interface Game {
    players: { [id: string]: Player };
    status: 'waiting' | 'in-progress' | 'finished';
    hostId?: string;
    creatorId?: string;
    gameState?: GameState;
    config?: GameConfig;
    roundSubmissions?: {
        [roundKey: string]: RoundSubmission; // e.g., "round_1": { playerId: amount }
    };
    privatePlayerInfo?: {
        [playerId: string]: {
            role: Role;
        };
    };
}

export interface User {
    uid: string;
    name: string;
}
