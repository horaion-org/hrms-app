import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { FindingsMarker } from "@/features/scheduling/FindingsMarker";
import type { Finding } from "@/features/scheduling/roster/findings/finding";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import { findingsOfEveryKindFixture } from "@/features/scheduling/schedules/fixtures";

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
	assignments: [],
	shifts: [],
	constraints: [],
});
const restNote: Finding = {
	kind: "message",
	date: null,
	message: "Ben Ong works more than five days in a row.",
};
const noShiftFits: Finding = {
	kind: "diagnostic",
	diagnostic: findings.diagnostics.find(
		({ code }) => code === "UNASSIGNABLE_EMPLOYEE"
	)!,
};

describe("FindingsMarker", () => {
	it("given_findings_when_opened_then_listsRosterNotesThenSetupIssues", async () => {
		const user = userEvent.setup();
		render(
			<FindingsMarker
				findings={[noShiftFits, restNote]}
				label="2 notes for Ben Ong"
				names={names}
				onShowAll={vi.fn()}
			/>
		);

		const marker = screen.getByRole("button", { name: "2 notes for Ben Ong" });
		expect(marker).toHaveTextContent("2");
		await user.click(marker);

		const popover = await screen.findByRole("dialog", {
			name: "2 notes for Ben Ong",
		});
		expect(
			within(popover)
				.getAllByRole("heading", { level: 3 })
				.map((heading) => heading.textContent)
		).toEqual(["Roster", "Setup"]);
		expect(popover).toHaveTextContent(
			"Ben Ong can only be scheduled off: no shift fits their job title and availability."
		);
	});

	it("given_anOpenPopover_when_showAllIsChosen_then_closesAndAsksForThePanel", async () => {
		const user = userEvent.setup();
		const onShowAll = vi.fn();
		render(
			<FindingsMarker
				findings={[restNote]}
				label="1 note for Ben Ong"
				names={names}
				onShowAll={onShowAll}
			/>
		);

		const marker = screen.getByRole("button", { name: "1 note for Ben Ong" });
		expect(marker).not.toHaveTextContent("1");
		await user.click(marker);
		await user.click(
			await screen.findByRole("button", { name: "Show in findings" })
		);

		expect(onShowAll).toHaveBeenCalledOnce();
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("given_noFindings_when_rendered_then_showsNothing", () => {
		const { container } = render(
			<FindingsMarker
				findings={[]}
				label="0 notes"
				names={names}
				onShowAll={vi.fn()}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
