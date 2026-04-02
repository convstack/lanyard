import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFn } from "~/server/functions/auth";

export const Route = createFileRoute("/_public")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session) {
			throw redirect({ to: "/profile/security" });
		}
	},
	component: PublicLayout,
});

function PublicLayout() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				<Outlet />
			</div>
		</div>
	);
}
