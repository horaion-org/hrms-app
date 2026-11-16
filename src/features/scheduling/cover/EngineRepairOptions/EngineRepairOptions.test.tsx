import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	callInMove,
	feasibleRepair,
	infeasibleRepair,
	reassignMove,
	stretchMove,
} from "@/features/scheduling/cover/engineRepairFixtures";
import type { RepairNames } from "@/features/scheduling/cover/engineRepairWords";
import { EngineRepairOptions } from "@/features/scheduling/cover/EngineRepairOptions";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const names: RepairNames = {
	member: (membershipId) => `Member ${membershipId}`,
	day: () => "Sat, Oct 17",
	hours: (minutes) => String(minutes / 60),
};
const NONE_CHECKED =
	"None of these options is checked against working-time rules: hours a day, overtime a month, days a week and leave. Check before you change the roster.";
const NOT_CHECKED =
	"Not checked against working-time rules: hours a day, overtime a month, days a week and leave. Check before you change the roster.";

describe("EngineRepairOptions", () => {
	it("asks the engine only when the button is pressed", async () => {
		const ask = vi.fn();
		render(
			<EngineRepairOptions names={names} repair={{ status: "idle", ask }} />
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Ask the engine" })
		);

		expect(ask).toHaveBeenCalledOnce();
	});

	it("says it is asking while the engine works", () => {
		render(
			<EngineRepairOptions
				names={names}
				repair={{ status: "loading", ask: vi.fn() }}
			/>
		);

		expect(screen.getByText("Asking the engine…")).toBeInTheDocument();
	});

	it("lists each option's moves, an honest no with its reason, and the working-time note on every option", () => {
		render(
			<EngineRepairOptions
				names={names}
				repair={{
					status: "ready",
					options: [
						feasibleRepair([callInMove(), stretchMove()]),
						infeasibleRepair(),
					],
					ask: vi.fn(),
				}}
			/>
		);

		const [fills, cannot] = screen
			.getAllByRole("listitem")
			.filter((item) => item.parentElement?.parentElement?.tagName !== "LI");
		expect(within(fills!).getByText("Fills the gap")).toBeVisible();
		expect(
			within(fills!).getByText(
				"Call in Aisha Rahman for Front Desk AM Sat, Oct 17"
			)
		).toBeVisible();
		expect(
			within(fills!).getByText(
				"Chen Wei stays on after Swing Shift until 15:00 (+2 h)"
			)
		).toBeVisible();
		expect(within(cannot!).getByText("Can’t fill the gap")).toBeVisible();
		expect(
			within(cannot!).getByText("Still 1 short 09:00 – 15:00")
		).toBeVisible();
		expect(
			within(cannot!).getByText(
				"Moving anyone would leave another shift short."
			)
		).toBeVisible();
		// None was checked, so one note heads the list for both rather than one under each.
		expect(screen.getAllByText(NONE_CHECKED)).toHaveLength(1);
		expect(screen.queryByText(NOT_CHECKED)).toBeNull();
	});

	it("says the engine found nothing", () => {
		render(
			<EngineRepairOptions
				names={names}
				repair={{ status: "ready", options: [], ask: vi.fn() }}
			/>
		);

		expect(
			screen.getByText("The engine found no way to fill this.")
		).toBeVisible();
	});

	it("says why it was refused, and offers to ask again only when the engine failed", async () => {
		const ask = vi.fn();
		const { rerender } = render(
			<EngineRepairOptions
				names={names}
				repair={{ status: "refused", refusal: "notSeenByEngine", ask }}
			/>
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"The engine sees this shift as fully staffed"
		);
		expect(screen.queryByRole("button")).toBeNull();

		rerender(
			<EngineRepairOptions
				names={names}
				repair={{ status: "refused", refusal: "failed", ask }}
			/>
		);
		await userEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(ask).toHaveBeenCalledOnce();
	});

	it("says the engine took too long this time, and offers to ask again", async () => {
		const ask = vi.fn();
		render(
			<EngineRepairOptions
				names={names}
				repair={{ status: "refused", refusal: "tooSlow", ask }}
			/>
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The engine took too long to look for options this time."
		);
		await userEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(ask).toHaveBeenCalledOnce();
	});

	it("offers to review a change Apply can state, and leaves the rest, or every one without a review, by hand", async () => {
		const onReview = vi.fn();
		const repair = {
			status: "ready" as const,
			options: [
				feasibleRepair([callInMove()]),
				feasibleRepair([stretchMove({ side: null })]),
			],
			ask: vi.fn(),
		};
		const { rerender } = render(
			<EngineRepairOptions names={names} repair={repair} onReview={onReview} />
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Review this change" })
		);
		expect(onReview).toHaveBeenCalledWith([
			expect.objectContaining({ membershipId: "m-1", kind: "WORK" }),
		]);
		expect(
			screen.getAllByText(
				"The app can’t apply this one: make it by hand on the roster."
			)
		).toHaveLength(1);

		rerender(<EngineRepairOptions names={names} repair={repair} />);
		expect(
			screen.queryByRole("button", { name: "Review this change" })
		).toBeNull();
		expect(
			screen.getAllByText(
				"The app can’t apply this one: make it by hand on the roster."
			)
		).toHaveLength(2);
	});

	it("offers to review a stretch, sent as the person's own shift with the minutes after it", async () => {
		const onReview = vi.fn();
		render(
			<EngineRepairOptions
				names={names}
				repair={{
					status: "ready",
					options: [
						feasibleRepair([stretchMove()], {
							kind: "overtime_stretch",
							workingTimeRulesChecked: true,
						}),
					],
					ask: vi.fn(),
				}}
				onReview={onReview}
			/>
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Review this change" })
		);

		expect(onReview).toHaveBeenCalledWith([
			expect.objectContaining({
				membershipId: "m-3",
				kind: "WORK",
				stretchAfterMinutes: 120,
			}),
		]);
		expect(
			screen.queryByText(
				"The app can’t apply this one: make it by hand on the roster."
			)
		).toBeNull();
	});

	it("shows a feasible option the app cannot apply with its moves and the by-hand line, an infeasible one with its reason only", () => {
		render(
			<EngineRepairOptions
				names={names}
				repair={{
					status: "ready",
					options: [
						feasibleRepair([stretchMove({ side: null })]),
						feasibleRepair([reassignMove({ fromDate: "2026-10-16" })]),
						infeasibleRepair(),
					],
					ask: vi.fn(),
				}}
				onReview={vi.fn()}
			/>
		);

		const [stretch, nextDay, cannot] = screen
			.getAllByRole("listitem")
			.filter((item) => item.parentElement?.parentElement?.tagName !== "LI");
		const byHand =
			"The app can’t apply this one: make it by hand on the roster.";
		expect(
			within(stretch!).getByText("Extend Chen Wei’s Swing Shift by 2 h")
		).toBeVisible();
		expect(within(stretch!).getByText(byHand)).toBeVisible();
		expect(
			within(nextDay!).getByText(/^Move Ben Ong from Swing Shift/)
		).toBeVisible();
		expect(within(nextDay!).getByText(byHand)).toBeVisible();
		expect(
			within(cannot!).getByText(
				"Moving anyone would leave another shift short."
			)
		).toBeVisible();
		expect(within(cannot!).queryByText(byHand)).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Review this change" })
		).toBeNull();
	});

	it("notes on each option it holds for when only some options were checked", () => {
		render(
			<EngineRepairOptions
				names={names}
				repair={{
					status: "ready",
					options: [
						feasibleRepair([callInMove()], { workingTimeRulesChecked: true }),
						feasibleRepair([stretchMove()]),
					],
					ask: vi.fn(),
				}}
			/>
		);

		expect(screen.queryByText(NONE_CHECKED)).toBeNull();
		expect(screen.getAllByText(NOT_CHECKED)).toHaveLength(1);
	});

	it("says each option's hours in one line, and nothing for an option from the older repair", () => {
		render(
			<EngineRepairOptions
				names={names}
				repair={{
					status: "ready",
					options: [
						feasibleRepair([callInMove()], {
							kind: "call_in",
							extraMinutes: { overtime: 0, restDayWork: 0, timeOffEarned: 0 },
						}),
						feasibleRepair([stretchMove()], {
							kind: "move",
							extraMinutes: { overtime: 480, restDayWork: 0, timeOffEarned: 0 },
						}),
						feasibleRepair([callInMove()]),
					],
					ask: vi.fn(),
				}}
			/>
		);

		const [free, overtime, older] = screen
			.getAllByRole("listitem")
			.filter((item) => item.parentElement?.parentElement?.tagName !== "LI");
		expect(within(free!).getByText("No extra hours.")).toBeVisible();
		expect(
			within(overtime!).getByText(
				"Adds 8 h of overtime for Chen Wei that week."
			)
		).toBeVisible();
		expect(older).not.toHaveTextContent(/extra hours|Adds/);
	});
});
