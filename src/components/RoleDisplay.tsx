import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface RoleDisplayProps {
    role: Role | null;
}

const roleInfo: Record<
    Role,
    { color: string; icon: string; description: string }
> = {
    Exploiter: {
        color: 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100',
        icon: '⚡',
        description: 'Win by maximizing your personal resources',
    },
    Environmentalist: {
        color: 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100',
        icon: '🌱',
        description: 'Win by maintaining the global resource pool',
    },
    Moderate: {
        color: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100',
        icon: '⚖️',
        description: 'Win by balancing personal and global resources',
    },
};

export function RoleDisplay({ role }: RoleDisplayProps) {
    if (!role) return null;

    const info = roleInfo[role];

    return (
        <div className="mx-auto w-full">
            <div
                className={cn(
                    'rounded-md border px-3 py-2 text-sm flex items-center gap-2',
                    info.color,
                )}
            >
                <span className="text-lg leading-none">{info.icon}</span>
                <span className="font-semibold tracking-tight">{role}</span>
                <span className="text-muted-foreground hidden md:inline">
                    • {info.description}
                </span>
            </div>
        </div>
    );
}
