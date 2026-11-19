import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import {
	ruleFixture,
	rulesCheckFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import { confirmOnceChecked } from "@/features/scheduling/rulesCheck/testing";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

/*
 * Publishing from the roster page runs the rules check first: a broken
 * locked company rule holds the confirm back and says why; a check that is
 * refused only warns. (Every rule holding is the page's own publish test.)
 */

beforeAll(async () => {
	await import("@/pages/ScheduleDetail");
});
let app: OpenedApp | undefined;
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const APPROVAL = `${SCHEDULE}/approval`;

/** A 200 carrying `data` in the API's envelope. */
const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

/** The schedule's frozen constraints, the first one a locked company rule. */
const [FIRST, ...OTHERS] = frozenConstraintsFixture();
const LOCKED = { ...FIRST!, locked: true };

/** Opens generated schedule s-1 for a publisher, the rules check answering `check`, and opens its publish dialog. */
const openPublishDialog = async (
	check: StubReply
): Promise<{
	calls: ReturnType<typeof stubApi>;
	dialog: HTMLElement;
	user: ReturnType<typeof userEvent.setup>;
}> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": ok(
			schedulingWorkspace([
				"schedule:read",
				"schedule:publish",
				"constraint:read",
			])
		),
		"GET /api/v1/companies/c-1/schedules/s-1": ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${SCHEDULE}/assignments`]: ok(scheduleAssignmentsFixture()),
		[`GET ${SCHEDULE}/constraints`]: ok([LOCKED, ...OTHERS]),
		[`POST ${SCHEDULE}/roster-check`]: check,
		[`POST ${APPROVAL}`]: ok(generatedScheduleFixture({ status: "PUBLISHED" })),
	});
	app = await openApp("/scheduling/s-1");
	renderAuthApp(app);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Publish roster" })
	);
	const dialog = screen.getByRole("dialog", { name: "Publish these days?" });
	return { calls, dialog, user };
};

/** Whether the roster was put forward: the publish route was asked. */
const published = (calls: ReturnType<typeof stubApi>): boolean =>
	calls.some((call) => call.method === "POST" && call.path === APPROVAL);

describe("publishing from the roster page", () => {
	/** A locked company rule is likely regulation: publishing waits until the roster is changed. */
	it("holds the confirm back, with the reason, while a locked company rule is broken", async () => {
		const { calls, dialog } = await openPublishDialog(
			ok(
				rulesCheckFixture({
					status: "BROKEN",
					brokenRules: [
						ruleFixture({
							constraintId: LOCKED.constraintId,
							constraintName: LOCKED.name,
							violations: [
								{ employeeId: "m-1", date: "2026-10-12", messages: [] },
							],
						}),
					],
				})
			)
		);

		expect(
			await within(dialog).findByText(
				"A locked company rule is broken, so these days can't be published yet:"
			)
		).toBeVisible();
		expect(within(dialog).getByText(`${LOCKED.name} · 1 person`)).toBeVisible();
		expect(
			within(dialog).getByText("Change the roster, then publish.")
		).toBeVisible();
		expect(
			within(dialog).getByRole("button", { name: "Publish roster" })
		).toBeDisabled();
		expect(published(calls)).toBe(false);
	});

	/** Never blocks on an unknown: the manager is told the rules are unchecked and may still publish. */
	it("warns and still publishes when the rules check is refused", async () => {
		const { calls, dialog, user } = await openPublishDialog(
			problemReply(403, "FORBIDDEN")
		);

		expect(
			await within(dialog).findByText(
				"The rules couldn't be checked just now. You can still publish."
			)
		).toBeVisible();
		await confirmOnceChecked(user, dialog, "Publish roster");

		await vi.waitFor(() => {
			expect(published(calls)).toBe(true);
		});
	});
});
