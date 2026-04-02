interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (entry.resetAt <= now) {
			store.delete(key);
		}
	}
}, 60_000);

export interface RateLimitConfig {
	windowMs: number;
	max: number;
	keyPrefix: string;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
}

export function checkRateLimit(
	key: string,
	config: RateLimitConfig,
): RateLimitResult {
	const fullKey = `${config.keyPrefix}:${key}`;
	const now = Date.now();

	const entry = store.get(fullKey);
	if (!entry || entry.resetAt <= now) {
		store.set(fullKey, { count: 1, resetAt: now + config.windowMs });
		return {
			allowed: true,
			remaining: config.max - 1,
			resetAt: now + config.windowMs,
		};
	}

	entry.count++;
	if (entry.count > config.max) {
		return { allowed: false, remaining: 0, resetAt: entry.resetAt };
	}

	return {
		allowed: true,
		remaining: config.max - entry.count,
		resetAt: entry.resetAt,
	};
}

export const RATE_LIMITS = {
	login: { windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "login" },
	register: { windowMs: 60 * 60 * 1000, max: 3, keyPrefix: "register" },
	token: { windowMs: 60 * 1000, max: 30, keyPrefix: "token" },
	general: { windowMs: 60 * 1000, max: 100, keyPrefix: "general" },
	passwordReset: {
		windowMs: 60 * 60 * 1000,
		max: 3,
		keyPrefix: "password-reset",
	},
} as const;
