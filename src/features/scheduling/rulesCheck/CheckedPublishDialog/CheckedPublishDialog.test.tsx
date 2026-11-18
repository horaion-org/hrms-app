import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import {
	CheckedPublishDialog,
	type PublishDialogPlace,
} from "@/features/scheduling/rulesCheck/CheckedPublishDialog";
import {
	ruleFixture,
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import { PUBLISH_CHECK_WAIT_MS } from "@/features/scheduling/rulesCheck/publishCheck";
import type { RosterRulesCheck } from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import {
	generatedScheduleFixture,
	SCHEDULING_BRANCHES,
} from "@/features/scheduling/schedules/fixtures";

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";

/** The schedule's frozen constraints, the first one a locked company rule. */
const [LOCKED, UNLOCKED] = frozenConstraintsFixture().map(
	(constraint, index) => ({ ...constraint, locked: index === 0 })
);

/** A broken rule tied to `constraint`, for two people, the first on two days. */
const ruleOf = (
	constraint: NonNullable<typeof LOCKED>
): ReturnType<typeof ruleFixture> =>
	ruleFixture({
		constraintId: constraint.constraintId,
		constraintName: constraint.name,
		violations: [
			{ employeeId: "m-1", date: "2026-10-12", messages: [] },
			{ employeeId: "m-1", date: "2026-10-13", messages: [] },
			{ employeeId: "m-2", date: "2026-10-13", messages: [] },
		],
	});

/** A 200 carrying `data` in the API's envelope. */
const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

beforeEach(() => {
	// The router scrolls to the top on load, which jsdom does not implement.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});

afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

/**
 * Opens the dialog on generated schedule s-1 with the roster check answering
 * `check` (it never answers when left out), shown on `shownOn` when given.
 */
const openDialog = (check?: StubReply, shownOn?: PublishDialogPlace): void => {
	stubApi({
		...(check ? { [`POST ${SCHEDULE}/roster-check`]: check } : {}),
		[`GET ${SCHEDULE}/constraints`]: ok([LOCKED, UNLOCKED]),
	});
	if (!check) {
		const answered = globalThis.fetch;
		vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
			url.includes("/roster-check")
				? new Promise<Response>(() => {})
				: answered(url, init)
		);
	}
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const Opened = (): ReactElement => (
		<CheckedPublishDialog
			companyId="c-1"
			schedule={generatedScheduleFixture({ status: "GENERATED" })}
			shownOn={shownOn}
			onClose={() => {}}
		/>
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(
					client,
					"c-1",
					SCHEDULING_BRANCHES
				)(Opened, {
					parameters: { permissions: ["schedule:read", "constraint:read"] },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};

/** The roster check's answer as the API sends it. */
const answer = (check: Partial<RosterRulesCheck>): StubReply =>
	ok(rulesCheckFixture(check));

/** The dialog's confirm button. */
const publishButton = (): HTMLElement =>
	screen.getByRole("button", { name: "Publish roster" });

describe("CheckedPublishDialog", () => {
	it("holds Publish back while the rules are checked", async () => {
		openDialog();

		expect(
			await screen.findByText("Checking the rules before publishing…")
		).toBeVisible();
		expect(publishButton()).toBeDisabled();
	});

	/** A locked company rule is likely regulation: it blocks, names the rule and says what to do next. */
	it("holds Publish back, with the reason, when a locked rule is broken", async () => {
		openDialog(
			answer({
				status: "BROKEN",
				brokenRules: [ruleOf(LOCKED!), ruleOf(UNLOCKED!)],
			})
		);

		expect(
			await screen.findByText(
				"A locked company rule is broken, so these days can't be published yet:"
			)
		).toBeVisible();
		expect(screen.getByText(`${LOCKED!.name} · 2 people`)).toBeVisible();
		expect(
			screen.getByText(
				'Change the roster from "Review and edit these days", then publish.'
			)
		).toBeVisible();
		expect(
			screen.getByText("1 rule is broken. You can still publish:")
		).toBeVisible();
		expect(publishButton()).toBeDisabled();
	});

	/** On the schedule's own page the manager is already where the roster is changed, so no page is named. */
	it("says only to change the roster when shown on the schedule page", async () => {
		openDialog(
			answer({ status: "BROKEN", brokenRules: [ruleOf(LOCKED!)] }),
			"schedulePage"
		);

		expect(
			await screen.findByText("Change the roster, then publish.")
		).toBeVisible();
		expect(
			screen.queryByText(/Review and edit these days/)
		).not.toBeInTheDocument();
		expect(publishButton()).toBeDisabled();
	});

	it("warns and lets Publish go ahead when only an unlocked rule is broken", async () => {
		openDialog(answer({ status: "BROKEN", brokenRules: [ruleOf(UNLOCKED!)] }));

		expect(
			await screen.findByText("1 rule is broken. You can still publish:")
		).toBeVisible();
		expect(screen.getByText(`${UNLOCKED!.name} · 2 people`)).toBeVisible();
		expect(screen.queryByText(/locked company rule/)).not.toBeInTheDocument();
		expect(publishButton()).toBeEnabled();
	});

	/** Never blocks on an unknown: a refused check says so and publishing stays open. */
	it("lets Publish go ahead, saying the rules are unchecked, when the check is refused", async () => {
		openDialog(problemReply(403, "FORBIDDEN"));

		expect(
			await screen.findByText(
				"The rules couldn't be checked just now. You can still publish."
			)
		).toBeVisible();
		expect(publishButton()).toBeEnabled();
	});

	it("lets Publish go ahead unchecked once the check has taken 20 seconds", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		openDialog();
		await screen.findByText("Checking the rules before publishing…");

		act(() => {
			vi.advanceTimersByTime(PUBLISH_CHECK_WAIT_MS);
		});

		expect(
			await screen.findByText(
				"The rules couldn't be checked just now. You can still publish."
			)
		).toBeVisible();
		expect(publishButton()).toBeEnabled();
	});

	/** With every rule holding the dialog says nothing of the check, and counts the shifts short from its answer. */
	it("says nothing of rules that hold, and warns of the shifts the check found short", async () => {
		openDialog(answer({ staffingGaps: [staffingGapFixture()] }));

		expect(
			await screen.findByText(/^1 shift is still short of people/)
		).toBeVisible();
		expect(screen.queryByText(/rule/)).not.toBeInTheDocument();
		expect(publishButton()).toBeEnabled();
	});
});
