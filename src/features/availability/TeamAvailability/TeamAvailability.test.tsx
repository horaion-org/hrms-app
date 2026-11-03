import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberWeek } from "@/features/availability/api";
import {
	FIXTURE_WEEK,
	MEMBER_WEEK_FIXTURES,
} from "@/features/availability/fixtures";
import { TeamAvailability } from "@/features/availability/TeamAvailability";

const show = (
	members: Array<MemberWeek> = MEMBER_WEEK_FIXTURES,
	canEdit: (member: MemberWeek) => boolean = () => true
): ReturnType<typeof vi.fn> => {
	const onEdit = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<TeamAvailability
				canEdit={canEdit}
				members={members}
				weekStartMonday={FIXTURE_WEEK}
				onEdit={onEdit}
			/>
		</I18nextProvider>
	);
	return onEdit;
};

const rowOf = (name: string): HTMLElement => {
	const row = screen.getByText(name).closest("tr");
	if (!row) throw new Error(`No row for ${name}`);
	return row;
};

describe("TeamAvailability", () => {
	it("given_aBranchWeek_when_shown_then_listsEachMemberWithTheirDepartmentAndDays", () => {
		show();

		const table = screen.getByRole("table", { name: "Team availability" });
		expect(within(table).getAllByRole("row")).toHaveLength(4);
		const aisha = rowOf("Aisha Rahman");
		expect(within(aisha).getByText("Sales")).toBeVisible();
		const cells = within(aisha).getAllByRole("cell");
		// Name, Department, then Monday to Sunday.
		expect(cells[2]).toHaveTextContent("09:00–13:00");
		expect(cells[3]).toHaveTextContent("Not available");
		expect(cells[4]).toHaveTextContent("18:00–22:00");
		expect(within(rowOf("Faris Ahmad")).getByText("Kitchen")).toBeVisible();
	});

	it("given_aWeekWithItsOwnHours_when_shown_then_marksOnlyThatRowCustom", () => {
		show();

		expect(within(rowOf("Cheryl Ng")).getByText("Custom")).toBeVisible();
		expect(
			within(rowOf("Aisha Rahman")).queryByText("Custom")
		).not.toBeInTheDocument();
		// A window past midnight is listed on the day it starts.
		expect(
			within(rowOf("Cheryl Ng")).getAllByRole("cell")[7]
		).toHaveTextContent("22:00–06:00");
	});

	it("given_editingAllowedOnlyInOneDepartment_when_shown_then_offersEditOnlyOnItsRows", () => {
		show(MEMBER_WEEK_FIXTURES, (member) => member.departmentId === "d-2");

		expect(
			within(rowOf("Faris Ahmad")).getByRole("button", {
				name: "Edit Faris Ahmad’s availability this week",
			})
		).toBeVisible();
		expect(
			within(rowOf("Aisha Rahman")).queryByRole("button")
		).not.toBeInTheDocument();
	});

	it("given_aRowEdited_when_chosen_then_reportsTheMemberAndWhatIsEdited", async () => {
		const user = userEvent.setup();
		const onEdit = show();

		await user.click(
			screen.getByRole("button", {
				name: "Edit Cheryl Ng’s availability this week",
			})
		);
		await user.click(
			screen.getByRole("button", {
				name: "Edit Aisha Rahman’s default pattern",
			})
		);

		expect(onEdit.mock.calls).toEqual([
			[
				MEMBER_WEEK_FIXTURES[1],
				{ kind: "week", weekStartMonday: FIXTURE_WEEK },
			],
			[MEMBER_WEEK_FIXTURES[0], { kind: "pattern" }],
		]);
	});

	it("given_noPartTimers_when_shown_then_saysSo", () => {
		show([]);

		expect(screen.getByText("No part-time members here.")).toBeVisible();
	});
});
