import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	assignSkill,
	createSkill,
	deleteSkill,
	fetchAssignablePeople,
	fetchSkillCategories,
	fetchSkillHolders,
	fetchSkillOverview,
	searchActiveSkills,
	updateSkill,
} from "@/features/skills/api";
import { licenceFixture, skillFixture } from "@/features/skills/fixtures";

const page = (content: Array<unknown>, total = content.length): unknown =>
	envelope({
		content,
		page: { size: 100, number: 0, totalElements: total, totalPages: 1 },
	});

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

describe("skill catalogue client", () => {
	it("reads the overview for a day, a status and a category", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/skill-overview": {
				status: 200,
				body: page([
					{ ...licenceFixture(), holders: 30, expiringSoon: 3, expired: 1 },
				]),
			},
		});
		const result = await fetchSkillOverview("c-1", {
			status: "ACTIVE",
			category: "Licence",
			asOf: "2026-11-05",
		});
		expect(result.total).toBe(1);
		expect(result.items[0]).toMatchObject({ holders: 30, expiringSoon: 3 });
		const query = new URLSearchParams(calls[0]?.search);
		expect(query.get("asOf")).toBe("2026-11-05");
		expect(query.get("status")).toBe("ACTIVE");
		expect(query.get("category")).toBe("Licence");
		expect(query.get("size")).toBe("100");
	});

	it("reads a scale or status newer than the app as unknown", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/skill-overview": {
				status: 200,
				body: page([
					{
						...skillFixture(),
						proficiencyScale: "STARS",
						status: "ARCHIVED",
						holders: 0,
						expiringSoon: 0,
						expired: 0,
					},
				]),
			},
		});
		const result = await fetchSkillOverview("c-1", { asOf: "2026-11-05" });
		expect(result.items[0]?.proficiencyScale).toBe("UNKNOWN");
		expect(result.items[0]?.status).toBe("UNKNOWN");
	});

	it("reads the categories in use", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/skill-categories": {
				status: 200,
				body: envelope(["Equipment", "Licence"]),
			},
		});
		await expect(fetchSkillCategories("c-1")).resolves.toEqual([
			"Equipment",
			"Licence",
		]);
	});

	it("searches active skills only", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/skills": {
				status: 200,
				body: page([skillFixture()]),
			},
		});
		await searchActiveSkills("c-1", "  fork ");
		const query = new URLSearchParams(calls[0]?.search);
		expect(query.get("status")).toBe("ACTIVE");
		expect(query.get("search")).toBe("fork");
	});

	it("creates, updates and deletes a skill", async () => {
		const body = {
			name: "Forklift",
			category: "Equipment",
			description: null,
			proficiencyScale: "ONE_TO_TEN" as const,
			tracksExpiry: false,
			validityMonths: null,
		};
		const calls = stubApi({
			"POST /api/v1/companies/c-1/skills": {
				status: 201,
				body: envelope(skillFixture()),
			},
			"PUT /api/v1/companies/c-1/skills/skill-forklift": {
				status: 200,
				body: envelope(skillFixture({ status: "INACTIVE" })),
			},
			"DELETE /api/v1/companies/c-1/skills/skill-forklift": { status: 204 },
		});
		await createSkill("c-1", body);
		await expect(
			updateSkill("c-1", "skill-forklift", { ...body, status: "INACTIVE" })
		).resolves.toMatchObject({ status: "INACTIVE" });
		await deleteSkill("c-1", "skill-forklift");
		expect(calls.map((call) => call.method)).toEqual(["POST", "PUT", "DELETE"]);
		expect(calls[1]?.body).toEqual({ ...body, status: "INACTIVE" });
	});
});

describe("bulk assignment client", () => {
	it("reads a skill's holders and the people it may go to", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/skills/skill-forklift/holders": {
				status: 200,
				body: page([
					{
						membershipId: "m-1",
						proficiency: 7,
						issuedOn: null,
						expiresOn: null,
					},
				]),
			},
			"GET /api/v1/companies/c-1/member-profiles": {
				status: 200,
				body: page([
					{
						membershipId: "m-1",
						displayName: "Jane Tan",
						departmentName: "Warehouse",
						email: "never-shown@example.com",
					},
				]),
			},
		});
		await expect(
			fetchSkillHolders("c-1", "skill-forklift", {
				departmentId: "d-1",
				page: 1,
			})
		).resolves.toMatchObject({
			items: [{ membershipId: "m-1", proficiency: 7 }],
		});
		const people = await fetchAssignablePeople("c-1", {
			search: "jane",
			departmentId: "d-1",
			page: 0,
		});
		// Only what the picker shows is kept.
		expect(people.items[0]).toEqual({
			membershipId: "m-1",
			displayName: "Jane Tan",
			departmentName: "Warehouse",
		});
		expect(new URLSearchParams(calls[0]?.search).get("page")).toBe("1");
		const peopleQuery = new URLSearchParams(calls[1]?.search);
		expect(peopleQuery.get("status")).toBe("ACTIVE");
		expect(peopleQuery.get("departmentId")).toBe("d-1");
		expect(peopleQuery.get("search")).toBe("jane");
	});

	it("posts the assignment and reads what it did", async () => {
		const calls = stubApi({
			"POST /api/v1/companies/c-1/skills/skill-forklift/assignments": {
				status: 200,
				body: envelope({ assigned: 2, updated: 0, skipped: 1, full: 0 }),
			},
		});
		const body = {
			membershipIds: ["m-1", "m-2", "m-3"],
			proficiency: 6,
			notes: null,
			issuedOn: null,
			expiresOn: null,
			overwrite: false,
		};
		await expect(assignSkill("c-1", "skill-forklift", body)).resolves.toEqual({
			assigned: 2,
			updated: 0,
			skipped: 1,
			full: 0,
		});
		expect(calls[0]?.body).toEqual(body);
	});
});
