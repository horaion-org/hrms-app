import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { Select } from "@/components/forms/Select";

/*
 * A multiple Select with wholeGroups, as the constraint dialog's shift field:
 * a row of group chips above one flat list of options. The rest of Select is
 * tested in Select.test.tsx.
 */

const i18n = createInstance();
beforeAll(async () => {
	await i18n.use(initReactI18next).init({
		lng: "en",
		fallbackLng: "en",
		resources: { en: { translation: en } },
	});
});

describe("Select with whole groups", () => {
	/** Whole-group shifts: two groups of one, one of them named as its shift in another case, and a group of two. */
	const shiftOptions = [
		{ value: "morning", label: "Morning", group: "Day" },
		{ value: "early", label: "Early", group: "early" },
		{ value: "late-a", label: "Late A", group: "Late" },
		{ value: "late-b", label: "Late B", group: "Late" },
	];

	/** The group chips' accessible names, in the order shown. */
	const chipNames = (): Array<string | null> =>
		within(screen.getByRole("group", { name: "Shift groups" }))
			.getAllByRole("option")
			.map((chip) => chip.getAttribute("aria-label"));

	it("offers one chip per group with an available option, in the order the groups first appear, under the groups label", async () => {
		const user = userEvent.setup();
		render(
			<Select
				multiple
				wholeGroups
				aria-label="Shifts"
				groupsLabel="Shift groups"
				options={[
					...shiftOptions,
					{ value: "day-late", label: "Day late", group: "Day" },
					{ value: "closed", label: "Closed", group: "Closed", disabled: true },
				]}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Shifts" }));

		expect(chipNames()).toEqual([
			"Whole group: Day",
			"Whole group: early",
			"Whole group: Late",
		]);
		expect(screen.getByText("Shift groups")).toHaveClass(
			"text-xs",
			"text-neutral-600"
		);
		// Many chips wrap onto more lines rather than widen the panel.
		expect(
			screen.getByRole("option", { name: "Whole group: Day" }).parentElement
		).toHaveClass("flex-wrap");
	});

	it("chooses and clears a group's available options from its chip, leaving a disabled option and other groups as they were", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Select
				multiple
				wholeGroups
				aria-label="Shifts"
				defaultValue={["late", "early"]}
				options={[
					{ value: "early", label: "Early", group: "Morning" },
					{ value: "mid", label: "Mid", group: "Morning" },
					{
						value: "closed",
						label: "Closed",
						group: "Morning",
						disabled: true,
					},
					{ value: "late", label: "Late", group: "Evening" },
				]}
				onChange={onChange}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Shifts" }));
		const morning = screen.getByRole("option", {
			name: "Whole group: Morning",
		});
		expect(morning).toHaveAttribute("aria-checked", "mixed");

		await user.click(morning);
		expect(onChange).toHaveBeenLastCalledWith(["early", "mid", "late"]);
		expect(morning).toHaveAttribute("aria-checked", "true");

		await user.click(morning);
		expect(onChange).toHaveBeenLastCalledWith(["late"]);
		expect(morning).toHaveAttribute("aria-checked", "false");
		expect(
			screen.getByRole("option", { name: "Closed Morning" })
		).toHaveAttribute("aria-selected", "false");
	});

	it("fills a chip with a tick when its whole group is chosen, outlines it when some is and leaves it neutral when none is", async () => {
		const user = userEvent.setup();
		render(
			<Select
				multiple
				wholeGroups
				aria-label="Shifts"
				options={shiftOptions}
				value={["morning", "late-a"]}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Shifts" }));

		const all = screen.getByRole("option", { name: "Whole group: Day" });
		const some = screen.getByRole("option", { name: "Whole group: Late" });
		const none = screen.getByRole("option", { name: "Whole group: early" });
		expect(all).toHaveAttribute("aria-checked", "true");
		expect(all).toHaveClass("bg-ink-blue-700", "text-white", "rounded-full");
		expect(all.querySelector("svg")).toBeInTheDocument();
		expect(some).toHaveAttribute("aria-checked", "mixed");
		expect(some).toHaveClass("border-ink-blue-700", "bg-white");
		expect(some.querySelector("svg")).toBeNull();
		expect(none).toHaveAttribute("aria-checked", "false");
		expect(none).toHaveClass("border-neutral-400", "bg-white");
		expect(none.querySelector("svg")).toBeNull();
	});

	it("names a group of several's count on its chip with the caller's words, and none for a group of one or without them", async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<Select
				multiple
				wholeGroups
				aria-label="Shifts"
				groupCountText={(count) => `${String(count)} shifts`}
				options={shiftOptions}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Shifts" }));

		expect(
			screen.getByRole("option", { name: "Whole group: Late" }).textContent
		).toBe("Late 2 shifts");
		expect(
			screen.getByRole("option", { name: "Whole group: Day" }).textContent
		).toBe("Day");

		rerender(
			<Select multiple wholeGroups aria-label="Shifts" options={shiftOptions} />
		);
		expect(
			screen.getByRole("option", { name: "Whole group: Late" }).textContent
		).toBe("Late");
	});

	it("lists every option as one flat row with no group headings, naming its group after the label only when it differs", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Select
				multiple
				wholeGroups
				aria-label="Shifts"
				groupsLabel="Shift groups"
				options={shiftOptions}
				onChange={onChange}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Shifts" }));

		const rows = screen
			.getAllByRole("option")
			.filter(
				(option) => !chipNames().includes(option.getAttribute("aria-label"))
			);
		expect(rows.map((row) => row.textContent)).toEqual([
			"Morning Day",
			"Early",
			"Late A Late",
			"Late B Late",
		]);
		rows.forEach((row) => {
			expect(row).toHaveClass("px-4");
		});
		// The chips' row is the only group: no heading rows among the options.
		expect(screen.getAllByRole("group")).toHaveLength(1);
		expect(
			within(screen.getByRole("option", { name: "Morning Day" })).getByText(
				"Day"
			)
		).toHaveClass("text-neutral-600");

		await user.click(screen.getByRole("option", { name: "Late A Late" }));
		expect(onChange).toHaveBeenLastCalledWith(["late-a"]);
	});

	it("keeps the select-all row first and working beside the group chips", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Select
				multiple
				wholeGroups
				aria-label="Shifts"
				options={shiftOptions}
				selectAllLabel="Select all"
				onChange={onChange}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Shifts" }));
		const selectAll = screen.getByRole("option", { name: "Select all" });
		expect(screen.getAllByRole("option")[0]).toBe(selectAll);

		await user.click(selectAll);
		expect(onChange).toHaveBeenLastCalledWith([
			"morning",
			"early",
			"late-a",
			"late-b",
		]);
		const late = screen.getByRole("option", { name: "Whole group: Late" });
		expect(late).toHaveAttribute("aria-checked", "true");

		await user.click(late);
		expect(onChange).toHaveBeenLastCalledWith(["morning", "early"]);
	});

	it("reaches the group chips with the arrow keys and chooses a group with Enter", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Select
				multiple
				wholeGroups
				aria-label="Shifts"
				options={shiftOptions}
				onChange={onChange}
			/>
		);
		await user.tab();
		// The first arrow opens the list, the second reaches its first option: the first chip.
		await user.keyboard("{ArrowDown}{ArrowDown}");
		const listbox = screen.getByRole("listbox");
		const activeName = (): string | null | undefined =>
			listbox.ownerDocument
				.getElementById(listbox.getAttribute("aria-activedescendant") ?? "")
				?.getAttribute("aria-label");
		expect(activeName()).toBe("Whole group: Day");
		await user.keyboard("{ArrowDown}{ArrowDown}");
		expect(activeName()).toBe("Whole group: Late");

		await user.keyboard("{Enter}");
		expect(onChange).toHaveBeenLastCalledWith(["late-a", "late-b"]);
	});
});
