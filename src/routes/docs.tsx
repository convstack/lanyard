import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/docs")({
	component: DocsPage,
	head: () => ({
		links: [
			{
				rel: "stylesheet",
				href: "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
			},
		],
	}),
});

function DocsPage() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const script = document.createElement("script");
		script.src =
			"https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
		script.onload = () => {
			// @ts-expect-error SwaggerUIBundle is loaded from CDN
			window.SwaggerUIBundle({
				url: "/api/docs/openapi",
				dom_id: "#swagger-ui",
				deepLinking: true,
				// @ts-expect-error SwaggerUIBundle is loaded from CDN
				presets: [window.SwaggerUIBundle.presets.apis],
				layout: "BaseLayout",
				defaultModelsExpandDepth: -1,
				docExpansion: "list",
				filter: true,
				tagsSorter: "alpha",
				operationsSorter: "alpha",
			});
		};
		document.head.appendChild(script);

		return () => {
			script.remove();
		};
	}, []);

	return (
		<div ref={containerRef} className="min-h-screen swagger-dark-overrides">
			<style>
				{`
				.dark .swagger-dark-overrides .swagger-ui {
					filter: invert(88%) hue-rotate(180deg);
				}
				.dark .swagger-dark-overrides .swagger-ui img,
				.dark .swagger-dark-overrides .swagger-ui svg {
					filter: invert(100%) hue-rotate(180deg);
				}
				.dark .swagger-dark-overrides .swagger-ui .topbar {
					background-color: transparent;
				}
				`}
			</style>
			<div id="swagger-ui" />
		</div>
	);
}
