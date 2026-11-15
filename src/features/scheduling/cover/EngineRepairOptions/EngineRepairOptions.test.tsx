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
			within(fills!).getByText("Extend Chen Wei’s Swing Shift by 2 h")
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
		expect(screen.getAllByText(NOT_CHECKED)).toHaveLength(2);
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
				repair={{ status: "refused", refusal: "notFromEngine", ask }}
			/>
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"The engine didn’t report this gap"
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

	it("offers to review a change Apply can state, and leaves the rest, or every one without a review, by hand", async () => {
		const onReview = vi.fn();
		const repair = {
			status: "ready" as const,
			options: [
				feasibleRepair([callInMove()]),
				feasibleRepair([stretchMove()]),
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
});
