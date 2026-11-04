import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState } from "react";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import {
	ListToolbar,
	type ListToolbarProps,
} from "@/features/organisation/ListToolbar";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const options = [
	{ value: "all", label: "All Branches" },
	{ value: "ACTIVE", label: "Active" },
	{ value: "INACTIVE", label: "Inactive" },
];

const Harness = (
	props: Partial<ListToolbarProps> & { onStatus?: (value: string) => void }
): FunctionComponent => {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");
	return (
		<ListToolbar
			createLabel="Create Branch"
			search={search}
			searchLabel="Search Branch"
			filter={{
				label: "Showing:",
				value: status,
				options,
				onChange: (value) => {
					setStatus(value);
					props.onStatus?.(value);
				},
			}}
			onSearchChange={setSearch}
			{...props}
		/>
	);
};

describe("ListToolbar", () => {
	it("offers a named search box with a search icon", async () => {
		const user = userEvent.setup();
		const onSearchChange = vi.fn();
		render(
			<ListToolbar
				createLabel="Create Branch"
				search=""
				searchLabel="Search Branch"
				onSearchChange={onSearchChange}
			/>
		);

		const search = screen.getByRole("searchbox", { name: "Search Branch" });
		expect(search).toHaveAttribute("placeholder", "Search Branch");
		expect(search.parentElement?.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		await user.type(search, "O");
		expect(onSearchChange).toHaveBeenCalledWith("O");
	});

	it("keeps the typed search when controlled", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		const search = screen.getByRole("searchbox", { name: "Search Branch" });
		await user.type(search, "Orchard");

		expect(search).toHaveValue("Orchard");
	});

	it("runs the create action from its primary button", async () => {
		const user = userEvent.setup();
		const onCreate = vi.fn();
		render(<Harness onCreate={onCreate} />);

		const create = screen.getByRole("button", { name: "Create Branch" });
		expect(create).toHaveClass("bg-ink-blue-700", "rounded-full");
		await user.click(create);

		expect(onCreate).toHaveBeenCalledOnce();
	});

	it("offers a second action beside the primary one when given", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<Harness secondaryAction={{ label: "Assign role", onClick }} />);

		await user.click(screen.getByRole("button", { name: "Assign role" }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("shows further actions before the others when given", () => {
		render(
			<Harness
				actions={<button type="button">Export</button>}
				onCreate={vi.fn()}
			/>
		);

		const buttons = screen.getAllByRole("button");
		expect(buttons.map((button) => button.textContent)).toEqual(
			expect.arrayContaining(["Export"])
		);
		expect(
			buttons.findIndex((button) => button.textContent === "Export")
		).toBeLessThan(
			buttons.findIndex((button) => button.textContent === "Create Branch")
		);
	});

	it("filters by status through the labelled Showing select in the Filters panel", async () => {
		const user = userEvent.setup();
		const onStatus = vi.fn();
		render(<Harness onStatus={onStatus} />);

		expect(
			screen.queryByRole("button", { name: "Showing:" })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Filters" }));
		const filter = screen.getByRole("button", { name: "Showing:" });
		expect(filter).toHaveTextContent("All Branches");
		await user.click(filter);
		await user.click(screen.getByRole("option", { name: "Inactive" }));

		expect(onStatus).toHaveBeenCalledWith("INACTIVE");
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"Inactive"
		);
	});

	it("ticks statuses on their own through a multiple-choice Showing select", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ListToolbar
				search=""
				searchLabel="Search employee"
				multipleFilter={{
					label: "Showing:",
					value: ["ACTIVE", "INACTIVE"],
					options: options.slice(1),
					placeholder: "All employees",
					formatSummary: () => "All employees",
					onChange,
				}}
				onSearchChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Filters" }));
		const filter = screen.getByRole("button", { name: "Showing:" });
		expect(filter).toHaveTextContent("All employees");
		await user.click(filter);
		await user.click(screen.getByRole("option", { name: "Active" }));

		expect(onChange).toHaveBeenCalledWith(["INACTIVE"]);
		expect(
			screen.queryByRole("button", { name: "Create Branch" })
		).not.toBeInTheDocument();
	});

	it("lays out search, then the Filters button, then the actions, in one labelled group", () => {
		render(<Harness onCreate={vi.fn()} />);

		const group = screen.getByRole("group", { name: "List controls" });
		expect(
			within(group)
				.getAllByRole("button")
				.map((button) => button.textContent)
		).toEqual(["Filters", "Create Branch"]);
		expect(
			within(group).getByRole("searchbox", { name: "Search Branch" })
		).toBeVisible();
	});

	it("offers Clear filters only while a filter is set", () => {
		render(<Harness onClearFilters={vi.fn()} />);

		expect(
			screen.queryByRole("button", { name: "Clear filters" })
		).not.toBeInTheDocument();
	});

	it("leaves the filter out when the list has none", () => {
		render(
			<ListToolbar
				createLabel="Create Role"
				search=""
				searchLabel="Search System Role"
				onSearchChange={vi.fn()}
			/>
		);

		expect(screen.queryByText("Showing:")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Filters" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Create Role" })
		).not.toBeInTheDocument();
	});

	it("lists the filters that are set as chips and counts them on the Filters button", async () => {
		const user = userEvent.setup();
		const onClearFilters = vi.fn();
		render(
			<Harness
				filterFields={<p>Department field</p>}
				chips={[
					{ key: "status", label: "Showing: Inactive", onRemove: vi.fn() },
				]}
				onClearFilters={onClearFilters}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Filters" })
		).toHaveAccessibleDescription("1 applied");
		await user.click(screen.getByRole("button", { name: "Filters" }));
		const panel = screen.getByRole("dialog", { name: "Filters" });
		expect(within(panel).getByText("Department field")).toBeVisible();
		expect(
			within(panel).getByRole("button", { name: "Showing:" })
		).toBeVisible();
		expect(
			screen.getByRole("list", { name: "Active filters" })
		).toHaveTextContent("Showing: Inactive");
		await user.click(screen.getByRole("button", { name: "Clear filters" }));
		expect(onClearFilters).toHaveBeenCalledOnce();
	});
});
