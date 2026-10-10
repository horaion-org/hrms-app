import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useRef, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";

const options = [
	{ id: "marcus", name: "Marcus Lim" },
	{ id: "sarah", name: "Sarah Tan" },
];

describe("Combobox single choice", () => {
	it("reports search, loading and empty results with a footer while retaining a choice absent from results", async () => {
		const user = userEvent.setup();
		const searched = vi.fn();
		const props = {
			multiple: false as const,
			"aria-label": "Branch head",
			getKey: (option: (typeof options)[number]): string => option.id,
			getLabel: (option: (typeof options)[number]): string => option.name,
			placeholder: "Select a branch head",
			searchPlaceholder: "Search people",
			query: "",
			value: options[0] ?? null,
			footer: "Only active people are shown.",
			onChange: vi.fn(),
			onQueryChange: searched,
		};
		const { rerender } = render(
			<Combobox
				{...props}
				loading
				loadingText="Searching people"
				options={options}
			/>
		);
		const trigger = screen.getByRole("button", { name: "Branch head" });
		await user.click(trigger);
		expect(screen.getByRole("status")).toHaveTextContent("Searching people");
		expect(screen.getAllByRole("option")).toHaveLength(2);
		expect(
			screen.getByText("Only active people are shown.")
		).toBeInTheDocument();
		await user.type(screen.getByRole("combobox"), "z");
		expect(searched).toHaveBeenLastCalledWith("z");
		rerender(
			<Combobox {...props} emptyText="Nobody matches" options={[]} query="z" />
		);
		expect(screen.getByRole("status")).toHaveTextContent("Nobody matches");
		expect(trigger).toHaveTextContent("Marcus Lim");
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
	});
	it("names a single-choice list, connects errors and required state, and cannot open or clear when disabled", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		const ref = createRef<HTMLButtonElement>();
		const props = {
			multiple: false as const,
			"aria-labelledby": "head-label",
			"aria-describedby": "head-error",
			"aria-required": true as const,
			id: "head-control",
			getKey: (option: (typeof options)[number]): string => option.id,
			getLabel: (option: (typeof options)[number]): string => option.name,
			options,
			placeholder: "Select a branch head",
			searchPlaceholder: "Search people",
			query: "",
			value: options[0] ?? null,
			onChange: changed,
			onQueryChange: vi.fn(),
		};
		const { rerender } = render(
			<>
				<span id="head-label">Branch head</span>
				<span id="head-error">Choose a branch head</span>
				<Combobox {...props} ref={ref} status="error" />
				<button type="button">Next field</button>
			</>
		);
		const trigger = screen.getByRole("button", { name: "Branch head" });
		expect(ref.current).toBe(trigger);
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger).toHaveAttribute("aria-required", "true");
		expect(trigger).toHaveAttribute("id", "head-control");
		expect(trigger).toHaveAccessibleDescription("Choose a branch head");
		await user.tab();
		expect(trigger).toHaveFocus();
		await user.keyboard(" ");
		const search = screen.getByRole("combobox", { name: "Search people" });
		const list = screen.getByRole("listbox", { name: "Branch head" });
		expect(list).not.toHaveAttribute("aria-multiselectable", "true");
		expect(search).toHaveFocus();
		expect(search).toHaveAttribute("aria-controls", list.id);
		expect(trigger).toHaveAttribute("aria-controls", list.id);
		await user.tab();
		await waitFor(() =>
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
		);
		expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
		changed.mockClear();
		rerender(
			<Combobox
				{...props}
				ref={ref}
				disabled
				aria-label="Branch head"
				aria-labelledby={undefined}
				status="error"
			/>
		);
		expect(ref.current).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Branch head" }));
		await user.keyboard("{Backspace}{Enter}");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(changed).not.toHaveBeenCalled();
		expect(ref.current).toHaveTextContent("Marcus Lim");
	});
	it("clears the chosen value with Backspace on the trigger and shows the placeholder again", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		const Example = (): FunctionComponent => {
			const [value, setValue] = useState<(typeof options)[number] | null>(
				options[0] ?? null
			);
			return (
				<Combobox
					aria-label="Branch head"
					getKey={(option) => option.id}
					getLabel={(option) => option.name}
					multiple={false}
					options={options}
					placeholder="Select a branch head"
					query=""
					searchPlaceholder="Search people"
					value={value}
					onQueryChange={vi.fn()}
					onChange={(next) => {
						setValue(next);
						changed(next);
					}}
				/>
			);
		};
		render(<Example />);
		const trigger = screen.getByRole("button", { name: "Branch head" });
		await user.tab();
		expect(trigger).toHaveFocus();
		await user.keyboard("{Backspace}");
		expect(changed).toHaveBeenCalledExactlyOnceWith(null);
		expect(trigger).toHaveTextContent("Select a branch head");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});
	it("chooses one value, replaces it, and closes with the chosen label and focus on the trigger", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		const Example = (): FunctionComponent => {
			const [value, setValue] = useState<(typeof options)[number] | null>(null);
			return (
				<Combobox
					aria-label="Branch head"
					getKey={(option) => option.id}
					getLabel={(option) => option.name}
					multiple={false}
					options={options}
					placeholder="Select a branch head"
					query=""
					searchPlaceholder="Search people"
					value={value}
					onQueryChange={vi.fn()}
					onChange={(next) => {
						setValue(next);
						changed(next);
					}}
				/>
			);
		};
		render(<Example />);
		const trigger = screen.getByRole("button", { name: "Branch head" });
		expect(trigger).toHaveTextContent("Select a branch head");
		await user.click(trigger);
		await user.click(screen.getByRole("option", { name: "Marcus Lim" }));
		expect(changed).toHaveBeenLastCalledWith(options[0]);
		expect(trigger).toHaveTextContent("Marcus Lim");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
		await user.keyboard("{Enter}");
		expect(screen.getByRole("option", { name: "Marcus Lim" })).toHaveAttribute(
			"aria-selected",
			"true"
		);
		await user.keyboard("{ArrowDown}{Enter}");
		expect(changed).toHaveBeenLastCalledWith(options[1]);
		expect(trigger).toHaveTextContent("Sarah Tan");
		expect(trigger).not.toHaveTextContent("Marcus Lim");
		expect(
			screen.queryByRole("button", { name: /Remove/ })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
	});
	it("offers a create row for an unknown query, by click or Enter, and never for a known label", async () => {
		const user = userEvent.setup();
		const created = vi.fn();
		const changed = vi.fn();
		const Example = (): FunctionComponent => {
			const [query, setQuery] = useState("");
			return (
				<Combobox
					aria-label="Shift group"
					getKey={(option) => option.id}
					getLabel={(option) => option.name}
					multiple={false}
					placeholder="Select or create a group"
					query={query}
					searchPlaceholder="Search groups"
					value={null}
					options={options.filter((option) =>
						option.name.toLowerCase().includes(query.trim().toLowerCase())
					)}
					onChange={changed}
					onQueryChange={setQuery}
					onCreate={(name) => {
						created(name);
						setQuery("");
					}}
				/>
			);
		};
		render(<Example />);
		await user.click(screen.getByRole("button", { name: "Shift group" }));
		expect(screen.queryByRole("option", { name: /^Create/ })).toBeNull();

		await user.type(screen.getByRole("combobox"), "marcus lim ");
		expect(screen.queryByRole("option", { name: /^Create/ })).toBeNull();
		expect(screen.getByRole("option", { name: "Marcus Lim" })).toBeVisible();

		await user.clear(screen.getByRole("combobox"));
		// Clearing the search reports null, as it always has; only the create row is under test.
		changed.mockClear();
		await user.type(screen.getByRole("combobox"), "Night ");
		const row = screen.getByRole("option", { name: 'Create "Night"' });
		expect(row).toHaveTextContent('Create "Night"');
		expect(screen.queryByRole("status")).toBeNull();
		await user.click(row);
		expect(created).toHaveBeenLastCalledWith("Night");
		expect(changed).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Shift group" }));
		await user.type(screen.getByRole("combobox"), "Dawn");
		await user.keyboard("{ArrowDown}{Enter}");
		expect(created).toHaveBeenLastCalledWith("Dawn");
		expect(changed).not.toHaveBeenCalled();
	});
	it("shows a compact chosen value in the trigger and places the list under an anchor", async () => {
		const user = userEvent.setup();
		const Example = (): FunctionComponent => {
			const anchor = useRef<HTMLDivElement>(null);
			return (
				<div ref={anchor} data-testid="anchor">
					<Combobox
						aria-label="Branch head"
						formatValue={(option) => option.id}
						getKey={(option) => option.id}
						getLabel={(option) => option.name}
						multiple={false}
						options={options}
						panelAnchor={anchor}
						placeholder="Select a branch head"
						query=""
						searchPlaceholder="Search people"
						value={options[0] ?? null}
						onChange={vi.fn()}
						onQueryChange={vi.fn()}
					/>
				</div>
			);
		};
		render(<Example />);
		vi.spyOn(
			screen.getByTestId("anchor"),
			"getBoundingClientRect"
		).mockReturnValue(
			DOMRect.fromRect({ x: 10, y: 20, width: 300, height: 44 })
		);
		const trigger = screen.getByRole("button", { name: "Branch head" });
		expect(trigger).toHaveTextContent("marcus");
		expect(trigger).not.toHaveTextContent("Marcus Lim");
		await user.click(trigger);
		expect(
			screen.getByRole("option", { name: "Marcus Lim" })
		).toBeInTheDocument();
		expect(screen.getByRole("presentation")).toHaveStyle({
			left: "10px",
			width: "300px",
		});
	});
});

describe("Combobox", () => {
	it("is reachable with Tab, names the popup correctly, and lets Tab leave without stealing focus", async () => {
		const user = userEvent.setup();
		render(
			<>
				<span id="heads-label">Branch heads</span>
				<Combobox
					aria-labelledby="heads-label"
					getKey={(option) => option.id}
					getLabel={(option) => option.name}
					options={options}
					placeholder="Select branch heads"
					query=""
					searchPlaceholder="Search people"
					value={[]}
					onChange={vi.fn()}
					onQueryChange={vi.fn()}
				/>
				<button type="button">Next field</button>
			</>
		);
		const trigger = screen.getByRole("button", { name: "Branch heads" });
		await user.tab();
		expect(trigger).toHaveFocus();
		await user.keyboard(" ");
		const search = screen.getByRole("combobox", { name: "Search people" });
		const list = screen.getByRole("listbox", { name: "Branch heads" });
		expect(search).toHaveAttribute("aria-controls", list.id);
		expect(trigger).toHaveAttribute("aria-controls", list.id);
		await user.tab();
		await waitFor(() =>
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
		);
		expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
	});
	it("announces loading with retained results, empty text, error and disabled state with a focusable ref", async () => {
		const user = userEvent.setup();
		const ref = createRef<HTMLButtonElement>();
		const props = {
			"aria-label": "Branch heads",
			"aria-describedby": "heads-help",
			"aria-required": true,
			id: "heads-control",
			getKey: (option: (typeof options)[number]): string => option.id,
			getLabel: (option: (typeof options)[number]): string => option.name,
			placeholder: "Select branch heads",
			searchPlaceholder: "Search people",
			query: "",
			value: [],
			onChange: vi.fn(),
			onQueryChange: vi.fn(),
		};
		const { rerender } = render(
			<Combobox {...props} ref={ref} loading options={options} status="error" />
		);
		const trigger = screen.getByRole("button", { name: "Branch heads" });
		expect(ref.current).toBe(trigger);
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger).toHaveAttribute("aria-describedby", "heads-help");
		expect(trigger).toHaveAttribute("aria-required", "true");
		expect(trigger).toHaveAttribute("id", "heads-control");
		ref.current?.focus();
		expect(trigger).toHaveFocus();
		await user.click(trigger);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(screen.getAllByRole("option")).toHaveLength(2);
		rerender(<Combobox {...props} emptyText="Nobody matches" options={[]} />);
		expect(screen.getByRole("status")).toHaveTextContent("Nobody matches");
		await user.keyboard("{Escape}");
		rerender(
			<Combobox
				{...props}
				disabled
				options={options}
				status="error"
				value={options}
			/>
		);
		expect(trigger).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Remove Marcus Lim" })
		).toBeDisabled();
		await user.click(trigger);
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});
	it("caps choices, skips unavailable rows, and supports arrows, Enter, Space and focus return", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		const Example = (): FunctionComponent => {
			const [value, setValue] = useState(options.slice(0, 1));
			return (
				<>
					<Combobox
						aria-label="Branch heads"
						getKey={(option) => option.id}
						getLabel={(option) => option.name}
						maxSelected={1}
						options={options}
						placeholder="Select branch heads"
						query=""
						searchPlaceholder="Search people"
						value={value}
						onQueryChange={vi.fn()}
						onChange={(next) => {
							setValue(next);
							changed(next);
						}}
					/>
					<button type="button">Outside</button>
				</>
			);
		};
		render(<Example />);
		const trigger = screen.getByRole("button", { name: "Branch heads" });
		trigger.focus();
		await user.keyboard("{Enter}");
		expect(screen.getByRole("combobox")).toHaveFocus();
		expect(screen.getByRole("option", { name: "Sarah Tan" })).toHaveAttribute(
			"aria-disabled",
			"true"
		);
		await user.click(screen.getByRole("option", { name: "Sarah Tan" }));
		expect(changed).not.toHaveBeenCalled();
		await user.keyboard("{ArrowDown}{Enter}");
		expect(changed).toHaveBeenLastCalledWith([]);
		await user.keyboard("{ArrowDown} ");
		expect(changed).toHaveBeenLastCalledWith([options[1]]);
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
		await user.click(trigger);
		await user.click(screen.getByRole("button", { name: "Outside" }));
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		await waitFor(() => expect(trigger).toHaveFocus());
	});
	it("retains Tokens absent from results and removes them by button or empty-search Backspace", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		const Example = (): FunctionComponent => {
			const [value, setValue] = useState(options);
			const [query, setQuery] = useState("");
			return (
				<Combobox
					aria-label="Branch heads"
					getKey={(option) => option.id}
					getLabel={(option) => option.name}
					options={[]}
					placeholder="Select branch heads"
					query={query}
					searchPlaceholder="Search people"
					value={value}
					onQueryChange={setQuery}
					onChange={(next) => {
						setValue(next);
						changed(next);
					}}
				/>
			);
		};
		render(<Example />);
		await user.click(screen.getByRole("button", { name: "Remove Marcus Lim" }));
		expect(changed).toHaveBeenLastCalledWith([options[1]]);
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Branch heads" }));
		await user.type(screen.getByRole("combobox"), "s{Backspace}");
		expect(
			screen.getByRole("button", { name: "Remove Sarah Tan" })
		).toBeInTheDocument();
		await user.keyboard("{Backspace}");
		expect(changed).toHaveBeenLastCalledWith([]);
		expect(
			screen.queryByRole("button", { name: "Remove Sarah Tan" })
		).not.toBeInTheDocument();
	});
	it("reports search and toggles choices in choosing order without closing", async () => {
		const user = userEvent.setup();
		const changed = vi.fn();
		const searched = vi.fn();
		const Example = (): FunctionComponent => {
			const [value, setValue] = useState<Array<(typeof options)[number]>>([]);
			const [query, setQuery] = useState("");
			return (
				<Combobox
					aria-label="Branch heads"
					getKey={(option) => option.id}
					getLabel={(option) => option.name}
					options={options}
					placeholder="Select branch heads"
					query={query}
					searchPlaceholder="Search people"
					value={value}
					onChange={(next) => {
						setValue(next);
						changed(next);
					}}
					onQueryChange={(next) => {
						setQuery(next);
						searched(next);
					}}
				/>
			);
		};
		render(<Example />);
		await user.click(screen.getByRole("button", { name: "Branch heads" }));
		await user.type(screen.getByRole("combobox"), "sa");
		expect(searched).toHaveBeenLastCalledWith("sa");
		await user.click(screen.getByRole("option", { name: "Sarah Tan" }));
		await user.click(screen.getByRole("option", { name: "Marcus Lim" }));
		expect(changed).toHaveBeenLastCalledWith([options[1], options[0]]);
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await user.click(screen.getByRole("option", { name: "Sarah Tan" }));
		expect(changed).toHaveBeenLastCalledWith([options[0]]);
	});
});
