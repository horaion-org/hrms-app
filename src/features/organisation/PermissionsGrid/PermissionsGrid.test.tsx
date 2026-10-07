import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	PermissionsGrid,
	type PermissionsGridProps,
} from "@/features/organisation/PermissionsGrid";
import { PERMISSION_KEYS } from "@/features/organisation/permissionCatalogue";

const Harness = (
	props: Partial<PermissionsGridProps> & {
		onValue?: (value: Array<string>) => void;
	}
): FunctionComponent => {
	const [value, setValue] = useState<Array<string>>(props.value ?? []);
	return (
		<I18nextProvider i18n={authTestI18n}>
			<PermissionsGrid
				grantable={new Set(PERMISSION_KEYS)}
				legend="Permissions"
				{...props}
				value={value}
				onChange={(next) => {
					setValue(next);
					props.onValue?.(next);
				}}
			/>
		</I18nextProvider>
	);
};

describe("PermissionsGrid", () => {
	it("lays out one row per resource and one column per action, with empty cells for unsupported actions", () => {
		render(<Harness />);
		const table = screen.getByRole("table");
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual([
			"Area",
			"Read",
			"Create",
			"Update",
			"Deactivate",
			"Delete",
			"Assign",
		]);
		expect(
			within(table)
				.getAllByRole("rowheader")
				.map((header) => header.textContent)
		).toEqual([
			"Company",
			"Branch",
			"Branch member",
			"Department",
			"Department member",
			"Job title",
			"System role",
			"Activity log",
		]);
		const company = within(table)
			.getByRole("rowheader", { name: "Company" })
			.closest("tr") as HTMLElement;
		expect(within(company).getAllByRole("cell")).toHaveLength(6);
		expect(within(company).getAllByRole("checkbox")).toHaveLength(2);
		expect(within(table).getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.length
		);
	});

	it("names each box by resource and action and reports keys in catalogue order", async () => {
		const onValue = vi.fn();
		render(<Harness onValue={onValue} />);
		await userEvent.click(
			screen.getByRole("checkbox", { name: "Activity log: read" })
		);
		await userEvent.click(
			screen.getByRole("checkbox", { name: "Branch member: deactivate" })
		);
		expect(onValue).toHaveBeenLastCalledWith([
			"branch_member:deactivate",
			"audit_event:read",
		]);
		await userEvent.click(
			screen.getByRole("checkbox", { name: "Activity log: read" })
		);
		expect(onValue).toHaveBeenLastCalledWith(["branch_member:deactivate"]);
	});

	it("disables what cannot be granted", () => {
		render(<Harness grantable={new Set(["branch:read"])} />);
		expect(
			screen.getByRole("checkbox", { name: "Branch: read" })
		).toBeEnabled();
		expect(
			screen.getByRole("checkbox", { name: "Branch: create" })
		).toBeDisabled();
	});

	it("is a named group described by its hint, then by its error", () => {
		const { rerender } = render(<Harness hint="Choose at least 1." />);
		expect(
			screen.getByRole("group", { name: "Permissions" })
		).toHaveAccessibleDescription("Choose at least 1.");
		rerender(<Harness error="Choose at least one permission." hint="Hint" />);
		const group = screen.getByRole("group", { name: "Permissions" });
		expect(group).toHaveAccessibleDescription(
			"Choose at least one permission."
		);
		expect(group).toHaveAttribute("aria-invalid", "true");
		expect(screen.queryByText("Hint")).not.toBeInTheDocument();
	});

	it("focuses the first box that can change", () => {
		const ref = createRef<{ focus: () => void }>();
		render(
			<Harness
				ref={ref}
				grantable={new Set(["company:update", "branch:read"])}
			/>
		);
		ref.current?.focus();
		expect(
			screen.getByRole("checkbox", { name: "Company: update" })
		).toHaveFocus();
	});

	it("disables every box while the form is busy", () => {
		render(<Harness disabled />);
		for (const box of screen.getAllByRole("checkbox"))
			expect(box).toBeDisabled();
	});
});
