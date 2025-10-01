import type { Player } from '../types';
import { useGameStore } from '../store';
import { Badge } from './ui/badge';

export function PlayerList() {
    const players = useGameStore((state) => state.game?.players);
    const user = useGameStore((state) => state.user);

    if (!players) return <div>Loading players...</div>;

    return (
        <div className="space-y-2">
            <h3 className="font-bold text-lg">Players:</h3>
            <div className="space-y-2">
                {Object.entries(players).map(([id, data]) => {
                    const player = data as Player;
                    const isCurrentUser = user?.uid === id;
                    const resources = player.resources ?? 0;
                    const isJailed = player.isJailed ?? false;

                    return (
                        <div
                            key={id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                isCurrentUser
                                    ? 'bg-primary/10 border-primary/30'
                                    : 'bg-muted border-muted'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium">
                                    {player.name}
                                    {isCurrentUser && ' (You)'}
                                </span>
                                {player.isHost && (
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        Host
                                    </Badge>
                                )}
                                {isJailed && (
                                    <Badge
                                        variant="destructive"
                                        className="text-xs"
                                    >
                                        🔒 Jailed
                                    </Badge>
                                )}
                            </div>
                            {resources > 0 && (
                                <Badge variant="outline">
                                    {resources} resources
                                </Badge>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
