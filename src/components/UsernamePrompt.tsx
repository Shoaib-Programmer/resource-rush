import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function UsernamePrompt() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!username.trim()) {
            setError('Username cannot be empty.');
            return;
        }
        if (auth.currentUser) {
            try {
                await updateProfile(auth.currentUser, {
                    displayName: username,
                });
                // The onAuthStateChanged listener in Root.tsx will handle the user state update
            } catch (err) {
                setError('Failed to update username. Please try again.');
                console.error(err);
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
                    <Button onClick={handleSave} className="w-full">
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}
