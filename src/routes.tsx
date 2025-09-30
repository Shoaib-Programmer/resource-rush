import { createRootRoute, createRoute } from '@tanstack/react-router';
import Root from './Root';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

// Root route (app shell)
const rootRoute = createRootRoute({ component: Root });

// "/" lobby route
const lobbyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Lobby,
});

// "/game/$gameId" route
const gameRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'game/$gameId',
    component: GameRoom,
});

// Build the route tree
export const routeTree = rootRoute.addChildren([lobbyRoute, gameRoute]);
