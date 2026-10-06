import { render, screen } from "@testing-library/react";
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

	it("filters by status through the labelled Showing select", async () => {
		const user = userEvent.setup();
		const onStatus = vi.fn();
		render(<Harness onStatus={onStatus} />);

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

		const filter = screen.getByRole("button", { name: "Showing:" });
		expect(filter).toHaveTextContent("All employees");
		await user.click(filter);
		await user.click(screen.getByRole("option", { name: "Active" }));

		expect(onChange).toHaveBeenCalledWith(["INACTIVE"]);
		expect(
			screen.queryByRole("button", { name: "Create Branch" })
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
			screen.queryByRole("button", { name: "Create Role" })
		).not.toBeInTheDocument();
	});
});
