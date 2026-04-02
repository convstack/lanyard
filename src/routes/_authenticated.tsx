import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { Session } from "~/lib/auth";
import { getSessionFn } from "~/server/functions/auth";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return { session } as { session: Session };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { session } = Route.useRouteContext();
	const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:4000";

	return (
		<div className="min-h-screen">
			<header className="border-b border-(--border) bg-(--sidebar-background) px-6 py-3 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<span className="text-lg font-bold">Lanyard</span>
					<span className="text-sm text-(--muted-foreground)">
						Security Settings
					</span>
				</div>
				<div className="flex items-center gap-4">
					<span className="text-sm text-(--muted-foreground)">
						{session.user.email}
					</span>
					<a
						href={dashboardUrl}
						className="rounded-md bg-(--primary) px-3 py-1.5 text-sm font-medium text-(--primary-foreground) hover:opacity-90"
					>
						Back to Dashboard
					</a>
				</div>
			</header>
			<main className="mx-auto max-w-4xl px-8 py-8">
				<Outlet />
			</main>
		</div>
	);
}
