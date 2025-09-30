import { useEffect } from 'react';
import { db, ref, onValue } from '../firebase';
import { useGameStore } from '../store';

export const useSyncGame = (gameId: string | undefined) => {
    const setGame = useGameStore((state) => state.setGame);

    useEffect(() => {
        if (!gameId) return;

        const gameRef = ref(db, `games/${gameId}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            setGame(data);
        });

        return () => unsubscribe();
    }, [gameId, setGame]);
};
