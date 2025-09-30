import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { humanId } from '../../lib/human-id';

export function Lobby() {
    const [joinId, setJoinId] = useState('');
    const navigate = useNavigate();

    const createGame = () => {
        const newGameId = humanId({ separator: '-', capitalize: true });
        navigate({ to: '/game/$gameId', params: { gameId: newGameId } });
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
