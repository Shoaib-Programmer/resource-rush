export const REQUIRED_PLAYER_COUNT = 6;

export const ROLE_DISTRIBUTION_6_PLAYER = {
    EXPLOITERS: 2,
    ENVIRONMENTALISTS: 3,
    MODERATES: 1,
} as const;

export const DEFAULT_X_ROUNDS = 17;
export const DEFAULT_Y_PROFIT = 408;

export const DEFAULT_STARTING_GLOBAL_RESOURCES = 714;

export const DEFAULT_RESOURCES_PER_ROUND = 18;

export const DEFAULT_STARTING_RESOURCES = 10;

export const MAX_ARRESTS_BEFORE_ELIMINATION = 2;

export function getMinimumResourceThreshold(round: number): number {
    return Math.max(0, (round - 1) * 2 + (round > 1 ? 1 : 0));
}

export const EVENT_CARD_FEE_RANGE = {
    MIN: 0,
    MAX: 10,
} as const;

export const MODERATE_WIN_THRESHOLDS = {
    PROFIT_HIGH: 0.75,
    PROFIT_LOW: 0.5,

    ROUNDS_HIGH: 0.75,
    ROUNDS_LOW: 0.5,
} as const;

export const ROLE_RATIOS_SCALING = {
    EXPLOITERS: 0.33, // 33% of players
    MODERATES: 0.17, // 17% of players
} as const;

export const FALLBACK_VALUES = {
    X_ROUNDS: 20,
    Y_PROFIT: 500,
    STARTING_GLOBAL_RESOURCES: 1000,
    RESOURCES_PER_ROUND: 18,
    STARTING_RESOURCES: 10,
} as const;

export const PLAYER_COUNT_STATUS = {
    READY: 'text-green-600', // Exactly the right number
    WAITING: 'text-yellow-600', // Need more players
    TOO_MANY: 'text-red-600', // Too many players
} as const;
