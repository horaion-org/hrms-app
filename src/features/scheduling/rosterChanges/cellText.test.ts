import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type {
	RosterCellValue,
	ScheduleAssignment,
} from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

const notWorked = (
	kind: RosterCellValue["kind"],
	dayType: string | null
): RosterCellValue => ({ kind, dayType, shift: null, jobTitle: null });

describe("rosterCellText", () => {
	it.each([
		["a rest day", notWorked("OFF", "REST"), "Rest day"],
		["a day off", notWorked("OFF", "OFF"), "Day off"],
		[
			"a type added later",
			notWorked("OFF", "PUBLIC_HOLIDAY_OFF"),
			"Public holiday off",
		],
		["a non-working day without a type", notWorked("OFF", null), "Day off"],
		["an absent day", notWorked("ABSENT", null), "Absent"],
		["leave", notWorked("LEAVE", null), "On leave"],
	])("writes %s", (_, cell, words) => {
		expect(rosterCellText(cell, t)).toBe(words);
	});
});

describe("assignmentCell", () => {
	const roster = scheduleAssignmentsFixture();
	const dayOf = (name: string, day: string): ScheduleAssignment =>
		roster.find((row) => row.member?.displayName === name && row.day === day)!;

	it.each([
		["a rest day", "Aisha Rahman", "2026-10-18", "OFF", "REST"],
		["an absent day", "Ben Ong", "2026-10-18", "ABSENT", null],
		["a leave day", "Ben Ong", "2026-10-14", "LEAVE", null],
		["a shift on a rest day", "Chen Wei", "2026-10-17", "WORK", "REST"],
	])("reads %s with its kind and type", (_, name, day, kind, dayType) => {
		expect(assignmentCell(dayOf(name, day))).toMatchObject({ kind, dayType });
	});
});
