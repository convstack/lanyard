export interface BrandingConfig {
	id: string;
	organizationId: string | null;
	appName: string;
	logoUrl: string | null;
	faviconUrl: string | null;
	primaryColor: string | null;
	accentColor: string | null;
	backgroundColor: string | null;
	foregroundColor: string | null;
	mutedColor: string | null;
	destructiveColor: string | null;
	borderRadius: string | null;
	customCss: string | null;
}
