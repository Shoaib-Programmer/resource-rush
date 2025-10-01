import { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useGameStore } from '@/store';
import { createPortal } from 'react-dom';

export function UsernamePrompt() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const { setUser } = useGameStore();
    const handleSave = async () => {
        if (saving) return;
        if (!username.trim()) {
            setError('Username cannot be empty.');
            return;
        }
        if (auth.currentUser) {
            try {
                setSaving(true);
                await updateProfile(auth.currentUser, {
                    displayName: username,
                });
                // Immediately update the app store so the modal hides without a reload
                setUser({ uid: auth.currentUser.uid, name: username.trim() });
                setError('');
            } catch (err) {
                setError('Failed to update username. Please try again.');
                console.error(err);
            } finally {
                setSaving(false);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    // Create a container we can portal into so the modal always sits at the
    // document body level (avoids layout/transform stacking issues).
    const elRef = useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const el = document.createElement('div');
        elRef.current = el;
        document.body.appendChild(el);
        setMounted(true);
        return () => {
            if (elRef.current) document.body.removeChild(elRef.current);
        };
    }, []);

    if (typeof document === 'undefined' || !mounted || !elRef.current)
        return null;

    const modal = (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a username"
        >
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
                <h2 className="text-xl font-bold mb-4">Enter Your Name</h2>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="John Doe"
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button
                        onClick={handleSave}
                        className="w-full"
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, elRef.current);
}
