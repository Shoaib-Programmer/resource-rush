import { Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
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

    useEffect(() => {
        signInAnonymously(auth)
            .then((userCredential) => {
                // Signed in..
                const user = userCredential.user;
                console.log('User ID:', user.uid); // Use this UID to identify the player
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error(
                    'Anonymous sign-in failed:',
                    errorCode,
                    errorMessage,
                );
            });
    }, []);

    return (
        <div className="p-2">
            <Outlet />
        </div>
    );
}

export default Root;
