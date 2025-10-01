export type Role = 'Exploiter' | 'Environmentalist' | 'Moderate';
export type GamePhase = 'extraction' | 'reveal' | 'action';

export interface Player {
    name: string;
    isHost?: boolean;
    resources?: number;
    timesArrested?: number;
    isJailed?: boolean;
    status?: 'active' | 'inactive';
}

export interface GameState {
    currentRound: number;
    currentPhase?: GamePhase;
    globalResources: number;
    revealedExtraction: number | null;
    roundSeed?: string; // Deterministic seed for the current round
    roundFees?: Record<string, number>; // playerId -> resource fee for this round
}

export interface GameConfig {
    xRounds: number; // Total number of rounds
    yProfit: number; // Target profit to win
}

export interface RoundSubmission {
    [playerId: string]: number; // playerId -> extraction amount
}

export interface Game {
    players: { [id: string]: Player };
    status: 'waiting' | 'in-progress' | 'completed';
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
