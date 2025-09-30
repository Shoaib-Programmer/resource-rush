import { Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import { useGameStore } from './store';
import { UsernamePrompt } from './components/UsernamePrompt';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function Root() {
    const { user, setUser } = useGameStore();
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                if (firebaseUser.displayName) {
                    setUser({
                        uid: firebaseUser.uid,
                        name: firebaseUser.displayName,
                    });
                    setShowPrompt(false);
                } else {
                    // User is authenticated but has no display name.
                    // We need to prompt them for one.
                    setShowPrompt(true);
                }
            } else {
                // No user is signed in.
                setUser(null);
                signInAnonymously(auth).catch((error) => {
                    console.error('Anonymous sign-in failed:', error);
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'Unknown error';
                    toast.error(`Sign-in failed: ${message}`);
                });
            }
        });

        return () => unsubscribe();
    }, [setUser]);

    return (
        <>
            <div className="mx-auto">
                {showPrompt && !user?.name && <UsernamePrompt />}
                <Outlet />
            </div>
            <Toaster />
        </>
    );
}

export default Root;
