import { describe, expect, it } from "vitest";
import { generateBrandingCss } from "../../src/lib/theming/theme-provider";
import type { BrandingConfig } from "../../src/lib/theming/types";

describe("Theme Provider", () => {
	describe("generateBrandingCss", () => {
		it("returns empty string for null branding", () => {
			expect(generateBrandingCss(null)).toBe("");
		});

		it("generates CSS for primary color override", () => {
			const branding: BrandingConfig = {
				id: "1",
				organizationId: null,
				appName: "Test",
				logoUrl: null,
				faviconUrl: null,
				primaryColor: "0.5 0.2 260",
				accentColor: null,
				backgroundColor: null,
				foregroundColor: null,
				mutedColor: null,
				destructiveColor: null,
				borderRadius: null,
				customCss: null,
			};

			const css = generateBrandingCss(branding);
			expect(css).toContain("--primary: oklch(0.5 0.2 260)");
		});

		it("includes custom CSS", () => {
			const branding: BrandingConfig = {
				id: "1",
				organizationId: null,
				appName: "Test",
				logoUrl: null,
				faviconUrl: null,
				primaryColor: null,
				accentColor: null,
				backgroundColor: null,
				foregroundColor: null,
				mutedColor: null,
				destructiveColor: null,
				borderRadius: null,
				customCss: ".my-class { color: red; }",
			};

			const css = generateBrandingCss(branding);
			expect(css).toContain(".my-class { color: red; }");
		});

		it("generates border-radius override", () => {
			const branding: BrandingConfig = {
				id: "1",
				organizationId: null,
				appName: "Test",
				logoUrl: null,
				faviconUrl: null,
				primaryColor: null,
				accentColor: null,
				backgroundColor: null,
				foregroundColor: null,
				mutedColor: null,
				destructiveColor: null,
				borderRadius: "1rem",
				customCss: null,
			};

			const css = generateBrandingCss(branding);
			expect(css).toContain("--radius: 1rem");
		});

		it("combines multiple overrides", () => {
			const branding: BrandingConfig = {
				id: "1",
				organizationId: null,
				appName: "Test",
				logoUrl: null,
				faviconUrl: null,
				primaryColor: "0.5 0.2 260",
				accentColor: "0.8 0.1 120",
				backgroundColor: null,
				foregroundColor: null,
				mutedColor: null,
				destructiveColor: null,
				borderRadius: "0.5rem",
				customCss: null,
			};

			const css = generateBrandingCss(branding);
			expect(css).toContain("--primary:");
			expect(css).toContain("--accent:");
			expect(css).toContain("--radius:");
		});
	});
});
