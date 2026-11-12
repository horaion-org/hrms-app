import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import { FindingList } from "@/features/scheduling/FindingList";
import type { Finding } from "@/features/scheduling/roster/findings/finding";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	findingsOfEveryKindFixture,
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
const morningCover: Finding = {
	kind: "conflict",
	conflict: findings.conflicts[0]!,
};

describe("FindingList", () => {
	it("given_findCoverAndAShiftLeftShort_when_listed_then_aFindCoverButtonForItsShiftAndDay", async () => {
		const onFindCover = vi.fn();
		render(
			<FindingList
				findings={[morningCover]}
				names={names}
				onFindCover={onFindCover}
			/>
		);

		await userEvent.click(screen.getByRole("button", { name: "Find cover" }));

		expect(onFindCover).toHaveBeenCalledWith({
			shiftId: findings.conflicts[0]!.shiftUuids[0],
			day: "2026-10-17",
		});
	});

	it("given_findCoverAndAHoleAboutOnePerson_when_listed_then_noButton", () => {
		const aboutBen: Finding = {
			kind: "conflict",
			conflict: { ...findings.conflicts[0]!, employeeUuid: "mp-2" },
		};
		render(
			<FindingList findings={[aboutBen]} names={names} onFindCover={vi.fn()} />
		);

		expect(screen.queryByRole("button")).toBeNull();
	});

	it("given_noFindCover_when_listed_then_noButton", () => {
		render(<FindingList findings={[morningCover]} names={names} />);

		expect(screen.queryByRole("button")).toBeNull();
	});

	it("given_aConflict_when_listed_then_saysWhenHowShortAndWhichRule", () => {
		render(<FindingList findings={[morningCover]} names={names} />);

		const item = screen.getByRole("listitem");
		expect(item).toHaveTextContent(
			"09:00 – 15:00•1 person shortFront Desk AM is one Front Desk Staff short.Rule: Morning cover"
		);
		expect(
			screen.getByText("Front Desk AM is one Front Desk Staff short.").tagName
		).toBe("Q");
	});

	it("given_showDates_when_listed_then_eachFindingSaysItsDay", () => {
		render(
			<FindingList
				showDates
				names={names}
				findings={[
					morningCover,
					{ kind: "message", date: "2026-10-18", message: "Alone." },
					{ kind: "message", date: null, message: "Tired." },
				]}
			/>
		);

		const [conflict, dated, undated] = screen.getAllByRole("listitem");
		expect(conflict).toHaveTextContent("Sat, Oct 17, 09:00 – 15:00");
		expect(dated).toHaveTextContent("Sun, Oct 18Alone.");
		expect(undated).toHaveTextContent(/^Tired\.$/);
	});

	it("given_diagnostics_when_listed_then_theAppsSentenceAndTheEnginesWordsQuoted", () => {
		const dead = findings.diagnostics.find(
			({ code }) => code === "DEAD_SHIFT"
		)!;
		const unknown = findings.diagnostics.find(
			({ code }) => code === "SHIFT_TOO_SHORT"
		)!;
		render(
			<FindingList
				names={names}
				findings={[
					{ kind: "diagnostic", diagnostic: dead },
					{ kind: "diagnostic", diagnostic: unknown },
				]}
			/>
		);

		const [known, other] = screen.getAllByRole("listitem");
		expect(known).toHaveTextContent(
			"No one in this schedule can take Breakfast Prep.Shift Breakfast Prep: no employee holds an eligible role."
		);
		expect(other).toHaveTextContent(
			/^Shift Lunch Rush is shorter than one block\.$/
		);
		expect(
			screen.getByText("Shift Lunch Rush is shorter than one block.").tagName
		).toBe("Q");
	});

	it("given_findingsOfEachTone_when_listed_then_eachLeadsWithItsOutlineIcon", () => {
		const info = findings.diagnostics.find(
			({ code }) => code === "SHIFT_TOO_SHORT"
		)!;
		render(
			<FindingList
				findings={[morningCover, { kind: "diagnostic", diagnostic: info }]}
				names={names}
			/>
		);

		const [note, information] = screen
			.getAllByRole("listitem")
			.map((item) => item.querySelector("svg"));
		expect(note).toHaveAttribute("aria-hidden", "true");
		expect(note).toHaveClass("text-warning-900");
		expect(information).toHaveClass("text-ink-blue-700");
	});
});
