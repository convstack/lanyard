/**
 * Resolves a user's effective permissions for a given service.
 *
 * Permission flow:
 * 1. Find the service by slug → get serviceId
 * 2. Find user's org memberships → get list of (orgId, role) pairs
 * 3. Query serviceRolePermission for all (serviceId, orgId, role) matches
 * 4. Union all matching permission strings
 *
 * Admin global role does NOT grant automatic service access.
 * Users must be in a department with the right role→permission mappings.
 */

import { db } from "~/db";
import {
	member,
	organization,
	serviceCatalogEntry,
	serviceRolePermission,
} from "~/db/schema";

export interface ResolvedPermissions {
	userId: string;
	permissions: string[];
	orgRoles: Array<{ orgId: string; name: string; slug: string; role: string }>;
}

// Cache resolved permissions for 2 minutes
const cache = new Map<
	string,
	{ result: ResolvedPermissions; expires: number }
>();
const CACHE_TTL = 15 * 1000; // 15 seconds

/**
 * Resolve a user's permissions for a specific service.
 */
export async function resolveUserPermissions(
	userId: string,
	serviceSlug: string,
): Promise<ResolvedPermissions> {
	const cacheKey = `${userId}:${serviceSlug}`;
	const cached = cache.get(cacheKey);
	if (cached && cached.expires > Date.now()) {
		return cached.result;
	}

	const { eq, and, inArray } = await import("drizzle-orm");

	// 1. Find the service
	const [service] = await db
		.select({ id: serviceCatalogEntry.id })
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.slug, serviceSlug))
		.limit(1);

	if (!service) {
		const result: ResolvedPermissions = {
			userId,
			permissions: [],
			orgRoles: [],
		};
		cache.set(cacheKey, { result, expires: Date.now() + CACHE_TTL });
		return result;
	}

	// 2. Find user's org memberships
	const memberships = await db
		.select({
			orgId: member.organizationId,
			orgName: organization.name,
			orgSlug: organization.slug,
			role: member.role,
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, userId));

	const orgRoles = memberships.map((m) => ({
		orgId: m.orgId,
		name: m.orgName,
		slug: m.orgSlug,
		role: m.role,
	}));

	if (memberships.length === 0) {
		const result: ResolvedPermissions = {
			userId,
			permissions: [],
			orgRoles: [],
		};
		cache.set(cacheKey, { result, expires: Date.now() + CACHE_TTL });
		return result;
	}

	// 3. Query all role-permission mappings for this service + user's orgs
	const orgIds = memberships.map((m) => m.orgId);
	const rolePermissions = await db
		.select({
			permission: serviceRolePermission.permission,
		})
		.from(serviceRolePermission)
		.where(
			and(
				eq(serviceRolePermission.serviceId, service.id),
				inArray(serviceRolePermission.organizationId, orgIds),
			),
		);

	// Filter to only permissions where the user's role in that org matches
	const rolesByOrg = new Map<string, string>();
	for (const m of memberships) {
		rolesByOrg.set(m.orgId, m.role);
	}

	// Re-query with role matching — get all mappings for this service+orgs
	const allMappings = await db
		.select({
			orgId: serviceRolePermission.organizationId,
			role: serviceRolePermission.role,
			permission: serviceRolePermission.permission,
		})
		.from(serviceRolePermission)
		.where(
			and(
				eq(serviceRolePermission.serviceId, service.id),
				inArray(serviceRolePermission.organizationId, orgIds),
			),
		);

	// 4. Filter: only include permissions where user's org role matches
	const permissions = new Set<string>();
	for (const mapping of allMappings) {
		const userRole = rolesByOrg.get(mapping.orgId);
		if (userRole === mapping.role) {
			permissions.add(mapping.permission);
		}
	}

	const result: ResolvedPermissions = {
		userId,
		permissions: [...permissions],
		orgRoles,
	};

	cache.set(cacheKey, { result, expires: Date.now() + CACHE_TTL });
	return result;
}

/**
 * Clear the permission cache (e.g. after role-permission mappings change).
 */
export function clearPermissionCache(): void {
	cache.clear();
}
