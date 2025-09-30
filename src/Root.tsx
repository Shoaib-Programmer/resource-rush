import { Outlet } from '@tanstack/react-router';

function Root() {
    return (
        <main className="container mx-auto p-4">
            <Outlet />
        </main>
    );
}

export default Root;
