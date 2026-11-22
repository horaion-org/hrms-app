import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import type { SentOptionKind } from "@/features/scheduling/coverOffers/coverOfferRules";
import type { RosterEditChoice } from "@/features/scheduling/rosterChanges/rosterEdit";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * How one of the engine's repair options goes out as a cover offer, pure:
 * the offer kind it is, and the member, day and shift it asks about. An
 * option that changes two people goes out as no offer.
 */

/**
 * The offer kind an engine repair option goes out as, or undefined for one
 * no offer can ask: a change of two people, and a rest-day move, which has no
 * offer kind, so it is applied once the person agreed, with a remark. A
 * call-in is a day off's shift, or a rest day's when the engine counts
 * rest-day hours; a move, a stretch and a day swap are their own kinds; one
 * of the older repair's changes reads as the cell panel reads it (`before`:
 * the member's day now).
 */
export const offerKindOfOption = (
	option: Pick<RepairOption, "kind" | "people" | "extraMinutes">,
	before: Pick<ScheduleAssignment, "shift"> | undefined
): SentOptionKind | undefined => {
	if (option.people.length !== 1) return undefined;
	switch (option.kind) {
		case "CALL_IN":
			return (option.extraMinutes?.restDayWork ?? 0) > 0
				? "REST_DAY_SHIFT"
				: "OFF_DAY_SHIFT";
		case "MOVE":
			return "MOVE";
		case "OVERTIME_STRETCH":
			return "STRETCH";
		case "DAY_SWAP":
			return "DAY_SWAP";
		case "STRETCH_PAIR":
		case "REST_DAY_MOVE":
			return undefined;
		default:
			return before?.shift ? "MOVE" : "OFF_DAY_SHIFT";
	}
};

/** What an offer of an engine option is about: the member's row on the day it adds work, that shift, and the kind. */
export type EngineOfferTarget = {
	assignment: ScheduleAssignment;
	choice: Extract<RosterEditChoice, { kind: "shift" }>;
	offerKind: SentOptionKind;
};

/**
 * What an offer of an engine option asks, or undefined for one no single
 * offer can ask (two people, or a member the roster no longer holds): the
 * member's row on the day of its WORK cell, that cell's shift, and its kind.
 */
export const engineOfferTargetOf = (
	option: Pick<RepairOption, "kind" | "people" | "extraMinutes" | "cells">,
	assignments: ReadonlyArray<ScheduleAssignment>
): EngineOfferTarget | undefined => {
	const work = option.cells.find((cell) => cell.kind === "WORK");
	if (work?.kind !== "WORK") return undefined;
	const assignment = assignments.find(
		(row) =>
			row.member?.membershipId === work.membershipId && row.day === work.day
	);
	const offerKind = offerKindOfOption(option, assignment);
	return assignment && offerKind
		? {
				assignment,
				choice: { kind: "shift", shiftId: work.shiftId },
				offerKind,
			}
		: undefined;
};

/**
 * Who must have agreed before an engine option no offer can ask applies on
 * a published roster: both people of a two-person option, or the one person
 * of a rest-day move; nobody named for any other.
 */
export type WhoMustAgree = "bothPeople" | "theirPerson" | undefined;

/**
 * Who must have agreed before an engine option applies with a remark on a
 * published roster (`remarkRequired`: no offer can ask it). Pure.
 */
export const whoMustAgree = (
	option: Pick<RepairOption, "kind" | "people"> | undefined,
	remarkRequired: boolean
): WhoMustAgree => {
	if (!remarkRequired || !option) return undefined;
	if (option.people.length > 1) return "bothPeople";
	return option.kind === "REST_DAY_MOVE" ? "theirPerson" : undefined;
};
