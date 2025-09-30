import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { humanId } from '../lib/human-id';
import { db, get, ref, set, update } from '../firebase';
import { useGameStore } from '../store';

export function Lobby() {
    const [joinId, setJoinId] = useState('');
    const user = useGameStore((state) => state.user);
    const navigate = useNavigate();

    const createGame = () => {
        if (!user) {
            console.error('You must be logged in to create a game.');
            // TODO: Show a message to the user
            return;
        }
        const newGameId = humanId({ separator: '-', capitalize: false });
        const gameRef = ref(db, `games/${newGameId}`);
        set(gameRef, {
            status: 'waiting',
            players: {
                [user.uid]: {
                    name: user.name,
                    // any other initial player data
                },
            },
            creatorId: user.uid,
        }).then(() => {
            navigate({ to: '/game/$gameId', params: { gameId: newGameId } });
        });
    };

    const joinGame = async () => {
        if (!user) {
            console.error('You must be logged in to join a game.');
            // TODO: Show a message to the user
            return;
        }
        if (!joinId.trim()) return;

        const gameId = joinId.trim();
        const gameRef = ref(db, `games/${gameId}`);

        try {
            const snapshot = await get(gameRef);
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                if (gameData.status === 'waiting') {
                    // Add player to the game
                    const playerRef = ref(db, `games/${gameId}/players`);
                    await update(playerRef, {
                        [user.uid]: {
                            name: user.name,
                        },
                    });
                    navigate({
                        to: '/game/$gameId',
                        params: { gameId: gameId },
                    });
                } else {
                    console.error('Game is not available to join.');
                    // TODO: Show a message to the user
                }
            } else {
                console.error('Game not found.');
                // TODO: Show a message to the user
            }
        } catch (error) {
            console.error('Error joining game:', error);
            // TODO: Show a message to the user
        }
    };

    return (
        <main className="max-w-xl mx-auto mt-20 p-6 rounded-lg shadow-md bg-white/80 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold mb-4">Lobby</h2>

            <div className="space-y-4">
                <div className="flex flex-col">
                    <Button className="w-full" onClick={createGame}>
                        Create Game
                    </Button>
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="gameId">Enter Game ID</Label>
                    <Input
                        id="gameId"
                        placeholder="e.g. Blue-Fish-Dance"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') joinGame();
                        }}
                    />
                    <div className="flex gap-2">
                        <Button className="w-full" onClick={joinGame}>
                            Join Game
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Lobby;
