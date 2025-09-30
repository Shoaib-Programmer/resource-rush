import { Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useGameStore } from './store';

function Root() {
    const setUser = useGameStore((state) => state.setUser);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser({
                    uid: user.uid,
                    name: user.displayName || 'Anonymous',
                });
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, [setUser]);

    return (
        <div className="p-2">
            <Outlet />
        </div>
    );
}

export default Root;
