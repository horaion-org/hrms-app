import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { MyRosterChanges } from "@/features/scheduling/MyRosterChanges";
import { editedAssignmentFixture } from "@/features/scheduling/rosterChanges/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const REMARK = "Covering the airport desk on Monday.";

const show = (assignments: Array<ScheduleAssignment>): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MyRosterChanges assignments={assignments} />
			<p>Rendered</p>
		</I18nextProvider>
	);
};

/** Aisha's Monday made a day off after publication, as her own roster read answers it. */
const changedMonday = (remark: string | null): ScheduleAssignment => {
	const day = editedAssignmentFixture(scheduleAssignmentsFixture()[0]!);
	return {
		...day,
		lastChange: day.lastChange && {
			...day.lastChange,
			appliedBy: null,
			remark,
		},
	};
};

describe("MyRosterChanges", () => {
	it("given_aDayChangedAfterPublication_when_shown_then_saysWhatItWasWhatItIsAndTheRemark", () => {
		show([changedMonday(REMARK), ...scheduleAssignmentsFixture().slice(1)]);

		const note = screen.getByRole("note");
		expect(note).toHaveTextContent(
			"Your days changed since this roster was published"
		);
		expect(note).toHaveTextContent(/was Front Desk AM.*now Day off/);
		expect(note).toHaveTextContent(`Remark: ${REMARK}`);
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
	});

	it("given_aChangeWithoutARemark_when_shown_then_noRemarkLine", () => {
		show([changedMonday(null)]);

		expect(screen.getByRole("note")).not.toHaveTextContent("Remark:");
	});

	it("given_noChangedDay_when_shown_then_nothing", () => {
		show(scheduleAssignmentsFixture());

		expect(screen.getByText("Rendered")).toBeInTheDocument();
		expect(screen.queryByRole("note")).not.toBeInTheDocument();
	});
});
