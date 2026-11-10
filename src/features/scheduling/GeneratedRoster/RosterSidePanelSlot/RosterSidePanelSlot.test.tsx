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

		expect(screen.getByRole("radio", { name: "Day off" })).toBeVisible();
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
});
