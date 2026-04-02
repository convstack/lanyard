import { describe, expect, it } from "vitest";
import {
	banUserSchema,
	updateUserRoleSchema,
} from "../../src/lib/validators/admin";
import {
	forgotPasswordSchema,
	loginSchema,
	registerSchema,
	resetPasswordSchema,
} from "../../src/lib/validators/auth";
import { createOidcClientSchema } from "../../src/lib/validators/oidc";
import {
	changePasswordSchema,
	updateProfileSchema,
} from "../../src/lib/validators/profile";

describe("Auth Validators", () => {
	describe("loginSchema", () => {
		it("accepts valid login input", () => {
			const result = loginSchema.safeParse({
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid email", () => {
			const result = loginSchema.safeParse({
				email: "not-an-email",
				password: "password123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty password", () => {
			const result = loginSchema.safeParse({
				email: "test@example.com",
				password: "",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("registerSchema", () => {
		it("accepts valid registration input", () => {
			const result = registerSchema.safeParse({
				name: "Test User",
				username: "testuser",
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects short username", () => {
			const result = registerSchema.safeParse({
				name: "Test",
				username: "ab",
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid username characters", () => {
			const result = registerSchema.safeParse({
				name: "Test",
				username: "user name with spaces",
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects short password", () => {
			const result = registerSchema.safeParse({
				name: "Test User",
				username: "testuser",
				email: "test@example.com",
				password: "short",
			});
			expect(result.success).toBe(false);
		});

		it("rejects XSS in username", () => {
			const result = registerSchema.safeParse({
				name: "Test",
				username: "<script>alert(1)</script>",
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("forgotPasswordSchema", () => {
		it("accepts valid email", () => {
			const result = forgotPasswordSchema.safeParse({
				email: "test@example.com",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("resetPasswordSchema", () => {
		it("accepts valid reset input", () => {
			const result = resetPasswordSchema.safeParse({
				token: "some-token",
				password: "newpassword123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects short password", () => {
			const result = resetPasswordSchema.safeParse({
				token: "some-token",
				password: "short",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Profile Validators", () => {
	describe("updateProfileSchema", () => {
		it("accepts valid profile update", () => {
			const result = updateProfileSchema.safeParse({
				name: "New Name",
			});
			expect(result.success).toBe(true);
		});

		it("accepts empty update", () => {
			const result = updateProfileSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe("changePasswordSchema", () => {
		it("rejects mismatched passwords", () => {
			const result = changePasswordSchema.safeParse({
				currentPassword: "oldpass",
				newPassword: "newpass123",
				confirmPassword: "different",
			});
			expect(result.success).toBe(false);
		});

		it("accepts matching passwords", () => {
			const result = changePasswordSchema.safeParse({
				currentPassword: "oldpass",
				newPassword: "newpass123",
				confirmPassword: "newpass123",
			});
			expect(result.success).toBe(true);
		});
	});
});

describe("OIDC Validators", () => {
	describe("createOidcClientSchema", () => {
		it("accepts valid client input", () => {
			const result = createOidcClientSchema.safeParse({
				name: "My App",
				redirectURIs: ["https://app.example.com/callback"],
				type: "confidential",
			});
			expect(result.success).toBe(true);
		});

		it("rejects empty redirect URIs", () => {
			const result = createOidcClientSchema.safeParse({
				name: "My App",
				redirectURIs: [],
				type: "confidential",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid redirect URI", () => {
			const result = createOidcClientSchema.safeParse({
				name: "My App",
				redirectURIs: ["not-a-url"],
				type: "confidential",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Admin Validators", () => {
	describe("banUserSchema", () => {
		it("accepts ban with reason", () => {
			const result = banUserSchema.safeParse({
				userId: "user-123",
				reason: "Violated terms of service",
			});
			expect(result.success).toBe(true);
		});

		it("accepts ban without reason", () => {
			const result = banUserSchema.safeParse({
				userId: "user-123",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("updateUserRoleSchema", () => {
		it("accepts valid role change", () => {
			const result = updateUserRoleSchema.safeParse({
				userId: "user-123",
				role: "admin",
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid role", () => {
			const result = updateUserRoleSchema.safeParse({
				userId: "user-123",
				role: "superadmin",
			});
			expect(result.success).toBe(false);
		});
	});
});
