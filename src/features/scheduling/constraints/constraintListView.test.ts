import { describe, expect, it } from "vitest";
import {
	COMPANY_SECTION,
	OPEN_ALL_UP_TO,
	initiallyClosedOf,
	passesShowing,
	showingOf,
	showingValue,
	type ShowingRow,
} from "@/features/scheduling/constraints/constraintListView";

/** A constraint with only what the filter reads; `broken` marks one that needs attention. */
const row = (
	type: string,
	requirement: ShowingRow["requirement"],
	status: ShowingRow["status"] = "ACTIVE",
	broken = false
): ShowingRow & { broken: boolean } => ({
	type: type as ShowingRow["type"],
	requirement,
	status,
	broken,
});

const needsFixing = (constraint: { broken: boolean }): boolean =>
	constraint.broken;

describe("showingOf and passesShowing", () => {
	it("given_noChoice_when_filtered_then_everyConstraintPasses", () => {
		expect(
			passesShowing(row("SHIFT_STAFFING", "MUST"), showingOf([]), needsFixing)
		).toBe(true);
	});

	it("given_choicesOfOneKind_when_filtered_then_anyOfThemWill", () => {
		const showing = showingOf([
			showingValue("firmness", "MUST"),
			showingValue("firmness", "SHOULD"),
		]);

		expect(
			passesShowing(row("SHIFT_STAFFING", "SHOULD"), showing, needsFixing)
		).toBe(true);
		expect(passesShowing(row("PAY_RATES", null), showing, needsFixing)).toBe(
			false
		);
	});

	it("given_choicesOfSeveralKinds_when_filtered_then_eachKindMustBeMet", () => {
		const showing = showingOf([
			showingValue("status", "NEEDS_ATTENTION"),
			showingValue("type", "SHIFT_STAFFING"),
		]);

		expect(
			passesShowing(
				row("SHIFT_STAFFING", "MUST", "ACTIVE", true),
				showing,
				needsFixing
			)
		).toBe(true);
		expect(
			passesShowing(row("SHIFT_STAFFING", "MUST"), showing, needsFixing)
		).toBe(false);
		expect(
			passesShowing(
				row("REST_BETWEEN_SHIFTS", "MUST", "ACTIVE", true),
				showing,
				needsFixing
			)
		).toBe(false);
	});

	it("given_inactiveChosen_when_filtered_then_onlySwitchedOffOnesPass", () => {
		const showing = showingOf([showingValue("status", "INACTIVE")]);

		expect(
			passesShowing(
				row("SHIFT_STAFFING", "MUST", "INACTIVE"),
				showing,
				needsFixing
			)
		).toBe(true);
		expect(
			passesShowing(row("SHIFT_STAFFING", "MUST"), showing, needsFixing)
		).toBe(false);
	});

	it("given_aValueOfNoKnownKind_when_read_then_itIsDropped", () => {
		expect(showingOf(["colour:RED", "firmness:MUST"])).toEqual({
			status: [],
			firmness: ["MUST"],
			type: [],
		});
	});
});

describe("initiallyClosedOf", () => {
	const section = (key: string, rowCount: number, needsAttention = false) => ({
		key,
		rowCount,
		needsAttention,
	});

	it("given_upToTheThreshold_when_opened_then_everySectionButTheCompanysIsOpen", () => {
		expect(
			initiallyClosedOf([
				section("STAFFING", OPEN_ALL_UP_TO - 2),
				section(COMPANY_SECTION, 2),
			])
		).toEqual([COMPANY_SECTION]);
	});

	// Closed headings keep the attention count in the error tone, so nothing that needs fixing is hidden.
	it("given_moreThanTheThreshold_when_opened_then_everySectionStartsClosed_evenOneNeedingAttention", () => {
		expect(
			initiallyClosedOf([
				section("STAFFING", 10, true),
				section("SHIFT_PATTERN", 10),
				section(COMPANY_SECTION, 6),
			])
		).toEqual(["STAFFING", "SHIFT_PATTERN", COMPANY_SECTION]);
	});

	it("given_theCompanysNeedingAttention_when_opened_then_itStartsOpen", () => {
		expect(
			initiallyClosedOf([
				section("STAFFING", 2),
				section(COMPANY_SECTION, 1, true),
			])
		).toEqual([]);
	});
});
