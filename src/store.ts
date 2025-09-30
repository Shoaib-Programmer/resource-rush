import { create } from 'zustand';
import type { Game, User } from './types';

interface GameState {
    game: Game | null;
    user: User | null;
    setGame: (newGameState: Game | null) => void;
    setUser: (newUser: User | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
    game: null,
    user: null,
    setGame: (newGameState) => set({ game: newGameState }),
    setUser: (newUser) => set({ user: newUser }),
}));
