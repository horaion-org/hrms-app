import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	createLeaveType,
	fetchLeaveTypeCatalogue,
	type LeaveTypeBody,
	reorderLeaveTypes,
	updateLeaveType,
} from "@/features/leaveTypes/api";
import { managedLeaveTypeFixture } from "@/features/leaveTypes/fixtures";

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

describe("leave type catalogue client", () => {
	it("reads the catalogue with its request counts", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/leave-types": {
				status: 200,
				body: envelope([managedLeaveTypeFixture({ requestCount: 12 })]),
			},
		});
		const types = await fetchLeaveTypeCatalogue("c-1");
		expect(types[0]).toMatchObject({ code: "ANNUAL", requestCount: 12 });
	});

	it("reads a kind or status newer than the app as unknown", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/leave-types": {
				status: 200,
				body: envelope([
					{
						...managedLeaveTypeFixture(),
						grantKind: "EARNED",
						status: "ARCHIVED",
					},
				]),
			},
		});
		const types = await fetchLeaveTypeCatalogue("c-1");
		expect(types[0]).toMatchObject({ grantKind: "UNKNOWN", status: "UNKNOWN" });
	});

	it("reads where a type applies and whether it takes part days", async () => {
		const kitchen = {
			departmentId: "d-kitchen",
			departmentName: "Kitchen",
			branchId: "b-orchard",
			branchName: "Orchard",
		};
		stubApi({
			"GET /api/v1/companies/c-1/leave-types": {
				status: 200,
				body: envelope([
					managedLeaveTypeFixture({
						allowsPartDays: false,
						appliesToDepartments: [kitchen],
					}),
				]),
			},
		});
		const types = await fetchLeaveTypeCatalogue("c-1");
		expect(types[0]).toMatchObject({
			allowsPartDays: false,
			appliesToBranches: [],
			appliesToDepartments: [kitchen],
		});
	});

	it("reads an older answer without reach as the whole company, allowing part days", async () => {
		const older: Record<string, unknown> = { ...managedLeaveTypeFixture() };
		delete older["allowsPartDays"];
		delete older["appliesToBranches"];
		delete older["appliesToDepartments"];
		stubApi({
			"GET /api/v1/companies/c-1/leave-types": {
				status: 200,
				body: envelope([older]),
			},
		});
		const types = await fetchLeaveTypeCatalogue("c-1");
		expect(types[0]).toMatchObject({
			allowsPartDays: true,
			appliesToBranches: [],
			appliesToDepartments: [],
		});
	});

	it("adds, replaces and reorders with the bodies the API takes", async () => {
		const calls = stubApi({
			"POST /api/v1/companies/c-1/leave-types": {
				status: 201,
				body: envelope(managedLeaveTypeFixture()),
			},
			"PUT /api/v1/companies/c-1/leave-types/lt-annual": {
				status: 200,
				body: envelope(managedLeaveTypeFixture({ status: "INACTIVE" })),
			},
			"PUT /api/v1/companies/c-1/leave-types/order": {
				status: 200,
				body: envelope([managedLeaveTypeFixture()]),
			},
		});
		const body: LeaveTypeBody = {
			name: "Annual leave",
			grantKind: "ALLOWANCE",
			paid: true,
			requiresReason: false,
			allowsPartDays: true,
			appliesToBranchIds: [],
			appliesToDepartmentIds: ["d-kitchen"],
		};
		await createLeaveType("c-1", body);
		await updateLeaveType("c-1", "lt-annual", { ...body, status: "INACTIVE" });
		await reorderLeaveTypes("c-1", {
			grantKind: "ALLOWANCE",
			leaveTypeIds: ["lt-annual"],
		});
		expect(calls.map((call) => call.body)).toEqual([
			body,
			{ ...body, status: "INACTIVE" },
			{ grantKind: "ALLOWANCE", leaveTypeIds: ["lt-annual"] },
		]);
	});
});
