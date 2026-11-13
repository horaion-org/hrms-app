import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	createLeaveDuration,
	deleteLeaveDuration,
	fetchLeaveDurationCatalogue,
	type LeaveDurationBody,
	reorderLeaveDurations,
	updateLeaveDuration,
} from "@/features/leaveDurations/api";
import {
	KITCHEN_REACH,
	managedLeaveDurationFixture,
} from "@/features/leaveDurations/fixtures";

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

describe("leave duration catalogue client", () => {
	it("reads the durations with their times, length, reach and edit right", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/leave-durations": {
				status: 200,
				body: envelope([
					managedLeaveDurationFixture({
						appliesToDepartments: [KITCHEN_REACH],
						canEdit: false,
					}),
				]),
			},
		});
		const durations = await fetchLeaveDurationCatalogue("c-1");
		expect(durations[0]).toMatchObject({
			name: "Morning",
			startTime: "09:00",
			endTime: "13:00",
			minutes: 240,
			appliesToDepartments: [KITCHEN_REACH],
			canEdit: false,
		});
	});

	it("reads a status newer than the app as unknown, and a missing edit right as no", async () => {
		const newer: Record<string, unknown> = {
			...managedLeaveDurationFixture(),
			status: "ARCHIVED",
		};
		delete newer["canEdit"];
		stubApi({
			"GET /api/v1/companies/c-1/leave-durations": {
				status: 200,
				body: envelope([newer]),
			},
		});
		const durations = await fetchLeaveDurationCatalogue("c-1");
		expect(durations[0]).toMatchObject({ status: "UNKNOWN", canEdit: false });
	});

	it("adds, replaces, reorders and deletes with the bodies the API takes", async () => {
		const calls = stubApi({
			"POST /api/v1/companies/c-1/leave-durations": {
				status: 201,
				body: envelope(managedLeaveDurationFixture()),
			},
			"PUT /api/v1/companies/c-1/leave-durations/ld-morning": {
				status: 200,
				body: envelope(managedLeaveDurationFixture({ status: "INACTIVE" })),
			},
			"PUT /api/v1/companies/c-1/leave-durations/order": {
				status: 200,
				body: envelope([managedLeaveDurationFixture()]),
			},
			"DELETE /api/v1/companies/c-1/leave-durations/ld-morning": {
				status: 204,
			},
		});
		const body: LeaveDurationBody = {
			name: "Morning",
			startTime: "09:00",
			endTime: "13:00",
			appliesToBranchIds: [],
			appliesToDepartmentIds: ["d-kitchen"],
		};
		await createLeaveDuration("c-1", body);
		await updateLeaveDuration("c-1", "ld-morning", {
			...body,
			status: "INACTIVE",
		});
		await reorderLeaveDurations("c-1", { leaveDurationIds: ["ld-morning"] });
		await deleteLeaveDuration("c-1", "ld-morning");
		expect(calls.map((call) => [call.method, call.body])).toEqual([
			["POST", body],
			["PUT", { ...body, status: "INACTIVE" }],
			["PUT", { leaveDurationIds: ["ld-morning"] }],
			["DELETE", undefined],
		]);
	});
});
