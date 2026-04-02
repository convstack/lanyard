import { z } from "zod";

export const updateUserRoleSchema = z.object({
	userId: z.string().min(1),
	role: z.enum(["user", "admin"]),
});

export const banUserSchema = z.object({
	userId: z.string().min(1),
	reason: z.string().max(500).optional(),
	expiresAt: z.string().datetime().optional(),
});

export const unbanUserSchema = z.object({
	userId: z.string().min(1),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
export type UnbanUserInput = z.infer<typeof unbanUserSchema>;
