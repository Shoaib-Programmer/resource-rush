import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function Lobby() {
    return (
        <main className="max-w-xl mx-auto mt-20 p-6 rounded-lg shadow-md bg-white/80 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold mb-4">Lobby</h2>

            <div className="space-y-4">
                <div className="flex flex-col">
                    <Button className="w-full">Create Game</Button>
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="gameId">Enter Game ID</Label>
                    <Input id="gameId" placeholder="e.g. AB12CD" />
                    <Button className="w-full">Join Game</Button>
                </div>
            </div>
        </main>
    );
}

export default Lobby;
