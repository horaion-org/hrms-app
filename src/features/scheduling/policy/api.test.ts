import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { fetchConstraints } from "@/features/scheduling/constraints/api";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
	DEPARTMENTS_POLICY_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import {
	createPolicyConstraint,
	deletePolicyConstraint,
	fetchPolicyConstraints,
	fetchPolicyOptions,
	updatePolicyConstraint,
	type PolicyConstraintBody,
} from "@/features/scheduling/policy/api";

const POLICY = "/api/v1/companies/c-1/scheduling-policy";
const REST = COMPANY_CONSTRAINT_FIXTURES[0]!;

const BODY: PolicyConstraintBody = {
	name: "Company rest",
	type: "REST_BETWEEN_SHIFTS",
	requirement: null,
	status: "ACTIVE",
	lock: "LOCKED",
	values: [{ field: "REST_HOURS", value: "11" }],
	appliesToBranchIds: [],
	appliesToDepartmentIds: ["d-1", "d-2"],
};

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

describe("Work policy client", () => {
	it("lists the company's constraints with their locks and no department", async () => {
		stubApi({
			[`GET ${POLICY}/constraints`]: {
				status: 200,
				body: envelope(COMPANY_CONSTRAINT_FIXTURES),
			},
		});

		const constraints = await fetchPolicyConstraints("c-1");

		expect(constraints).toEqual(COMPANY_CONSTRAINT_FIXTURES);
		expect(constraints[0]).toMatchObject({
			departmentId: null,
			level: "COMPANY",
			lock: "LOCKED",
			locked: true,
		});
	});

	it("adds, replaces and removes a company constraint with its lock", async () => {
		const calls = stubApi({
			[`POST ${POLICY}/constraints`]: { status: 201, body: envelope(REST) },
			[`PUT ${POLICY}/constraints/company-rest`]: {
				status: 200,
				body: envelope(REST),
			},
			[`DELETE ${POLICY}/constraints/company-rest`]: { status: 204 },
		});

		await expect(createPolicyConstraint("c-1", BODY)).resolves.toEqual(REST);
		await expect(
			updatePolicyConstraint("c-1", "company-rest", BODY)
		).resolves.toEqual(REST);
		await expect(
			deletePolicyConstraint("c-1", "company-rest")
		).resolves.toBeUndefined();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`POST ${POLICY}/constraints`,
			`PUT ${POLICY}/constraints/company-rest`,
			`DELETE ${POLICY}/constraints/company-rest`,
		]);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it("reads the policy's own options", async () => {
		stubApi({
			[`GET ${POLICY}/constraint-options`]: {
				status: 200,
				body: envelope(CONSTRAINT_OPTIONS_RESPONSE),
			},
		});

		const options = await fetchPolicyOptions("c-1");

		expect(options.types.map((type) => type.type)).toContain(
			"REST_BETWEEN_SHIFTS"
		);
	});

	it("reads where a work-policy constraint applies, and an answer without reach as the whole company", async () => {
		const { appliesToBranches, appliesToDepartments, ...withoutReach } = REST;
		stubApi({
			[`GET ${POLICY}/constraints`]: {
				status: 200,
				body: envelope([DEPARTMENTS_POLICY_FIXTURE, withoutReach]),
			},
		});

		const [chosen, older] = await fetchPolicyConstraints("c-1");

		expect(
			chosen?.appliesToDepartments.map((unit) => unit.departmentName)
		).toEqual(["Bar", "Kitchen"]);
		expect(older).toMatchObject({ appliesToBranches, appliesToDepartments });
		expect(older?.appliesToBranches).toEqual([]);
	});

	it("reads a lock or level a newer API adds as unknown instead of failing", async () => {
		stubApi({
			[`GET /api/v1/companies/c-1/branches/b-1/departments/d-1/constraints`]: {
				status: 200,
				body: envelope([{ ...REST, level: "BRANCH", lock: "SOFT" }]),
			},
		});

		const [constraint] = await fetchConstraints("c-1", {
			branchId: "b-1",
			departmentId: "d-1",
		});

		expect(constraint?.level).toBe("UNKNOWN");
		expect(constraint?.lock).toBeNull();
	});
});
