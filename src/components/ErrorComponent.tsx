import { useMemo, useState } from 'react';
import {
    AlertTriangle,
    BugPlay,
    Home,
    RefreshCcw,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export type ErrorComponentProps<TError extends Error = Error> = {
    error: TError;
    info?: {
        componentStack: string;
    };
    reset?: () => void;
};

function formatMessage(error: Error) {
    if (!error?.message) return 'An unexpected error occurred.';
    return error.message.trim();
}

export function ErrorComponent({ error, info, reset }: ErrorComponentProps) {
    const [showDetails, setShowDetails] = useState(import.meta.env.DEV);

    const message = useMemo(() => formatMessage(error), [error]);

    const handleReset = () => {
        if (reset) {
            reset();
        } else {
            window.location.href = '/';
        }
    };

    return (
        <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            >
                <div className="absolute left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.violet.500/.25),transparent_70%)] blur-3xl" />
                <div className="absolute left-[15%] bottom-[-10rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.emerald.500/.15),transparent_70%)] blur-3xl" />
                <div className="absolute right-[12%] top-[35%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.sky.500/.18),transparent_70%)] blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,theme(colors.background)/.6_30%,transparent_60%)]" />
            </div>

            <Card className="max-w-2xl backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <CardHeader className="border-b">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Sparkles className="size-4" />
                        <span className="text-xs uppercase tracking-wide">
                            Resource Rush Control Room
                        </span>
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl">
                        Reactor Anomaly Detected
                    </CardTitle>
                    <CardDescription>
                        Something went sideways while loading the arena. Our
                        engineers are already on it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 py-6">
                    <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-sm">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="size-5 text-amber-500" />
                            <div className="space-y-1">
                                <p className="font-medium text-foreground">
                                    {message}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Stay frosty—your progress is still safe.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Button onClick={handleReset} className="w-full">
                            <RefreshCcw className="size-4" /> Try again
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                window.location.href = '/';
                            }}
                        >
                            <Home className="size-4" /> Return to lobby
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                        <div className="inline-flex items-center gap-2">
                            <BugPlay className="size-4" />
                            <span>Error telemetry is standing by.</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            onClick={() => setShowDetails((prev) => !prev)}
                        >
                            {showDetails ? 'Hide error' : 'Show error'}
                        </Button>
                    </div>

                    {showDetails && (
                        <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-4 text-sm">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Details
                                </h3>
                                <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/60 p-3 text-xs leading-relaxed">
                                    {error.stack || message}
                                </pre>
                            </div>
                            {info?.componentStack && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Component Stack
                                    </h4>
                                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/60 p-3 text-xs leading-relaxed">
                                        {info.componentStack}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 border-t text-xs text-muted-foreground">
                    <span>
                        Tip: If this keeps happening, DM and send a screenshot
                        to Sarthak.
                    </span>
                    <span>
                        Timestamp:{' '}
                        {new Date().toLocaleString(undefined, {
                            hour12: false,
                        })}
                    </span>
                </CardFooter>
            </Card>
        </main>
    );
}

export default ErrorComponent;
