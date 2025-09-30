import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routes';

export const router = createRouter({ routeTree });

// Register the router for type inference
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
