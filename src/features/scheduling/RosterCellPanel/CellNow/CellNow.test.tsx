import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { SchedulePreferenceOutcome } from "@/features/shiftPreferences/api";
import { editedAssignmentFixture } from "@/features/scheduling/rosterChanges/fixtures";
import {
	scheduleAssignmentsFixture,
	shortenedShiftFixture,
	workedAroundLeaveFixture,
} from "@/features/scheduling/schedules/fixtures";
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

	it.each([
		["REST", "On rest day"],
		["OFF", "On day off"],
	])(
		"given_aShiftOnA%sDay_when_rendered_then_saysTheDayType",
		(dayType, words) => {
			show({ assignment: { ...dayOf("m-1", "2026-10-12"), dayType } });

			expect(screen.getByText(words)).toBeVisible();
		}
	);

	it("given_aShiftOnADayWithoutAType_when_rendered_then_saysNoDayType", () => {
		show();

		expect(screen.queryByText(/^On /)).toBeNull();
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

	describe("part-day leave", () => {
		const leaveDay = (): ScheduleAssignment => {
			const day = roster.find((row) => row.offReason === "LEAVE")!;
			return {
				...day,
				leaveTypeName: "Annual leave",
				leaveDurationName: "Morning",
				leaveStartTime: "07:00",
				leaveEndTime: "11:00",
				lastChange: null,
			};
		};

		it("given_aDayAsGenerated_when_rendered_then_namesThePartAndSaysWhyTheWholeDayIsFree", () => {
			show({ assignment: leaveDay(), leaveDay: true });

			expect(
				screen.getByText(/Annual leave · Morning 07:00–11:00/)
			).toBeVisible();
			expect(
				screen.getByText(/The scheduler can’t plan part days yet/)
			).toBeVisible();
		});

		it("given_aDayChangedSinceGeneration_when_rendered_then_doesNotSayItWasApprovedBefore", () => {
			const day = leaveDay();
			show({
				assignment: {
					...day,
					lastChange: editedAssignmentFixture(day).lastChange,
				},
				leaveDay: true,
			});

			expect(
				screen.queryByText(/The scheduler can’t plan part days yet/)
			).toBeNull();
		});
	});
	describe("a shift kept around part-day leave", () => {
		it("given_aShortenedShift_when_rendered_then_saysTheTimeStillWorkedAndTheLeave", () => {
			show({ assignment: shortenedShiftFixture() });

			expect(
				screen.getByText(/Works 11:00 – 15:00 · Front Desk AM/)
			).toBeVisible();
			expect(screen.getByText("Annual leave 09:00–11:00")).toBeVisible();
		});

		it("given_leaveInTheMiddle_when_rendered_then_saysBothPieces", () => {
			show({ assignment: workedAroundLeaveFixture() });

			expect(
				screen.getByText(/Works 09:00 – 11:00 · 13:00 – 15:00/)
			).toBeVisible();
		});

		it("given_leaveKeptTheShift_when_rendered_then_saysItWasShortenedNotTakenOff", () => {
			const kept = shortenedShiftFixture();
			show({
				assignment: {
					...kept,
					lastChange: {
						...editedAssignmentFixture(kept).lastChange!,
						reason: "LEAVE_APPROVED",
					},
				},
			});

			expect(screen.getByText("Shortened for leave")).toBeVisible();
			expect(screen.queryByText("Taken off for leave")).toBeNull();
		});
	});

	describe("shift preference", () => {
		/** A preference for Morning or Late on the shown day, with `change` applied. */
		const outcome = (
			change: Partial<SchedulePreferenceOutcome>
		): SchedulePreferenceOutcome => ({
			membershipId: "m-1",
			date: "2026-10-12",
			shiftNames: ["Morning", "Late"],
			outcome: "MET",
			reason: null,
			...change,
		});

		it("given_noPreference_when_rendered_then_showsNoPreferenceRow", () => {
			show();

			expect(screen.queryByText("Preference")).toBeNull();
		});

		it.each([
			["MET", "Met"],
			["NOT_MET", "Not met"],
		] as const)(
			"given_an%sPreference_when_rendered_then_namesTheShiftsAndItsPill",
			(kind, pill) => {
				show({ preferenceOutcome: outcome({ outcome: kind }) });

				expect(screen.getByText("Preference")).toBeVisible();
				expect(screen.getByText(/Preferred: Morning or Late/)).toBeVisible();
				expect(screen.getByText(pill)).toBeVisible();
			}
		);

		it.each([
			["ON_LEAVE", "On leave that day"],
			["SHIFT_NOT_IN_ROSTER", "The shift isn’t in this roster"],
			["SHIFT_NOT_ON_DAY", "The shift doesn’t run that day"],
			["ROLE_NOT_STAFFED", "The shift doesn’t need this job title"],
		] as const)(
			"given_aPreferenceLeftOutFor%s_when_rendered_then_saysNotConsideredAndWhy",
			(reason, words) => {
				show({
					preferenceOutcome: outcome({ outcome: "NOT_CONSIDERED", reason }),
				});

				expect(screen.getByText("Not considered")).toBeVisible();
				expect(screen.getByText(words)).toBeVisible();
			}
		);
	});
});
