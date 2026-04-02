import { describe, expect, it } from "vitest";
import {
	checkRateLimit,
	type RateLimitConfig,
} from "../../src/lib/security/rate-limiter";

describe("Rate Limiter", () => {
	const config: RateLimitConfig = {
		windowMs: 60_000,
		max: 3,
		keyPrefix: "test",
	};

	it("allows requests under the limit", () => {
		const key = `test-${Date.now()}`;
		const result = checkRateLimit(key, config);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(2);
	});

	it("blocks requests over the limit", () => {
		const key = `block-${Date.now()}`;
		checkRateLimit(key, config);
		checkRateLimit(key, config);
		checkRateLimit(key, config);
		const result = checkRateLimit(key, config);
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it("tracks remaining correctly", () => {
		const key = `remaining-${Date.now()}`;
		const r1 = checkRateLimit(key, config);
		expect(r1.remaining).toBe(2);

		const r2 = checkRateLimit(key, config);
		expect(r2.remaining).toBe(1);

		const r3 = checkRateLimit(key, config);
		expect(r3.remaining).toBe(0);
	});

	it("uses different keys independently", () => {
		const ts = Date.now();
		const key1 = `user1-${ts}`;
		const key2 = `user2-${ts}`;

		checkRateLimit(key1, config);
		checkRateLimit(key1, config);
		checkRateLimit(key1, config);

		const result = checkRateLimit(key2, config);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(2);
	});
});
