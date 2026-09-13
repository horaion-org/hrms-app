import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/common/content-security-policy";

const production = {
	apiOrigin: "https://api.example.test",
	cognitoRegion: "ap-southeast-1",
};

function directive(policy: string, name: string): string | undefined {
	return policy
		.split("; ")
		.find((entry) => entry.startsWith(`${name} `))
		?.slice(name.length + 1);
}

describe("contentSecurityPolicy", () => {
	it("given_production_when_built_then_allowsScriptsFromSelfOnly", () => {
		const policy = contentSecurityPolicy(production);

		expect(directive(policy, "script-src")).toBe("'self'");
		expect(policy).not.toContain("unsafe-inline");
		expect(policy).not.toContain("unsafe-eval");
	});

	it("given_production_when_built_then_connectsOnlyToTheApiAndCognito", () => {
		const policy = contentSecurityPolicy(production);

		expect(directive(policy, "connect-src")).toBe(
			"'self' https://api.example.test https://cognito-idp.ap-southeast-1.amazonaws.com"
		);
	});

	it("given_anApiUrlWithAPath_when_built_then_keepsOnlyItsOrigin", () => {
		const policy = contentSecurityPolicy({
			...production,
			apiOrigin: "https://api.example.test/api/v1/",
		});

		expect(directive(policy, "connect-src")).toContain(
			"https://api.example.test "
		);
		expect(policy).not.toContain("/api/v1");
	});

	it("given_production_when_built_then_forbidsEmbeddingPluginsAndBaseOverride", () => {
		const policy = contentSecurityPolicy(production);

		expect(directive(policy, "object-src")).toBe("'none'");
		expect(directive(policy, "base-uri")).toBe("'none'");
		expect(directive(policy, "frame-src")).toBe("'none'");
		expect(directive(policy, "form-action")).toBe("'self'");
		expect(policy).toContain("upgrade-insecure-requests");
	});

	it("given_aDevNonce_when_built_then_allowsNoncedTagsAndHotReloadSockets", () => {
		const policy = contentSecurityPolicy({ ...production, nonce: "abc123" });

		expect(directive(policy, "script-src")).toBe("'self' 'nonce-abc123'");
		expect(directive(policy, "style-src")).toBe("'self' 'nonce-abc123'");
		expect(directive(policy, "connect-src")).toContain("ws: wss:");
		expect(policy).not.toContain("upgrade-insecure-requests");
	});
});
