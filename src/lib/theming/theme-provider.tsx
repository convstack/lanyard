import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import type { BrandingConfig } from "./types";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	branding: BrandingConfig | null;
}

const ThemeContext = createContext<ThemeContextValue>({
	theme: "system",
	setTheme: () => {},
	branding: null,
});

export function useTheme() {
	return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function generateBrandingCss(branding: BrandingConfig | null): string {
	if (!branding) return "";

	const overrides: string[] = [];
	if (branding.primaryColor)
		overrides.push(`--primary: oklch(${branding.primaryColor});`);
	if (branding.accentColor)
		overrides.push(`--accent: oklch(${branding.accentColor});`);
	if (branding.backgroundColor)
		overrides.push(`--background: oklch(${branding.backgroundColor});`);
	if (branding.foregroundColor)
		overrides.push(`--foreground: oklch(${branding.foregroundColor});`);
	if (branding.mutedColor)
		overrides.push(`--muted: oklch(${branding.mutedColor});`);
	if (branding.destructiveColor)
		overrides.push(`--destructive: oklch(${branding.destructiveColor});`);
	if (branding.borderRadius)
		overrides.push(`--radius: ${branding.borderRadius};`);

	let css = "";
	if (overrides.length > 0) {
		css += `:root { ${overrides.join(" ")} }`;
	}
	if (branding.customCss) {
		css += `\n${branding.customCss}`;
	}
	return css;
}

export function ThemeProvider({
	children,
	branding,
}: {
	children: ReactNode;
	branding: BrandingConfig | null;
}) {
	const [theme, setThemeState] = useState<Theme>("system");

	useEffect(() => {
		const stored = localStorage.getItem("lanyard-theme") as Theme | null;
		if (stored) setThemeState(stored);
	}, []);

	useEffect(() => {
		const resolved = theme === "system" ? getSystemTheme() : theme;
		document.documentElement.classList.toggle("dark", resolved === "dark");
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);
		localStorage.setItem("lanyard-theme", newTheme);
	};

	return (
		<ThemeContext.Provider value={{ theme, setTheme, branding }}>
			{children}
		</ThemeContext.Provider>
	);
}
