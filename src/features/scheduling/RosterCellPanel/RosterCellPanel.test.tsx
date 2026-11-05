import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	RosterCellPanel,
	type RosterCellPanelProps,
} from "@/features/scheduling/RosterCellPanel";
import { rosterChangePreviewFixture } from "@/features/scheduling/rosterChanges/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

const PREVIEW =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-changes/preview";
const roster = scheduleAssignmentsFixture();
const dayOf = (membershipId: string, day: string): ScheduleAssignment =>
	roster.find(
		(row) => row.member?.membershipId === membershipId && row.day === day
	)!;

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

const show = (
	props: Partial<RosterCellPanelProps> = {}
): RosterCellPanelProps => {
	const all: RosterCellPanelProps = {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 1,
		assignment: dayOf("m-1", "2026-10-12"),
		assignments: roster,
		shifts: frozenShiftsFixture(),
		onClose: vi.fn(),
		onPreviewDays: vi.fn(),
		onApplied: vi.fn(),
		...props,
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<RosterCellPanel {...all} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return all;
};

describe("RosterCellPanel", () => {
	it("given_aLeaveDay_when_opened_then_saysLeaveIsChangedInLeaveAndOffersNothing", () => {
		show({ assignment: dayOf("m-2", "2026-10-14") });

		expect(
			screen.getByText(
				"Leave can’t be changed on the roster. Change it in Leave."
			)
		).toBeVisible();
		expect(screen.queryByRole("radio")).toBeNull();
	});

	it("given_aWorkingDay_when_swapIsChosen_then_listsWhoCanSwapAndNamesWhoCant", async () => {
		show({ assignment: dayOf("m-1", "2026-10-14") });
		const user = userEvent.setup();

		await user.click(screen.getByRole("radio", { name: "Swap with someone" }));

		expect(screen.getByText("Not available: Ben Ong")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Swap with" }));
		expect(screen.getByRole("option", { name: /Chen Wei/ })).toBeVisible();
		expect(screen.queryByRole("option", { name: /Ben Ong/ })).toBeNull();
	});

	it("given_noReadableShifts_when_opened_then_offersADayOffAndASwapButNoOtherShift", () => {
		show({ shifts: [] });

		expect(
			screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))
		).toEqual(["dayOff", "swap"]);
	});

	it("given_aChoice_when_made_then_previewsItAndOutlinesTheDay", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: {
				status: 200,
				body: envelope(rosterChangePreviewFixture()),
			},
		});
		const props = show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("radio", { name: "Day off" }));

		const panel = screen.getByRole("complementary");
		expect(
			await within(panel).findByText(
				"Front Desk AM, Mon, Oct 12: 2 → 1 people."
			)
		).toBeVisible();
		expect(calls[0]?.body).toEqual({
			expectedRevision: 1,
			cells: [{ membershipId: "m-1", day: "2026-10-12", kind: "OFF" }],
		});
		expect(props.onPreviewDays).toHaveBeenLastCalledWith(["m-1|2026-10-12"]);
	});

	it("given_escapeInsideAnOpenList_when_pressed_then_closesOnlyTheList", async () => {
		const props = show();
		const user = userEvent.setup();
		await user.click(screen.getByRole("radio", { name: "Swap with someone" }));
		await user.click(screen.getByRole("button", { name: "Swap with" }));
		expect(screen.getByRole("listbox")).toBeVisible();

		await user.keyboard("{Escape}");

		expect(screen.queryByRole("listbox")).toBeNull();
		expect(props.onClose).not.toHaveBeenCalled();
	});

	it("given_escape_when_pressed_then_closes", async () => {
		const props = show();
		const user = userEvent.setup();

		await user.keyboard("{Escape}");

		expect(props.onClose).toHaveBeenCalled();
	});
});
