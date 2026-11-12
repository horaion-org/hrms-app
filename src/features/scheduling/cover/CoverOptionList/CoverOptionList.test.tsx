import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	CoverOptionList,
	type CoverOptionItem,
	type CoverOptionListProps,
} from "./CoverOptionList";

const option = (index: number): CoverOptionItem => ({
	membershipId: `m-${index}`,
	name: `Person ${index}`,
	lines: [`Line of person ${index}`],
});

const show = (
	props: Partial<CoverOptionListProps> = {}
): CoverOptionListProps => {
	const all: CoverOptionListProps = {
		options: [option(1), option(2)],
		selected: "m-1",
		onSelect: vi.fn(),
		unavailable: [
			{ membershipId: "m-9", name: "Aisha Rahman", reason: "On leave" },
		],
		radioName: "cover",
		...props,
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<CoverOptionList {...all} />
		</I18nextProvider>
	);
	return all;
};

describe("CoverOptionList", () => {
	it("given_options_when_shown_then_theFirstIsSuggestedAndChosenAndEachSaysItsLines", () => {
		show();

		const first = screen.getByRole("radio", { name: "Person 1" });
		expect(first).toBeChecked();
		expect(first).toHaveAccessibleDescription(/Suggested/);
		expect(
			screen.getByRole("radio", { name: "Person 2" })
		).not.toHaveAccessibleDescription(/Suggested/);
		expect(screen.getByText("Line of person 2")).toBeVisible();
		expect(
			screen.getByRole("radiogroup", { name: "Who covers" })
		).toBeVisible();
	});

	it("given_anOptionChosen_when_clicked_then_reportsWho", async () => {
		const { onSelect } = show();

		await userEvent.click(screen.getByRole("radio", { name: "Person 2" }));

		expect(onSelect).toHaveBeenCalledWith("m-2");
	});

	it("given_moreThanFive_when_shown_then_fiveThenShowMoreRevealsTheRest", async () => {
		show({ options: [1, 2, 3, 4, 5, 6, 7].map(option) });

		expect(screen.getAllByRole("radio")).toHaveLength(5);
		await userEvent.click(
			screen.getByRole("button", { name: "Show more (2)" })
		);

		expect(screen.getAllByRole("radio")).toHaveLength(7);
		expect(screen.getByRole("button", { name: "Show fewer" })).toBeVisible();
	});

	it("given_cantHelp_when_theDisclosureIsUsed_then_itOpensAndSaysSo", async () => {
		show();

		const disclosure = screen.getByRole("button", { name: "Can't help (1)" });
		expect(disclosure).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Aisha Rahman · On leave")).not.toBeVisible();

		await userEvent.click(disclosure);

		expect(disclosure).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Aisha Rahman · On leave")).toBeVisible();
	});

	it("given_nobodyCanCover_when_shown_then_noRadiosAndCantHelpOpenByItself", () => {
		show({ options: [], selected: undefined, unavailableOpen: true });

		expect(screen.queryByRole("radio")).toBeNull();
		expect(
			screen.getByRole("button", { name: "Can't help (1)" })
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Aisha Rahman · On leave")).toBeVisible();
	});
});
