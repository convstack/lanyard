import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/data-deletion")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { dataDeletionRequest } = await import("~/db/schema");
				const { eq, and, notInArray, desc } = await import("drizzle-orm");

				const [activeRequest] = await db
					.select({
						status: dataDeletionRequest.status,
						reason: dataDeletionRequest.reason,
						createdAt: dataDeletionRequest.createdAt,
						scheduledDeletionAt: dataDeletionRequest.scheduledDeletionAt,
					})
					.from(dataDeletionRequest)
					.where(
						and(
							eq(dataDeletionRequest.userId, authedUser.id),
							notInArray(dataDeletionRequest.status, ["cancelled", "declined"]),
						),
					)
					.orderBy(desc(dataDeletionRequest.createdAt))
					.limit(1);

				if (!activeRequest) {
					return new Response(
						JSON.stringify({
							fields: [
								{
									key: "status",
									label: "Status",
									value: "No active deletion request",
								},
							],
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}

				const formatDate = (d: Date | null, includeTime = false) => {
					if (!d) return "";
					const pad = (n: number) => String(n).padStart(2, "0");
					const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
					if (!includeTime) return date;
					return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
				};

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "status", label: "Status", value: activeRequest.status },
							{ key: "reason", label: "Reason", value: activeRequest.reason },
							{
								key: "createdAt",
								label: "Requested",
								value: formatDate(activeRequest.createdAt, true),
							},
							{
								key: "scheduledDeletionAt",
								label: "Scheduled Deletion",
								value: formatDate(activeRequest.scheduledDeletionAt),
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			POST: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();

				const { db } = await import("~/db");
				const { dataDeletionRequest, user } = await import("~/db/schema");
				const { eq, and, inArray } = await import("drizzle-orm");
				const { nanoid } = await import("nanoid");

				const [existing] = await db
					.select({ id: dataDeletionRequest.id })
					.from(dataDeletionRequest)
					.where(
						and(
							eq(dataDeletionRequest.userId, authedUser.id),
							inArray(dataDeletionRequest.status, ["pending", "accepted"]),
						),
					)
					.limit(1);

				if (existing) {
					return new Response(
						JSON.stringify({
							error: "A pending or accepted deletion request already exists.",
						}),
						{
							status: 409,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				const now = new Date();

				await db.insert(dataDeletionRequest).values({
					id: nanoid(),
					userId: authedUser.id,
					userEmail: authedUser.email,
					userName: authedUser.name,
					reason: body.reason ?? "",
					additionalInfo: body.additionalInfo ?? null,
					status: "pending",
					createdAt: now,
					updatedAt: now,
				});

				await db
					.update(user)
					.set({ deletionPending: true, updatedAt: now })
					.where(eq(user.id, authedUser.id));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
