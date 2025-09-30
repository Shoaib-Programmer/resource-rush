export interface Player {
    name: string;
}

export interface Game {
    players: { [id: string]: Player };
    // Add other game properties here
}

export interface User {
    uid: string;
    name: string;
}
