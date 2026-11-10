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

	it("keeps a row that can't be selected as the selection says, disabled", async () => {
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
					canSelect: (branch) => branch.id !== "b-1",
					onChange,
				}}
			/>
		);
		const main = screen.getByRole("checkbox", { name: "Select Main Branch" });
		expect(main).toBeChecked();
		expect(main).toBeDisabled();

		await user.click(screen.getByRole("checkbox", { name: "Select Orchard" }));

		expect(onChange).toHaveBeenLastCalledWith(
			expect.arrayContaining(["b-1", "b-2"])
		);
	});

	it("selects and clears all but a fixed row's box", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const props = {
			columns,
			data: branches,
			getRowId,
			label: "Branches",
		};
		const fixed = (branch: Branch): boolean => branch.id !== "b-1";
		const { rerender } = render(
			<DataTable
				{...props}
				selection={{
					rowLabel: (branch) => branch.name,
					selectedIds: [],
					canSelect: fixed,
					onChange,
				}}
			/>
		);

		await user.click(screen.getByRole("checkbox", { name: "Select all" }));

		expect(onChange).toHaveBeenLastCalledWith(
			expect.arrayContaining(["b-2", "b-3"])
		);
		expect(onChange.mock.lastCall?.[0]).not.toContain("b-1");

		rerender(
			<DataTable
				{...props}
				selection={{
					rowLabel: (branch) => branch.name,
					selectedIds: ["b-1", "b-2", "b-3"],
					canSelect: fixed,
					onChange,
				}}
			/>
		);
		await user.click(screen.getByRole("checkbox", { name: "Select all" }));

		// Clearing all leaves a fixed row as it was, too.
		expect(onChange).toHaveBeenLastCalledWith(["b-1"]);
	});

	it("disables select-all when no row's box can change", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				selection={{
					rowLabel: (branch) => branch.name,
					selectedIds: ["b-1"],
					canSelect: () => false,
				}}
			/>
		);

		expect(screen.getByRole("checkbox", { name: "Select all" })).toBeDisabled();
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

	it("keeps positioned content in its cells inside the scrolling frame", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
				selection={{ rowLabel: (branch) => branch.name }}
			/>
		);

		// The row boxes' visually hidden labels are positioned; a relative frame contains them.
		expect(screen.getByRole("table").parentElement).toHaveClass("relative");
	});

	it("sizes columns to their content below xl and fixes their widths from xl", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
			/>
		);

		expect(screen.getByRole("table")).toHaveClass(
			"table-auto",
			"xl:table-fixed"
		);
	});

	it("keeps its 576 px floor from sm only, so a phone's priority columns fit", () => {
		render(
			<DataTable
				columns={columns}
				data={branches}
				getRowId={getRowId}
				label="Branches"
			/>
		);

		expect(screen.getByRole("table")).toHaveClass("sm:min-w-xl");
		expect(screen.getByRole("table")).not.toHaveClass("min-w-xl");
	});

	it("lets the column naming each row take the room left on a phone, so it truncates", () => {
		render(
			<DataTable
				columns={[{ ...columns[0]!, pin: "start" }, columns[1]!]}
				data={branches}
				getRowId={getRowId}
				label="Branches"
			/>
		);

		const naming = ["max-sm:w-full", "max-sm:max-w-0", "max-sm:min-w-36"];
		expect(
			screen.getByRole("columnheader", { name: /Branch Name/ })
		).toHaveClass(...naming);
		expect(screen.getByRole("cell", { name: "Orchard" })).toHaveClass(
			...naming
		);
		expect(screen.getByRole("columnheader", { name: /Code/ })).not.toHaveClass(
			"max-sm:max-w-0"
		);
	});

	it("leaves a column out below its breakpoint, header and cells alike", () => {
		render(
			<DataTable
				data={branches}
				getRowId={getRowId}
				label="Branches"
				columns={[
					columns[0]!,
					{ ...columns[1]!, hideBelow: "md", headerClassName: "w-30" },
				]}
			/>
		);

		expect(screen.getByRole("columnheader", { name: "Code" })).toHaveClass(
			"hidden",
			"md:table-cell",
			"w-30"
		);
		expect(screen.getByRole("cell", { name: "0002" })).toHaveClass(
			"hidden",
			"md:table-cell"
		);
		expect(
			screen.getByRole("columnheader", { name: /Branch Name/ })
		).not.toHaveClass("hidden");
	});

	it("leaves a column out below xl, with its value on the naming cell's line until then", () => {
		render(
			<DataTable
				data={branches}
				getRowId={getRowId}
				label="Branches"
				columns={[
					{ ...columns[0]!, pin: "start" },
					{ ...columns[1]!, hideBelow: "xl" },
				]}
			/>
		);

		expect(screen.getByRole("columnheader", { name: "Code" })).toHaveClass(
			"hidden",
			"xl:table-cell"
		);
		const [onLine] = screen.getAllByText("0002");
		expect(onLine).toHaveClass("xl:hidden");
	});

	describe("a hidden column's value on the naming cell's line", () => {
		type Place = Branch & { city: string | null; note: string };
		const places: Array<Place> = [
			{ ...branches[0]!, city: "Singapore", note: "Opens at nine" },
			{ ...branches[1]!, city: null, note: "Closed on Sundays" },
		];
		const placeColumns: Array<DataTableColumn<Place>> = [
			{ ...columns[0]!, pin: "start" },
			{
				id: "code",
				header: "Code",
				cell: (place) => place.code,
				sortValue: (place) => place.code,
				hideBelow: "md",
			},
			{
				id: "city",
				header: "City",
				cell: (place) => place.city ?? "—",
				summary: (place) => place.city && `In ${place.city}`,
				hideBelow: "sm",
			},
			{
				id: "note",
				header: "Note",
				cell: (place) => place.note,
				hideBelow: "md",
				omitFromSummary: true,
			},
		];
		const renderPlaces = (): void => {
			render(
				<DataTable
					columns={placeColumns}
					data={places}
					getRowId={getRowId}
					label="Branches"
				/>
			);
		};
		const namingCellOf = (name: string): HTMLElement =>
			screen
				.getAllByRole("cell")
				.find((cell) => cell.textContent?.startsWith(name))!;

		it("shows each value only while its column is out of the table, named for screen readers", () => {
			renderPlaces();

			const naming = namingCellOf("Orchard");
			const code = within(naming).getByText("0002");
			expect(code).toHaveClass("md:hidden");
			expect(code).toHaveTextContent("Code: 0002");
			const city = within(naming).getByText("In Singapore");
			expect(city).toHaveClass("sm:hidden");
			// The line shows while any of its columns is hidden: below the widest breakpoint.
			expect(code.parentElement?.parentElement).toHaveClass("md:hidden");
		});

		it("leads every value with a dot and clips the one that starts each line, so no line starts or ends with one", () => {
			renderPlaces();

			const naming = namingCellOf("Orchard");
			for (const value of ["0002", "In Singapore"])
				expect(
					within(within(naming).getByText(value)).getByText("·")
				).toHaveAttribute("aria-hidden", "true");
			const line = within(naming).getByText("0002").parentElement!;
			expect(line).toHaveClass("-ml-3", "flex-wrap");
			expect(line.parentElement).toHaveClass("overflow-hidden");
		});

		it("leaves off a column that opts out and a value that is not set", () => {
			renderPlaces();

			expect(
				within(namingCellOf("Orchard")).queryByText("Opens at nine")
			).not.toBeInTheDocument();
			expect(
				within(namingCellOf("Main Branch")).queryByText(/^In /)
			).not.toBeInTheDocument();
		});

		it("sorts by a hidden column from the naming header's menu, shown only while it hides", async () => {
			const user = userEvent.setup();
			renderPlaces();

			const menuButton = screen.getByRole("button", { name: "Sort rows" });
			expect(menuButton.closest("span.md\\:hidden")).toHaveClass("inline-flex");
			expect(
				screen.getByRole("button", { name: "Sort by Branch Name" })
					.parentElement
			).toHaveClass("hidden", "md:inline-flex");
			await user.click(menuButton);
			expect(
				screen.getAllByRole("menuitem").map((item) => item.textContent)
			).toEqual([
				"Branch Name: A – Z",
				"Branch Name: Z – A",
				"Code: A – Z",
				"Code: Z – A",
			]);
			await user.click(screen.getByRole("menuitem", { name: "Code: Z – A" }));

			const firstRow = screen.getAllByRole("row")[1]!;
			expect(within(firstRow).getAllByRole("cell")[0]).toHaveTextContent(
				/^Main Branch/
			);
		});
	});
});
