import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
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
