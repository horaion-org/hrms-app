import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	daySwapOption,
	stretchPairOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import {
	changeTileGroups,
	changeTilePairs,
	previewTileGroups,
	previewTilePairs,
	tileFaceOfCell,
	type TileShift,
} from "@/features/scheduling/roster/changeTiles";
import { rosterChangePreviewFixture } from "@/features/scheduling/rosterChanges/fixtures";
import type { RosterCellValue } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const t = authTestI18n.t;
const roster = scheduleAssignmentsFixture();
const SWING: TileShift = {
	name: "Swing Shift",
	colour: "#3179D0",
	startTime: "13:00",
	endTime: "21:00",
};
const shiftOf = (shiftId: string): TileShift | undefined =>
	shiftId === "swing" ? SWING : undefined;
const WORKED: RosterCellValue = {
	kind: "WORK",
	dayType: null,
	shift: { ...roster[0]!.shift!, startTime: "13:00", endTime: "21:00" },
	jobTitle: null,
	stretch: { beforeMinutes: 0, afterMinutes: 120 },
};

describe("tileFaceOfCell", () => {
	it.each<[string, RosterCellValue, ReturnType<typeof tileFaceOfCell>]>([
		[
			"a stretched shift, its times widened",
			WORKED,
			{
				kind: "shift",
				name: WORKED.shift!.name,
				colour: WORKED.shift!.colour,
				times: { start: "13:00", end: "23:00" },
				stretchMinutes: 120,
			},
		],
		[
			"a rest day",
			{
				kind: "OFF",
				dayType: "REST",
				shift: null,
				jobTitle: null,
				stretch: null,
			},
			{ kind: "day", label: "Rest day" },
		],
		[
			"leave",
			{
				kind: "LEAVE",
				dayType: null,
				shift: null,
				jobTitle: null,
				stretch: null,
			},
			{ kind: "day", label: "On leave" },
		],
	])("draws %s", (_case, cell, face) => {
		expect(tileFaceOfCell(cell, t)).toEqual(face);
	});
});

describe("changeTilePairs", () => {
	it("reads each changed day against the roster as it stands", () => {
		const aishaMonday = roster.find(
			(row) => row.member?.membershipId === "m-1" && row.day === "2026-10-12"
		)!;
		const [pair, nobody] = changeTilePairs(
			[
				{
					membershipId: "m-1",
					day: "2026-10-12",
					kind: "WORK",
					shiftId: "swing",
					stretchAfterMinutes: 60,
				},
				{
					membershipId: "m-9",
					day: "2026-10-12",
					kind: "OFF",
					dayType: "REST",
				},
			],
			roster,
			shiftOf,
			t
		);

		expect(pair?.key).toBe("m-1|2026-10-12");
		expect(pair?.before.kind).toBe(aishaMonday.shift ? "shift" : "day");
		expect(pair?.after).toEqual({
			kind: "shift",
			name: "Swing Shift",
			colour: "#3179D0",
			times: { start: "13:00", end: "22:00" },
			stretchMinutes: 60,
		});
		expect(nobody).toMatchObject({
			before: { kind: "day", label: "Day off" },
			after: { kind: "day", label: "Rest day" },
		});
	});
});

describe("previewTilePairs", () => {
	it("draws every day the preview names", () => {
		const preview = rosterChangePreviewFixture();
		expect(previewTilePairs(preview, t)).toHaveLength(preview.cells.length);
	});
});

describe("changeTileGroups", () => {
	const memberName = (membershipId: string): string =>
		roster.find((row) => row.member?.membershipId === membershipId)?.member
			?.displayName ?? "";
	const shiftsByCopy = (shiftId: string): TileShift | undefined =>
		roster.find((row) => row.shift?.shiftId === shiftId)?.shift ?? undefined;

	it("puts one person's two days under their name, each with its day", () => {
		const groups = changeTileGroups(
			daySwapOption().cells,
			roster,
			shiftsByCopy,
			memberName,
			t
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({
			membershipId: "m-1",
			name: "Aisha Rahman",
		});
		expect(
			groups[0]?.days.map((day) => [day.day, day.before.kind, day.after.kind])
		).toEqual([
			["2026-10-17", "day", "shift"],
			["2026-10-16", "shift", "day"],
		]);
	});

	it("gives two people a group each, in the order of the cells", () => {
		const groups = changeTileGroups(
			stretchPairOption().cells,
			roster,
			shiftsByCopy,
			memberName,
			t
		);

		expect(groups.map((group) => group.name)).toEqual(["Ben Ong", "Chen Wei"]);
		expect(groups.map((group) => group.days.length)).toEqual([1, 1]);
	});
});

describe("previewTileGroups", () => {
	it("names each person as the preview does, each day with its date", () => {
		const groups = previewTileGroups(rosterChangePreviewFixture(), () => "", t);

		expect(groups).toEqual([
			expect.objectContaining({
				membershipId: "m-1",
				name: "Aisha Rahman",
				days: [expect.objectContaining({ day: "2026-10-12" })],
			}),
		]);
	});
});
