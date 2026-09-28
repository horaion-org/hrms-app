import { afterEach, describe, expect, it, vi } from "vitest";
import { registerCompany, type Registration } from "@/features/auth/api";

const registration: Registration = {
	displayName: "Alex Tan",
	companyName: "Acme",
	registrationNumber: "202600001A",
	subdomain: "acme",
	email: "alex@example.com",
	password: "Example123!",
};

const respondWith = (status: number, body?: object): void => {
	vi.stubGlobal(
		"fetch",
		vi
			.fn()
			.mockResolvedValue(
				new Response(body ? JSON.stringify(body) : null, { status })
			)
	);
};

describe("registerCompany", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends only the properties the onboarding endpoint accepts", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 201 }));
		vi.stubGlobal("fetch", fetchMock);

		await registerCompany(registration);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toMatch(/\/api\/v1\/public\/onboardings$/);
		expect(JSON.parse(init.body as string)).toEqual({
			email: "alex@example.com",
			password: "Example123!",
			companyName: "Acme",
			subdomain: "acme",
			displayName: "Alex Tan",
		});
	});

	it("resolves with no refusals when the workspace is created", async () => {
		respondWith(201);

		await expect(registerCompany(registration)).resolves.toEqual({});
	});

	it.each([
		[400, "PASSWORD_POLICY_VIOLATION", "password"],
		[400, "IDENTITY_REJECTED", "email"],
		[409, "EMAIL_ALREADY_REGISTERED", "email"],
		[409, "SUBDOMAIN_ALREADY_TAKEN", "subdomain"],
	])(
		"puts a %i %s refusal on the %s input",
		async (status, errorCode, field) => {
			respondWith(status, { status, errorCode });

			const refused = await registerCompany(registration);

			expect(Object.keys(refused)).toEqual([field]);
		}
	);

	it("lists the password requirements when the password is refused", async () => {
		respondWith(400, { status: 400, errorCode: "PASSWORD_POLICY_VIOLATION" });

		const refused = await registerCompany(registration);

		expect(refused.password).toContain(
			"an uppercase letter, a lowercase letter, a number and a symbol"
		);
	});

	it("maps validation errors to the form inputs they came from", async () => {
		respondWith(400, {
			status: 400,
			errors: [
				{ field: "subdomain", message: "reserved" },
				{ field: "displayName", message: "must not be blank" },
			],
		});

		const refused = await registerCompany(registration);

		expect(Object.keys(refused).sort()).toEqual(["firstName", "subdomain"]);
	});

	it("rejects with a general message when no input can be blamed", async () => {
		respondWith(400, { status: 400, errorCode: "SOMETHING_NEW" });

		await expect(registerCompany(registration)).rejects.toThrow(
			/check your details/i
		);
	});

	it("rejects with a general message when the body is not JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("<html>", { status: 409 }))
		);

		await expect(registerCompany(registration)).rejects.toThrow(
			/already in use/i
		);
	});
});
