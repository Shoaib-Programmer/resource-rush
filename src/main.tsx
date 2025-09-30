import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Suspense fallback={null}>
            <RouterProvider router={router} />
        </Suspense>
    </StrictMode>,
);
