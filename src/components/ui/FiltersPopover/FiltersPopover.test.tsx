import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState } from "react";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { FiltersPopover } from "@/components/ui/FiltersPopover";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** A page with one filter, applied as soon as it changes. */
const Page = ({
	onChange,
}: {
	onChange: (value: string) => void;
}): FunctionComponent => {
	const [status, setStatus] = useState("all");
	return (
		<FiltersPopover count={status === "all" ? 0 : 1}>
			<Select
				aria-label="Showing"
				value={status}
				options={[
					{ value: "all", label: "All" },
					{ value: "ACTIVE", label: "Active" },
				]}
				onChange={(value) => {
					setStatus(value);
					onChange(value);
				}}
			/>
		</FiltersPopover>
	);
};

/** The Tailwind stacking layer (`z-<n>`) an element is given. */
const layerOf = (element: HTMLElement): number =>
	Number(/(?:^|\s)z-(\d+)(?:\s|$)/.exec(element.className)?.[1] ?? 0);

describe("FiltersPopover", () => {
	it("given_noFilterSet_when_rendered_then_offersOnlyAFiltersButton", () => {
		render(<Page onChange={vi.fn()} />);

		const button = screen.getByRole("button", { name: "Filters" });
		expect(button).not.toHaveAttribute("aria-describedby");
		expect(within(button).queryByText(/\d/)).not.toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("given_aFilterIsChosenInThePanel_when_applied_then_theButtonCountsItAndThePanelStaysOpen", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Page onChange={onChange} />);

		await user.click(screen.getByRole("button", { name: "Filters" }));
		const panel = screen.getByRole("dialog", { name: "Filters" });
		await user.click(within(panel).getByRole("button", { name: "Showing" }));
		await user.click(screen.getByRole("option", { name: "Active" }));

		expect(onChange).toHaveBeenCalledWith("ACTIVE");
		expect(screen.getByRole("dialog", { name: "Filters" })).toBeVisible();
		const button = screen.getByRole("button", { name: "Filters" });
		expect(button).toHaveAccessibleDescription("1 applied");
		expect(within(button).getByText("1")).toBeVisible();
	});

	it("given_theKeyboard_when_openedWithEnter_then_tabMovesIntoThePanel", async () => {
		const user = userEvent.setup();
		render(<Page onChange={vi.fn()} />);

		await user.tab();
		await user.keyboard("{Enter}");
		await user.tab();

		expect(screen.getByRole("button", { name: "Showing" })).toHaveFocus();
	});

	it("given_anOpenPanel_when_escapeIsPressed_then_closesAndReturnsFocusToTheButton", async () => {
		const user = userEvent.setup();
		render(<Page onChange={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: "Filters" }));
		expect(screen.getByRole("dialog", { name: "Filters" })).toBeVisible();
		await user.keyboard("{Escape}");

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Filters" })).toHaveFocus();
	});

	it("given_aSelectOpenedInThePanel_when_itsOptionsShow_then_theyLayerAboveThePanel", async () => {
		const user = userEvent.setup();
		render(<Page onChange={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: "Filters" }));
		const panel = screen.getByRole("dialog", { name: "Filters" });
		await user.click(within(panel).getByRole("button", { name: "Showing" }));
		const options = screen.getByRole("listbox");

		// Both float in their own portal; the options must stack above the panel that holds their Select.
		expect(options).not.toBe(panel);
		expect(panel.contains(options)).toBe(false);
		expect(layerOf(options)).toBeGreaterThan(layerOf(panel));
	});

	it("given_aPhone_when_shown_then_theIconAndCountStandForTheNameItKeeps", () => {
		render(<Page onChange={vi.fn()} />);

		const button = screen.getByRole("button", { name: "Filters" });
		expect(within(button).getByText("Filters")).toHaveClass("max-sm:sr-only");
	});
});
