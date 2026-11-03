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

const show = ({
	members = MEMBER_WEEK_FIXTURES,
	canEdit = (): boolean => true,
	showDepartment = true,
}: {
	members?: Array<MemberWeek>;
	canEdit?: (member: MemberWeek) => boolean;
	showDepartment?: boolean;
} = {}): ReturnType<typeof vi.fn> => {
	const onEdit = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<TeamAvailability
				canEdit={canEdit}
				members={members}
				showDepartment={showDepartment}
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

/** A row's day cells, Monday to Sunday, without its action cell. */
const daysOf = (name: string): Array<HTMLElement> =>
	within(rowOf(name)).getAllByRole("cell").slice(0, 7);

describe("TeamAvailability", () => {
	it("given_aBranchWeek_when_shown_then_listsEachMemberByNameWithTheirDepartmentAndDays", () => {
		show();

		const table = screen.getByRole("table", { name: "Team availability" });
		const [first, second, third] = within(table).getAllByRole("rowheader");
		expect(first).toHaveTextContent("Aisha Rahman");
		expect(second).toHaveTextContent("Cheryl Ng");
		expect(third).toHaveTextContent("Faris Ahmad");
		expect(within(rowOf("Aisha Rahman")).getByText("Sales")).toBeVisible();
		const days = daysOf("Aisha Rahman");
		expect(days[0]).toHaveTextContent("09:00–13:00");
		expect(days[1]).toHaveTextContent("Not available");
		expect(days[2]).toHaveTextContent("18:00–22:00");
		expect(within(rowOf("Faris Ahmad")).getByText("Kitchen")).toBeVisible();
	});

	it("given_oneDepartmentChosen_when_shown_then_leavesTheDepartmentOut", () => {
		show({ showDepartment: false });

		expect(
			within(rowOf("Aisha Rahman")).queryByText("Sales")
		).not.toBeInTheDocument();
	});

	it("given_aWeekWithItsOwnHours_when_shown_then_marksOnlyThatRowCustom", () => {
		show();

		expect(within(rowOf("Cheryl Ng")).getByText("Custom")).toBeVisible();
		expect(
			within(rowOf("Aisha Rahman")).queryByText("Custom")
		).not.toBeInTheDocument();
		// A window past midnight is listed on the day it starts.
		expect(daysOf("Cheryl Ng")[5]).toHaveTextContent("22:00–06:00");
	});

	it("given_editingAllowedOnlyInOneDepartment_when_shown_then_offersEditOnlyOnItsRows", () => {
		show({ canEdit: (member) => member.departmentId === "d-2" });

		expect(
			within(rowOf("Faris Ahmad")).getByRole("button", {
				name: "Edit Faris Ahmad’s availability",
			})
		).toBeVisible();
		expect(
			within(rowOf("Aisha Rahman")).queryByRole("button")
		).not.toBeInTheDocument();
	});

	it("given_aRowEdited_when_chosen_then_reportsTheMember", async () => {
		const user = userEvent.setup();
		const onEdit = show();

		await user.click(
			screen.getByRole("button", { name: "Edit Cheryl Ng’s availability" })
		);

		expect(onEdit).toHaveBeenCalledWith(MEMBER_WEEK_FIXTURES[1]);
	});

	it("given_noPartTimers_when_shown_then_saysSo", () => {
		show({ members: [] });

		expect(screen.getByText("No part-time members here.")).toBeVisible();
	});
});
