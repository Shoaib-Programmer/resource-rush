import { createRootRoute, createRoute } from '@tanstack/react-router';
import { lazy } from 'react';

// Route-level code splitting
const Root = lazy(() => import('./Root'));
const Lobby = lazy(() => import('./components/Lobby'));
const GameRoom = lazy(() => import('./components/GameRoom'));

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
