import { z } from "zod";

export const updateProfileSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(100)
		.optional(),
	username: z
		.string()
		.min(3, "Username must be at least 3 characters")
		.max(30)
		.regex(/^[a-zA-Z0-9_-]+$/, "Invalid username format")
		.optional(),
	image: z.string().url().nullable().optional(),
});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(128),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
