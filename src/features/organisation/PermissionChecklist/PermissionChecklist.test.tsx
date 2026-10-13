import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PermissionChecklist } from "@/features/organisation/PermissionChecklist";
import {
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

let latest: Array<PermissionKey> = [];

const Harness = ({
	initial,
	disabled,
	unavailable,
	unknown,
}: {
	initial: Array<PermissionKey>;
	disabled?: boolean;
	unavailable?: Array<PermissionKey>;
	unknown?: Array<string>;
}): ReactElement => {
	const [value, setValue] = useState(initial);
	return (
		<I18nextProvider i18n={authTestI18n}>
			<PermissionChecklist
				disabled={disabled}
				label="Permissions"
				unavailable={unavailable}
				unknown={unknown}
				value={value}
				onChange={(next) => {
					latest = next;
					setValue(next);
				}}
			/>
		</I18nextProvider>
	);
};

const row = (name: string): HTMLElement => screen.getByRole("group", { name });
const box = (group: string, name: string): HTMLElement =>
	within(row(group)).getByRole("checkbox", { name });

describe("PermissionChecklist", () => {
	it("shows one row per resource with a box for every permission in the catalog", () => {
		render(<Harness initial={[]} />);

		expect(
			within(screen.getByRole("group", { name: "Permissions" }))
				.getAllByRole("group")
				.map((group) => group.getAttribute("aria-label"))
		).toEqual([
			"Company",
			"Branches",
			"Branch members",
			"Departments",
			"Department members",
			"Job titles",
			"People",
			"Notes",
			"Leave",
			"Schedules",
			"Shifts",
			"Constraints",
			"System roles",
			"Activity",
		]);
		// One box per key, plus each row's own.
		expect(screen.getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.length + 14
		);
		expect(within(row("Schedules")).getAllByRole("checkbox")).toHaveLength(5);
		for (const action of ["View", "Create", "Edit", "Generate"])
			expect(box("Schedules", action)).not.toBeChecked();
		expect(within(row("Shifts")).getAllByRole("checkbox")).toHaveLength(5);
		for (const action of ["View", "Add", "Edit", "Delete"])
			expect(box("Shifts", action)).not.toBeChecked();
		expect(within(row("Constraints")).getAllByRole("checkbox")).toHaveLength(5);
		for (const action of ["View", "Add", "Edit", "Delete"])
			expect(box("Constraints", action)).not.toBeChecked();
		expect(within(row("System roles")).getAllByRole("checkbox")).toHaveLength(
			6
		);
		expect(within(row("People")).getAllByRole("checkbox")).toHaveLength(4);
		expect(box("People", "Create")).not.toBeChecked();
		expect(box("People", "Edit")).not.toBeChecked();
		expect(within(row("Notes")).getAllByRole("checkbox")).toHaveLength(5);
		for (const action of ["View", "Add", "Edit", "Delete"])
			expect(box("Notes", action)).not.toBeChecked();
	});

	it("ticks what the role holds and counts it per row", () => {
		render(<Harness initial={["branch:read", "branch:create"]} />);

		expect(box("Branches", "View")).toBeChecked();
		expect(box("Branches", "Create")).toBeChecked();
		expect(box("Branches", "Edit")).not.toBeChecked();
		expect(box("Branches", "Branches")).toBePartiallyChecked();
		expect(within(row("Branches")).getByText("2 of 3")).toBeVisible();
		expect(within(row("Departments")).getByText("0 of 3")).toBeVisible();
	});

	it("ticks a schedule's, a shift's or a constraint's view along with generating or changing", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} />);

		await user.click(box("Schedules", "Generate"));
		await user.click(box("Shifts", "Delete"));
		await user.click(box("Constraints", "Edit"));

		expect(latest).toEqual([
			"schedule:read",
			"schedule:generate",
			"shift:read",
			"shift:delete",
			"constraint:read",
			"constraint:update",
		]);
	});

	it("ticks view along with any other permission of the resource", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} />);

		await user.click(box("Branches", "Edit"));

		expect(latest).toEqual(["branch:read", "branch:update"]);
		expect(box("Branches", "View")).toBeChecked();
	});

	it("clears the whole resource when view is cleared", async () => {
		const user = userEvent.setup();
		render(
			<Harness initial={["branch:read", "branch:update", "department:read"]} />
		);

		await user.click(box("Branches", "View"));

		expect(latest).toEqual(["department:read"]);
	});

	it("clears one permission without touching the rest", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["branch:read", "branch:update"]} />);

		await user.click(box("Branches", "Edit"));

		expect(latest).toEqual(["branch:read"]);
	});

	it("ticks and clears a whole resource from the row's own box, in catalog order", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["audit_event:read", "branch:read"]} />);

		await user.click(box("Branches", "Branches"));

		expect(latest).toEqual([
			"branch:read",
			"branch:create",
			"branch:update",
			"audit_event:read",
		]);
		expect(box("Branches", "Branches")).toBeChecked();

		await user.click(box("Branches", "Branches"));

		expect(latest).toEqual(["audit_event:read"]);
	});

	it("never ticks an unavailable permission, by its box, its row or what a tick implies", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={[]}
				unavailable={["branch:update", "department:read", "audit_event:read"]}
			/>
		);

		expect(box("Branches", "Edit")).toBeDisabled();
		expect(box("Activity", "Activity")).toBeDisabled();

		await user.click(box("Branches", "Branches"));
		expect(latest).toEqual(["branch:read", "branch:create"]);
		expect(box("Branches", "Branches")).toBeChecked();

		await user.click(box("Branches", "Branches"));
		expect(latest).toEqual([]);

		// Nothing in Departments can be ticked without View, which can't be given.
		expect(box("Departments", "Edit")).toBeDisabled();
		expect(box("Departments", "Create")).toBeDisabled();
		expect(box("Departments", "Departments")).toBeDisabled();
	});

	it("explains a permission whose prerequisite can't be given", () => {
		render(<Harness initial={[]} unavailable={["member_note:read"]} />);

		for (const action of ["Add", "Edit", "Delete"])
			expect(box("Notes", action)).toHaveAccessibleDescription(
				"Needs View, which you can’t give"
			);
		expect(
			within(row("Notes")).getAllByText(/which you can’t give/)
		).toHaveLength(3);
		expect(box("Notes", "View")).not.toHaveAccessibleDescription();
		expect(
			within(row("People")).queryByText(/which you can’t give/)
		).not.toBeInTheDocument();
	});

	it("says which permissions need another, from the contract", () => {
		render(<Harness initial={[]} />);

		expect(
			within(row("Notes")).getByText("Add, Edit, and Delete need View.")
		).toBeVisible();
		expect(within(row("Company")).getByText("Edit needs View.")).toBeVisible();
		expect(
			within(row("Activity")).queryByText(/needs? View/)
		).not.toBeInTheDocument();
	});

	it("marks permissions that can only be given company-wide", () => {
		render(<Harness initial={[]} />);

		expect(box("Branches", "Create")).toHaveAccessibleDescription(
			"Company only"
		);
		expect(box("Branches", "Edit")).not.toHaveAccessibleDescription();
		expect(box("Activity", "View")).toHaveAccessibleDescription("Company only");
		expect(
			within(row("System roles")).getAllByText("Company only")
		).toHaveLength(3);
	});

	it("shows keys this app doesn't know as ticked and locked, and never hands them back", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["branch:read"]} unknown={["leave:approve"]} />);

		const unknown = row("Not recognised");
		expect(
			within(unknown).getByRole("checkbox", { name: "leave:approve" })
		).toBeChecked();
		expect(
			within(unknown).getByRole("checkbox", { name: "leave:approve" })
		).toBeDisabled();
		expect(
			within(unknown).getByText(
				"This version of the app doesn’t know these permissions. They stay on the role when you save."
			)
		).toBeVisible();

		await user.click(box("Branches", "Edit"));
		expect(latest).toEqual(["branch:read", "branch:update"]);
	});

	it("lets nothing be changed when disabled", () => {
		render(<Harness disabled initial={["branch:read"]} />);

		for (const item of screen.getAllByRole("checkbox"))
			expect(item).toBeDisabled();
		expect(box("Branches", "View")).toBeChecked();
	});
});
