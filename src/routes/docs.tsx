import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({
	component: DocsPage,
});

function DocsPage() {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>ConvStack API Docs</title>
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
				/>
			</head>
			<body>
				<div id="swagger-ui" />
				<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" />
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: inline script for Swagger UI init
					dangerouslySetInnerHTML={{
						__html: `
							window.onload = function() {
								SwaggerUIBundle({
									url: "/api/docs/openapi",
									dom_id: "#swagger-ui",
									deepLinking: true,
									presets: [
										SwaggerUIBundle.presets.apis,
										SwaggerUIBundle.SwaggerUIStandalonePreset
									],
									layout: "BaseLayout",
									defaultModelsExpandDepth: -1,
									docExpansion: "list",
									filter: true,
									tagsSorter: "alpha",
									operationsSorter: "alpha",
								});
							};
						`,
					}}
				/>
			</body>
		</html>
	);
}
