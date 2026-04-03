/**
 * Look up a department (organization) by slug and check the user's role.
 * Returns null if the department doesn't exist or user has no access.
 *
 * Access rules:
 * - IdP admins: always access, role = "admin"
 * - Department members: always access, role = their membership role
 * - Staff (non-member): access if department is not private, role = "viewer"
 * - Regular users (non-member): no access
 */
export async function getDepartmentBySlug(
	slug: string,
	userId: string,
	userRole: string | null,
): Promise<{
	departmentId: string;
	name: string;
	slug: string;
	metadata: string | null;
	isPrivate: boolean;
	role: string;
} | null> {
	const { db } = await import("~/db");
	const { organization, member } = await import("~/db/schema");
	const { eq, and } = await import("drizzle-orm");

	const [org] = await db
		.select({
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			metadata: organization.metadata,
			private: organization.private,
		})
		.from(organization)
		.where(eq(organization.slug, slug))
		.limit(1);

	if (!org) return null;

	const isIdpAdmin = userRole === "admin";

	if (isIdpAdmin) {
		return {
			departmentId: org.id,
			name: org.name,
			slug: org.slug,
			metadata: org.metadata,
			isPrivate: org.private,
			role: "admin",
		};
	}

	// Check membership
	const [m] = await db
		.select({ role: member.role })
		.from(member)
		.where(and(eq(member.userId, userId), eq(member.organizationId, org.id)))
		.limit(1);

	if (m) {
		return {
			departmentId: org.id,
			name: org.name,
			slug: org.slug,
			metadata: org.metadata,
			isPrivate: org.private,
			role: m.role,
		};
	}

	// Staff can view non-private departments
	if (userRole === "staff" && !org.private) {
		return {
			departmentId: org.id,
			name: org.name,
			slug: org.slug,
			metadata: org.metadata,
			isPrivate: org.private,
			role: "viewer",
		};
	}

	return null;
}
