export interface Player {
    name: string;
    isHost?: boolean;
}

export interface Game {
    players: { [id: string]: Player };
    status: 'waiting' | 'in-progress' | 'completed';
    // Host can be identified either via hostId or creatorId for backwards compatibility
    hostId?: string;
    creatorId?: string;
}

export interface User {
    uid: string;
    name: string;
}
