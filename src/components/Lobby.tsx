import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { humanId } from '../lib/human-id';
import { auth, db, ref, set } from '../firebase';

export function Lobby() {
    const [joinId, setJoinId] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const createGame = () => {
        if (!user) {
            console.error('You must be logged in to create a game.');
            // TODO: Show a message to the user
            return;
        }
        const newGameId = humanId({ separator: '-', capitalize: true });
        const gameRef = ref(db, `games/${newGameId}`);
        set(gameRef, {
            status: 'waiting',
            players: {
                [user.uid]: {
                    name: user.displayName || 'Anonymous',
                    // any other initial player data
                },
            },
            creatorId: user.uid,
        }).then(() => {
            navigate({ to: '/game/$gameId', params: { gameId: newGameId } });
        });
    };

    const joinGame = () => {
        if (!joinId.trim()) return;
        navigate({ to: '/game/$gameId', params: { gameId: joinId.trim() } });
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
                        {/* Example using Link for type-safe navigation */}
                        <Link
                            to="/game/$gameId"
                            params={{ gameId: 'Blue-Fish-Play' }}
                        >
                            <Button variant="secondary">Demo Link</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Lobby;
