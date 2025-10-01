import { useState, useEffect } from 'react';
import { db, ref, onValue } from '@/firebase';
import type { Role } from '@/types';

/**
 * Hook to fetch and sync the current player's role from privatePlayerInfo
 */
export function usePlayerRole(
    gameId: string | undefined,
    userId: string | undefined,
): Role | null {
    const [role, setRole] = useState<Role | null>(null);

    useEffect(() => {
        if (!gameId || !userId) {
            setRole(null);
            return;
        }

        const roleRef = ref(
            db,
            `games/${gameId}/privatePlayerInfo/${userId}/role`,
        );
        const unsubscribe = onValue(roleRef, (snapshot) => {
            const data = snapshot.val();
            setRole(data || null);
        });

        return () => unsubscribe();
    }, [gameId, userId]);

    return role;
}
