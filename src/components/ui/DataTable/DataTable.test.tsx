import { render, screen, within } from "@testing-library/react";
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
