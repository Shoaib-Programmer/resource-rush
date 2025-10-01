import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store';
import { checkAllPlayersSubmitted, processRound } from '@/lib/extractionPhase';
import { toast } from 'sonner';

/**
 * Hook that automatically processes the round when all players have submitted
 * Only runs on the host's client
 */
export function useHostRoundProcessor(
    gameId: string | undefined,
    userId: string | undefined,
    isHost: boolean,
) {
    const game = useGameStore((state) => state.game);
    const processingRef = useRef(false);
    const lastProcessedRoundRef = useRef<string | null>(null);

    useEffect(() => {
        if (!gameId || !userId || !isHost || !game) return;
        if (game.status !== 'in-progress') return;
        if (game.gameState?.currentPhase !== 'extraction') return;

        const currentRound = game.gameState?.currentRound ?? 1;
        const roundKey = `round_${currentRound}`;

        // Check if we've already processed this round
        if (lastProcessedRoundRef.current === roundKey) {
            return;
        }

        // Check if all players have submitted
        const allSubmitted = checkAllPlayersSubmitted(game);

        if (allSubmitted && !processingRef.current) {
            processingRef.current = true;

            // Add a small delay to ensure all data is synced
            const timeoutId = setTimeout(async () => {
                try {
                    console.log(`[Host] Processing round ${currentRound}...`);
                    await processRound(gameId, userId);
                    lastProcessedRoundRef.current = roundKey;
                    toast.success(
                        'All players submitted! Processing results...',
                    );
                } catch (error) {
                    console.error('[Host] Error processing round:', error);
                    toast.error('Failed to process round. Please try again.');
                } finally {
                    processingRef.current = false;
                }
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [gameId, userId, isHost, game]);

    // Reset when moving to a new round
    useEffect(() => {
        if (!game?.gameState?.currentRound) return;
        const currentRound = game.gameState.currentRound;
        const roundKey = `round_${currentRound}`;

        // If we're on a new round, reset the processing flag
        if (
            lastProcessedRoundRef.current &&
            lastProcessedRoundRef.current !== roundKey
        ) {
            processingRef.current = false;
        }
    }, [game?.gameState?.currentRound]);
}
