import { z } from "zod";

export const createOidcClientSchema = z.object({
	name: z.string().min(1, "Client name is required").max(100),
	redirectURIs: z
		.array(z.string().url("Each redirect URI must be a valid URL"))
		.min(1, "At least one redirect URI is required"),
	type: z.enum(["confidential", "public"]).default("confidential"),
	icon: z.string().url().nullable().optional(),
});

export const updateOidcClientSchema = z.object({
	clientId: z.string().min(1),
	name: z.string().min(1).max(100).optional(),
	redirectURIs: z.array(z.string().url()).min(1).optional(),
	icon: z.string().url().nullable().optional(),
	disabled: z.boolean().optional(),
});

export type CreateOidcClientInput = z.infer<typeof createOidcClientSchema>;
export type UpdateOidcClientInput = z.infer<typeof updateOidcClientSchema>;
