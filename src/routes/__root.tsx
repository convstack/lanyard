import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import {
	generateBrandingCss,
	ThemeProvider,
} from "~/lib/theming/theme-provider";
import { getBrandingFn } from "~/server/functions/auth";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "description", content: "Lanyard Identity Provider" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.ico" },
		],
	}),
	loader: async () => {
		const branding = await getBrandingFn();
		return { branding };
	},
	component: RootComponent,
});

function RootComponent() {
	const { branding } = Route.useLoaderData();
	const brandingCss = generateBrandingCss(branding);
	const appName = branding?.appName || "Lanyard";

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<title>{appName}</title>
				{brandingCss && (
					<style dangerouslySetInnerHTML={{ __html: brandingCss }} />
				)}
				<script
					dangerouslySetInnerHTML={{
						__html: `
              (function() {
                var theme = localStorage.getItem('lanyard-theme') || 'system';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
					}}
				/>
			</head>
			<body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
				<ThemeProvider branding={branding}>
					<Outlet />
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
