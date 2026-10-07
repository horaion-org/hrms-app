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
}: {
	initial: Array<PermissionKey>;
	disabled?: boolean;
	unavailable?: Array<PermissionKey>;
}): ReactElement => {
	const [value, setValue] = useState(initial);
	return (
		<I18nextProvider i18n={authTestI18n}>
			<PermissionChecklist
				disabled={disabled}
				label="Permissions"
				unavailable={unavailable}
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
			"System roles",
			"Activity",
		]);
		// One box per key, plus each row's own.
		expect(screen.getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.length + 10
		);
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

		await user.click(box("Departments", "Edit"));
		expect(latest).toEqual(["department:update"]);
	});

	it("lets nothing be changed when disabled", () => {
		render(<Harness disabled initial={["branch:read"]} />);

		for (const item of screen.getAllByRole("checkbox"))
			expect(item).toBeDisabled();
		expect(box("Branches", "View")).toBeChecked();
	});
});
