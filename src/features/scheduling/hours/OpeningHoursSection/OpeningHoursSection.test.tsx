import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import { OpeningHoursSection } from "@/features/scheduling/hours/OpeningHoursSection";
import { firstWeek } from "@/features/scheduling/startingContext/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";

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

/** The section with the dialog's open state held as a page would. */
const Harness = ({ canEdit }: { canEdit: boolean }): FunctionComponent => {
	const [open, setOpen] = useState(false);
	return (
		<OpeningHoursSection
			canEdit={canEdit}
			companyId="c-1"
			generated={false}
			open={open}
			scheduleId="s-1"
			unit={UNIT}
			onOpenChange={setOpen}
		/>
	);
};

const show = (canEdit = true): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<Harness canEdit={canEdit} />
			</QueryClientProvider>
		</I18nextProvider>
	);
};

const startingDays = {
	[`GET ${SCHEDULE}/starting-days`]: {
		status: 200,
		body: envelope(firstWeek()),
	},
};

const entered = midMonthOpenings([
	editableMember("p-tan", {
		workedMinutes: 4320,
		overtimeMinutes: 1680,
		enteredAsOf: "2026-11-09",
	}),
]);

describe("OpeningHoursSection", () => {
	it("given_unknownHours_when_added_then_onlyTheChangedPersonIsPutAndTheLineSaysAllKnown", async () => {
		const calls = stubApi({
			...startingDays,
			[`GET ${SCHEDULE}/opening-balances`]: {
				status: 200,
				body: envelope(midMonthOpenings([editableMember("p-tan")])),
			},
			[`PUT ${SCHEDULE}/opening-balances`]: {
				status: 200,
				body: envelope(entered),
			},
		});
		show();

		expect(
			await screen.findByText(
				"Hours worked before Nov 9 are unknown for 1 person."
			)
		).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: "Add them" }));
		await userEvent.type(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, paid hours/ }),
			"72"
		);
		await userEvent.type(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, overtime/ }),
			"28"
		);
		await userEvent.click(screen.getByRole("button", { name: "Save hours" }));

		expect(
			await screen.findByText(
				"Hours worked before Nov 9 are known for everyone."
			)
		).toBeVisible();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			openings: [
				{
					memberProfileId: "p-tan",
					workedMinutes: 4320,
					overtimeMinutes: 1680,
				},
			],
		});
	});

	it("given_aRefusedSave_when_saved_then_theReasonShowsAndTheTypedHoursStay", async () => {
		stubApi({
			...startingDays,
			[`GET ${SCHEDULE}/opening-balances`]: {
				status: 200,
				body: envelope(midMonthOpenings([editableMember("p-tan")])),
			},
			[`PUT ${SCHEDULE}/opening-balances`]: problemReply(
				409,
				"OPENING_BALANCES_PUBLISHED"
			),
		});
		show();

		await userEvent.click(
			await screen.findByRole("button", { name: "Add them" })
		);
		await userEvent.type(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, paid hours/ }),
			"72"
		);
		await userEvent.click(screen.getByRole("button", { name: "Save hours" }));

		expect(
			await screen.findByText(
				"This roster is published, so the hours before it can no longer change here."
			)
		).toBeVisible();
		expect(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, paid hours/ })
		).toHaveValue(72);
	});

	it("given_aFailedRead_when_retried_then_theHoursShow", async () => {
		let reads = 0;
		stubApi({
			...startingDays,
			[`GET ${SCHEDULE}/opening-balances`]: () => {
				reads += 1;
				// A refusal, which isn't retried on its own, so the person's retry is the second read.
				return reads === 1
					? problemReply(403, "ACCESS_DENIED")
					: {
							status: 200,
							body: envelope(midMonthOpenings([editableMember("p-tan")])),
						};
			},
		});
		show();

		await userEvent.click(
			await screen.findByRole("button", { name: "Try again" })
		);

		expect(
			await screen.findByText(
				"Hours worked before Nov 9 are unknown for 1 person."
			)
		).toBeVisible();
	});

	it("given_noRightToChangeThem_when_shown_then_theLineHasNoButton", async () => {
		stubApi({
			...startingDays,
			[`GET ${SCHEDULE}/opening-balances`]: {
				status: 200,
				body: envelope(midMonthOpenings([editableMember("p-tan")])),
			},
		});
		show(false);

		expect(
			await screen.findByText(
				"Hours worked before Nov 9 are unknown for 1 person."
			)
		).toBeVisible();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
