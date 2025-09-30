import type { Player } from '../types';
import { useGameStore } from '../store';

export function PlayerList() {
    const players = useGameStore((state) => state.game?.players);

    if (!players) return <div>Loading players...</div>;

    return (
        <div>
            <h3 className="font-bold">Players:</h3>
            <ul>
                {Object.entries(players).map(([id, data]) => (
                    <li key={id}>{(data as Player).name}</li>
                ))}
            </ul>
        </div>
    );
}
