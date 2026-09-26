import { render, screen, waitFor } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import {
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
import { Select, type SelectProps } from "@/components/forms/Select";
import * as stories from "@/components/forms/Select/Select.stories";
import { Button } from "@/components/ui/Button";

const options = [
	{ value: "people", label: "People" },
	{ value: "finance", label: "Finance" },
	{ value: "operations", label: "Operations" },
];

const i18n = createInstance();
beforeAll(async () => {
	await i18n.use(initReactI18next).init({
		lng: "en",
		fallbackLng: "en",
		resources: { en: { translation: en }, es: { translation: es } },
	});
});

describe("Select", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("en");
	});

	it.each([
		["en", "No options"],
		["es", "No hay opciones"],
	])("shows the translated empty message in %s", async (language, message) => {
		await i18n.changeLanguage(language);
		const user = userEvent.setup();
		render(<Select aria-label="Department" options={[]} />);
		await user.click(screen.getByRole("button", { name: "Department" }));
		expect(screen.getByRole("listbox")).toHaveTextContent(message);
		expect(screen.getByText(message)).toHaveClass("text-neutral-500", "h-10");
		expect(screen.queryByRole("option")).not.toBeInTheDocument();
	});

	it.each([false, true])(
		"uses emptyText without offering a selectable value (multiple=%s)",
		async (multiple) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Select
					aria-label="Department"
					emptyText="No departments available"
					multiple={multiple}
					options={[]}
					onChange={onChange}
				/>
			);
			await user.click(screen.getByRole("button", { name: "Department" }));
			await user.click(screen.getByText("No departments available"));
			expect(onChange).not.toHaveBeenCalled();
			expect(screen.getByRole("listbox")).toBeInTheDocument();
			await user.keyboard("{ArrowDown}{Enter}");
			expect(onChange).not.toHaveBeenCalled();
		}
	);

	it("keeps an unavailable selected option with a Neutral tick without allowing it to be picked", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Select
				aria-label="Department"
				defaultValue="finance"
				options={[{ value: "finance", label: "Finance", disabled: true }]}
				onChange={onChange}
			/>
		);
		const trigger = screen.getByRole("button", { name: "Department" });
		expect(trigger).toHaveTextContent("Finance");
		await user.click(trigger);
		const unavailable = screen.getByRole("option", { name: "Finance" });
		expect(unavailable).toHaveAttribute("aria-selected", "true");
		expect(unavailable.querySelector("svg")).toHaveClass("text-neutral-400");
		expect(unavailable.querySelector("svg")).not.toHaveClass(
			"text-ink-blue-900"
		);
		await user.click(unavailable);
		await user.keyboard("{ArrowDown}{Enter}");
		expect(onChange).not.toHaveBeenCalled();
		expect(trigger).toHaveTextContent("Finance");
	});

	it.each(["{Enter}", " "])(
		"skips disabled options with arrows and cannot pick them with %s or a click",
		async (key) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Select
					aria-label="Department"
					options={options.map((option) => ({
						...option,
						disabled: option.value === "finance",
					}))}
					onChange={onChange}
				/>
			);
			await user.tab();
			await user.keyboard("{ArrowDown}");
			const unavailable = screen.getByRole("option", { name: "Finance" });
			expect(unavailable).toHaveAttribute("aria-disabled", "true");
			expect(unavailable).toHaveClass("text-neutral-500", "cursor-not-allowed");
			expect(unavailable).not.toHaveClass(
				"data-focus:bg-neutral-100",
				"text-neutral-800"
			);
			await user.click(unavailable);
			expect(onChange).not.toHaveBeenCalled();
			expect(unavailable).toHaveAttribute("aria-selected", "false");
			await user.keyboard("{Home}{ArrowDown}");
			expect(screen.getByRole("listbox")).toHaveAttribute(
				"aria-activedescendant",
				screen.getByRole("option", { name: "Operations" }).id
			);
			await user.keyboard("{ArrowUp}");
			expect(screen.getByRole("listbox")).toHaveAttribute(
				"aria-activedescendant",
				screen.getByRole("option", { name: "People" }).id
			);
			await user.keyboard(key);
			expect(onChange).toHaveBeenCalledExactlyOnceWith("people");
		}
	);

	it.each([undefined, "success", "error"] as const)(
		"disables opening and tab focus with Neutral styling over status=%s",
		async (status) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<>
					<Select
						disabled
						aria-label="Department"
						options={options}
						status={status}
						onChange={onChange}
					/>
					<Button>Next</Button>
				</>
			);
			const trigger = screen.getByRole("button", { name: "Department" });
			expect(trigger).toBeDisabled();
			expect(trigger).toHaveClass(
				"border-neutral-400",
				"bg-neutral-200",
				"text-neutral-500",
				"cursor-not-allowed"
			);
			expect(trigger).not.toHaveClass(
				"border-error-600",
				"border-success-600",
				"focus:outline-2",
				"focus:outline-solid",
				"focus:border-ink-blue-900",
				"text-ink-blue-900",
				"bg-white"
			);
			if (status === "error")
				expect(trigger).toHaveAttribute("aria-invalid", "true");
			else expect(trigger).not.toHaveAttribute("aria-invalid");
			await user.click(trigger);
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
			trigger.focus();
			expect(trigger).not.toHaveFocus();
			await user.keyboard("{Enter} {ArrowDown}{ArrowUp}");
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
			await user.tab();
			expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
			expect(onChange).not.toHaveBeenCalled();
		}
	);

	it("announces only an error status as invalid", () => {
		const { rerender } = render(
			<Select aria-label="Department" options={options} />
		);
		const trigger = screen.getByRole("button", { name: "Department" });
		expect(trigger).not.toHaveAttribute("aria-invalid");
		rerender(
			<Select aria-label="Department" options={options} status="error" />
		);
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		rerender(
			<Select aria-label="Department" options={options} status="success" />
		);
		expect(trigger).not.toHaveAttribute("aria-invalid");
	});

	it.each([false, true, "false", "true", "grammar", "spelling"] as const)(
		"preserves explicit aria-invalid=%s over status",
		(ariaInvalid) => {
			const { rerender } = render(
				<Select
					aria-invalid={ariaInvalid}
					aria-label="Department"
					options={options}
					status="error"
				/>
			);
			const trigger = screen.getByRole("button", { name: "Department" });
			expect(trigger).toHaveAttribute("aria-invalid", String(ariaInvalid));
			rerender(
				<Select
					aria-invalid={ariaInvalid}
					aria-label="Department"
					options={options}
					status="success"
				/>
			);
			expect(trigger).toHaveAttribute("aria-invalid", String(ariaInvalid));
			rerender(
				<Select
					disabled
					aria-invalid={ariaInvalid}
					aria-label="Department"
					options={options}
					status="error"
				/>
			);
			expect(trigger).toHaveAttribute("aria-invalid", String(ariaInvalid));
		}
	);

	it.each([
		["success", "border-success-600"],
		["error", "border-error-600"],
	] as const)(
		"keeps the %s border with an Ink Blue focus ring",
		(status, border) => {
			render(
				<Select aria-label="Department" options={options} status={status} />
			);
			const trigger = screen.getByRole("button", { name: "Department" });
			trigger.focus();
			expect(trigger).toHaveFocus();
			expect(trigger).toHaveClass(
				border,
				"focus:outline-2",
				"focus:outline-solid",
				"focus:outline-offset-2",
				"focus:outline-ink-blue-500"
			);
			expect(trigger).not.toHaveClass("focus:border-ink-blue-900");
		}
	);

	it.each(["{Enter}", " "])(
		"preserves disabled multi selections on %s while allowing valid selection and deselection",
		async (key) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Select
					multiple
					aria-label="Departments"
					defaultValue={["finance"]}
					options={[
						{ value: "finance", label: "Finance", disabled: true },
						{ value: "people", label: "People" },
						{ value: "unavailable", label: "Unavailable", disabled: true },
						{ value: "operations", label: "Operations" },
					]}
					onChange={onChange}
				/>
			);
			await user.click(screen.getByRole("button", { name: "Departments" }));
			const selected = screen.getByRole("option", { name: "Finance" });
			const unselected = screen.getByRole("option", { name: "Unavailable" });
			for (const row of [selected, unselected]) {
				expect(row).toHaveAttribute("aria-disabled", "true");
				expect(row).toHaveClass("text-neutral-500");
				expect(row.querySelector("svg")).toHaveClass("text-neutral-400");
				expect(row.querySelector("svg")).not.toHaveClass("text-ink-blue-900");
			}
			// Opening with a selected disabled value must not toggle it on Enter/Space.
			await user.keyboard(key);
			expect(onChange).not.toHaveBeenCalled();
			expect(selected).toHaveAttribute("aria-selected", "true");
			await user.click(selected);
			await user.click(unselected);
			expect(onChange).not.toHaveBeenCalled();
			expect(unselected).toHaveAttribute("aria-selected", "false");
			await user.keyboard("{Home}{ArrowDown}");
			expect(screen.getByRole("listbox")).toHaveAttribute(
				"aria-activedescendant",
				screen.getByRole("option", { name: "Operations" }).id
			);
			await user.keyboard(key);
			expect(onChange).toHaveBeenLastCalledWith(["finance", "operations"]);
			await user.keyboard(key);
			expect(onChange).toHaveBeenLastCalledWith(["finance"]);
			expect(onChange).toHaveBeenCalledTimes(2);
			expect(selected).toHaveAttribute("aria-selected", "true");
			await user.click(screen.getByRole("option", { name: "People" }));
			expect(onChange).toHaveBeenLastCalledWith(["finance", "people"]);
			await user.click(screen.getByRole("option", { name: "People" }));
			expect(onChange).toHaveBeenLastCalledWith(["finance"]);
		}
	);

	it("focuses each invalid Controller trigger through ref and shows its error status", async () => {
		const user = userEvent.setup();
		const { ReactHookForm } = composeStories(stories);
		render(<ReactHookForm />);
		const single = screen.getByRole("button", { name: "Department" });
		const multi = screen.getByRole("button", { name: "Departments" });
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() => expect(single).toHaveFocus());
		expect(single).toHaveAttribute("aria-invalid", "true");
		expect(single).toHaveClass("border-error-600");
		expect(multi).toHaveAttribute("aria-invalid", "true");
		expect(
			screen.getByRole("status", { name: "Submitted values" })
		).toHaveTextContent("Not submitted");
		await user.click(single);
		await user.click(screen.getByRole("option", { name: "Finance" }));
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() => expect(multi).toHaveFocus());
		expect(single).not.toHaveAttribute("aria-invalid");
		expect(multi).toHaveClass("border-error-600");
		await user.click(multi);
		await user.click(screen.getByRole("option", { name: "People" }));
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() => expect(multi).not.toHaveAttribute("aria-invalid"));
		expect(
			screen.getByRole("status", { name: "Submitted values" })
		).toHaveTextContent(
			JSON.stringify({ department: "finance", departments: ["people"] })
		);
	});

	it("submits a string and an array through the React Hook Form Controller story", async () => {
		const user = userEvent.setup();
		const { ReactHookForm } = composeStories(stories);
		render(<ReactHookForm />);
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "Finance" }));
		await user.click(screen.getByRole("button", { name: "Departments" }));
		await user.click(
			screen.getByRole("option", { name: "Operations and administration" })
		);
		await user.click(screen.getByRole("option", { name: "People" }));
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() =>
			expect(
				screen.getByRole("status", { name: "Submitted values" })
			).toHaveTextContent(
				JSON.stringify({
					department: "finance",
					departments: ["people", "operations"],
				})
			)
		);
	});

	it("submits the single default value and subsequent selection under its name", async () => {
		const user = userEvent.setup();
		const form = createRef<HTMLFormElement>();
		render(
			<form ref={form}>
				<Select
					aria-label="Department"
					defaultValue="people"
					name="department"
					options={options}
				/>
			</form>
		);
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
			["department", "people"],
		]);
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "Finance" }));
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
			["department", "finance"],
		]);
	});

	it.each([false, true])(
		"restores a disabled default on native reset (multiple=%s)",
		async (multiple) => {
			const user = userEvent.setup();
			const form = createRef<HTMLFormElement>();
			const onChange = vi.fn();
			const unavailableOptions = options.map((option) => ({
				...option,
				disabled: option.value === "finance",
			}));
			render(
				<form ref={form}>
					<Select
						aria-label="Department"
						name="department"
						options={unavailableOptions}
						onChange={onChange}
						{...(multiple
							? { multiple: true, defaultValue: ["finance"] }
							: { multiple: false, defaultValue: "finance" })}
					/>
					<Button type="reset">Reset</Button>
				</form>
			);
			const trigger = screen.getByRole("button", { name: "Department" });
			await user.click(trigger);
			await user.click(screen.getByRole("option", { name: "People" }));
			if (multiple) await user.keyboard("{Escape}");
			expect(trigger).toHaveTextContent(multiple ? "2 selected" : "People");
			onChange.mockClear();
			await user.click(screen.getByRole("button", { name: "Reset" }));
			expect(trigger).toHaveTextContent("Finance");
			expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
				[multiple ? "department[0]" : "department", "finance"],
			]);
			expect(onChange).toHaveBeenCalledExactlyOnceWith(
				multiple ? ["finance"] : "finance"
			);
			await user.click(trigger);
			const unavailable = screen.getByRole("option", { name: "Finance" });
			expect(unavailable).toHaveAttribute("aria-selected", "true");
			onChange.mockClear();
			await user.keyboard("{Enter} ");
			await user.click(unavailable);
			expect(onChange).not.toHaveBeenCalled();
			expect(unavailable).toHaveAttribute("aria-selected", "true");
		}
	);

	it("submits each multi value using Headless UI's indexed field names and resets both modes to their defaults", async () => {
		const user = userEvent.setup();
		const form = createRef<HTMLFormElement>();
		render(
			<form ref={form}>
				<Select
					aria-label="Department"
					defaultValue="people"
					name="department"
					options={options}
				/>
				<Select
					multiple
					aria-label="Departments"
					defaultValue={["finance"]}
					name="departments"
					options={options}
				/>
				<Button type="reset">Reset</Button>
			</form>
		);
		const defaults = [
			["department", "people"],
			["departments[0]", "finance"],
		];
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual(
			defaults
		);
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "Operations" }));
		await user.click(screen.getByRole("button", { name: "Departments" }));
		await user.click(screen.getByRole("option", { name: "People" }));
		await user.keyboard("{Escape}");
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
			["department", "operations"],
			["departments[0]", "finance"],
			["departments[1]", "people"],
		]);
		await user.click(screen.getByRole("button", { name: "Reset" }));
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual(
			defaults
		);
		expect(
			screen.getByRole("button", { name: "Department" })
		).toHaveTextContent("People");
		expect(
			screen.getByRole("button", { name: "Departments" })
		).toHaveTextContent("Finance");
	});

	it("renders no hidden inputs or submitted values without a name in either mode", () => {
		const form = createRef<HTMLFormElement>();
		render(
			<form ref={form}>
				<Select
					aria-label="Department"
					defaultValue="people"
					options={options}
				/>
				<Select
					multiple
					aria-label="Departments"
					defaultValue={["people", "finance"]}
					options={options}
				/>
			</form>
		);
		expect(form.current?.querySelectorAll('input[type="hidden"]')).toHaveLength(
			0
		);
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([]);
	});

	it("omits disabled Select values from native form submission in both modes", () => {
		const form = createRef<HTMLFormElement>();
		render(
			<form ref={form}>
				<Select
					disabled
					aria-label="Department"
					defaultValue="people"
					name="department"
					options={options}
				/>
				<Select
					disabled
					multiple
					aria-label="Departments"
					defaultValue={["people", "finance"]}
					name="departments"
					options={options}
				/>
			</form>
		);
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([]);
	});

	it("resets a multi selection to an explicit empty default with no submitted values", async () => {
		const user = userEvent.setup();
		const form = createRef<HTMLFormElement>();
		render(
			<form ref={form}>
				<Select
					multiple
					aria-label="Departments"
					defaultValue={[]}
					name="departments"
					options={options}
					placeholder="Choose departments"
				/>
				<Button type="reset">Reset</Button>
			</form>
		);
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([]);
		await user.click(screen.getByRole("button", { name: "Departments" }));
		await user.click(screen.getByRole("option", { name: "Finance" }));
		await user.keyboard("{Escape}");
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([
			["departments[0]", "finance"],
		]);
		await user.click(screen.getByRole("button", { name: "Reset" }));
		expect(Array.from(new FormData(form.current ?? undefined))).toEqual([]);
		expect(
			screen.getByRole("button", { name: "Departments" })
		).toHaveTextContent("Choose departments");
	});

	it("types values and callbacks according to the selection mode", () => {
		type Single = Extract<SelectProps, { multiple?: false }>;
		type Multi = Extract<SelectProps, { multiple: true }>;
		expectTypeOf<Single["value"]>().toEqualTypeOf<string | undefined>();
		expectTypeOf<Single["defaultValue"]>().toEqualTypeOf<string | undefined>();
		expectTypeOf<Single["onChange"]>().toEqualTypeOf<
			((value: string) => void) | undefined
		>();
		expectTypeOf<Multi["value"]>().toEqualTypeOf<Array<string> | undefined>();
		expectTypeOf<Multi["defaultValue"]>().toEqualTypeOf<
			Array<string> | undefined
		>();
		expectTypeOf<Multi["onChange"]>().toEqualTypeOf<
			((value: Array<string>) => void) | undefined
		>();
		expectTypeOf<{
			options: [];
			multiple: true;
			value: string;
		}>().not.toExtend<SelectProps>();
		expectTypeOf<{
			options: [];
			multiple: true;
			defaultValue: string;
		}>().not.toExtend<SelectProps>();
		expectTypeOf<{
			options: [];
			multiple: true;
			onChange: (value: string) => void;
		}>().not.toExtend<SelectProps>();
		expectTypeOf<{
			options: [];
			value: Array<string>;
		}>().not.toExtend<SelectProps>();
		expectTypeOf<{
			options: [];
			defaultValue: Array<string>;
		}>().not.toExtend<SelectProps>();
		expectTypeOf<{
			options: [];
			onChange: (value: Array<string>) => void;
		}>().not.toExtend<SelectProps>();
	});

	it("keeps controlled multi values until the caller updates them", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const { rerender } = render(
			<Select
				multiple
				aria-label="Departments"
				options={options}
				value={["operations", "people"]}
				onChange={onChange}
			/>
		);
		const trigger = screen.getByRole("button", { name: "Departments" });
		await user.click(trigger);
		await user.click(screen.getByRole("option", { name: "Finance" }));
		expect(onChange).toHaveBeenLastCalledWith([
			"people",
			"finance",
			"operations",
		]);
		expect(screen.getByRole("option", { name: "Finance" })).toHaveAttribute(
			"aria-selected",
			"false"
		);
		expect(trigger).toHaveTextContent("2 selected");
		rerender(
			<Select
				multiple
				aria-label="Departments"
				options={options}
				value={["people", "finance", "operations"]}
				onChange={onChange}
			/>
		);
		expect(screen.getByRole("option", { name: "Finance" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		expect(trigger).toHaveTextContent("3 selected");
	});

	it("toggles multi options with the keyboard and dismisses with Escape or an outside click", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Select multiple aria-label="Departments" options={options} />
				<Button>Outside</Button>
			</>
		);
		const trigger = screen.getByRole("button", { name: "Departments" });
		await user.tab();
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("listbox")).toHaveFocus();
		await user.keyboard("{ArrowDown}{Enter}");
		expect(screen.getByRole("option", { name: "People" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		await user.keyboard("{ArrowDown} ");
		expect(screen.getByRole("option", { name: "Finance" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
		const outside = screen.getByRole("button", { name: "Outside" });
		await user.click(trigger);
		await user.click(outside);
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(trigger).toHaveTextContent("2 selected");
	});

	it("uses a custom summary only for several options, supplied in option order", async () => {
		const user = userEvent.setup();
		const formatSummary = vi.fn(() => "Chosen departments");
		render(
			<Select
				multiple
				aria-label="Departments"
				formatSummary={formatSummary}
				options={options}
				placeholder="Choose"
			/>
		);
		const trigger = screen.getByRole("button", { name: "Departments" });
		expect(trigger).toHaveTextContent("Choose");
		await user.click(trigger);
		await user.click(screen.getByRole("option", { name: "Operations" }));
		expect(trigger).toHaveTextContent("Operations");
		expect(formatSummary).not.toHaveBeenCalled();
		await user.click(screen.getByRole("option", { name: "People" }));
		expect(trigger).toHaveTextContent("Chosen departments");
		expect(formatSummary).toHaveBeenLastCalledWith([
			{ value: "people", label: "People" },
			{ value: "operations", label: "Operations" },
		]);
	});

	it("summarises zero, one and several selections in English and Spanish", async () => {
		const user = userEvent.setup();
		render(
			<Select
				multiple
				aria-label="Departments"
				options={options}
				placeholder="Choose departments"
			/>
		);
		const trigger = screen.getByRole("button", { name: "Departments" });
		expect(trigger).toHaveTextContent("Choose departments");
		await user.click(trigger);
		await user.click(screen.getByRole("option", { name: "Finance" }));
		expect(trigger).toHaveTextContent("Finance");
		await user.click(screen.getByRole("option", { name: "People" }));
		expect(trigger).toHaveTextContent("2 selected");
		await user.click(screen.getByRole("option", { name: "Operations" }));
		expect(trigger).toHaveTextContent("3 selected");
		await i18n.changeLanguage("es");
		await waitFor(() => expect(trigger).toHaveTextContent("3 seleccionados"));
		await user.click(screen.getByRole("option", { name: "Operations" }));
		expect(trigger).toHaveTextContent("2 seleccionados");
		await user.click(screen.getByRole("option", { name: "People" }));
		expect(trigger).toHaveTextContent("Finance");
		await user.click(screen.getByRole("option", { name: "Finance" }));
		expect(trigger).toHaveTextContent("Choose departments");
		await i18n.changeLanguage("en");
	});

	it("shows decorative selected and unselected checkbox indicators in multi mode", async () => {
		const user = userEvent.setup();
		render(
			<Select
				multiple
				aria-label="Departments"
				defaultValue={["finance"]}
				options={options}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Departments" }));
		const selected = screen.getByRole("option", { name: "Finance" });
		const unselected = screen.getByRole("option", { name: "People" });
		expect(selected.querySelector("svg")).toHaveClass("text-ink-blue-900");
		expect(unselected.querySelector("svg")).toHaveClass("text-neutral-400");
		expect(selected.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(unselected.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		await user.click(unselected);
		expect(unselected.querySelector("svg")).toHaveClass("text-ink-blue-900");
		await user.click(selected);
		expect(selected.querySelector("svg")).toHaveClass("text-neutral-400");
	});

	it("toggles multiple values in option order while keeping the panel open", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Select
				multiple
				aria-label="Departments"
				options={options}
				onChange={onChange}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Departments" }));
		await user.click(screen.getByRole("option", { name: "Operations" }));
		expect(onChange).toHaveBeenLastCalledWith(["operations"]);
		expect(screen.getByRole("listbox")).toHaveAttribute(
			"aria-multiselectable",
			"true"
		);
		await user.click(screen.getByRole("option", { name: "People" }));
		expect(onChange).toHaveBeenLastCalledWith(["people", "operations"]);
		expect(screen.getByRole("option", { name: "People" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		expect(screen.getByRole("option", { name: "Operations" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		await user.click(screen.getByRole("option", { name: "Operations" }));
		expect(onChange).toHaveBeenLastCalledWith(["people"]);
		expect(screen.getByRole("option", { name: "Operations" })).toHaveAttribute(
			"aria-selected",
			"false"
		);
	});

	it("uses aria-labelledby independently of the selected label", () => {
		render(
			<>
				<span id="department-label">Department</span>
				<Select
					aria-labelledby="department-label"
					defaultValue="people"
					options={options}
				/>
			</>
		);
		expect(
			screen.getByRole("button", { name: "Department" })
		).toHaveTextContent("People");
	});

	it("keeps a controlled value until the caller updates it", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const { rerender } = render(
			<Select
				aria-label="Department"
				options={options}
				value="people"
				onChange={onChange}
			/>
		);
		const trigger = screen.getByRole("button", { name: "Department" });
		await user.click(trigger);
		await user.click(screen.getByRole("option", { name: "Finance" }));
		expect(onChange).toHaveBeenCalledWith("finance");
		expect(trigger).toHaveTextContent("People");
		rerender(
			<Select
				aria-label="Department"
				options={options}
				value="finance"
				onChange={onChange}
			/>
		);
		expect(trigger).toHaveTextContent("Finance");
	});

	it("preserves an uncontrolled selection when its selected row is picked again", async () => {
		const user = userEvent.setup();
		render(
			<Select aria-label="Department" defaultValue="people" options={options} />
		);
		const trigger = screen.getByRole("button", { name: "Department" });
		await user.click(trigger);
		await user.click(screen.getByRole("option", { name: "People" }));
		expect(trigger).toHaveTextContent("People");
		await user.click(trigger);
		expect(screen.getByRole("option", { name: "People" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
	});

	it.each(["{Enter}", " ", "{ArrowDown}", "{ArrowUp}"])(
		"opens with %s and returns focus on Escape",
		async (key) => {
			const user = userEvent.setup();
			render(
				<Select
					aria-label="Department"
					options={options}
					placeholder="Choose"
				/>
			);
			await user.tab();
			await user.keyboard(key);
			expect(screen.getByRole("listbox")).toHaveFocus();
			await user.keyboard("{Escape}");
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
			await waitFor(() =>
				expect(screen.getByRole("button", { name: "Department" })).toHaveFocus()
			);
		}
	);

	it.each(["{Enter}", " "])(
		"moves with arrows and picks with %s",
		async (key) => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<Select aria-label="Department" options={options} onChange={onChange} />
			);
			await user.tab();
			await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}");
			expect(screen.getByRole("listbox")).toHaveAttribute(
				"aria-activedescendant",
				screen.getByRole("option", { name: "Finance" }).id
			);
			await user.keyboard(key);
			expect(onChange).toHaveBeenCalledWith("finance");
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
			await waitFor(() =>
				expect(screen.getByRole("button", { name: "Department" })).toHaveFocus()
			);
		}
	);

	it("jumps to an option by typing its label", async () => {
		const user = userEvent.setup();
		render(<Select aria-label="Department" options={options} />);
		await user.tab();
		await user.keyboard("{Enter}");
		// jsdom lacks innerText, which browser typeahead reads. These rows contain
		// only visible label text; supply that browser API without mocking Listbox.
		for (const option of screen.getAllByRole("option")) {
			Object.defineProperty(option, "innerText", { value: option.textContent });
		}
		await user.keyboard("op{Enter}");
		expect(
			screen.getByRole("button", { name: "Department" })
		).toHaveTextContent("Operations");
	});

	it("closes on an outside click", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Select aria-label="Department" options={options} />
				<Button>Outside</Button>
			</>
		);
		const outside = screen.getByRole("button", { name: "Outside" });
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(outside);
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("shows a tick only on the selected row and styles keyboard-active rows", async () => {
		const user = userEvent.setup();
		render(
			<Select
				aria-label="Department"
				defaultValue="finance"
				options={options}
			/>
		);
		await user.click(screen.getByRole("button", { name: "Department" }));
		const selected = screen.getByRole("option", { name: "Finance" });
		expect(selected.querySelector("svg")).toHaveClass("text-ink-blue-900");
		expect(selected.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(
			screen.getByRole("option", { name: "People" }).querySelector("svg")
		).toBeNull();
		expect(selected).toHaveClass(
			"h-10",
			"px-4",
			"text-neutral-800",
			"data-focus:bg-neutral-100"
		);
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("listbox")).toHaveAttribute(
			"aria-activedescendant",
			screen.getByRole("option", { name: "Operations" }).id
		);
	});

	it("exposes the Input-sized neutral trigger through ref and sizes it with className", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<Select
				ref={ref}
				aria-label="Department"
				className="w-full"
				options={options}
				placeholder="Choose"
			/>
		);
		const trigger = screen.getByRole("button", { name: "Department" });
		expect(ref.current).toBe(trigger);
		ref.current?.focus();
		expect(trigger).toHaveFocus();
		expect(trigger).toHaveClass(
			"w-full",
			"inline-flex",
			"h-11",
			"px-4",
			"gap-3",
			"rounded-lg",
			"border",
			"border-neutral-400",
			"bg-white",
			"text-sm",
			"text-ink-blue-900",
			"focus:border-ink-blue-900"
		);
		expect(screen.getByText("Choose")).toHaveClass("truncate");
		expect(trigger.querySelector("svg")).toHaveClass("size-5", "shrink-0");
	});

	it("opens options in order, picks a string value and returns focus with its label", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<Select aria-label="Department" options={options} onChange={onChange} />
		);
		const trigger = screen.getByRole("button", { name: "Department" });
		await user.click(trigger);
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["People", "Finance", "Operations"]);
		await user.click(screen.getByRole("option", { name: "Finance" }));
		expect(onChange).toHaveBeenCalledWith("finance");
		expect(trigger).toHaveTextContent("Finance");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
		await user.click(trigger);
		expect(screen.getByRole("option", { name: "Finance" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		expect(screen.getByRole("option", { name: "People" })).toHaveAttribute(
			"aria-selected",
			"false"
		);
	});

	it("shows a placeholder with a caller-supplied accessible name", () => {
		render(
			<Select
				aria-label="Department"
				options={options}
				placeholder="Choose a department"
			/>
		);
		expect(
			screen.getByRole("button", { name: "Department" })
		).toHaveTextContent("Choose a department");
		expect(
			screen.queryByRole("button", { name: "Choose a department" })
		).not.toBeInTheDocument();
	});
});
