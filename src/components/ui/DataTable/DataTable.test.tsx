import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

type Branch = { id: string; name: string; code: string };

const branches: Array<Branch> = [
	{ id: "b-2", name: "Orchard", code: "0002" },
	{ id: "b-1", name: "Main Branch", code: "0010" },
	{ id: "b-3", name: "Jurong", code: "0003" },
];

const columns: Array<DataTableColumn<Branch>> = [
	{
		id: "name",
		header: "Branch Name",
		cell: (branch) => branch.name,
		sortValue: (branch) => branch.name,
		cellClassName: "font-semibold",
	},
	{ id: "code", header: "Code", cell: (branch) => branch.code },
];

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const getRowId = (branch: Branch): string => branch.id;

describe("DataTable", () => {
	it("renders a named native table with column headers and one row per item", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
			/>
		);

		const table = screen.getByRole("table", { name: "Branches" });
		expect(table.tagName).toBe("TABLE");
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual(["Branch Name", "Code"]);
		expect(within(table).getAllByRole("row")).toHaveLength(4);
		expect(screen.getByRole("cell", { name: "Orchard" })).toHaveClass(
			"font-semibold"
		);
	});

	it("sorts a column with a sort value on the client, toggling direction", async () => {
		const user = userEvent.setup();
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
			/>
		);
		const header = screen.getByRole("columnheader", { name: /Branch Name/ });
		expect(header).toHaveAttribute("aria-sort", "none");
		expect(
			screen.getByRole("columnheader", { name: "Code" })
		).not.toHaveAttribute("aria-sort");
		expect(
			screen.queryByRole("button", { name: "Sort by Code" })
		).not.toBeInTheDocument();
		expect(
			screen
				.getAllByRole("row")
				.slice(1)
				.map((row) => row.textContent)
		).toEqual(["Orchard0002", "Main Branch0010", "Jurong0003"]);

		await user.click(
			screen.getByRole("button", { name: "Sort by Branch Name" })
		);

		expect(header).toHaveAttribute("aria-sort", "ascending");
		expect(
			screen
				.getAllByRole("row")
				.slice(1)
				.map((row) => row.textContent)
		).toEqual(["Jurong0003", "Main Branch0010", "Orchard0002"]);

		await user.click(
			screen.getByRole("button", { name: "Sort by Branch Name" })
		);

		expect(header).toHaveAttribute("aria-sort", "descending");
		expect(
			screen
				.getAllByRole("row")
				.slice(1)
				.map((row) => row.textContent)
		).toEqual(["Orchard0002", "Main Branch0010", "Jurong0003"]);
	});

	it("starts from a default sort", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				defaultSort={{ id: "name", desc: true }}
				getRowId={getRowId}
				label="Branches"
			/>
		);

		expect(
			screen.getByRole("columnheader", { name: /Branch Name/ })
		).toHaveAttribute("aria-sort", "descending");
		expect(screen.getAllByRole("row")[1]).toHaveTextContent("Orchard");
	});

	it("leaves a manually sorted order alone and reports the requested sort", async () => {
		const user = userEvent.setup();
		const onSortChange = vi.fn();
		const { rerender } = render(
			<DataTable
				manualSorting
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				sort={{ id: "name", desc: false }}
				onSortChange={onSortChange}
			/>
		);
		const header = screen.getByRole("columnheader", { name: /Branch Name/ });
		expect(header).toHaveAttribute("aria-sort", "ascending");

		await user.click(
			screen.getByRole("button", { name: "Sort by Branch Name" })
		);

		expect(onSortChange).toHaveBeenCalledExactlyOnceWith({
			id: "name",
			desc: true,
		});
		// The caller owns the sort until it passes the new one back.
		expect(header).toHaveAttribute("aria-sort", "ascending");
		expect(screen.getAllByRole("row")[1]).toHaveTextContent("Orchard");

		rerender(
			<DataTable
				manualSorting
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				sort={{ id: "name", desc: true }}
				onSortChange={onSortChange}
			/>
		);
		expect(header).toHaveAttribute("aria-sort", "descending");
		expect(screen.getAllByRole("row")[1]).toHaveTextContent("Orchard");
	});

	it("offers ascending and descending in a menu, marking the applied one", async () => {
		const user = userEvent.setup();
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				sortControl="menu"
			/>
		);
		const header = screen.getByRole("columnheader", { name: /Branch Name/ });
		expect(header).toHaveAttribute("aria-sort", "none");
		expect(
			screen.queryByRole("button", { name: "Sort by Code" })
		).not.toBeInTheDocument();
		const trigger = screen.getByRole("button", { name: "Sort by Branch Name" });
		expect(trigger).toHaveAttribute("aria-haspopup", "menu");

		await user.click(trigger);

		const menu = screen.getByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent)
		).toEqual(["A – Z", "Z – A"]);
		expect(
			within(menu).getByRole("menuitem", { name: "A – Z" })
		).not.toHaveAttribute("aria-current");

		await user.click(screen.getByRole("menuitem", { name: "Z – A" }));

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(header).toHaveAttribute("aria-sort", "descending");
		expect(
			screen
				.getAllByRole("row")
				.slice(1)
				.map((row) => row.textContent)
		).toEqual(["Orchard0002", "Main Branch0010", "Jurong0003"]);

		await user.click(trigger);

		const descending = screen.getByRole("menuitem", { name: "Z – A" });
		expect(descending).toHaveAttribute("aria-current", "true");
		expect(descending.querySelector("svg")).toBeInTheDocument();
		const ascending = screen.getByRole("menuitem", { name: "A – Z" });
		expect(ascending).not.toHaveAttribute("aria-current");
		expect(ascending.querySelector("svg")).not.toBeInTheDocument();

		await user.click(ascending);

		expect(header).toHaveAttribute("aria-sort", "ascending");
		expect(screen.getAllByRole("row")[1]).toHaveTextContent("Jurong");
	});

	it("reports the direction chosen from the menu when the caller owns the sort", async () => {
		const user = userEvent.setup();
		const onSortChange = vi.fn();
		render(
			<DataTable
				manualSorting
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				sort={{ id: "name", desc: false }}
				sortControl="menu"
				onSortChange={onSortChange}
			/>
		);
		const header = screen.getByRole("columnheader", { name: /Branch Name/ });
		const trigger = screen.getByRole("button", { name: "Sort by Branch Name" });

		await user.click(trigger);
		expect(screen.getByRole("menuitem", { name: "A – Z" })).toHaveAttribute(
			"aria-current",
			"true"
		);
		await user.click(screen.getByRole("menuitem", { name: "Z – A" }));

		expect(onSortChange).toHaveBeenLastCalledWith({ id: "name", desc: true });
		// The caller owns the sort until it passes the new one back.
		expect(header).toHaveAttribute("aria-sort", "ascending");
		expect(screen.getAllByRole("row")[1]).toHaveTextContent("Orchard");

		await user.click(trigger);
		await user.click(screen.getByRole("menuitem", { name: "A – Z" }));

		expect(onSortChange).toHaveBeenLastCalledWith({ id: "name", desc: false });
	});

	it("selects rows one by one and all at once, showing a partial selection", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				selection={{ rowLabel: (branch) => branch.name, onChange }}
			/>
		);
		const all = screen.getByRole("checkbox", { name: "Select all" });
		const orchard = screen.getByRole("checkbox", { name: "Select Orchard" });
		expect(all).not.toBeChecked();
		expect(all).not.toBePartiallyChecked();

		await user.click(orchard);

		expect(orchard).toBeChecked();
		expect(all).toBePartiallyChecked();
		expect(onChange).toHaveBeenLastCalledWith(["b-2"]);

		await user.click(all);

		expect(all).toBeChecked();
		expect(all).not.toBePartiallyChecked();
		expect(
			screen
				.getAllByRole("checkbox")
				.slice(1)
				.every((box) => (box as HTMLInputElement).checked)
		).toBe(true);
		expect(onChange).toHaveBeenLastCalledWith(
			expect.arrayContaining(["b-1", "b-2", "b-3"])
		);

		await user.click(all);

		expect(
			screen.getByRole("checkbox", { name: "Select Jurong" })
		).not.toBeChecked();
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

	it("shows the caller's selection and reports changes without keeping its own", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				selection={{
					rowLabel: (branch) => branch.name,
					selectedIds: ["b-1"],
					onChange,
				}}
			/>
		);
		const main = screen.getByRole("checkbox", { name: "Select Main Branch" });
		const orchard = screen.getByRole("checkbox", { name: "Select Orchard" });
		expect(main).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Select all" })
		).toBePartiallyChecked();

		await user.click(orchard);

		expect(onChange).toHaveBeenLastCalledWith(
			expect.arrayContaining(["b-1", "b-2"])
		);
		// The caller has not passed the new ids back, so nothing moves.
		expect(orchard).not.toBeChecked();
	});

	it("shows the empty state across every column and disables select-all", () => {
		render(
			<DataTable
				columns={columns}
				data={[]}
				emptyState="No branches yet."
				getRowId={getRowId}
				label="Branches"
				selection={{ rowLabel: (branch) => branch.name }}
			/>
		);

		const cell = screen.getByRole("cell", { name: "No branches yet." });
		expect(cell).toHaveAttribute("colSpan", "3");
		expect(screen.getByRole("checkbox", { name: "Select all" })).toBeDisabled();
	});

	it("draws row lines on the cells, so a cell carries its own lines", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
			/>
		);

		expect(screen.getByRole("table")).toHaveClass(
			"border-separate",
			"border-spacing-0"
		);
		for (const cell of screen.getAllByRole("cell")) {
			expect(cell).toHaveClass("border-t", "border-neutral-400");
		}
	});

	it("keeps pinned columns at their edges, after the leading checkbox", () => {
		const pinnedColumns: Array<DataTableColumn<Branch>> = [
			{ id: "code", header: "Code", cell: (branch) => branch.code, pin: "end" },
			{ id: "city", header: "City", cell: () => "Singapore" },
			{
				id: "name",
				header: "Branch Name",
				cell: (branch) => branch.name,
				pin: "start",
			},
		];
		render(
			<DataTable
				columns={pinnedColumns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				selection={{ rowLabel: (branch) => branch.name }}
			/>
		);

		const headers = screen.getAllByRole("columnheader");
		expect(headers.map((header) => header.textContent)).toEqual([
			"Select all",
			"Branch Name",
			"City",
			"Code",
		]);
		expect(headers[0]).toHaveClass("md:sticky", "md:start-0");
		expect(headers[1]).toHaveClass("md:sticky", "md:start-12");
		expect(headers[2]).not.toHaveClass("md:sticky");
		expect(headers[3]).toHaveClass("md:sticky", "md:end-0");
		expect(screen.getByRole("cell", { name: "Orchard" })).toHaveClass(
			"md:sticky",
			"md:start-12"
		);
		expect(
			screen.getAllByRole("cell", { name: "Singapore" })[0]
		).not.toHaveClass("md:sticky");
		expect(screen.getByRole("cell", { name: "0002" })).toHaveClass(
			"md:sticky",
			"md:end-0"
		);
	});

	it("pins nothing and watches no scrolling unless a column asks", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				selection={{ rowLabel: (branch) => branch.name }}
			/>
		);

		const frame = screen.getByRole("table").parentElement;
		expect(frame).not.toHaveClass("group");
		for (const cell of [
			...screen.getAllByRole("columnheader"),
			...screen.getAllByRole("cell"),
		]) {
			expect(cell).not.toHaveClass("md:sticky");
		}
	});

	it("marks which edges hide scrolled content, for the pinned columns' shadows", () => {
		render(
			<DataTable
				data={branches}
				getRowId={getRowId}
				label="Branches"
				columns={columns.map((column) =>
					column.id === "name" ? { ...column, pin: "start" } : column
				)}
			/>
		);
		const frame = screen.getByRole("table").parentElement;
		if (!frame) throw new Error("The table has no frame.");
		expect(frame).toHaveClass("group");
		// jsdom has no layout, so the frame's scroll metrics are set by hand.
		Object.defineProperty(frame, "scrollWidth", { value: 1200 });
		Object.defineProperty(frame, "clientWidth", { value: 600 });

		frame.scrollLeft = 300;
		fireEvent.scroll(frame);
		expect(frame).toHaveAttribute("data-overflows-start");
		expect(frame).toHaveAttribute("data-overflows-end");

		frame.scrollLeft = 600;
		fireEvent.scroll(frame);
		expect(frame).toHaveAttribute("data-overflows-start");
		expect(frame).not.toHaveAttribute("data-overflows-end");
	});

	it("merges caller classes onto its scrolling frame", () => {
		render(
			<DataTable
				className="mt-8"
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
			/>
		);

		expect(screen.getByRole("table").parentElement).toHaveClass(
			"mt-8",
			"overflow-x-auto",
			"rounded-lg",
			"border-neutral-400"
		);
	});
});
