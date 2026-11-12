import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { leaveFixture, LEAVE_TYPE_FIXTURES } from "@/features/leave/fixtures";
import {
	RosterCellPanel,
	type RosterCellPanelProps,
} from "@/features/scheduling/RosterCellPanel";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}): React.JSX.Element => (
		<a className={className} href="/leave">
			{children}
		</a>
	),
}));

const CHANGES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-changes";
const LEAVE = "/api/v1/companies/c-1/member-profiles/m-1/leave-requests";
const LEAVE_TYPES = "/api/v1/companies/c-1/me/leave-types";
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

	describe("leave choices", () => {
		const shiftDay = dayOf("m-1", "2026-10-12");
		const onLeave: ScheduleAssignment = {
			...shiftDay,
			off: true,
			offReason: "LEAVE",
			leaveTypeName: "Annual leave",
			leaveRequestId: "r-1",
			shift: null,
			jobTitle: null,
		};
		const takenOffByLeave: ScheduleAssignment = {
			...onLeave,
			lastChange: {
				changeId: "c-9",
				appliedAt: "2026-10-01T00:00:00Z",
				appliedBy: null,
				remark: null,
				reason: "LEAVE_APPROVED",
				before: { kind: "WORK", dayType: null, shift: null, jobTitle: null },
			},
		};
		const dayOffUnderLeave: ScheduleAssignment = {
			...onLeave,
			offReason: "OFF",
		};
		const leaveEditing = { viewerMembershipId: "manager-1" };
		const changed = envelope(rosterChangeFixture({ undoable: false }));
		const leaveReply = {
			status: 200,
			body: envelope(leaveFixture({ leaveRequestId: "r-1" })),
		};
		const preview = {
			status: 200,
			body: envelope(rosterChangePreviewFixture({ checks: [] })),
		};
		const refused = {
			status: 422,
			body: {
				errorCode: "ROSTER_CHANGE_REFUSED",
				status: 422,
				title: "No",
			},
		};
		const routes = {
			[`GET ${LEAVE_TYPES}`]: {
				status: 200,
				body: envelope(LEAVE_TYPE_FIXTURES),
			},
			[`GET ${LEAVE}/r-1`]: {
				status: 200,
				body: envelope(leaveFixture({ leaveRequestId: "r-1" })),
			},
		};
		const fillIn = async (
			user: ReturnType<typeof userEvent.setup>,
			option: string,
			type?: string
		): Promise<void> => {
			await user.click(screen.getByRole("radio", { name: option }));
			if (type !== undefined) {
				await user.click(
					await screen.findByRole("button", { name: "Leave type" })
				);
				await user.click(await screen.findByRole("option", { name: type }));
			}
			await user.type(
				await screen.findByRole("textbox", { name: /Remark/ }),
				"Fell ill"
			);
		};

		it.each([
			{
				move: "shift to leave",
				assignment: shiftDay,
				option: "Leave",
				type: "Sick leave",
				path: `${LEAVE}/approved`,
				expected: {
					leaveType: "SICK",
					startDate: shiftDay.day,
					endDate: shiftDay.day,
					remark: "Fell ill",
					takeOffRosteredDays: true,
				},
			},
			{
				move: "leave to another type",
				assignment: onLeave,
				option: "Another leave type",
				type: "Sick leave",
				path: `${LEAVE}/r-1/days/${shiftDay.day}/change`,
				expected: { leaveType: "SICK", remark: "Fell ill" },
			},
			{
				move: "leave nobody took a shift for to a day off",
				assignment: onLeave,
				option: "Day off",
				type: undefined,
				path: `${LEAVE}/r-1/days/${shiftDay.day}/cancellation`,
				expected: { remark: "Fell ill" },
			},
			{
				move: "a day off under leave back to a plain day off",
				assignment: dayOffUnderLeave,
				option: "Day off",
				type: undefined,
				path: `${LEAVE}/r-1/days/${shiftDay.day}/cancellation`,
				expected: { remark: "Fell ill" },
			},
		])(
			"given_$move_when_applied_then_callsLeaveAloneAndClosesWithNoRosterChange",
			async ({ assignment, option, type, path, expected }) => {
				const calls = stubApi({ ...routes, [`POST ${path}`]: leaveReply });
				const props = show({
					assignment,
					leaveEditing,
					onLeaveChanged: vi.fn(),
				});
				const user = userEvent.setup();

				await fillIn(user, option, type);
				await user.click(screen.getByRole("button", { name: "Apply" }));

				await waitFor(() => {
					expect(props.onLeaveChanged).toHaveBeenCalled();
				});
				expect(calls.find((call) => call.path === path)?.body).toEqual(
					expected
				);
				expect(calls.some((call) => call.path === CHANGES)).toBe(false);
				expect(props.onApplied).not.toHaveBeenCalled();
			}
		);

		it("given_leaveThatTookAShift_when_movedToADayOff_then_cancelsTheDayThenEditsTheRoster", async () => {
			const cancel = `${LEAVE}/r-1/days/${shiftDay.day}/cancellation`;
			const calls = stubApi({
				...routes,
				[`POST ${cancel}`]: leaveReply,
				[`POST ${CHANGES}`]: { status: 201, body: changed },
			});
			const props = show({ assignment: takenOffByLeave, leaveEditing });
			const user = userEvent.setup();

			await fillIn(user, "Day off");
			await user.click(screen.getByRole("button", { name: "Apply" }));

			await waitFor(() => {
				expect(props.onApplied).toHaveBeenCalled();
			});
			expect(
				calls.map((call) => call.path).filter((path) => path !== LEAVE_TYPES)
			).toEqual(expect.arrayContaining([cancel, CHANGES]));
			expect(calls.find((call) => call.path === CHANGES)?.body).toMatchObject({
				cells: [{ membershipId: "m-1", day: shiftDay.day, kind: "OFF" }],
				remark: "Fell ill",
			});
		});

		it("given_leave_when_movedToAShift_then_previewsPastTheLeaveThenCancelsItThenEdits", async () => {
			const cancel = `${LEAVE}/r-1/days/${shiftDay.day}/cancellation`;
			const calls = stubApi({
				...routes,
				[`POST ${PREVIEW}`]: preview,
				[`POST ${cancel}`]: leaveReply,
				[`POST ${CHANGES}`]: { status: 201, body: changed },
			});
			const props = show({ assignment: onLeave, leaveEditing });
			const user = userEvent.setup();

			await user.click(screen.getByRole("radio", { name: "A shift" }));
			await user.click(screen.getByRole("button", { name: "Shift" }));
			await user.click((await screen.findAllByRole("option"))[0]!);
			await user.type(
				await screen.findByRole("textbox", { name: /Remark/ }),
				"Back early"
			);
			await user.click(screen.getByRole("button", { name: "Apply change" }));

			await waitFor(() => {
				expect(props.onApplied).toHaveBeenCalled();
			});
			expect(calls.find((call) => call.path === PREVIEW)?.body).toMatchObject({
				assumeLeaveCancelledOn: [shiftDay.day],
			});
			const order = calls.map((call) => call.path);
			expect(order.indexOf(cancel)).toBeLessThan(order.indexOf(CHANGES));
			expect(
				calls.find((call) => call.path === CHANGES)?.body
			).not.toHaveProperty("assumeLeaveCancelledOn");
		});

		it("given_theRosterEditRefusedAfterTheLeaveWentAway_when_applied_then_staysOpenAndSaysSo", async () => {
			stubApi({
				...routes,
				[`POST ${PREVIEW}`]: preview,
				[`POST ${LEAVE}/r-1/days/${shiftDay.day}/cancellation`]: leaveReply,
				[`POST ${CHANGES}`]: refused,
			});
			const props = show({ assignment: onLeave, leaveEditing });
			const user = userEvent.setup();

			await user.click(screen.getByRole("radio", { name: "A shift" }));
			await user.click(screen.getByRole("button", { name: "Shift" }));
			await user.click((await screen.findAllByRole("option"))[0]!);
			await user.type(
				await screen.findByRole("textbox", { name: /Remark/ }),
				"Back early"
			);
			await user.click(screen.getByRole("button", { name: "Apply change" }));

			expect(
				await screen.findByText(/The shift couldn’t be given.*Day off\./)
			).toBeVisible();
			expect(screen.queryByText(/needs a decision/)).toBeNull();
			expect(props.onApplied).not.toHaveBeenCalled();
			expect(props.onClose).not.toHaveBeenCalled();
		});

		it("given_aDayLeaveTookTheShiftFrom_when_theRosterEditIsRefused_then_saysItNeedsADecision", async () => {
			stubApi({
				...routes,
				[`POST ${LEAVE}/r-1/days/${shiftDay.day}/cancellation`]: leaveReply,
				[`POST ${CHANGES}`]: refused,
			});
			const props = show({ assignment: takenOffByLeave, leaveEditing });
			const user = userEvent.setup();

			await fillIn(user, "Day off");
			await user.click(screen.getByRole("button", { name: "Apply" }));

			expect(
				await screen.findByText(
					/The roster couldn’t be changed.*now needs a decision/
				)
			).toBeVisible();
			expect(screen.queryByText(/The shift couldn’t be given/)).toBeNull();
			expect(props.onClose).not.toHaveBeenCalled();
		});

		it("given_theCancellationRefused_when_applied_then_noRosterEditAndStaysOpenSayingSo", async () => {
			const calls = stubApi({
				...routes,
				[`POST ${LEAVE}/r-1/days/${shiftDay.day}/cancellation`]: {
					status: 500,
					body: { errorCode: "BOOM", status: 500, title: "No" },
				},
			});
			const props = show({ assignment: takenOffByLeave, leaveEditing });
			const user = userEvent.setup();

			await fillIn(user, "Day off");
			await user.click(screen.getByRole("button", { name: "Apply" }));

			expect(
				await screen.findByText("We couldn’t change the leave. Try again.")
			).toBeVisible();
			expect(calls.some((call) => call.path === CHANGES)).toBe(false);
			expect(props.onApplied).not.toHaveBeenCalled();
			expect(props.onClose).not.toHaveBeenCalled();
		});

		it("given_aFailedMove_when_anotherChoiceIsMade_then_theFailureGoes", async () => {
			stubApi({
				...routes,
				[`POST ${LEAVE}/r-1/days/${shiftDay.day}/cancellation`]: {
					status: 500,
					body: { errorCode: "BOOM", status: 500, title: "No" },
				},
			});
			show({ assignment: takenOffByLeave, leaveEditing });
			const user = userEvent.setup();
			await fillIn(user, "Day off");
			await user.click(screen.getByRole("button", { name: "Apply" }));
			await screen.findByText("We couldn’t change the leave. Try again.");

			await user.click(
				screen.getByRole("radio", { name: "Another leave type" })
			);
			await user.click(
				await screen.findByRole("button", { name: "Leave type" })
			);
			await user.click(
				await screen.findByRole("option", { name: "Sick leave" })
			);

			expect(
				screen.queryByText("We couldn’t change the leave. Try again.")
			).toBeNull();
		});

		it("given_aMoveFromADayOffUnderLeaveToAShift_when_applied_then_tellsTheApiItIsALeaveMove", async () => {
			const calls = stubApi({
				...routes,
				[`POST ${PREVIEW}`]: preview,
				[`POST ${LEAVE}/r-1/days/${shiftDay.day}/cancellation`]: leaveReply,
				[`POST ${CHANGES}`]: { status: 201, body: changed },
			});
			const props = show({ assignment: dayOffUnderLeave, leaveEditing });
			const user = userEvent.setup();

			await user.click(screen.getByRole("radio", { name: "A shift" }));
			await user.click(screen.getByRole("button", { name: "Shift" }));
			await user.click((await screen.findAllByRole("option"))[0]!);
			await user.type(
				await screen.findByRole("textbox", { name: /Remark/ }),
				"Back early"
			);
			await user.click(screen.getByRole("button", { name: "Apply change" }));

			await waitFor(() => {
				expect(props.onApplied).toHaveBeenCalledWith(
					expect.objectContaining({ undoable: false })
				);
			});
			expect(calls.find((call) => call.path === CHANGES)?.body).toMatchObject({
				leaveMove: true,
			});
		});

		it("given_aLeaveMoveWithARosterPreview_when_opened_then_theHintSaysTheEmployeeReadsTheRemark", async () => {
			stubApi({ ...routes, [`POST ${PREVIEW}`]: preview });
			show({ assignment: onLeave, leaveEditing });
			const user = userEvent.setup();

			await user.click(screen.getByRole("radio", { name: "A shift" }));
			await user.click(screen.getByRole("button", { name: "Shift" }));
			await user.click((await screen.findAllByRole("option"))[0]!);

			expect(
				await screen.findByText(/is told and sees this remark/)
			).toBeVisible();
			expect(
				screen.queryByText("Seen by schedulers of this department.")
			).toBeNull();
		});

		it("given_noRemark_when_aLeaveMoveIsChosen_then_applyStaysOff", async () => {
			stubApi(routes);
			show({ assignment: onLeave, leaveEditing });
			const user = userEvent.setup();

			await user.click(screen.getByRole("radio", { name: "Day off" }));

			expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
		});

		it("given_aRequestOfSeveralDays_when_opened_then_linksToChangeThemAllInLeave", async () => {
			stubApi({
				...routes,
				[`GET ${LEAVE}/r-1`]: {
					status: 200,
					body: envelope(
						leaveFixture({
							leaveRequestId: "r-1",
							startDate: "2026-10-12",
							endDate: "2026-10-16",
						})
					),
				},
			});
			show({ assignment: onLeave, leaveEditing });

			expect(
				await screen.findByRole("link", { name: "Change all 5 days in Leave" })
			).toBeVisible();
		});

		it("given_noLeaveKeys_when_aShiftDayIsOpened_then_noLeaveChoiceAndALeaveDayStaysReadOnly", () => {
			stubApi(routes);
			show();

			expect(screen.queryByRole("radio", { name: "Leave" })).toBeNull();
		});

		it("given_theViewersOwnDay_when_opened_then_refusesToChangeTheirOwnLeave", () => {
			stubApi(routes);
			show({
				assignment: onLeave,
				leaveEditing: { viewerMembershipId: "m-1" },
			});

			expect(
				screen.getByText("You can’t change your own leave.")
			).toBeVisible();
			expect(screen.queryByRole("radio")).toBeNull();
		});

		it("given_aPendingRequest_when_opened_then_pointsToLeaveInsteadOfOfferingIt", () => {
			stubApi(routes);
			show({
				assignment: {
					...shiftDay,
					flag: "LEAVE_REQUESTED",
					leaveRequestId: "r-1",
					leaveTypeName: "Annual leave",
				},
				leaveEditing,
			});

			expect(
				screen.getByRole("link", { name: "Review in Leave" })
			).toBeVisible();
			expect(screen.queryByRole("radio", { name: "Leave" })).toBeNull();
		});

		it("given_aDayNeedingAttention_when_opened_then_offersTheSameChoicesAndSaysNothingOfLeave", () => {
			stubApi(routes);
			show({
				assignment: {
					...onLeave,
					offReason: "OFF",
					leaveRequestId: null,
					leaveTypeName: null,
					flag: "NEEDS_ATTENTION",
				},
			});

			expect(screen.getByText(/This day needs attention/)).toBeVisible();
			expect(
				screen.getByRole("radio", { name: "Confirm day off" })
			).toBeVisible();
			expect(screen.getByRole("complementary")).not.toHaveTextContent(/leave/i);
		});

		it("given_aDayToDecide_when_opened_then_offersAShiftOrToConfirmTheDayOff", () => {
			stubApi(routes);
			show({
				assignment: {
					...onLeave,
					offReason: "OFF",
					leaveRequestId: null,
					leaveTypeName: null,
					flag: "NEEDS_DECISION",
				},
			});

			expect(screen.getByText(/Leave was cancelled on this day/)).toBeVisible();
			expect(
				screen.getByRole("radio", { name: "Confirm day off" })
			).toBeVisible();
		});
	});
});
