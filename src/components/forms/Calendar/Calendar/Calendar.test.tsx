import { act, render, screen, waitFor, within } from "@testing-library/react";
import { createRef } from "react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import {
	Calendar,
	type CalendarProps,
	type DateRange,
} from "@/components/forms/Calendar";
import * as stories from "@/components/forms/Calendar/Calendar/Calendar.stories";
import { Button } from "@/components/ui/Button";

const i18n = createInstance();
beforeAll(async () => {
	await i18n.use(initReactI18next).init({
		lng: "en",
		fallbackLng: "en",
		resources: { en: { translation: en }, es: { translation: es } },
	});
});

beforeEach(async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(2026, 5, 10, 12));
	await i18n.changeLanguage("en");
});
afterEach(() => {
	vi.useRealTimers();
});

describe("Calendar forms", () => {
	it("focuses the current roving cell on RHF/Zod errors and submits valid single and range JSON", async () => {
		const user = userEvent.setup();
		const { ReactHookForm } = composeStories(stories);
		render(<ReactHookForm />);
		const single = within(screen.getByRole("grid", { name: "Required date" }));
		const range = within(screen.getByRole("grid", { name: "Required range" }));
		const submit = screen.getByRole("button", { name: "Submit" });
		const output = screen.getByRole("status", { name: "Submitted values" });
		await user.click(submit);
		await waitFor(() =>
			expect(
				single.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
			).toHaveFocus()
		);
		await user.keyboard("{ArrowRight}");
		await user.click(submit);
		await waitFor(() =>
			expect(
				single.getByRole("gridcell", { name: "Thursday, 11 June 2026" })
			).toHaveFocus()
		);
		expect(document.activeElement).toHaveAttribute("tabindex", "0");
		expect(screen.getByText("Choose a date")).toBeInTheDocument();
		expect(screen.getByText("Choose a complete range")).toBeInTheDocument();
		expect(output).toHaveTextContent("Not submitted");
		await user.keyboard("{Enter}");
		await user.click(submit);
		await waitFor(() =>
			expect(
				range.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
			).toHaveFocus()
		);
		await user.keyboard("{Enter}{ArrowRight}{ArrowRight}");
		await user.click(submit);
		await waitFor(() =>
			expect(
				range.getByRole("gridcell", { name: "Friday, 12 June 2026" })
			).toHaveFocus()
		);
		expect(output).toHaveTextContent("Not submitted");
		expect(document.activeElement).toHaveAttribute("tabindex", "0");
		await user.keyboard("{Enter}");
		await user.click(submit);
		await waitFor(() =>
			expect(output).toHaveTextContent(
				JSON.stringify({
					date: "2026-06-11",
					range: { start: "2026-06-10", end: "2026-06-12" },
				})
			)
		);
		expect(screen.queryByText("Choose a date")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Choose a complete range")
		).not.toBeInTheDocument();
	});

	it.each(["aria-label", "aria-labelledby"] as const)(
		"names all three grids through %s",
		async (labelProp) => {
			const user = userEvent.setup();
			render(
				<>
					<span id="calendar-label">Leave dates</span>
					<Calendar
						{...{
							[labelProp]:
								labelProp === "aria-label" ? "Leave dates" : "calendar-label",
						}}
					/>
				</>
			);
			expect(
				screen.getByRole("grid", { name: "Leave dates" })
			).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: "Show months" }));
			expect(
				screen.getByRole("grid", { name: "Leave dates" })
			).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: "Show years" }));
			expect(
				screen.getByRole("grid", { name: "Leave dates" })
			).toBeInTheDocument();
		}
	);

	it.each(["single", "range"] as const)(
		"resets an empty %s default and clears any draft and preview without a name",
		async (mode) => {
			const user = userEvent.setup();
			const form = createRef<HTMLFormElement>();
			const ref = createRef<HTMLElement>();
			render(
				<form ref={form}>
					<Calendar
						ref={ref}
						defaultMonth="2026-06-01"
						defaultValue={null}
						mode={mode}
					/>
				</form>
			);
			const start = screen.getByRole("gridcell", {
				name: "Monday, 15 June 2026",
			});
			const end = screen.getByRole("gridcell", {
				name: "Friday, 19 June 2026",
			});
			await user.click(start);
			await user.click(end);
			act(() => {
				form.current?.reset();
			});
			expect(
				screen.queryAllByRole("gridcell", { selected: true })
			).toHaveLength(0);
			await user.click(start);
			await user.hover(end);
			act(() => {
				form.current?.reset();
			});
			expect(end).not.toHaveAttribute("data-range-preview");
			expect(start).not.toHaveAttribute("data-range");
			expect(
				screen.queryAllByRole("gridcell", { selected: true })
			).toHaveLength(0);
			expect(ref.current).toBe(
				screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
			);
			expect(ref.current).toHaveFocus();
			await user.click(start);
			expect(end).not.toHaveAttribute("data-range");
			if (mode === "range")
				expect(start).toHaveAccessibleDescription(
					"Range start; choose an end date"
				);
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual([]);
		}
	);

	it.each(["single", "range"] as const)(
		"keeps controlled %s ownership on reset and focuses its current value rather than defaultValue",
		async (mode) => {
			const user = userEvent.setup();
			const ref = createRef<HTMLElement>();
			const form = createRef<HTMLFormElement>();
			const onChange = vi.fn();
			const props: CalendarProps =
				mode === "single"
					? { value: "2026-06-10", defaultValue: "2025-01-01" }
					: {
							mode: "range",
							value: { start: "2026-06-10", end: "2026-06-12" },
							defaultValue: { start: "2025-01-01", end: "2025-01-03" },
						};
			render(
				<form ref={form}>
					<Calendar {...props} ref={ref} name="leave" onChange={onChange} />
				</form>
			);
			await user.click(
				screen.getByRole("gridcell", { name: "Sunday, 12 July 2026" })
			);
			onChange.mockClear();
			act(() => {
				form.current?.reset();
			});
			expect(ref.current).toBe(
				screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
			);
			expect(ref.current).toHaveAttribute("tabindex", "0");
			expect(ref.current).toHaveFocus();
			expect(onChange).not.toHaveBeenCalled();
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual(
				mode === "single"
					? [["leave", "2026-06-10"]]
					: [
							["leave[start]", "2026-06-10"],
							["leave[end]", "2026-06-12"],
						]
			);
		}
	);

	it.each([false, true])(
		"submits only completed range endpoints, including a replacement draft (controlled=%s)",
		async (controlled) => {
			const user = userEvent.setup();
			const form = createRef<HTMLFormElement>();
			const original = { start: "2026-06-01", end: "2026-06-03" };
			const { rerender } = render(
				<form ref={form}>
					<Calendar
						aria-label="Leave"
						mode="range"
						name="leave"
						{...(controlled ? { value: original } : { defaultValue: original })}
					/>
					<Calendar defaultValue={original} mode="range" />
				</form>
			);
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
				["leave[start]", "2026-06-01"],
				["leave[end]", "2026-06-03"],
			]);
			const grid = within(screen.getByRole("grid", { name: "Leave" }));
			await user.click(
				grid.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
			);
			await user.hover(
				grid.getByRole("gridcell", { name: "Friday, 12 June 2026" })
			);
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
				["leave[start]", ""],
				["leave[end]", ""],
			]);
			await user.click(
				grid.getByRole("gridcell", { name: "Friday, 12 June 2026" })
			);
			if (controlled)
				rerender(
					<form ref={form}>
						<Calendar
							mode="range"
							name="leave"
							value={{ start: "2026-06-10", end: "2026-06-12" }}
						/>
					</form>
				);
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
				["leave[start]", "2026-06-10"],
				["leave[end]", "2026-06-12"],
			]);
		}
	);

	it("submits single ISO dates or empty values and omits unnamed Calendars", async () => {
		const user = userEvent.setup();
		const form = createRef<HTMLFormElement>();
		render(
			<form ref={form}>
				<Calendar aria-label="Date" name="date" />
				<Calendar defaultValue="2026-06-12" />
			</form>
		);
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
			["date", ""],
		]);
		await user.click(
			within(screen.getByRole("grid", { name: "Date" })).getByRole("gridcell", {
				name: "Wednesday, 10 June 2026",
			})
		);
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
			["date", "2026-06-10"],
		]);
	});

	it.each(["single", "range"] as const)(
		"restores %s defaults, view and roving ref after native reset from another year",
		async (mode) => {
			const user = userEvent.setup();
			const ref = createRef<HTMLElement>();
			const form = createRef<HTMLFormElement>();
			const props: CalendarProps =
				mode === "single"
					? { defaultValue: "2026-06-10" }
					: {
							mode: "range",
							defaultValue: { start: "2026-06-10", end: "2026-06-12" },
						};
			render(
				<form ref={form}>
					<Calendar {...props} ref={ref} name="leave" />
					<Button type="reset">Reset</Button>
				</form>
			);
			await user.click(
				screen.getByRole("gridcell", { name: "Monday, 15 June 2026" })
			);
			await user.hover(
				screen.getByRole("gridcell", { name: "Friday, 19 June 2026" })
			);
			await user.click(screen.getByRole("button", { name: "Show months" }));
			await user.click(screen.getByRole("button", { name: "Show years" }));
			await user.keyboard("{ArrowRight}");
			act(() => {
				form.current?.reset();
			});
			expect(screen.getByText("June 2026")).toBeInTheDocument();
			const restored = screen.getByRole("gridcell", {
				name: "Wednesday, 10 June 2026",
			});
			expect(ref.current).toBe(restored);
			expect(restored).toHaveAttribute("tabindex", "0");
			expect(restored).toHaveFocus();
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual(
				mode === "single"
					? [["leave", "2026-06-10"]]
					: [
							["leave[start]", "2026-06-10"],
							["leave[end]", "2026-06-12"],
						]
			);
			expect(
				screen.getByRole("gridcell", { name: "Monday, 15 June 2026" })
			).not.toHaveAttribute("data-range");
			await user.click(screen.getByRole("button", { name: "Next month" }));
			await user.click(screen.getByRole("button", { name: "Reset" }));
			expect(screen.getByRole("button", { name: "Reset" })).toHaveFocus();
			act(() => {
				ref.current?.focus();
			});
			expect(
				screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
			).toHaveFocus();
		}
	);

	it("exposes the current roving cell through keyboard movement, paging and every view", async () => {
		const user = userEvent.setup();
		const ref = createRef<HTMLElement>();
		const { unmount } = render(
			<Calendar ref={ref} defaultValue="2026-06-10" />
		);
		const focusThroughRef = (name: string): void => {
			const cell = screen.getByRole("gridcell", { name });
			expect(ref.current).toBe(cell);
			expect(cell).toHaveAttribute("tabindex", "0");
			act(() => {
				ref.current?.focus();
			});
			expect(cell).toHaveFocus();
		};
		focusThroughRef("Wednesday, 10 June 2026");
		await user.keyboard("{ArrowRight}");
		focusThroughRef("Thursday, 11 June 2026");
		await user.keyboard("{PageDown}");
		focusThroughRef("Saturday, 11 July 2026");
		await user.click(screen.getByRole("button", { name: "Show months" }));
		focusThroughRef("July");
		await user.keyboard("{ArrowRight}");
		focusThroughRef("August");
		await user.click(screen.getByRole("button", { name: "Show years" }));
		focusThroughRef("2026");
		await user.keyboard("{ArrowRight}");
		focusThroughRef("2027");
		await user.keyboard("{Enter}");
		focusThroughRef("August");
		await user.keyboard("{Enter}");
		focusThroughRef("Wednesday, 11 August 2027");
		await user.click(screen.getByRole("button", { name: "Next month" }));
		focusThroughRef("Saturday, 11 September 2027");
		unmount();
		expect(ref.current).toBeNull();
	});
});

describe("Calendar", () => {
	it("uses the completed range start for month and year indicators while a draft survives drilling", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar
				defaultValue={{ start: "2025-12-30", end: "2026-01-02" }}
				mode="range"
				onChange={onChange}
			/>
		);
		expect(screen.getByText("December 2025")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Show months" }));
		expect(
			screen.getByRole("gridcell", { name: "December", selected: true })
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Show years" }));
		expect(
			screen.getByRole("gridcell", { name: "2025", selected: true })
		).toBeInTheDocument();
		await user.click(screen.getByRole("gridcell", { name: "2026" }));
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
		await user.click(screen.getByRole("gridcell", { name: "June" }));
		await user.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		await user.click(screen.getByRole("button", { name: "Show months" }));
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
		await user.click(screen.getByRole("button", { name: "Show years" }));
		expect(
			screen.getByRole("gridcell", { name: "2025", selected: true })
		).toBeInTheDocument();
		await user.click(screen.getByRole("gridcell", { name: "2026" }));
		await user.click(screen.getByRole("gridcell", { name: "July" }));
		expect(onChange).not.toHaveBeenCalled();
		await user.click(
			screen.getByRole("gridcell", { name: "Friday, 3 July 2026" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-10",
			end: "2026-07-03",
		});
		await user.click(screen.getByRole("button", { name: "Show months" }));
		expect(
			screen.getByRole("gridcell", { name: "June", selected: true })
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Show years" }));
		expect(
			screen.getByRole("gridcell", { name: "2026", selected: true })
		).toBeInTheDocument();
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ date: "2026-12-31", title: "2015 - 2026", first: "2015", last: "2026" },
		{ date: "2027-01-01", title: "2027 - 2038", first: "2027", last: "2038" },
		{ date: "2014-12-31", title: "2003 - 2014", first: "2003", last: "2014" },
		{ date: "2002-01-01", title: "1991 - 2002", first: "1991", last: "2002" },
	])(
		"aligns the year block containing $date without inventing a selection",
		async ({ date, title, first, last }) => {
			render(<Calendar defaultMonth={date} />);
			await userEvent.click(
				screen.getByRole("button", { name: "Show months" })
			);
			expect(
				screen.queryAllByRole("gridcell", { selected: true })
			).toHaveLength(0);
			await userEvent.click(screen.getByRole("button", { name: "Show years" }));
			expect(screen.getByText(title)).toBeInTheDocument();
			expect(screen.getAllByRole("gridcell")[0]).toHaveAccessibleName(first);
			expect(screen.getAllByRole("gridcell")[11]).toHaveAccessibleName(last);
			expect(
				screen.queryAllByRole("gridcell", { selected: true })
			).toHaveLength(0);
		}
	);

	it("follows controlled selection updates in months and years independently of navigation", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<Calendar value="2026-06-10" onChange={onChange} />
		);
		await userEvent.click(screen.getByRole("button", { name: "Show months" }));
		rerender(<Calendar value="2026-08-15" onChange={onChange} />);
		expect(
			screen.getByRole("gridcell", { name: "August", selected: true })
		).toBeInTheDocument();
		expect(screen.getByRole("gridcell", { name: "June" })).toHaveAttribute(
			"aria-selected",
			"false"
		);
		await userEvent.click(screen.getByRole("button", { name: "Show years" }));
		rerender(<Calendar value="2024-02-29" onChange={onChange} />);
		expect(
			screen.getByRole("gridcell", { name: "2024", selected: true })
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("gridcell", { name: "2024" }));
		expect(
			screen.getByRole("gridcell", { name: "February", selected: true })
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("gridcell", { name: "February" }));
		expect(
			screen.getByRole("gridcell", {
				name: "Thursday, 29 February 2024",
				selected: true,
			})
		).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("localises every drill and paging action and the short month names in Spanish", async () => {
		render(<Calendar defaultValue="2026-06-10" />);
		await act(async () => {
			await i18n.changeLanguage("es-ES");
		});
		await userEvent.click(
			screen.getByRole("button", { name: "Mostrar meses" })
		);
		expect(
			screen.getAllByRole("gridcell").map((cell) => cell.textContent)
		).toEqual([
			"ene",
			"feb",
			"mar",
			"abr",
			"may",
			"jun",
			"jul",
			"ago",
			"sep",
			"oct",
			"nov",
			"dic",
		]);
		expect(
			screen.getByRole("gridcell", { name: "junio", selected: true })
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Año siguiente" })
		);
		expect(screen.getByText("2027")).toHaveAttribute("aria-live", "polite");
		await userEvent.click(screen.getByRole("button", { name: "Año anterior" }));
		await userEvent.click(screen.getByRole("button", { name: "Mostrar años" }));
		await userEvent.click(
			screen.getByRole("button", { name: "12 años anteriores" })
		);
		expect(screen.getByText("2003 - 2014")).toHaveAttribute(
			"aria-live",
			"polite"
		);
		await userEvent.click(
			screen.getByRole("button", { name: "12 años siguientes" })
		);
		expect(screen.getByText("2015 - 2026")).toHaveAttribute(
			"aria-live",
			"polite"
		);
		await userEvent.click(screen.getByRole("gridcell", { name: "2026" }));
		await act(async () => {
			await i18n.changeLanguage("en");
		});
		expect(
			screen.getByRole("gridcell", { name: "June", selected: true })
		).toHaveTextContent("Jun");
		expect(screen.getByRole("button", { name: "Show years" })).toBeEnabled();
		await userEvent.click(screen.getByRole("gridcell", { name: "June" }));
		expect(screen.getByText("June 2026")).toBeInTheDocument();
	});

	it("drills to four-column years, pages fixed blocks both ways and navigates back without selecting", async () => {
		const onChange = vi.fn();
		render(
			<Calendar
				aria-label="Leave date"
				defaultValue="2026-06-10"
				onChange={onChange}
			/>
		);
		await userEvent.click(screen.getByRole("button", { name: "Show months" }));
		await userEvent.click(screen.getByRole("button", { name: "Show years" }));
		expect(screen.getByText("2015 - 2026")).toHaveAttribute(
			"aria-live",
			"polite"
		);
		expect(screen.getByRole("button", { name: "2015 - 2026" })).toBeDisabled();
		const rows = within(
			screen.getByRole("grid", { name: "Leave date" })
		).getAllByRole("row");
		expect(rows).toHaveLength(3);
		for (const row of rows) {
			expect(row).toHaveClass("grid-cols-4");
			expect(within(row).getAllByRole("gridcell")).toHaveLength(4);
		}
		expect(
			screen.getAllByRole("gridcell").map((cell) => cell.textContent)
		).toEqual([
			"2015",
			"2016",
			"2017",
			"2018",
			"2019",
			"2020",
			"2021",
			"2022",
			"2023",
			"2024",
			"2025",
			"2026",
		]);
		expect(
			screen.getByRole("gridcell", { name: "2026", selected: true })
		).toHaveClass("bg-ink-blue-900", "text-white");
		await userEvent.click(
			screen.getByRole("button", { name: "Next 12 years" })
		);
		expect(screen.getByText("2027 - 2038")).toHaveAttribute(
			"aria-live",
			"polite"
		);
		expect(screen.getAllByRole("gridcell")[0]).toHaveAccessibleName("2027");
		expect(screen.getAllByRole("gridcell")[11]).toHaveAccessibleName("2038");
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Previous 12 years" })
		);
		expect(
			screen.getByRole("gridcell", { name: "2026", selected: true })
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Previous 12 years" })
		);
		expect(screen.getByText("2003 - 2014")).toBeInTheDocument();
		expect(screen.getAllByRole("gridcell")[0]).toHaveAccessibleName("2003");
		expect(screen.getAllByRole("gridcell")[11]).toHaveAccessibleName("2014");
		await userEvent.click(screen.getByRole("gridcell", { name: "2014" }));
		expect(screen.getByText("2014")).toHaveAttribute("aria-live", "polite");
		expect(screen.getByRole("button", { name: "Show years" })).toBeEnabled();
		await userEvent.click(screen.getByRole("gridcell", { name: "December" }));
		expect(screen.getByText("December 2014")).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("drills to four-column months, pages years, and returns to days without changing selection", async () => {
		const onChange = vi.fn();
		render(
			<Calendar
				aria-label="Leave date"
				defaultValue="2026-06-10"
				onChange={onChange}
			/>
		);
		await userEvent.click(screen.getByRole("button", { name: "Show months" }));
		expect(screen.getByText("2026")).toHaveAttribute("aria-live", "polite");
		const grid = screen.getByRole("grid", { name: "Leave date" });
		const rows = within(grid).getAllByRole("row");
		expect(rows).toHaveLength(3);
		for (const row of rows) {
			expect(row).toHaveClass("grid-cols-4");
			expect(within(row).getAllByRole("gridcell")).toHaveLength(4);
		}
		expect(
			within(grid)
				.getAllByRole("gridcell")
				.map((cell) => cell.textContent)
		).toEqual([
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		]);
		expect(
			screen.getByRole("gridcell", { name: "June", selected: true })
		).toHaveClass("bg-ink-blue-900", "text-white");
		await userEvent.click(screen.getByRole("button", { name: "Next year" }));
		expect(screen.getByText("2027")).toBeInTheDocument();
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Previous year" })
		);
		expect(
			screen.getByRole("gridcell", { name: "June", selected: true })
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("gridcell", { name: "February" }));
		expect(screen.getByText("February 2026")).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole("button", { name: "Show months" }));
		await userEvent.click(screen.getByRole("gridcell", { name: "June" }));
		expect(
			screen.getByRole("gridcell", {
				name: "Wednesday, 10 June 2026",
				selected: true,
			})
		).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("updates an uncontrolled default selection in explicit single mode", async () => {
		render(<Calendar defaultValue="2026-06-10" mode="single" />);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Saturday, 13 June 2026" })
		);
		expect(
			screen.getByRole("gridcell", {
				name: "Saturday, 13 June 2026",
				selected: true,
			})
		).toHaveClass("bg-ink-blue-900", "text-white");
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveAttribute("aria-selected", "false");
	});

	it("uses an external label for the grid", () => {
		render(
			<>
				<span id="leave-date">First day of leave</span>
				<Calendar aria-labelledby="leave-date" />
			</>
		);
		expect(
			screen.getByRole("grid", { name: "First day of leave" })
		).toBeInTheDocument();
	});
	it.each([
		{
			month: "2024-02-29",
			first: "Monday, 29 January 2024",
			last: "Sunday, 10 March 2024",
			end: "Thursday, 29 February 2024",
			iso: "2024-02-29",
		},
		{
			month: "2025-02-28",
			first: "Monday, 27 January 2025",
			last: "Sunday, 9 March 2025",
			end: "Friday, 28 February 2025",
			iso: "2025-02-28",
		},
		{
			month: "2000-02-29",
			first: "Monday, 31 January 2000",
			last: "Sunday, 12 March 2000",
			end: "Tuesday, 29 February 2000",
			iso: "2000-02-29",
		},
		{
			month: "2100-02-28",
			first: "Monday, 1 February 2100",
			last: "Sunday, 14 March 2100",
			end: "Sunday, 28 February 2100",
			iso: "2100-02-28",
		},
		{
			month: "2026-03-01",
			first: "Monday, 23 February 2026",
			last: "Sunday, 5 April 2026",
			end: "Tuesday, 31 March 2026",
			iso: "2026-03-31",
		},
	])(
		"handles leap years and six-week months ($month)",
		async ({ month, first, last, end, iso }) => {
			const onChange = vi.fn();
			render(<Calendar defaultMonth={month} onChange={onChange} />);
			const cells = screen.getAllByRole("gridcell");
			expect(cells).toHaveLength(42);
			expect(cells[0]).toHaveAccessibleName(first);
			expect(cells[41]).toHaveAccessibleName(last);
			if (iso.endsWith("02-28"))
				expect(
					screen.queryByRole("gridcell", { name: /29 February/ })
				).not.toBeInTheDocument();
			await userEvent.click(screen.getByRole("gridcell", { name: end }));
			expect(onChange).toHaveBeenCalledExactlyOnceWith(iso);
		}
	);

	it("selects a previous-month day across the year boundary", async () => {
		const onChange = vi.fn();
		render(<Calendar defaultMonth="2026-01-01" onChange={onChange} />);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Wednesday, 31 December 2025" })
		);
		expect(screen.getByText("December 2025")).toBeInTheDocument();
		expect(onChange).toHaveBeenCalledExactlyOnceWith("2025-12-31");
	});

	it("pages from a long month through leap February to March and back", async () => {
		render(<Calendar defaultMonth="2024-01-31" />);
		await userEvent.click(screen.getByRole("button", { name: "Next month" }));
		expect(screen.getByText("February 2024")).toBeInTheDocument();
		expect(
			screen.getByRole("gridcell", { name: "Thursday, 29 February 2024" })
		).not.toHaveClass("text-neutral-400");
		await userEvent.click(screen.getByRole("button", { name: "Next month" }));
		expect(screen.getByText("March 2024")).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Previous month" })
		);
		expect(screen.getByText("February 2024")).toBeInTheDocument();
	});

	it("follows language changes with Spanish dates, weekdays and actions while keeping Monday first", async () => {
		render(<Calendar defaultValue="2026-06-10" />);
		await act(async () => {
			await i18n.changeLanguage("es-ES");
		});
		expect(screen.getByText("junio 2026")).toBeInTheDocument();
		expect(
			screen
				.getAllByRole("columnheader")
				.map((header) => header.getAttribute("aria-label"))
		).toEqual([
			"lunes",
			"martes",
			"miércoles",
			"jueves",
			"viernes",
			"sábado",
			"domingo",
		]);
		expect(
			screen.getByRole("columnheader", { name: "lunes" })
		).toHaveTextContent("lun");
		expect(
			screen.getByRole("gridcell", { name: "miércoles, 10 junio 2026" })
		).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("button", { name: "Mes anterior" })
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Mes siguiente" })
		);
		expect(screen.getByText("julio 2026")).toBeInTheDocument();
		await act(async () => {
			await i18n.changeLanguage("en");
		});
		expect(screen.getByText("July 2026")).toBeInTheDocument();
	});
	it("pages across December and January without changing the selected date", async () => {
		const onChange = vi.fn();
		render(<Calendar defaultValue="2025-12-31" onChange={onChange} />);
		const next = screen.getByRole("button", { name: "Next month" });
		expect(next).toHaveClass("size-9", "bg-transparent");
		await userEvent.click(next);
		expect(screen.getByText("January 2026")).toHaveAttribute(
			"aria-live",
			"polite"
		);
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 31 December 2025" })
		).toHaveAttribute("aria-selected", "true");
		await userEvent.click(
			screen.getByRole("button", { name: "Previous month" })
		);
		expect(screen.getByText("December 2025")).toBeInTheDocument();
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 31 December 2025" })
		).toHaveAttribute("aria-selected", "true");
		expect(onChange).not.toHaveBeenCalled();
	});
	it.each([
		{
			props: { value: "2024-02-29", defaultMonth: "2025-01-01" },
			title: "February 2024",
			selected: "Thursday, 29 February 2024",
		},
		{
			props: { defaultValue: "2025-12-31", defaultMonth: "2025-01-01" },
			title: "December 2025",
			selected: "Wednesday, 31 December 2025",
		},
		{
			props: { defaultMonth: "2025-01-31" },
			title: "January 2025",
			selected: undefined,
		},
		{
			props: {
				value: null,
				defaultValue: "2024-02-29",
				defaultMonth: "2025-01-01",
			},
			title: "January 2025",
			selected: undefined,
		},
	])(
		"initialises from selection then defaultMonth ($title)",
		({ props, title, selected }) => {
			render(<Calendar {...props} />);
			expect(screen.getByText(title)).toBeInTheDocument();
			if (selected)
				expect(
					screen.getByRole("gridcell", { name: selected })
				).toHaveAttribute("aria-selected", "true");
			else
				expect(
					screen.queryAllByRole("gridcell", { selected: true })
				).toHaveLength(0);
		}
	);

	it("keeps controlled selection with the caller, including null, and accepts updated values", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<Calendar value="2026-06-10" onChange={onChange} />
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Thursday, 11 June 2026" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-06-11");
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("gridcell", { name: "Thursday, 11 June 2026" })
		).toHaveAttribute("aria-selected", "false");
		rerender(<Calendar value="2026-06-11" onChange={onChange} />);
		expect(
			screen.getByRole("gridcell", { name: "Thursday, 11 June 2026" })
		).toHaveAttribute("aria-selected", "true");
		rerender(<Calendar value={null} onChange={onChange} />);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Thursday, 11 June 2026" })
		);
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
	});

	it("types single dates and Date ranges according to mode", () => {
		expectTypeOf<{
			value: string;
			onChange: (value: string) => void;
		}>().toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "single";
			defaultValue: string;
		}>().toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "range";
			value: DateRange;
			onChange: (value: DateRange) => void;
		}>().toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "single";
			value: DateRange;
		}>().not.toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "range";
			value: string;
		}>().not.toExtend<CalendarProps>();
		expectTypeOf<{ value: Date }>().not.toExtend<CalendarProps>();
	});
	it("selects an ISO date and moves to a neighbouring month without submitting a form", async () => {
		const onChange = vi.fn();
		const onSubmit = vi.fn((event: React.FormEvent) => {
			event.preventDefault();
		});
		render(
			<form onSubmit={onSubmit}>
				<Calendar onChange={onChange} />
			</form>
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		expect(onChange).toHaveBeenLastCalledWith("2026-06-10");
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveClass("bg-ink-blue-900", "text-white");
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Sunday, 12 July 2026" })
		);
		expect(onChange).toHaveBeenLastCalledWith("2026-07-12");
		expect(screen.getByText("July 2026")).toBeInTheDocument();
		expect(
			screen.getByRole("gridcell", { name: "Sunday, 12 July 2026" })
		).toHaveAttribute("aria-selected", "true");
		expect(onSubmit).not.toHaveBeenCalled();
	});
	it("shows six Monday-first weeks with Weekend, neighbouring days and today states", () => {
		render(<Calendar aria-label="Leave date" className="w-full" />);
		const grid = screen.getByRole("grid", { name: "Leave date" });
		expect(grid.parentElement).toHaveClass("w-full", "bg-white", "border");
		expect(screen.getByText("June 2026")).toBeInTheDocument();
		expect(
			within(grid)
				.getAllByRole("columnheader")
				.map((header) => header.getAttribute("aria-label"))
		).toEqual([
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		]);
		const rows = within(grid).getAllByRole("row");
		expect(rows).toHaveLength(7);
		for (const row of rows.slice(1))
			expect(within(row).getAllByRole("gridcell")).toHaveLength(7);
		const cells = within(grid).getAllByRole("gridcell");
		expect(cells).toHaveLength(42);
		expect(cells[0]).toHaveAccessibleName("Monday, 1 June 2026");
		expect(cells[41]).toHaveAccessibleName("Sunday, 12 July 2026");
		expect(screen.getByRole("columnheader", { name: "Saturday" })).toHaveClass(
			"text-ink-blue-500"
		);
		expect(screen.getByRole("columnheader", { name: "Sunday" })).toHaveClass(
			"text-ink-blue-500"
		);
		expect(
			screen.getByRole("gridcell", { name: "Saturday, 6 June 2026" })
		).toHaveClass("text-ink-blue-500");
		expect(
			screen.getByRole("gridcell", { name: "Sunday, 7 June 2026" })
		).toHaveClass("text-ink-blue-500");
		expect(cells[41]).toHaveClass("text-neutral-400");
		const today = screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
		});
		expect(today).toHaveAttribute("aria-current", "date");
		expect(today).toHaveAttribute("aria-selected", "false");
		expect(today).toHaveClass(
			"underline",
			"hover:bg-porcelain-50",
			"active:bg-porcelain-500"
		);
	});
});

describe("Calendar limits", () => {
	it("starts a new draft if updated limits make the previous range start unavailable", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const { rerender } = render(
			<Calendar defaultMonth="2026-06-01" mode="range" onChange={onChange} />
		);
		await user.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		rerender(
			<Calendar
				defaultMonth="2026-06-01"
				minDate="2026-06-11"
				mode="range"
				onChange={onChange}
			/>
		);
		await user.click(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		);
		expect(onChange).not.toHaveBeenCalled();
		await user.click(
			screen.getByRole("gridcell", { name: "Saturday, 13 June 2026" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-12",
			end: "2026-06-13",
		});
	});

	it.each([false, true])(
		"allows a range across a disabled day but never a disabled endpoint (reversed=%s)",
		async (reversed) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Calendar
					defaultMonth="2026-06-01"
					isDateDisabled={(date) => date === "2026-06-11"}
					maxDate="2026-06-12"
					minDate="2026-06-10"
					mode="range"
					onChange={onChange}
				/>
			);
			const middle = screen.getByRole("gridcell", {
				name: "Thursday, 11 June 2026",
			});
			const start = screen.getByRole("gridcell", {
				name: "Wednesday, 10 June 2026",
			});
			const end = screen.getByRole("gridcell", {
				name: "Friday, 12 June 2026",
			});
			const before = screen.getByRole("gridcell", {
				name: "Tuesday, 9 June 2026",
			});
			const after = screen.getByRole("gridcell", {
				name: "Saturday, 13 June 2026",
			});
			await user.click(before);
			await user.click(middle);
			await user.click(after);
			expect(
				screen.queryAllByRole("gridcell", { selected: true })
			).toHaveLength(0);
			await user.click(reversed ? end : start);
			await user.click(before);
			await user.click(middle);
			await user.click(after);
			expect(onChange).not.toHaveBeenCalled();
			expect(screen.getAllByRole("gridcell", { selected: true })).toEqual([
				reversed ? end : start,
			]);
			await user.hover(reversed ? start : end);
			expect(middle).toHaveAttribute("aria-disabled", "true");
			expect(middle).toHaveClass("bg-ink-blue-50", "text-neutral-400");
			await user.click(reversed ? start : end);
			expect(onChange).toHaveBeenCalledExactlyOnceWith({
				start: "2026-06-10",
				end: "2026-06-12",
			});
			expect(middle).toHaveAttribute("aria-selected", "true");
			expect(middle).toHaveAccessibleDescription("Within range");
			expect(middle).toHaveClass("bg-ink-blue-50", "text-neutral-400");
			expect(middle).not.toHaveClass("text-white", "hover:bg-porcelain-50");
			await user.click(middle);
			expect(middle).toHaveFocus();
			await user.keyboard("{Enter} ");
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(
				3
			);
			expect(start).toHaveAccessibleDescription("Range start");
			expect(end).toHaveAccessibleDescription("Range end");
		}
	);

	it("allows a single leap day when min and max coincide, with both arrows blocked in every view", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar
				defaultMonth="2024-02-01"
				maxDate="2024-02-29"
				minDate="2024-02-29"
				onChange={onChange}
			/>
		);
		expect(
			screen.getByRole("button", { name: "Previous month" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
		await user.click(
			screen.getByRole("gridcell", { name: "Thursday, 29 February 2024" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith("2024-02-29");
		await user.click(screen.getByRole("button", { name: "Show months" }));
		expect(
			screen.getByRole("button", { name: "Previous year" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next year" })).toBeDisabled();
		expect(
			screen.getByRole("gridcell", { name: "February" })
		).not.toHaveAttribute("aria-disabled");
		await user.click(screen.getByRole("button", { name: "Show years" }));
		expect(
			screen.getByRole("button", { name: "Previous 12 years" })
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Next 12 years" })
		).toBeDisabled();
		expect(screen.getByRole("gridcell", { name: "2024" })).not.toHaveAttribute(
			"aria-disabled"
		);
	});

	it.each([
		{
			bounds: { minDate: "2026-06-10" },
			blocked: "Tuesday, 9 June 2026",
			allowed: "Thursday, 11 June 2026",
			disabledArrow: "Previous month",
			enabledArrow: "Next month",
		},
		{
			bounds: { maxDate: "2026-06-10" },
			blocked: "Thursday, 11 June 2026",
			allowed: "Tuesday, 9 June 2026",
			disabledArrow: "Next month",
			enabledArrow: "Previous month",
		},
	])(
		"supports one-sided bounds ($disabledArrow disabled)",
		({ bounds, blocked, allowed, disabledArrow, enabledArrow }) => {
			render(<Calendar defaultMonth="2026-06-01" {...bounds} />);
			expect(screen.getByRole("gridcell", { name: blocked })).toHaveAttribute(
				"aria-disabled",
				"true"
			);
			expect(
				screen.getByRole("gridcell", { name: allowed })
			).not.toHaveAttribute("aria-disabled");
			expect(
				screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
			).not.toHaveAttribute("aria-disabled");
			expect(
				screen.getByRole("button", { name: disabledArrow })
			).toBeDisabled();
			expect(screen.getByRole("button", { name: enabledArrow })).toBeEnabled();
		}
	);

	it("applies updated limits and predicates without changing the caller's selected date", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const { rerender } = render(
			<Calendar value="2026-06-10" onChange={onChange} />
		);
		rerender(
			<Calendar
				maxDate="2026-06-20"
				minDate="2026-06-11"
				value="2026-06-10"
				onChange={onChange}
			/>
		);
		const selected = screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
			selected: true,
		});
		expect(selected).toHaveAttribute("aria-disabled", "true");
		expect(selected).toHaveClass("text-neutral-400");
		await user.click(selected);
		expect(onChange).not.toHaveBeenCalled();
		rerender(
			<Calendar
				isDateDisabled={() => true}
				value="2026-06-10"
				onChange={onChange}
			/>
		);
		expect(selected).toHaveAttribute("aria-disabled", "true");
		expect(
			screen.getByRole("button", { name: "Previous month" })
		).toBeEnabled();
		expect(screen.getByRole("button", { name: "Next month" })).toBeEnabled();
		rerender(<Calendar value="2026-06-10" onChange={onChange} />);
		expect(selected).not.toHaveAttribute("aria-disabled");
		await user.click(selected);
		expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-06-10");
	});

	it.each([
		{
			view: "days",
			min: "2026-05-31",
			max: "2026-07-01",
			previous: "Previous month",
			next: "Next month",
			first: "May 2026",
			last: "July 2026",
		},
		{
			view: "months",
			min: "2025-12-31",
			max: "2027-01-01",
			previous: "Previous year",
			next: "Next year",
			first: "2025",
			last: "2027",
		},
		{
			view: "years",
			min: "2014-12-31",
			max: "2027-01-01",
			previous: "Previous 12 years",
			next: "Next 12 years",
			first: "2003 - 2014",
			last: "2027 - 2038",
		},
	])(
		"stops $view paging at bounds while allowing pages with even one in-bounds day",
		async ({ view, min, max, previous, next, first, last }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Calendar
					defaultMonth="2026-06-01"
					isDateDisabled={() => true}
					maxDate={max}
					minDate={min}
					onChange={onChange}
				/>
			);
			if (view !== "days")
				await user.click(screen.getByRole("button", { name: "Show months" }));
			if (view === "years")
				await user.click(screen.getByRole("button", { name: "Show years" }));
			expect(screen.getByRole("button", { name: previous })).toBeEnabled();
			expect(screen.getByRole("button", { name: next })).toBeEnabled();
			await user.click(screen.getByRole("button", { name: previous }));
			expect(screen.getByText(first)).toHaveAttribute("aria-live", "polite");
			expect(screen.getByRole("button", { name: previous })).toBeDisabled();
			await user.click(screen.getByRole("button", { name: previous }));
			expect(screen.getByText(first)).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: next }));
			await user.click(screen.getByRole("button", { name: next }));
			expect(screen.getByText(last)).toHaveAttribute("aria-live", "polite");
			expect(screen.getByRole("button", { name: next })).toBeDisabled();
			await user.click(screen.getByRole("button", { name: next }));
			expect(screen.getByText(last)).toBeInTheDocument();
			expect(screen.getByRole("button", { name: previous })).toBeEnabled();
			expect(onChange).not.toHaveBeenCalled();
		}
	);

	it("disables months and years only when their whole period misses the inclusive bounds", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar
				defaultMonth="2024-02-01"
				isDateDisabled={() => true}
				maxDate="2025-01-01"
				minDate="2024-02-29"
				onChange={onChange}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Show months" }));
		const january = screen.getByRole("gridcell", { name: "January" });
		expect(january).toHaveAttribute("aria-disabled", "true");
		expect(january).toHaveClass("text-neutral-400");
		await user.click(january);
		expect(january).toHaveFocus();
		await user.keyboard("{Enter} ");
		expect(
			screen.getByRole("button", { name: "Show years" })
		).toBeInTheDocument();
		const february = screen.getByRole("gridcell", { name: "February" });
		expect(february).not.toHaveAttribute("aria-disabled");
		expect(
			screen.getByRole("gridcell", { name: "December" })
		).not.toHaveAttribute("aria-disabled");
		await user.click(february);
		expect(screen.getByText("February 2024")).toBeInTheDocument();
		expect(
			screen.getByRole("gridcell", { name: "Thursday, 29 February 2024" })
		).toHaveAttribute("aria-disabled", "true");
		await user.click(screen.getByRole("button", { name: "Show months" }));
		await user.click(screen.getByRole("button", { name: "Show years" }));
		const checkBlockedYear = async (name: string): Promise<void> => {
			const year = screen.getByRole("gridcell", { name });
			expect(year).toHaveAttribute("aria-disabled", "true");
			expect(year).toHaveClass("text-neutral-400");
			await user.click(year);
			expect(year).toHaveFocus();
			await user.keyboard("{Enter} ");
			expect(screen.getByText("2015 - 2026")).toBeInTheDocument();
		};
		await checkBlockedYear("2023");
		await checkBlockedYear("2026");
		expect(screen.getByRole("gridcell", { name: "2024" })).not.toHaveAttribute(
			"aria-disabled"
		);
		const lastYear = screen.getByRole("gridcell", { name: "2025" });
		expect(lastYear).not.toHaveAttribute("aria-disabled");
		await user.click(lastYear);
		expect(
			screen.getByRole("gridcell", { name: "January" })
		).not.toHaveAttribute("aria-disabled");
		expect(screen.getByRole("gridcell", { name: "February" })).toHaveAttribute(
			"aria-disabled",
			"true"
		);
		expect(screen.getByRole("gridcell", { name: "December" })).toHaveAttribute(
			"aria-disabled",
			"true"
		);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("blocks days outside inclusive bounds and predicate-disabled days while keeping them focusable", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar
				defaultMonth="2026-06-01"
				isDateDisabled={(date) => date === "2026-06-13"}
				maxDate="2026-06-15"
				minDate="2026-06-10"
				onChange={onChange}
			/>
		);
		const checkBlockedDay = async (name: string): Promise<void> => {
			const cell = screen.getByRole("gridcell", { name });
			expect(cell).toHaveAttribute("aria-disabled", "true");
			expect(cell).not.toHaveAttribute("disabled");
			expect(cell).toHaveClass("text-neutral-400");
			await user.click(cell);
			expect(cell).toHaveFocus();
			await user.keyboard("{Enter} ");
			expect(cell).toHaveAttribute("aria-selected", "false");
		};
		await checkBlockedDay("Tuesday, 9 June 2026");
		await checkBlockedDay("Saturday, 13 June 2026");
		await checkBlockedDay("Tuesday, 16 June 2026");
		await checkBlockedDay("Wednesday, 1 July 2026");
		expect(screen.getAllByRole("gridcell")).toHaveLength(42);
		expect(screen.getByText("June 2026")).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
		await user.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		await user.click(
			screen.getByRole("gridcell", { name: "Monday, 15 June 2026" })
		);
		expect(onChange.mock.calls).toEqual([["2026-06-10"], ["2026-06-15"]]);
		expect(
			screen.getByRole("gridcell", {
				name: "Monday, 15 June 2026",
				selected: true,
			})
		).not.toHaveAttribute("aria-disabled");
	});
});

describe("Calendar Date range", () => {
	it("restores the focused range endpoint when the pointer leaves for the header", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar defaultMonth="2026-06-01" mode="range" onChange={onChange} />
		);
		const start = screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
		});
		const end = screen.getByRole("gridcell", {
			name: "Friday, 12 June 2026",
		});
		const middle = screen.getByRole("gridcell", {
			name: "Thursday, 11 June 2026",
		});
		const hovered = screen.getByRole("gridcell", {
			name: "Monday, 15 June 2026",
		});
		const header = screen.getByRole("button", { name: "Show months" });
		await user.click(start);
		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(end).toHaveFocus();
		expect(end).toHaveAccessibleDescription("Preview: range end");
		await user.hover(header);
		expect(end).toHaveFocus();
		expect(end).toHaveAccessibleDescription("Preview: range end");
		expect(middle).toHaveAttribute("data-range", "middle");
		await user.hover(hovered);
		expect(end).toHaveFocus();
		expect(hovered).toHaveAccessibleDescription("Preview: range end");
		expect(end).toHaveAccessibleDescription("Preview: within range");
		await user.hover(header);
		expect(hovered).not.toHaveAttribute("data-range");
		expect(end).toHaveAccessibleDescription("Preview: range end");
		expect(end).toHaveAttribute("data-range-preview", "true");
		expect(onChange).not.toHaveBeenCalled();
		await user.keyboard("{Enter}");
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-10",
			end: "2026-06-12",
		});
		expect(end).toHaveAccessibleDescription("Range end");
		expect(end).not.toHaveAttribute("data-range-preview");
	});

	it("clears pointer preview on exit when the grid no longer holds focus", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar defaultMonth="2026-06-01" mode="range" onChange={onChange} />
		);
		const start = screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
		});
		const end = screen.getByRole("gridcell", {
			name: "Friday, 12 June 2026",
		});
		await user.click(start);
		await user.keyboard("{ArrowRight}{ArrowRight}");
		await user.tab({ shift: true });
		expect(screen.getByRole("button", { name: "Next month" })).toHaveFocus();
		await user.hover(end);
		expect(end).toHaveAccessibleDescription("Preview: range end");
		await user.hover(screen.getByRole("button", { name: "Show months" }));
		expect(end).not.toHaveAttribute("data-range");
		expect(start).toHaveAccessibleDescription(
			"Range start; choose an end date"
		);
		expect(onChange).not.toHaveBeenCalled();
	});

	it.each([
		null,
		{ start: "2026-06-19", end: "2026-06-22" },
		{ start: "2026-06-20", end: "2026-06-21" },
	])(
		"supersedes an open draft and preview with an externally supplied controlled range (previous=%j)",
		async (value) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const form = createRef<HTMLFormElement>();
			const { rerender } = render(
				<form ref={form}>
					<Calendar
						mode="range"
						name="leave"
						value={value}
						onChange={onChange}
					/>
				</form>
			);
			const start = screen.getByRole("gridcell", {
				name: "Wednesday, 10 June 2026",
			});
			const preview = screen.getByRole("gridcell", {
				name: "Friday, 12 June 2026",
			});
			await user.click(start);
			await user.hover(preview);
			expect(preview).toHaveAttribute("data-range-preview");
			rerender(
				<form ref={form}>
					<Calendar
						mode="range"
						name="leave"
						value={{ start: "2026-06-20", end: "2026-06-22" }}
						onChange={onChange}
					/>
				</form>
			);
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
				["leave[start]", "2026-06-20"],
				["leave[end]", "2026-06-22"],
			]);
			expect(start).not.toHaveAttribute("data-range");
			expect(preview).not.toHaveAttribute("data-range-preview");
			expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(
				3
			);
			expect(
				screen.getByRole("gridcell", { name: "Saturday, 20 June 2026" })
			).toHaveAccessibleDescription("Range start");
			expect(
				screen.getByRole("gridcell", { name: "Monday, 22 June 2026" })
			).toHaveAccessibleDescription("Range end");
			await user.click(
				screen.getByRole("gridcell", { name: "Thursday, 25 June 2026" })
			);
			expect(onChange).not.toHaveBeenCalled();
			expect(preview).not.toHaveAttribute("data-range-preview");
			await user.click(
				screen.getByRole("gridcell", { name: "Friday, 26 June 2026" })
			);
			expect(onChange).toHaveBeenCalledExactlyOnceWith({
				start: "2026-06-25",
				end: "2026-06-26",
			});
		}
	);

	it("clears an open draft and preview when the controlled range becomes null", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const form = createRef<HTMLFormElement>();
		const original = { start: "2026-06-20", end: "2026-06-22" };
		const { rerender } = render(
			<form ref={form}>
				<Calendar
					mode="range"
					name="leave"
					value={original}
					onChange={onChange}
				/>
			</form>
		);
		const start = screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
		});
		const preview = screen.getByRole("gridcell", {
			name: "Friday, 12 June 2026",
		});
		await user.click(start);
		await user.hover(preview);
		expect(preview).toHaveAttribute("data-range-preview");
		rerender(
			<form ref={form}>
				<Calendar mode="range" name="leave" value={null} onChange={onChange} />
			</form>
		);
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
		expect(start).not.toHaveAttribute("data-range");
		expect(preview).not.toHaveAttribute("data-range-preview");
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
			["leave[start]", ""],
			["leave[end]", ""],
		]);
		// Returning to the earlier value must not resurrect the discarded draft.
		rerender(
			<form ref={form}>
				<Calendar
					mode="range"
					name="leave"
					value={original}
					onChange={onChange}
				/>
			</form>
		);
		expect(start).not.toHaveAttribute("data-range");
		rerender(
			<form ref={form}>
				<Calendar mode="range" name="leave" value={null} onChange={onChange} />
			</form>
		);
		await user.click(
			screen.getByRole("gridcell", { name: "Thursday, 25 June 2026" })
		);
		expect(onChange).not.toHaveBeenCalled();
		expect(preview).not.toHaveAttribute("data-range-preview");
		await user.click(
			screen.getByRole("gridcell", { name: "Friday, 26 June 2026" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-25",
			end: "2026-06-26",
		});
	});

	it.each([null, { start: "2026-06-20", end: "2026-06-22" }])(
		"preserves a draft and preview on semantically equivalent controlled rerenders (value=%j)",
		async (value) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const form = createRef<HTMLFormElement>();
			const { rerender } = render(
				<form ref={form}>
					<Calendar
						mode="range"
						name="leave"
						value={value}
						onChange={onChange}
					/>
				</form>
			);
			const start = screen.getByRole("gridcell", {
				name: "Wednesday, 10 June 2026",
			});
			const preview = screen.getByRole("gridcell", {
				name: "Friday, 12 June 2026",
			});
			await user.click(start);
			await user.hover(preview);
			rerender(
				<form ref={form}>
					<Calendar
						mode="range"
						name="leave"
						value={value ? { ...value } : null}
						onChange={onChange}
					/>
				</form>
			);
			expect(start).toHaveAccessibleDescription("Preview: range start");
			expect(preview).toHaveAttribute("data-range-preview");
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
				["leave[start]", ""],
				["leave[end]", ""],
			]);
			await user.click(
				screen.getByRole("gridcell", { name: "Thursday, 25 June 2026" })
			);
			expect(onChange).toHaveBeenCalledExactlyOnceWith({
				start: "2026-06-10",
				end: "2026-06-25",
			});
		}
	);

	it("keeps completed controlled values with the caller, including null and updated ranges", async () => {
		const onChange = vi.fn();
		const original = { start: "2026-06-01", end: "2026-06-03" };
		const replacement = { start: "2026-06-10", end: "2026-06-12" };
		const { rerender } = render(
			<Calendar mode="range" value={original} onChange={onChange} />
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		expect(onChange).not.toHaveBeenCalled();
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith(replacement);
		expect(
			screen.getByRole("gridcell", { name: "Monday, 1 June 2026" })
		).toHaveAccessibleDescription("Range start");
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveAttribute("aria-selected", "false");
		rerender(<Calendar mode="range" value={replacement} onChange={onChange} />);
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveAccessibleDescription("Range start");
		expect(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		).toHaveAccessibleDescription("Range end");
		rerender(<Calendar mode="range" value={null} onChange={onChange} />);
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
		const day = screen.getByRole("gridcell", { name: "Monday, 15 June 2026" });
		await userEvent.click(day);
		await userEvent.click(day);
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenLastCalledWith({
			start: "2026-06-15",
			end: "2026-06-15",
		});
		expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(
			0
		);
	});

	it.each([
		{
			props: { value: { start: "2025-12-30", end: "2026-01-04" } },
			title: "December 2025",
			count: 6,
		},
		{
			props: { defaultValue: { start: "2025-12-30", end: "2026-01-04" } },
			title: "December 2025",
			count: 6,
		},
		{
			props: {
				value: null,
				defaultValue: { start: "2025-12-30", end: "2026-01-04" },
			},
			title: "February 2026",
			count: 0,
		},
	])(
		"opens on the range start before defaultMonth ($title, $count selected)",
		({ props, title, count }) => {
			render(<Calendar {...props} defaultMonth="2026-02-01" mode="range" />);
			expect(screen.getByText(title)).toBeInTheDocument();
			expect(
				screen.queryAllByRole("gridcell", { selected: true })
			).toHaveLength(count);
		}
	);

	it("replaces an uncontrolled default range and does not reset it when defaultValue changes", async () => {
		const { rerender } = render(
			<Calendar
				defaultValue={{ start: "2026-06-01", end: "2026-06-03" }}
				mode="range"
			/>
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		);
		rerender(
			<Calendar
				defaultValue={{ start: "2026-06-20", end: "2026-06-22" }}
				mode="range"
			/>
		);
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveAccessibleDescription("Range start");
		expect(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		).toHaveAccessibleDescription("Range end");
		expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(3);
	});

	it("keeps a draft through paging and completes on a neighbouring-month day across a year boundary", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar defaultMonth="2025-12-01" mode="range" onChange={onChange} />
		);
		await user.click(
			screen.getByRole("gridcell", { name: "Tuesday, 30 December 2025" })
		);
		await user.click(screen.getByRole("button", { name: "Next month" }));
		expect(onChange).not.toHaveBeenCalled();
		await user.hover(
			screen.getByRole("gridcell", { name: "Friday, 2 January 2026" })
		);
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 31 December 2025" })
		).toHaveAccessibleDescription("Preview: within range");
		await user.click(screen.getByRole("button", { name: "Previous month" }));
		await user.click(
			screen.getByRole("gridcell", { name: "Friday, 2 January 2026" })
		);
		expect(screen.getByText("January 2026")).toBeInTheDocument();
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2025-12-30",
			end: "2026-01-02",
		});
		expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(4);
		expect(
			screen.getByRole("gridcell", { name: "Tuesday, 30 December 2025" })
		).toHaveAccessibleDescription("Range start");
		expect(
			screen.getByRole("gridcell", { name: "Friday, 2 January 2026" })
		).toHaveAccessibleDescription("Range end");
	});

	it("localizes draft, preview and completed range descriptions when the language changes", async () => {
		const user = userEvent.setup();
		render(<Calendar mode="range" />);
		await user.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		await act(async () => {
			await i18n.changeLanguage("es-ES");
		});
		expect(
			screen.getByRole("gridcell", { name: "miércoles, 10 junio 2026" })
		).toHaveAccessibleDescription("Inicio del rango; elige una fecha de fin");
		const end = screen.getByRole("gridcell", {
			name: "viernes, 12 junio 2026",
		});
		await user.hover(end);
		expect(end).toHaveAccessibleDescription("Vista previa: fin del rango");
		expect(
			screen.getByRole("gridcell", { name: "miércoles, 10 junio 2026" })
		).toHaveAccessibleDescription("Vista previa: inicio del rango");
		expect(
			screen.getByRole("gridcell", { name: "jueves, 11 junio 2026" })
		).toHaveAccessibleDescription("Vista previa: dentro del rango");
		await user.click(end);
		expect(end).toHaveAccessibleDescription("Fin del rango");
		expect(
			screen.getByRole("gridcell", { name: "miércoles, 10 junio 2026" })
		).toHaveAccessibleDescription("Inicio del rango");
		expect(
			screen.getByRole("gridcell", { name: "jueves, 11 junio 2026" })
		).toHaveAccessibleDescription("Dentro del rango");
	});

	it("discriminates default values and callback payloads by mode", () => {
		expectTypeOf<{
			mode: "range";
			defaultValue: DateRange | null;
			onChange: (range: DateRange) => void;
		}>().toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "range";
			defaultValue: string;
		}>().not.toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "single";
			defaultValue: DateRange;
		}>().not.toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "range";
			onChange: (date: string) => void;
		}>().not.toExtend<CalendarProps>();
		expectTypeOf<{
			mode: "single";
			onChange: (range: DateRange) => void;
		}>().not.toExtend<CalendarProps>();
	});

	it("previews both directions across week rows without committing and clears the preview on pointer exit", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Calendar mode="range" onChange={onChange} />);
		const start = screen.getByRole("gridcell", {
			name: "Saturday, 13 June 2026",
		});
		const later = screen.getByRole("gridcell", {
			name: "Tuesday, 16 June 2026",
		});
		const earlier = screen.getByRole("gridcell", {
			name: "Thursday, 11 June 2026",
		});
		await user.click(start);
		await user.hover(later);
		expect(later).toHaveAccessibleDescription("Preview: range end");
		expect(later).toHaveAttribute("data-range", "end");
		expect(later).toHaveAttribute("data-range-preview", "true");
		expect(later).toHaveAttribute("aria-selected", "false");
		expect(start).toHaveAccessibleDescription("Preview: range start");
		expect(
			screen.getByRole("gridcell", { name: "Sunday, 14 June 2026" })
		).toHaveClass("bg-ink-blue-50", "rounded-none");
		expect(
			screen.getByRole("gridcell", { name: "Monday, 15 June 2026" })
		).toHaveAccessibleDescription("Preview: within range");
		await user.hover(earlier);
		expect(earlier).toHaveAccessibleDescription("Preview: range start");
		expect(start).toHaveAccessibleDescription("Preview: range end");
		expect(later).not.toHaveAttribute("data-range");
		expect(screen.getAllByRole("gridcell", { selected: true })).toEqual([
			start,
		]);
		expect(onChange).not.toHaveBeenCalled();
		await user.hover(screen.getByRole("button", { name: "Next month" }));
		expect(earlier).not.toHaveAttribute("data-range");
		expect(start).toHaveAccessibleDescription(
			"Range start; choose an end date"
		);
		await user.click(earlier);
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-11",
			end: "2026-06-13",
		});
		expect(earlier).not.toHaveAttribute("data-range-preview");
		expect(earlier).toHaveAccessibleDescription("Range start");
		await user.hover(later);
		expect(later).not.toHaveAttribute("data-range");
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("normalizes a reversed pick and restarts with a one-day range after the third click", async () => {
		const onChange = vi.fn();
		render(<Calendar mode="range" onChange={onChange} />);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-10",
			end: "2026-06-12",
		});
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		).toHaveAccessibleDescription("Range start");
		expect(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		).toHaveAccessibleDescription("Range end");
		const next = screen.getByRole("gridcell", { name: "Monday, 15 June 2026" });
		await userEvent.click(next);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(next).toHaveAccessibleDescription("Range start; choose an end date");
		expect(screen.getAllByRole("gridcell", { selected: true })).toEqual([next]);
		await userEvent.click(next);
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenLastCalledWith({
			start: "2026-06-15",
			end: "2026-06-15",
		});
		expect(next).toHaveAccessibleDescription("Range start and end");
		expect(next).toHaveAttribute("data-range", "start-end");
		expect(next).toHaveClass("bg-ink-blue-900", "text-white", "rounded");
		expect(screen.getAllByRole("gridcell", { selected: true })).toEqual([next]);
	});

	it("keeps the first pick as a draft and completes an inclusive range on the second pick", async () => {
		const onChange = vi.fn();
		render(<Calendar mode="range" onChange={onChange} />);
		const start = screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
		});
		await userEvent.click(start);
		expect(onChange).not.toHaveBeenCalled();
		expect(start).toHaveAttribute("aria-selected", "true");
		expect(start).toHaveAccessibleDescription(
			"Range start; choose an end date"
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: "Friday, 12 June 2026" })
		);
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-10",
			end: "2026-06-12",
		});
		expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(3);
		expect(start).toHaveAccessibleDescription("Range start");
		expect(start).toHaveAttribute("data-range", "start");
		expect(start).toHaveClass("bg-ink-blue-900", "text-white", "rounded-l");
		const middle = screen.getByRole("gridcell", {
			name: "Thursday, 11 June 2026",
		});
		expect(middle).toHaveAccessibleDescription("Within range");
		expect(middle).toHaveAttribute("data-range", "middle");
		expect(middle).toHaveClass("bg-ink-blue-50", "rounded-none");
		const end = screen.getByRole("gridcell", { name: "Friday, 12 June 2026" });
		expect(end).toHaveAccessibleDescription("Range end");
		expect(end).toHaveAttribute("data-range", "end");
		expect(end).toHaveClass("bg-ink-blue-900", "text-white", "rounded-r");
	});
});

describe("Calendar keyboard", () => {
	it.each(["{Enter}", " "])(
		"selects once with %s while controlled values and focus remain independent",
		async (key) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const { rerender } = render(
				<Calendar value="2026-06-10" onChange={onChange} />
			);
			await user.keyboard("{Tab}{Tab}{Tab}{Tab}{ArrowRight}");
			const day = screen.getByRole("gridcell", {
				name: "Thursday, 11 June 2026",
			});
			await user.keyboard(key);
			expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-06-11");
			expect(day).toHaveFocus();
			expect(day).toHaveAttribute("aria-selected", "false");
			rerender(<Calendar value="2026-06-15" onChange={onChange} />);
			expect(day).toHaveFocus();
			expect(day).toHaveAttribute("tabindex", "0");
			expect(
				screen.getByRole("gridcell", { name: "Monday, 15 June 2026" })
			).toHaveAttribute("aria-selected", "true");
			await user.keyboard(
				"x{Escape}{Control>}{ArrowRight}{/Control}{Alt>}{PageDown}{/Alt}{Meta>}{ArrowLeft}{/Meta}"
			);
			expect(day).toHaveFocus();
			expect(onChange).toHaveBeenCalledTimes(1);
		}
	);

	it("previews across pages and restores the draft preview when drilling back to days", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Calendar mode="range" onChange={onChange} />);
		await user.keyboard("{Tab}{Tab}{Tab}{Tab}{Enter}{PageDown}");
		expect(
			screen.getByRole("gridcell", { name: "Friday, 10 July 2026" })
		).toHaveFocus();
		expect(
			screen.getByRole("gridcell", { name: "Friday, 10 July 2026" })
		).toHaveAccessibleDescription("Preview: range end");
		await user.keyboard("{Shift>}{Tab}{Tab}{/Shift}{Enter}{ArrowRight}{Enter}");
		const end = screen.getByRole("gridcell", {
			name: "Monday, 10 August 2026",
		});
		expect(end).toHaveFocus();
		expect(end).toHaveAccessibleDescription("Preview: range end");
		expect(
			screen.getByRole("gridcell", { name: "Sunday, 9 August 2026" })
		).toHaveAccessibleDescription("Preview: within range");
		expect(onChange).not.toHaveBeenCalled();
		await user.keyboard(" ");
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-10",
			end: "2026-08-10",
		});
	});

	it("keeps Monday-first keyboard navigation and focus through a language change", async () => {
		const user = userEvent.setup();
		render(<Calendar defaultValue="2026-06-10" />);
		await user.keyboard("{Tab}{Tab}{Tab}{Tab}{ArrowRight}");
		await act(async () => {
			await i18n.changeLanguage("es-ES");
		});
		expect(
			screen.getByRole("gridcell", { name: "jueves, 11 junio 2026" })
		).toHaveFocus();
		await user.keyboard("{Home}");
		expect(
			screen.getByRole("gridcell", { name: "lunes, 8 junio 2026" })
		).toHaveFocus();
		await user.keyboard("{Shift>}{Tab}{Tab}{/Shift}{Enter}");
		expect(screen.getByRole("gridcell", { name: "junio" })).toHaveFocus();
	});
	it("retains focus when picking an outside-month day moves to its month", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Calendar defaultMonth="2026-06-01" onChange={onChange} />);
		await user.click(
			screen.getByRole("gridcell", { name: "Sunday, 12 July 2026" })
		);
		const day = screen.getByRole("gridcell", { name: "Sunday, 12 July 2026" });
		expect(day).toHaveFocus();
		expect(day).toHaveAttribute("tabindex", "0");
		expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-07-12");
		await user.keyboard("{ArrowLeft}{Enter}");
		expect(onChange).toHaveBeenLastCalledWith("2026-07-11");
	});

	it.each([
		{
			view: "months",
			date: "2026-06-10",
			key: "{ArrowLeft}",
			target: "May",
			title: "2026",
		},
		{
			view: "months",
			date: "2026-06-10",
			key: "{ArrowRight}",
			target: "July",
			title: "2026",
		},
		{
			view: "months",
			date: "2026-06-10",
			key: "{ArrowUp}",
			target: "February",
			title: "2026",
		},
		{
			view: "months",
			date: "2026-06-10",
			key: "{ArrowDown}",
			target: "October",
			title: "2026",
		},
		{
			view: "months",
			date: "2026-06-10",
			key: "{Home}",
			target: "May",
			title: "2026",
		},
		{
			view: "months",
			date: "2026-06-10",
			key: "{End}",
			target: "August",
			title: "2026",
		},
		{
			view: "months",
			date: "2026-06-10",
			key: "{PageUp}",
			target: "June",
			title: "2025",
		},
		{
			view: "months",
			date: "2026-06-10",
			key: "{PageDown}",
			target: "June",
			title: "2027",
		},
		{
			view: "months",
			date: "2026-01-10",
			key: "{ArrowLeft}",
			target: "December",
			title: "2025",
		},
		{
			view: "months",
			date: "2026-12-10",
			key: "{ArrowRight}",
			target: "January",
			title: "2027",
		},
		{
			view: "months",
			date: "2026-02-10",
			key: "{ArrowUp}",
			target: "October",
			title: "2025",
		},
		{
			view: "months",
			date: "2026-11-10",
			key: "{ArrowDown}",
			target: "March",
			title: "2027",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{ArrowLeft}",
			target: "2019",
			title: "2015 - 2026",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{ArrowRight}",
			target: "2021",
			title: "2015 - 2026",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{ArrowUp}",
			target: "2016",
			title: "2015 - 2026",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{ArrowDown}",
			target: "2024",
			title: "2015 - 2026",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{Home}",
			target: "2019",
			title: "2015 - 2026",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{End}",
			target: "2022",
			title: "2015 - 2026",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{PageUp}",
			target: "2008",
			title: "2003 - 2014",
		},
		{
			view: "years",
			date: "2020-06-10",
			key: "{PageDown}",
			target: "2032",
			title: "2027 - 2038",
		},
		{
			view: "years",
			date: "2015-06-10",
			key: "{ArrowLeft}",
			target: "2014",
			title: "2003 - 2014",
		},
		{
			view: "years",
			date: "2026-06-10",
			key: "{ArrowRight}",
			target: "2027",
			title: "2027 - 2038",
		},
		{
			view: "years",
			date: "2016-06-10",
			key: "{ArrowUp}",
			target: "2012",
			title: "2003 - 2014",
		},
		{
			view: "years",
			date: "2025-06-10",
			key: "{ArrowDown}",
			target: "2029",
			title: "2027 - 2038",
		},
	])(
		"navigates the four-column $view grid with $key to $target",
		async ({ view, date, key, target, title }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<Calendar defaultValue={date} onChange={onChange} />);
			await user.click(screen.getByRole("button", { name: "Show months" }));
			if (view === "years")
				await user.click(screen.getByRole("button", { name: "Show years" }));
			await user.keyboard(key);
			const cell = screen.getByRole("gridcell", { name: target });
			expect(cell).toHaveFocus();
			expect(
				screen
					.getAllByRole("gridcell")
					.filter((period) => period.tabIndex === 0)
			).toEqual([cell]);
			expect(
				screen
					.getAllByRole("gridcell")
					.filter((period) => period.tabIndex === -1)
			).toHaveLength(11);
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			await user.tab();
			expect(screen.getByRole("grid").contains(document.activeElement)).toBe(
				false
			);
			await user.tab({ shift: true });
			expect(cell).toHaveFocus();
			expect(onChange).not.toHaveBeenCalled();
		}
	);
	it.each([
		{ first: "{Enter}", second: " " },
		{ first: " ", second: "{Enter}" },
	])(
		"previews a reversed Date range from focus and completes with $second",
		async ({ first, second }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<Calendar mode="range" onChange={onChange} />);
			await user.keyboard("{Tab}{Tab}{Tab}{Tab}");
			await user.keyboard(first);
			expect(onChange).not.toHaveBeenCalled();
			await user.keyboard("{ArrowLeft}{ArrowLeft}");
			const start = screen.getByRole("gridcell", {
				name: "Monday, 8 June 2026",
			});
			const end = screen.getByRole("gridcell", {
				name: "Wednesday, 10 June 2026",
			});
			expect(start).toHaveFocus();
			expect(start).toHaveAccessibleDescription("Preview: range start");
			expect(start).toHaveAttribute("aria-selected", "false");
			expect(end).toHaveAccessibleDescription("Preview: range end");
			expect(
				screen.getByRole("gridcell", { name: "Tuesday, 9 June 2026" })
			).toHaveAccessibleDescription("Preview: within range");
			expect(onChange).not.toHaveBeenCalled();
			await user.keyboard(second);
			expect(onChange).toHaveBeenCalledExactlyOnceWith({
				start: "2026-06-08",
				end: "2026-06-10",
			});
			expect(start).toHaveAccessibleDescription("Range start");
			expect(end).toHaveAccessibleDescription("Range end");
			await user.keyboard(first);
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(start).toHaveAccessibleDescription(
				"Range start; choose an end date"
			);
			await user.keyboard(second);
			expect(onChange).toHaveBeenLastCalledWith({
				start: "2026-06-08",
				end: "2026-06-08",
			});
		}
	);
	it("keeps a matching clamped tab stop after header paging in every view without stealing header focus", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Calendar defaultValue="2024-01-31" onChange={onChange} />);
		const nextMonth = screen.getByRole("button", { name: "Next month" });
		await user.click(nextMonth);
		expect(nextMonth).toHaveFocus();
		await user.tab();
		expect(
			screen.getByRole("gridcell", { name: "Thursday, 29 February 2024" })
		).toHaveFocus();
		await user.click(screen.getByRole("button", { name: "Show months" }));
		expect(screen.getByRole("gridcell", { name: "February" })).toHaveFocus();
		const nextYear = screen.getByRole("button", { name: "Next year" });
		await user.click(nextYear);
		expect(nextYear).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("gridcell", { name: "February" })).toHaveFocus();
		await user.click(screen.getByRole("button", { name: "Show years" }));
		expect(screen.getByRole("gridcell", { name: "2025" })).toHaveFocus();
		const nextBlock = screen.getByRole("button", { name: "Next 12 years" });
		await user.click(nextBlock);
		expect(nextBlock).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("gridcell", { name: "2037" })).toHaveFocus();
		await user.keyboard("{Enter}{Enter}");
		expect(
			screen.getByRole("gridcell", { name: "Saturday, 28 February 2037" })
		).toHaveFocus();
		expect(onChange).not.toHaveBeenCalled();
	});
	it("keeps the navigated day through keyboard drilling and clamps it in the chosen month", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Calendar defaultValue="2024-01-30" onChange={onChange} />);
		await user.keyboard("{Tab}{Tab}{Tab}{Tab}{ArrowRight}");
		expect(
			screen.getByRole("gridcell", { name: "Wednesday, 31 January 2024" })
		).toHaveFocus();
		await user.keyboard("{Shift>}{Tab}{Tab}{/Shift}{Enter}");
		expect(screen.getByRole("gridcell", { name: "January" })).toHaveFocus();
		await user.keyboard("{Shift>}{Tab}{Tab}{/Shift} ");
		expect(screen.getByRole("gridcell", { name: "2024" })).toHaveFocus();
		await user.keyboard("{ArrowRight}{Enter}");
		expect(screen.getByRole("gridcell", { name: "January" })).toHaveFocus();
		expect(screen.getByText("2025")).toHaveAttribute("aria-live", "polite");
		await user.keyboard("{ArrowRight} ");
		const day = screen.getByRole("gridcell", {
			name: "Friday, 28 February 2025",
		});
		expect(day).toHaveFocus();
		expect(screen.getByText("February 2025")).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
		await user.keyboard(" ");
		expect(onChange).toHaveBeenCalledExactlyOnceWith("2025-02-28");
		expect(day).toHaveAttribute("aria-selected", "true");
	});
	it.each([
		{
			date: "2026-06-10",
			key: "{ArrowLeft}",
			target: "Tuesday, 9 June 2026",
			title: "June 2026",
		},
		{
			date: "2026-06-10",
			key: "{ArrowRight}",
			target: "Thursday, 11 June 2026",
			title: "June 2026",
		},
		{
			date: "2026-06-10",
			key: "{ArrowUp}",
			target: "Wednesday, 3 June 2026",
			title: "June 2026",
		},
		{
			date: "2026-06-10",
			key: "{ArrowDown}",
			target: "Wednesday, 17 June 2026",
			title: "June 2026",
		},
		{
			date: "2026-06-10",
			key: "{Home}",
			target: "Monday, 8 June 2026",
			title: "June 2026",
		},
		{
			date: "2026-06-10",
			key: "{End}",
			target: "Sunday, 14 June 2026",
			title: "June 2026",
		},
		{
			date: "2026-06-01",
			key: "{ArrowLeft}",
			target: "Sunday, 31 May 2026",
			title: "May 2026",
		},
		{
			date: "2025-12-31",
			key: "{ArrowRight}",
			target: "Thursday, 1 January 2026",
			title: "January 2026",
		},
		{
			date: "2026-06-01",
			key: "{ArrowUp}",
			target: "Monday, 25 May 2026",
			title: "May 2026",
		},
		{
			date: "2026-06-30",
			key: "{ArrowDown}",
			target: "Tuesday, 7 July 2026",
			title: "July 2026",
		},
		{
			date: "2026-01-01",
			key: "{Home}",
			target: "Monday, 29 December 2025",
			title: "December 2025",
		},
		{
			date: "2025-12-31",
			key: "{End}",
			target: "Sunday, 4 January 2026",
			title: "January 2026",
		},
		{
			date: "2024-01-31",
			key: "{PageDown}",
			target: "Thursday, 29 February 2024",
			title: "February 2024",
		},
		{
			date: "2025-03-31",
			key: "{PageUp}",
			target: "Friday, 28 February 2025",
			title: "February 2025",
		},
		{
			date: "2024-02-29",
			key: "{Shift>}{PageDown}{/Shift}",
			target: "Friday, 28 February 2025",
			title: "February 2025",
		},
		{
			date: "2024-02-29",
			key: "{Shift>}{PageUp}{/Shift}",
			target: "Tuesday, 28 February 2023",
			title: "February 2023",
		},
	])(
		"moves $date with $key to $target without selecting",
		async ({ date, key, target, title }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<Calendar defaultValue={date} onChange={onChange} />);
			await user.keyboard("{Tab}{Tab}{Tab}{Tab}");
			await user.keyboard(key);
			const cell = screen.getByRole("gridcell", { name: target });
			expect(cell).toHaveFocus();
			expect(cell).toHaveAttribute("aria-selected", "false");
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			expect(
				screen.getAllByRole("gridcell").filter((day) => day.tabIndex === 0)
			).toEqual([cell]);
			expect(onChange).not.toHaveBeenCalled();
		}
	);
	it("starts on today when it is visible among neighbouring-month days", () => {
		vi.setSystemTime(new Date(2026, 5, 5, 12));
		render(<Calendar defaultMonth="2026-05-01" />);
		expect(
			screen.getByRole("gridcell", { name: "Friday, 5 June 2026" })
		).toHaveAttribute("tabindex", "0");
		expect(screen.getByText("May 2026")).toBeInTheDocument();
	});
	it.each<{ props: CalendarProps; initial: string }>([
		{
			props: { defaultValue: "2026-06-13" },
			initial: "Saturday, 13 June 2026",
		},
		{
			props: {
				mode: "range",
				value: { start: "2026-06-15", end: "2026-06-19" },
			},
			initial: "Monday, 15 June 2026",
		},
		{ props: {}, initial: "Wednesday, 10 June 2026" },
		{ props: { defaultMonth: "2026-05-01" }, initial: "Friday, 1 May 2026" },
		{
			props: { defaultMonth: "2025-02-15" },
			initial: "Saturday, 1 February 2025",
		},
	])(
		"tabs through the header into one grid stop at $initial",
		async ({ props, initial }) => {
			const user = userEvent.setup();
			render(<Calendar {...props} />);
			const cell = screen.getByRole("gridcell", { name: initial });
			expect(
				screen.getAllByRole("gridcell").filter((day) => day.tabIndex === 0)
			).toEqual([cell]);
			expect(
				screen.getAllByRole("gridcell").filter((day) => day.tabIndex === -1)
			).toHaveLength(41);
			expect(cell).not.toHaveFocus();
			await user.tab();
			expect(
				screen.getByRole("button", { name: "Previous month" })
			).toHaveFocus();
			await user.tab();
			expect(screen.getByRole("button", { name: "Show months" })).toHaveFocus();
			await user.tab();
			expect(screen.getByRole("button", { name: "Next month" })).toHaveFocus();
			await user.tab();
			expect(cell).toHaveFocus();
			await user.tab();
			expect(screen.getByRole("grid").contains(document.activeElement)).toBe(
				false
			);
			await user.tab({ shift: true });
			expect(cell).toHaveFocus();
		}
	);
});

describe("Calendar bounded keyboard navigation", () => {
	it.each([
		{
			date: "2024-01-31",
			min: "2024-01-01",
			max: "2024-02-15",
			key: "{PageDown}",
			target: "Thursday, 29 February 2024",
			title: "February 2024",
		},
		{
			date: "2025-03-31",
			min: "2025-02-15",
			max: "2025-03-31",
			key: "{PageUp}",
			target: "Friday, 28 February 2025",
			title: "February 2025",
		},
		{
			date: "2024-02-29",
			min: "2024-02-01",
			max: "2025-02-15",
			key: "{Shift>}{PageDown}{/Shift}",
			target: "Friday, 28 February 2025",
			title: "February 2025",
		},
		{
			date: "2024-02-29",
			min: "2023-02-15",
			max: "2024-02-29",
			key: "{Shift>}{PageUp}{/Shift}",
			target: "Tuesday, 28 February 2023",
			title: "February 2023",
		},
	])(
		"clamps $date with $key on an overlapping page even when the destination day is disabled",
		async ({ date, min, max, key, target, title }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Calendar
					defaultValue={date}
					isDateDisabled={() => true}
					maxDate={max}
					minDate={min}
					onChange={onChange}
				/>
			);
			act(() => {
				screen.getByRole("gridcell", { selected: true }).focus();
			});
			await user.keyboard(key);
			const cell = screen.getByRole("gridcell", { name: target });
			expect(cell).toHaveFocus();
			expect(cell).toHaveAttribute("aria-disabled", "true");
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			await user.keyboard("{Enter} ");
			await user.keyboard(key);
			expect(cell).toHaveFocus();
			expect(screen.getByText(title)).toBeInTheDocument();
			expect(
				screen.getAllByRole("gridcell").filter((item) => item.tabIndex === 0)
			).toEqual([cell]);
			expect(onChange).not.toHaveBeenCalled();
		}
	);

	it.each([
		{
			view: "months",
			date: "2026-06-10",
			min: "2026-01-01",
			max: "2027-01-01",
			key: "{PageDown}",
			target: "June",
			title: "2027",
		},
		{
			view: "months",
			date: "2026-06-10",
			min: "2025-12-31",
			max: "2026-12-31",
			key: "{PageUp}",
			target: "June",
			title: "2025",
		},
		{
			view: "years",
			date: "2026-06-10",
			min: "2026-01-01",
			max: "2027-01-01",
			key: "{PageDown}",
			target: "2038",
			title: "2027 - 2038",
		},
		{
			view: "years",
			date: "2015-06-10",
			min: "2014-12-31",
			max: "2015-12-31",
			key: "{PageUp}",
			target: "2003",
			title: "2003 - 2014",
		},
	])(
		"pages $view with $key to a disabled cell when another cell keeps the page available",
		async ({ view, date, min, max, key, target, title }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Calendar
					defaultValue={date}
					isDateDisabled={() => true}
					maxDate={max}
					minDate={min}
					onChange={onChange}
				/>
			);
			await user.click(screen.getByRole("button", { name: "Show months" }));
			if (view === "years")
				await user.click(screen.getByRole("button", { name: "Show years" }));
			await user.keyboard(key);
			const cell = screen.getByRole("gridcell", { name: target });
			expect(cell).toHaveFocus();
			expect(cell).toHaveAttribute("aria-disabled", "true");
			await user.keyboard("{Enter} ");
			await user.keyboard(key);
			expect(cell).toHaveFocus();
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			expect(
				screen.getAllByRole("gridcell").filter((item) => item.tabIndex === 0)
			).toEqual([cell]);
			expect(onChange).not.toHaveBeenCalled();
		}
	);

	it("preserves clamped roving focus after header paging reaches a bound", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar
				defaultValue="2024-01-31"
				maxDate="2024-02-29"
				minDate="2024-01-01"
				onChange={onChange}
			/>
		);
		const next = screen.getByRole("button", { name: "Next month" });
		await user.click(next);
		const day = screen.getByRole("gridcell", {
			name: "Thursday, 29 February 2024",
		});
		expect(next).toBeDisabled();
		expect(day).toHaveAttribute("tabindex", "0");
		await user.click(next);
		expect(screen.getByText("February 2024")).toBeInTheDocument();
		expect(day).toHaveAttribute("tabindex", "0");
		act(() => {
			day.focus();
		});
		await user.keyboard("{PageDown}{ArrowRight}");
		expect(day).toHaveFocus();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("previews and completes a keyboard range across a predicate-disabled day", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Calendar
				defaultMonth="2026-06-01"
				isDateDisabled={(date) => date === "2026-06-11"}
				maxDate="2026-06-12"
				minDate="2026-06-10"
				mode="range"
				onChange={onChange}
			/>
		);
		await user.keyboard("{Tab}{Tab}{Enter}{ArrowRight}");
		const disabled = screen.getByRole("gridcell", {
			name: "Thursday, 11 June 2026",
		});
		expect(disabled).toHaveFocus();
		expect(disabled).toHaveAttribute("aria-disabled", "true");
		expect(disabled).toHaveAccessibleDescription("Preview: range end");
		await user.keyboard("{Enter} ");
		expect(onChange).not.toHaveBeenCalled();
		await user.keyboard("{ArrowRight}");
		expect(disabled).toHaveClass("bg-ink-blue-50", "text-neutral-400");
		await user.keyboard(" ");
		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			start: "2026-06-10",
			end: "2026-06-12",
		});
		expect(disabled).toHaveAccessibleDescription("Within range");
		expect(disabled).toHaveClass("bg-ink-blue-50", "text-neutral-400");
	});

	it.each([
		{
			view: "days",
			start: "Wednesday, 10 June 2026",
			disabled: "Tuesday, 9 June 2026",
			title: "June 2026",
		},
		{ view: "months", start: "June", disabled: "May", title: "2026" },
		{ view: "years", start: "2026", disabled: "2025", title: "2015 - 2026" },
	])(
		"focuses disabled $view cells in the displayed period but rejects activation",
		async ({ view, start, disabled, title }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Calendar
					defaultValue="2026-06-10"
					maxDate="2026-06-10"
					minDate="2026-06-10"
					onChange={onChange}
				/>
			);
			if (view !== "days")
				await user.click(screen.getByRole("button", { name: "Show months" }));
			if (view === "years")
				await user.click(screen.getByRole("button", { name: "Show years" }));
			act(() => {
				screen.getByRole("gridcell", { name: start }).focus();
			});
			await user.keyboard("{ArrowLeft}");
			const cell = screen.getByRole("gridcell", { name: disabled });
			expect(cell).toHaveFocus();
			expect(cell).toHaveAttribute("aria-disabled", "true");
			expect(cell).not.toHaveAttribute("disabled");
			expect(
				screen.getAllByRole("gridcell").filter((item) => item.tabIndex === 0)
			).toEqual([cell]);
			await user.keyboard("{Enter} ");
			await user.click(cell);
			expect(cell).toHaveFocus();
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			expect(onChange).not.toHaveBeenCalled();
			await user.keyboard("{ArrowRight}");
			expect(screen.getByRole("gridcell", { name: start })).toHaveFocus();
		}
	);

	it.each([
		{ view: "days", target: "Thursday, 11 June 2026", title: "June 2026" },
		{ view: "months", target: "July", title: "2026" },
		{ view: "years", target: "2025", title: "2015 - 2026" },
	])(
		"keeps disabled $view cells reachable even when the entire displayed page is outside updated bounds",
		async ({ view, target, title }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const { rerender } = render(
				<Calendar defaultValue="2026-06-10" onChange={onChange} />
			);
			if (view !== "days")
				await user.click(screen.getByRole("button", { name: "Show months" }));
			if (view === "years")
				await user.click(screen.getByRole("button", { name: "Show years" }));
			if (view === "days")
				act(() => {
					screen
						.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
						.focus();
				});
			rerender(
				<Calendar
					defaultValue="2026-06-10"
					maxDate="2040-12-31"
					minDate="2040-01-01"
					onChange={onChange}
				/>
			);
			await user.keyboard(view === "years" ? "{ArrowLeft}" : "{ArrowRight}");
			const cell = screen.getByRole("gridcell", { name: target });
			expect(cell).toHaveFocus();
			expect(cell).toHaveAttribute("aria-disabled", "true");
			await user.keyboard("{Enter} {PageUp}{PageDown}");
			expect(cell).toHaveFocus();
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			expect(
				screen.getAllByRole("gridcell").filter((item) => item.tabIndex === 0)
			).toEqual([cell]);
			expect(onChange).not.toHaveBeenCalled();
		}
	);

	it.each([
		{
			view: "days",
			date: "2026-06-01",
			min: "2026-06-01",
			max: "2026-06-30",
			name: "Monday, 1 June 2026",
			title: "June 2026",
			keys: "{PageUp}{Shift>}{PageUp}{/Shift}{ArrowLeft}{ArrowUp}",
		},
		{
			view: "days",
			date: "2026-06-30",
			min: "2026-06-01",
			max: "2026-06-30",
			name: "Tuesday, 30 June 2026",
			title: "June 2026",
			keys: "{PageDown}{Shift>}{PageDown}{/Shift}{ArrowRight}{ArrowDown}",
		},
		{
			view: "months",
			date: "2026-01-31",
			min: "2026-01-01",
			max: "2026-12-31",
			name: "January",
			title: "2026",
			keys: "{PageUp}{ArrowLeft}{ArrowUp}",
		},
		{
			view: "months",
			date: "2026-12-31",
			min: "2026-01-01",
			max: "2026-12-31",
			name: "December",
			title: "2026",
			keys: "{PageDown}{ArrowRight}{ArrowDown}",
		},
		{
			view: "years",
			date: "2015-06-10",
			min: "2015-01-01",
			max: "2026-12-31",
			name: "2015",
			title: "2015 - 2026",
			keys: "{PageUp}{ArrowLeft}{ArrowUp}",
		},
		{
			view: "years",
			date: "2026-06-10",
			min: "2015-01-01",
			max: "2026-12-31",
			name: "2026",
			title: "2015 - 2026",
			keys: "{PageDown}{ArrowRight}{ArrowDown}",
		},
	])(
		"stops $view page keys and edge arrows at $name without moving focus",
		async ({ view, date, min, max, name, title, keys }) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Calendar
					defaultValue={date}
					maxDate={max}
					minDate={min}
					onChange={onChange}
				/>
			);
			if (view !== "days")
				await user.click(screen.getByRole("button", { name: "Show months" }));
			if (view === "years")
				await user.click(screen.getByRole("button", { name: "Show years" }));
			const cell = screen.getByRole("gridcell", { name });
			act(() => {
				cell.focus();
			});
			await user.keyboard(keys);
			expect(cell).toHaveFocus();
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			expect(
				screen.getAllByRole("gridcell").filter((item) => item.tabIndex === 0)
			).toEqual([cell]);
			expect(onChange).not.toHaveBeenCalled();
		}
	);
});

describe("Calendar stories", () => {
	const {
		Days,
		NoValue,
		Spanish,
		Months,
		Years,
		Range,
		RangeAcrossMonths,
		DraftRange,
		MinMax,
		DisabledDates,
		RangeAcrossDisabledDay,
	} = composeStories(stories);
	it.each([
		{ Story: MinMax, disabled: "Tuesday, 9 June 2026", selected: false },
		{
			Story: DisabledDates,
			disabled: "Saturday, 13 June 2026",
			selected: false,
		},
		{
			Story: RangeAcrossDisabledDay,
			disabled: "Thursday, 11 June 2026",
			selected: true,
		},
	])(
		"renders the limits story with $disabled disabled",
		({ Story, disabled, selected }) => {
			render(<Story />);
			expect(screen.getAllByRole("gridcell")).toHaveLength(42);
			const cell = screen.getByRole("gridcell", { name: disabled, selected });
			expect(cell).toHaveAttribute("aria-disabled", "true");
			expect(cell).toHaveClass("text-neutral-400");
			if (selected) expect(cell).toHaveClass("bg-ink-blue-50");
		}
	);
	it("runs the draft story's first pick and hover preview", async () => {
		const { container } = render(<DraftRange />);
		await DraftRange.play?.({ canvasElement: container });
		expect(
			screen.getByRole("gridcell", { name: "Friday, 19 June 2026" })
		).toHaveAccessibleDescription("Preview: range end");
		expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(1);
	});
	it.each([
		{ Story: Months, title: "2026", selected: "June" },
		{ Story: Years, title: "2015 - 2026", selected: "2026" },
	])(
		"opens the $title story through its play setup",
		async ({ Story, title, selected }) => {
			const { container } = render(<Story />);
			await Story.play?.({
				canvasElement: container,
				canvas: within(container),
			});
			expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
			expect(screen.getAllByRole("gridcell")).toHaveLength(12);
			expect(
				screen.getByRole("gridcell", { name: selected, selected: true })
			).toBeInTheDocument();
		}
	);

	it.each([
		{ Story: Days, title: "June 2026", selectedCount: 1 },
		{ Story: NoValue, title: "June 2026", selectedCount: 0 },
		{ Story: Spanish, title: "junio 2026", selectedCount: 1 },
		{ Story: Range, title: "June 2026", selectedCount: 10 },
		{ Story: RangeAcrossMonths, title: "June 2026", selectedCount: 5 },
	])(
		"renders $title with $selectedCount selected dates",
		({ Story, title, selectedCount }) => {
			render(<Story />);
			expect(screen.getByText(title)).toBeInTheDocument();
			expect(screen.getAllByRole("gridcell")).toHaveLength(42);
			expect(
				screen.queryAllByRole("gridcell", { selected: true })
			).toHaveLength(selectedCount);
		}
	);
});
