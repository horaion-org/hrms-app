import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	RosterSidePanelSlot,
	type RosterSidePanelSlotProps,
} from "@/features/scheduling/GeneratedRoster/RosterSidePanelSlot";
import {
	slotEditingFixture,
	slotRosterFixture,
} from "@/features/scheduling/GeneratedRoster/RosterSidePanelSlot/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const show = (
	props: Pick<RosterSidePanelSlotProps, "roster"> &
		Partial<RosterSidePanelSlotProps>
): RosterSidePanelSlotProps => {
	const all: RosterSidePanelSlotProps = {
		assignments: scheduleAssignmentsFixture(),
		timeZone: "Asia/Singapore",
		list: {
			id: "side-panel",
			resetKey: "changes|",
			sections: [
				{ key: "days", items: [{ key: "a-1", lines: ["Aisha Rahman"] }] },
			],
		},
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
				<RosterSidePanelSlot {...all} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return all;
};

describe("RosterSidePanelSlot", () => {
	it("given_nothingChosenAndNoList_when_rendered_then_showsNothing", () => {
		show({ roster: slotRosterFixture({}) });

		expect(screen.queryByRole("complementary")).toBeNull();
	});

	it("given_aShiftChosenOnAReadOnlyRoster_when_rendered_then_showsItsShift", () => {
		show({ roster: slotRosterFixture({ cell: "m-1|2026-10-13" }) });

		expect(screen.getByText("Front Desk AM")).toBeVisible();
		expect(screen.getByText("Aisha Rahman")).toBeVisible();
	});

	it("given_aDayChosenToEdit_when_rendered_then_opensTheDayEditor", () => {
		show({
			roster: slotRosterFixture({ cell: "m-1|2026-10-13" }, true),
			editing: slotEditingFixture(),
		});

		expect(screen.getByRole("radio", { name: "Not working" })).toBeVisible();
	});

	it("given_anOpenList_when_closed_then_callsOnClose", async () => {
		const user = userEvent.setup();
		const { onClose } = show({
			roster: {
				...slotRosterFixture({}),
				sidePanel: "list",
				openList: "changes",
			},
		});

		expect(screen.getByRole("heading", { name: "Changed" })).toBeVisible();
		expect(screen.getByText("Aisha Rahman")).toBeVisible();
		await user.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("given_findCoverOnARosterThatMayBeChanged_when_rendered_then_opensFindCoverAndClosesBackToIssues", async () => {
		const user = userEvent.setup();
		const onCloseCover = vi.fn();
		show({
			roster: slotRosterFixture(
				{ cover: "front-desk-am-copy|2026-10-17" },
				true
			),
			editing: slotEditingFixture(),
			onCloseCover,
		});

		expect(screen.getByRole("heading", { name: "Find cover" })).toBeVisible();
		await user.keyboard("{Escape}");
		expect(onCloseCover).toHaveBeenCalledOnce();
	});

	it("given_aShiftLeftShortOnTheChosenDay_when_findCoverIsPressed_then_opensItForThatShiftDay", async () => {
		const user = userEvent.setup();
		const onFindCover = vi.fn();
		const roster = scheduleAssignmentsFixture().map((row) =>
			row.member?.membershipId === "m-1" && row.day === "2026-10-13"
				? { ...row, uncoveredShift: row.shift }
				: row
		);
		show({
			assignments: roster,
			roster: {
				...slotRosterFixture({ cell: "m-1|2026-10-13" }, true),
				chosenRow: roster.find(
					(row) =>
						row.member?.membershipId === "m-1" && row.day === "2026-10-13"
				),
				chosenDayNotes: {
					membershipId: "m-1",
					note: { uncoveredShiftName: "Front Desk AM" },
				},
			},
			editing: slotEditingFixture(),
			onFindCover,
		});

		await user.click(screen.getByRole("button", { name: "Find cover" }));

		expect(onFindCover).toHaveBeenCalledWith({
			shiftId: "front-desk-am-copy",
			day: "2026-10-13",
		});
	});
});
