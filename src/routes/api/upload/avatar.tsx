import { createFileRoute } from "@tanstack/react-router";
import { deleteFile, isS3Configured, uploadFile } from "~/lib/s3";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

async function getMaxSizeMb(): Promise<number> {
	const { db } = await import("~/db");
	const { appSettings } = await import("~/db/schema");
	const [settings] = await db.select().from(appSettings).limit(1);
	return settings?.avatarMaxSizeMb ?? 2;
}

export const Route = createFileRoute("/api/upload/avatar")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				if (!isS3Configured()) {
					return new Response(
						JSON.stringify({ error: "File uploads are not configured" }),
						{ status: 501, headers: { "Content-Type": "application/json" } },
					);
				}

				const formData = await request.formData();
				const file = formData.get("file");

				if (!file || !(file instanceof File)) {
					return new Response(JSON.stringify({ error: "No file provided" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				if (!ALLOWED_TYPES.includes(file.type)) {
					return new Response(
						JSON.stringify({
							error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP",
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const maxSizeMb = await getMaxSizeMb();
				const maxSize = maxSizeMb * 1024 * 1024;

				if (file.size > maxSize) {
					return new Response(
						JSON.stringify({
							error: `File too large. Maximum ${maxSizeMb}MB`,
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const ext = file.name.split(".").pop() || "jpg";
				const buffer = new Uint8Array(await file.arrayBuffer());

				const url = await uploadFile(buffer, {
					folder: `avatars/${user.id}`,
					contentType: file.type,
					extension: `.${ext}`,
				});

				if (!url) {
					return new Response(JSON.stringify({ error: "Upload failed" }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user: userTable } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				// Delete old avatar if exists
				const [current] = await db
					.select({ image: userTable.image })
					.from(userTable)
					.where(eq(userTable.id, user.id))
					.limit(1);
				if (current?.image) {
					await deleteFile(current.image).catch(() => {});
				}

				await db
					.update(userTable)
					.set({ image: url, updatedAt: new Date() })
					.where(eq(userTable.id, user.id));

				return new Response(JSON.stringify({ url }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
