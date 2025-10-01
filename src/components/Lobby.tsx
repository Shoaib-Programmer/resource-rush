import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { humanId } from '../lib/human-id';
import { db, get, ref, set, update } from '../firebase';
import { useGameStore } from '../store';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
    Rocket,
    Users2,
    Swords,
    KeyRound,
    Sparkles,
    HelpCircle,
} from 'lucide-react';

export function Lobby() {
    const [joinId, setJoinId] = useState('');
    const user = useGameStore((state) => state.user);
    const navigate = useNavigate();

    const createGame = () => {
        if (!user) {
            console.error('You must be logged in to create a game.');
            toast.error('You must be logged in to create a game.');
            return;
        }
        const newGameId = humanId({ separator: '-', capitalize: false });
        const gameRef = ref(db, `games/${newGameId}`);
        set(gameRef, {
            status: 'waiting',
            players: {
                [user.uid]: {
                    name: user.name,
                    isHost: true,
                    // any other initial player data
                },
            },
            hostId: user.uid,
            creatorId: user.uid,
        })
            .then(() => {
                navigate({
                    to: '/game/$gameId',
                    params: { gameId: newGameId },
                });
            })
            .catch((error) => {
                console.error('Failed to create game:', error);
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                toast.error(`Failed to create game: ${message}`);
            });
    };

    const joinGame = async () => {
        if (!user) {
            console.error('You must be logged in to join a game.');
            toast.error('You must be logged in to join a game.');
            return;
        }
        if (!joinId.trim()) {
            toast.error('Please enter a game ID.');
            return;
        }

        const gameId = joinId.trim().toLowerCase();
        const gameRef = ref(db, `games/${gameId}`);

        try {
            const snapshot = await get(gameRef);
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                if (gameData.status === 'waiting') {
                    // Add player to the game
                    const playerRef = ref(db, `games/${gameId}/players`);
                    await update(playerRef, {
                        [user.uid]: {
                            name: user.name,
                        },
                    });
                    navigate({
                        to: '/game/$gameId',
                        params: { gameId: gameId },
                    });
                } else {
                    console.error('Game is not available to join.');
                    toast.error('Game is not available to join.');
                }
            } else {
                console.error('Game not found.');
                toast.error('Game not found.');
            }
        } catch (error) {
            console.error('Error joining game:', error);
            const message =
                error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Error joining game: ${message}`);
        }
    };

    return (
        <main className="relative isolate">
            {/* Gamified ambient background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            >
                <div className="absolute left-1/2 top-[-8rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.violet.500/.25),transparent_70%)] blur-2xl" />
                <div className="absolute left-[10%] bottom-[-6rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.emerald.500/.18),transparent_70%)] blur-2xl" />
                <div className="absolute right-[8%] top-[30%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.sky.500/.18),transparent_70%)] blur-2xl" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,theme(colors.background)/.6_30%,transparent_60%)]" />
            </div>

            <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-12 sm:px-6 md:py-16">
                <header className="relative flex flex-col items-center text-center">
                    <div className="mb-3 flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                        <Sparkles className="size-3.5" />
                        <span>Welcome{user?.name ? `, ${user.name}` : ''}</span>
                    </div>

                    <h1 className="text-balance bg-clip-text text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                        Resource Rush Lobby
                    </h1>
                    <p className="text-balance mt-2 max-w-prose text-sm text-muted-foreground sm:text-base">
                        Squad up, pick an arena, and race to collect resources.
                        Host a new match or join an existing room with a game
                        ID.
                    </p>

                    <div className="mt-4 inline-flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="inline-flex items-center gap-1.5">
                            <Swords className="size-3.5" /> Competitive PvP
                        </div>
                        <Separator className="h-3" orientation="vertical" />
                        <div className="inline-flex items-center gap-1.5">
                            <Users2 className="size-3.5" /> 2–8 players
                        </div>
                        <Separator className="h-3" orientation="vertical" />
                        <div className="inline-flex items-center gap-1.5">
                            <Rocket className="size-3.5" /> Quick matches
                        </div>
                    </div>
                </header>

                <Card className="backdrop-blur supports-[backdrop-filter]:bg-card/80">
                    <CardHeader className="border-b">
                        <CardTitle className="text-xl sm:text-2xl">
                            Jump Into a Match
                        </CardTitle>
                        <CardDescription>
                            Create a new arena or enter a game ID to join your
                            friends.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 py-6">
                        {/* Create */}
                        <div className="grid gap-3">
                            <Label className="flex items-center gap-1.5 text-sm">
                                Host a new game
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex cursor-help">
                                            <HelpCircle className="size-3.5 opacity-70" />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Create a fresh lobby and share the ID
                                        with friends.
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    size="lg"
                                    className="w-full sm:w-auto"
                                    onClick={createGame}
                                >
                                    <Rocket className="size-4" /> Create Game
                                </Button>
                                {user?.name ? (
                                    <Badge
                                        variant="outline"
                                        className="w-full justify-center sm:w-auto"
                                    >
                                        Signed in as{' '}
                                        <span className="ml-1 font-medium">
                                            {user.name}
                                        </span>
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="destructive"
                                        className="w-full justify-center sm:w-auto"
                                    >
                                        Login required
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Join */}
                        <div className="grid gap-3">
                            <Label
                                htmlFor="gameId"
                                className="flex items-center gap-1.5"
                            >
                                Join with Game ID{' '}
                                <KeyRound className="size-3.5 opacity-70" />
                            </Label>
                            <div className="flex flex-col items-stretch gap-2 sm:flex-row">
                                <div className="relative w-full">
                                    <Input
                                        id="gameId"
                                        placeholder="e.g. blue-fish-dance"
                                        value={joinId}
                                        onChange={(e) =>
                                            setJoinId(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') joinGame();
                                        }}
                                        className="pr-28 uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-2 hidden items-center text-xs text-muted-foreground sm:flex">
                                        Press Enter ↵
                                    </div>
                                </div>
                                <Button
                                    size="lg"
                                    className="w-full sm:w-auto"
                                    onClick={joinGame}
                                    disabled={!joinId.trim()}
                                >
                                    <Swords className="size-4" /> Join Game
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t">
                        <p className="text-xs text-muted-foreground">
                            Pro tip: Share the game ID with your squad.
                        </p>
                    </CardFooter>
                </Card>
            </section>
        </main>
    );
}

export default Lobby;
