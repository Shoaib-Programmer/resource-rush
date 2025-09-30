import { useParams } from '@tanstack/react-router';

function GameRoom() {
    const { gameId } = useParams({ from: '/game/$gameId' });

    return (
        <div>
            <h2 className="text-2xl font-bold">Game Room</h2>
            <p className="text-lg">
                You are in game:{' '}
                <span className="font-mono bg-gray-200 dark:bg-slate-800 p-1 rounded">
                    {gameId}
                </span>
            </p>
        </div>
    );
}

export default GameRoom;
