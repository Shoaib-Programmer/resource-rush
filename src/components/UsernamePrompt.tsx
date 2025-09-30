import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useGameStore } from '@/store';

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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
}
