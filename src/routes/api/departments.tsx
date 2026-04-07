import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/departments")({
	server: {
		handlers: {
			/** @openapi
			 * summary: List departments visible to the current user
			 * auth: user
			 * response: 200
			 *   columns: array
			 *   rows: array
			 *   total: number
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { organization, member } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const isIdpAdmin = user.role === "admin";

				if (isIdpAdmin) {
					// IdP admins see all departments
					const allOrgs = await db
						.select({
							id: organization.id,
							name: organization.name,
							slug: organization.slug,
						})
						.from(organization);

					return new Response(
						JSON.stringify({
							columns: [
								{ key: "name", label: "Name" },
								{ key: "slug", label: "Slug" },
								{ key: "role", label: "Your Role" },
							],
							rows: allOrgs.map((o) => ({
								...o,
								role: "admin (IdP)",
							})),
							total: allOrgs.length,
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}

				// Staff see all non-private departments + departments they're members of
				// Non-staff shouldn't reach here (visibility filter blocks the service)
				// but if they do, they only see departments they're members of

				// Get user's memberships
				const userMemberships = await db
					.select({
						id: organization.id,
						name: organization.name,
						slug: organization.slug,
						role: member.role,
						private: organization.private,
					})
					.from(member)
					.innerJoin(organization, eq(member.organizationId, organization.id))
					.where(eq(member.userId, user.id));

				if (user.role === "staff") {
					// Staff also see non-private departments they're NOT members of
					const allPublicOrgs = await db
						.select({
							id: organization.id,
							name: organization.name,
							slug: organization.slug,
							private: organization.private,
						})
						.from(organization);

					const memberIds = new Set(userMemberships.map((m) => m.id));
					const publicNonMember = allPublicOrgs
						.filter((o) => !o.private && !memberIds.has(o.id))
						.map((o) => ({ ...o, role: "—" }));

					const all = [
						...userMemberships.map((m) => ({
							id: m.id,
							name: m.name,
							slug: m.slug,
							role: m.role,
						})),
						...publicNonMember,
					];

					return new Response(
						JSON.stringify({
							columns: [
								{ key: "name", label: "Name" },
								{ key: "slug", label: "Slug" },
								{ key: "role", label: "Your Role" },
							],
							rows: all,
							total: all.length,
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// Regular users — only their memberships
				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "slug", label: "Slug" },
							{ key: "role", label: "Your Role" },
						],
						rows: userMemberships.map((m) => ({
							id: m.id,
							name: m.name,
							slug: m.slug,
							role: m.role,
						})),
						total: userMemberships.length,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
