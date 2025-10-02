import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routes';
import ErrorComponent from './components/ErrorComponent';

export const router = createRouter({
    routeTree,
    defaultErrorComponent: ErrorComponent,
});

// Register the router for type inference
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
