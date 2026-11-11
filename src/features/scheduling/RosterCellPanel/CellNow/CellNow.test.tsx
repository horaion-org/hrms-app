import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { CellNow, type CellNowProps } from "./CellNow";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
		<a href="/leave">{children}</a>
	),
}));

const roster = scheduleAssignmentsFixture();
const dayOf = (membershipId: string, day: string): ScheduleAssignment =>
	roster.find(
		(row) => row.member?.membershipId === membershipId && row.day === day
	)!;

const show = (props: Partial<CellNowProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<CellNow
				assignment={dayOf("m-1", "2026-10-12")}
				language="en"
				leaveDay={false}
				requestDays={1}
				requestLink={undefined}
				{...props}
			/>
		</I18nextProvider>
	);
};

describe("CellNow", () => {
	it("given_aWorkingDay_when_rendered_then_namesItsShiftAndJobTitle", () => {
		show();

		expect(screen.getByText("Now")).toBeVisible();
		expect(screen.getByText(/Front Desk AM/)).toBeVisible();
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("given_aLeaveDayForALeaveEditor_when_rendered_then_linksToEveryDayOfTheRequest", () => {
		show({
			assignment: { ...dayOf("m-2", "2026-10-14"), leaveRequestId: "r-1" },
			leaveDay: true,
			requestDays: 2,
			requestLink: { requestId: "r-1", memberId: "m-2", view: "requests" },
		});

		expect(
			screen.getByRole("link", { name: "Change all 2 days in Leave" })
		).toBeVisible();
	});

	it("given_aDayChangedByHand_when_rendered_then_saysWhoChangedItAndFromWhat", () => {
		show({
			assignment: {
				...dayOf("m-1", "2026-10-12"),
				lastChange: {
					changeId: "c-1",
					appliedAt: "2026-10-10T09:00:00Z",
					appliedBy: { membershipId: "m-9", displayName: "Dana Lim" },
					before: { kind: "OFF", dayType: "OFF", shift: null, jobTitle: null },
					remark: "Covering for Ben",
					reason: null,
				},
			},
		});

		expect(screen.getByText(/by Dana Lim/)).toBeVisible();
		expect(screen.getByText("Was: Day off")).toBeVisible();
		expect(screen.getByText("Covering for Ben")).toBeVisible();
	});
});
