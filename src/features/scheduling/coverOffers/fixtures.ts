import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

/*
 * API-shaped cover offers for stories and tests; never sent anywhere. Schedule
 * s-1's Front Desk AM is offered to Aisha Rahman (m-1) on Saturday 17 Oct,
 * her day off, by Lina Tan.
 */

const frontDeskAm = (): NonNullable<CoverOffer["shift"]> => {
	const copy = frozenShiftsFixture().find(
		(shift) => shift.name === "Front Desk AM"
	)!;
	return {
		shiftId: copy.shiftId,
		name: copy.name,
		group: copy.group,
		colour: copy.colour,
		startTime: copy.startTime,
		endTime: copy.endTime,
		unpaidBreakMinutes: copy.unpaidBreakMinutes,
		carriesOvertime: copy.carriesOvertime,
	};
};

/** An open offer o-1; `overrides` set it apart. */
export const coverOfferFixture = (
	overrides: Partial<CoverOffer> = {}
): CoverOffer => {
	const shift = frontDeskAm();
	return {
		offerId: "o-1",
		scheduleId: "s-1",
		rosterDate: "2026-10-17",
		member: {
			membershipId: "m-1",
			memberProfileId: "mp-1",
			displayName: "Aisha Rahman",
			employeeCode: "EMP-001",
			jobTitleName: "Front Desk Lead",
		},
		shift,
		optionKind: "OFF_DAY_SHIFT",
		cells: [
			{
				membershipId: "m-1",
				day: "2026-10-17",
				kind: "WORK",
				shiftId: shift.shiftId,
			},
		],
		status: "OPEN",
		channel: "APP",
		expiresAt: "2026-10-16T07:30:00Z",
		groupId: "g-1",
		remark: "Ana is off sick, can you help?",
		answerReason: null,
		answeredAt: null,
		recordedHow: null,
		recordedBy: null,
		appliedChangeId: null,
		createdBy: { membershipId: "manager-1", displayName: "Lina Tan" },
		createdAt: "2026-10-16T05:30:00Z",
		...overrides,
	};
};

/** Before the open fixture's deadline (15:30 in Singapore): 13:18 there. */
export const BEFORE_DEADLINE = new Date("2026-10-16T05:18:00Z");
