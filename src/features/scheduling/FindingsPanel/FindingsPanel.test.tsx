import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import { FindingsPanel } from "@/features/scheduling/FindingsPanel";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import { daysOf } from "@/features/scheduling/schedules";
import {
	findingsOfEveryKindFixture,
	generationFindingsFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

const findings = findingsOfEveryKindFixture();
const names = findingNames(findings, {
	assignments: scheduleAssignmentsFixture(),
	shifts: frozenShiftsFixture(),
	constraints: frozenConstraintsFixture(),
});
const week = daysOf("2026-10-12");

describe("FindingsPanel", () => {
	it("given_setupIssues_when_rendered_then_groupsThemByCodeWithTheHint", () => {
		render(
			<FindingsPanel findings={findings} names={names} visibleDays={week} />
		);

		const setup = screen.getByRole("region", { name: "Setup issues (5)" });
		expect(setup).toHaveTextContent(
			"Fix these in the schedule’s setup; generating again with the same setup won’t clear them."
		);
		expect(
			within(setup)
				.getAllByRole("heading", { level: 3 })
				.map((heading) => heading.textContent)
		).toEqual([
			"Demand no shift can cover · 1",
			"Rules naming missing items · 1",
			"Members no shift fits · 1",
			"Shifts nobody can take · 1",
			"Shift too short · 1",
		]);
	});

	it("given_rosterNotes_when_rendered_then_groupsThemByDayThenByMember", () => {
		render(
			<FindingsPanel findings={findings} names={names} visibleDays={week} />
		);

		const roster = screen.getByRole("region", { name: "Roster notes (8)" });
		expect(
			within(roster)
				.getAllByRole("heading", { level: 3 })
				.map((heading) => heading.textContent)
		).toEqual([
			"Fri, Oct 16",
			"Sat, Oct 17",
			"Ben Ong",
			"A former member",
			"Chen Wei",
		]);
		expect(roster).toHaveTextContent("Rule: Forecast demand");
		expect(roster).toHaveTextContent("Rule: Role presence");
	});

	it("given_onlyRosterNotes_when_rendered_then_leavesOutTheSetupPart", () => {
		render(
			<FindingsPanel
				findings={generationFindingsFixture({ diagnostics: [] })}
				names={names}
				visibleDays={week}
			/>
		);

		expect(screen.queryByRole("region", { name: /Setup issues/ })).toBeNull();
		expect(
			screen.getByRole("region", { name: "Roster notes (3)" })
		).toBeInTheDocument();
	});
});
