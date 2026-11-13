import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { AccessRoleKind } from "@/features/organisation/api";
import { PermissionChecklist } from "@/features/organisation/PermissionChecklist";
import { PERMISSION_GROUPS } from "@/features/organisation/PermissionChecklist/groups";
import {
	isCompanyOnly,
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

let latest: Array<PermissionKey> = [];

const Harness = ({
	initial,
	disabled,
	unavailable,
	unknown,
	kind,
}: {
	initial: Array<PermissionKey>;
	disabled?: boolean;
	unavailable?: Array<PermissionKey>;
	unknown?: Array<string>;
	kind?: AccessRoleKind;
}): ReactElement => {
	const [value, setValue] = useState(initial);
	return (
		<I18nextProvider i18n={authTestI18n}>
			<PermissionChecklist
				disabled={disabled}
				kind={kind}
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

const list = (): HTMLElement =>
	screen.getByRole("group", { name: "Permissions" });
const row = (name: string): HTMLElement => screen.getByRole("group", { name });
const section = (name: string): HTMLElement =>
	screen.getByRole("region", { name });
const box = (group: string, name: string): HTMLElement =>
	within(row(group)).getByRole("checkbox", { name });
const rowNames = (): Array<string | null> =>
	within(list())
		.getAllByRole("group")
		.map((group) => group.getAttribute("aria-label"));

describe("PermissionChecklist", () => {
	it("groups the resources into the role editor's sections, in the contract's order", () => {
		render(<Harness initial={[]} />);

		expect(
			within(list())
				.getAllByRole("region")
				.map((region) => within(region).getByRole("heading").textContent)
		).toEqual([
			"People",
			"Leave",
			"Scheduling",
			"Approvals",
			"Organisation",
			"Company settings",
			"Access and activity",
		]);
		expect(
			within(section("Scheduling"))
				.getAllByRole("group")
				.map((group) => group.getAttribute("aria-label"))
		).toEqual(["Schedules", "Shifts", "Constraints"]);
		expect(
			within(section("Approvals"))
				.getAllByRole("group")
				.map((group) => group.getAttribute("aria-label"))
		).toEqual(["Approval flows", "Approvals"]);
		expect(
			within(section("Scheduling")).getByText(
				"Build, change and publish departments’ rosters."
			)
		).toBeVisible();
	});

	it("shows one row per resource with a box for every permission in the catalog", () => {
		render(<Harness initial={[]} />);

		expect(rowNames()).toEqual([
			"People",
			"Notes",
			"Availability",
			"People’s employment terms",
			"Leave",
			"Schedules",
			"Shifts",
			"Constraints",
			"Approval flows",
			"Approvals",
			"Branches",
			"Branch members",
			"Departments",
			"Department members",
			"Job titles",
			"Company",
			"Skills",
			"Employment terms",
			"Leave types",
			"Leave durations",
			"Work policy",
			"Access roles",
			"Activity",
		]);
		// One box per key, plus each row's own.
		expect(screen.getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.length + PERMISSION_GROUPS.length
		);
		expect(within(row("Schedules")).getAllByRole("checkbox")).toHaveLength(8);
		for (const capability of [
			"See schedules and rosters",
			"Start a schedule",
			"Set up a draft: its week, settings and shifts",
			"Generate rosters",
			"Change who works which shift",
			"Publish or reject rosters",
			"Delete schedules",
		])
			expect(box("Schedules", capability)).not.toBeChecked();
		expect(within(row("Access roles")).getAllByRole("checkbox")).toHaveLength(
			6
		);
		expect(within(row("People")).getAllByRole("checkbox")).toHaveLength(4);
		expect(
			box("People", "Add people (sends them an invitation)")
		).not.toBeChecked();
	});

	it("explains each permission in a line of its own", () => {
		render(<Harness initial={[]} />);

		expect(
			box("Leave", "Apply for leave for someone else")
		).toHaveAccessibleDescription("Applying for oneself needs nothing");
		expect(box("Schedules", "Generate rosters")).toHaveAccessibleDescription(
			"Fixes the draft’s shifts for good"
		);
	});

	it("ticks what the role holds and counts it per row and per section", () => {
		render(<Harness initial={["branch:read", "branch:create"]} />);

		expect(box("Branches", "See branches")).toBeChecked();
		expect(box("Branches", "Create branches")).toBeChecked();
		expect(box("Branches", "Edit branches")).not.toBeChecked();
		expect(box("Branches", "Branches")).toBePartiallyChecked();
		expect(within(row("Branches")).getByText("2 of 3")).toBeVisible();
		expect(within(row("Departments")).getByText("0 of 3")).toBeVisible();
		expect(
			within(section("Organisation")).getByText("2 of 17 selected")
		).toBeVisible();
	});

	it("ticks a schedule's, a shift's or a constraint's view along with generating or changing", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} />);

		await user.click(box("Schedules", "Generate rosters"));
		await user.click(box("Shifts", "Delete shifts"));
		await user.click(box("Constraints", "Edit constraints"));

		// Generating also ticks Shifts' view, which the schedule wizard reads.
		expect(latest).toEqual([
			"schedule:read",
			"schedule:generate",
			"shift:read",
			"shift:delete",
			"constraint:read",
			"constraint:update",
		]);
	});

	it("ticks what a permission's screens use along with it, and says why", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} />);

		await user.click(box("Schedules", "Start a schedule"));

		expect(latest).toEqual(["schedule:read", "schedule:create", "shift:read"]);
		// Said on the row that was ticked.
		expect(
			within(row("Schedules")).getByText(
				"Also ticked “See shifts”: the schedule wizard lists the department’s shifts."
			)
		).toBeVisible();

		// Clearing what is used leaves what uses it, and warns on its row.
		await user.click(box("Shifts", "See shifts"));

		expect(latest).toEqual(["schedule:read", "schedule:create"]);
		expect(
			within(row("Schedules")).getByText(
				"Without “See shifts”, holders can’t see the shifts step of the schedule wizard."
			)
		).toBeVisible();
		expect(screen.queryByText(/^Also ticked/)).not.toBeInTheDocument();
	});

	it("doesn't tick what a permission uses when it can't be given", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} unavailable={["shift:read"]} />);

		await user.click(box("Schedules", "Start a schedule"));

		expect(latest).toEqual(["schedule:read", "schedule:create"]);
		expect(screen.queryByText(/^Also ticked/)).not.toBeInTheDocument();
	});

	it("ticks view along with any other permission of the resource", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} />);

		await user.click(box("Branches", "Edit branches"));

		expect(latest).toEqual(["branch:read", "branch:update"]);
		expect(box("Branches", "See branches")).toBeChecked();
	});

	it("clears the whole resource when view is cleared", async () => {
		const user = userEvent.setup();
		render(
			<Harness initial={["branch:read", "branch:update", "department:read"]} />
		);

		await user.click(box("Branches", "See branches"));

		expect(latest).toEqual(["department:read"]);
	});

	it("clears one permission without touching the rest", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["branch:read", "branch:update"]} />);

		await user.click(box("Branches", "Edit branches"));

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

		expect(box("Branches", "Edit branches")).toBeDisabled();
		expect(box("Activity", "Activity")).toBeDisabled();

		await user.click(box("Branches", "Branches"));
		expect(latest).toEqual(["branch:read", "branch:create"]);
		expect(box("Branches", "Branches")).toBeChecked();

		await user.click(box("Branches", "Branches"));
		expect(latest).toEqual([]);

		// Nothing in Departments can be ticked without its view, which can't be given.
		expect(box("Departments", "Edit departments")).toBeDisabled();
		expect(box("Departments", "Create departments")).toBeDisabled();
		expect(box("Departments", "Departments")).toBeDisabled();
	});

	it("explains a permission whose prerequisite can't be given", () => {
		render(<Harness initial={[]} unavailable={["member_note:read"]} />);

		expect(box("Notes", "Add notes")).toHaveAccessibleDescription(
			"About a person. Needs “Read notes about people”, which you can’t give"
		);
		expect(
			within(row("Notes")).getAllByText(/which you can’t give/)
		).toHaveLength(3);
		expect(box("Notes", "Read notes about people")).toHaveAccessibleDescription(
			"With who wrote them"
		);
		expect(
			within(row("People")).queryByText(/which you can’t give/)
		).not.toBeInTheDocument();
	});

	it("says once what every other permission of a row needs, from the contract", () => {
		render(<Harness initial={[]} />);

		expect(
			within(row("Notes")).getByText(
				"Everything else here needs “Read notes about people”."
			)
		).toBeVisible();
		expect(
			within(row("Schedules")).getByText(
				"Everything else here needs “See schedules and rosters”."
			)
		).toBeVisible();
		expect(
			within(row("Activity")).queryByText(/needs “/)
		).not.toBeInTheDocument();
	});

	it("marks permissions that can only be given company-wide", () => {
		render(<Harness initial={[]} />);

		expect(box("Branches", "Create branches")).toHaveAccessibleDescription(
			"Choosing their first heads. Only for whole-company roles"
		);
		expect(box("Branches", "Edit branches")).toHaveAccessibleDescription(
			"Rename a branch, change its code, city or country, and deactivate or reactivate it"
		);
		expect(
			within(row("Access roles")).getAllByText("Only for whole-company roles", {
				exact: false,
			})
		).toHaveLength(3);
	});

	it("leaves company-only permissions, and rows left without any, out of a local role", () => {
		render(<Harness initial={[]} kind="LOCAL" />);

		expect(rowNames()).toEqual([
			"People",
			"Notes",
			"Availability",
			"People’s employment terms",
			"Leave",
			"Schedules",
			"Shifts",
			"Constraints",
			"Approvals",
			"Branches",
			"Branch members",
			"Departments",
			"Department members",
			"Job titles",
			"Leave durations",
			"Access roles",
		]);
		// Company settings keeps only the leave durations, held at any scope.
		expect(
			within(
				screen.getByRole("region", { name: "Company settings" })
			).getAllByRole("group")
		).toHaveLength(1);
		expect(screen.getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.filter((key) => !isCompanyOnly(key)).length + 16
		);
		expect(within(row("Branches")).getAllByRole("checkbox")).toHaveLength(3);
		expect(
			within(row("Branches")).queryByRole("checkbox", {
				name: "Create branches",
			})
		).not.toBeInTheDocument();
		expect(within(row("Branches")).getByText("0 of 2")).toBeVisible();
		// The row's own box, view and give: creating, editing and deleting roles is company-only.
		expect(within(row("Access roles")).getAllByRole("checkbox")).toHaveLength(
			3
		);
		expect(
			box("Access roles", "See access roles and who holds them")
		).toBeVisible();
		expect(box("Access roles", "Give access roles to people")).toBeVisible();
	});

	it("marks a local role's permissions that can't be given at a department, and nothing company-only", () => {
		render(<Harness initial={[]} kind="LOCAL" />);

		expect(box("Branches", "See branches")).toHaveAccessibleDescription(
			"Their code, city, country, status and heads. Not at departments"
		);
		expect(
			box("Branch members", "Add people to a branch")
		).toHaveAccessibleDescription(/Not at departments$/);
		expect(
			box("Departments", "Create departments")
		).toHaveAccessibleDescription(/Not at departments$/);
		expect(box("Departments", "See departments")).toHaveAccessibleDescription(
			"With their branch, status and heads"
		);
		expect(
			screen.queryByText(/Only for whole-company roles/)
		).not.toBeInTheDocument();
	});

	it("never adds a company-only permission to a local role, even from a row's own box", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} kind="LOCAL" />);

		await user.click(box("Access roles", "Access roles"));

		expect(latest).toEqual(["access_role:read", "access_role:assign"]);
		expect(box("Access roles", "Access roles")).toBeChecked();
	});

	it("shows a company role every permission, with no hint about where it applies", () => {
		render(<Harness initial={[]} kind="COMPANY" />);

		expect(screen.getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.length + PERMISSION_GROUPS.length
		);
		expect(box("Branches", "Create branches")).toHaveAccessibleDescription(
			"Choosing their first heads"
		);
		expect(
			screen.queryByText(/Only for whole-company roles/)
		).not.toBeInTheDocument();
		expect(screen.queryByText(/Not at departments/)).not.toBeInTheDocument();
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

		await user.click(box("Branches", "Edit branches"));
		expect(latest).toEqual(["branch:read", "branch:update"]);
	});

	it("lets nothing be changed when disabled", () => {
		render(<Harness disabled initial={["branch:read"]} />);

		for (const item of screen.getAllByRole("checkbox"))
			expect(item).toBeDisabled();
		expect(box("Branches", "See branches")).toBeChecked();
	});
});
