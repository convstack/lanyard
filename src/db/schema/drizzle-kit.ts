// Schema export for drizzle-kit migrations only.
// Excludes OIDC tables because Better Auth's oauth-provider plugin
// manages them internally and defines all columns — including them
// here causes duplicate column errors during migration generation.
// The full schema (including OIDC) is in index.ts for runtime queries.

export * from "./auth";
export * from "./branding";
export * from "./data-deletion";
export * from "./organization";
export * from "./passkey";
export * from "./service-catalog";
export * from "./settings";
export * from "./two-factor";
