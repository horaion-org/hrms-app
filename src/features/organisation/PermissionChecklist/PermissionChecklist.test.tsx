import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { AccessRoleKind } from "@/features/organisation/api";
import { offeredKeys } from "@/features/organisation/areaLevels";
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

const inCatalogueOrder = (
	keys: ReadonlyArray<PermissionKey>
): Array<PermissionKey> => PERMISSION_KEYS.filter((key) => keys.includes(key));
const list = (): HTMLElement =>
	screen.getByRole("group", { name: "Permissions" });
const area = (name: string): HTMLElement => screen.getByRole("group", { name });
const level = (name: string): HTMLElement =>
	within(area(name)).getByRole("button", { name: `Level for ${name}` });
const areaNames = (): Array<string> =>
	within(list())
		.getAllByRole("button", { name: /^Level for / })
		.map((button) =>
			(button.getAttribute("aria-label") ?? "").replace("Level for ", "")
		);
const openDetails = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string
): Promise<void> => {
	await user.click(
		within(area(name)).getByRole("button", { name: /^Details/ })
	);
};
const box = (name: string, label: string): HTMLElement =>
	within(area(name)).getByRole("checkbox", { name: label });
const chooseLevel = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string,
	choice: string
): Promise<void> => {
	await user.click(level(name));
	await user.click(screen.getByRole("option", { name: choice }));
};

describe("PermissionChecklist", () => {
	beforeEach(() => {
		latest = [];
	});

	it("shows one area per menu entry, in the menu's order, with Settings' areas last", () => {
		render(<Harness initial={[]} kind="COMPANY" />);

		expect(areaNames()).toEqual([
			"Dashboard",
			"Scheduling",
			"Leave",
			"Shift preferences",
			"Availability",
			"People",
			"Organisation",
			"Reports",
			"Company details",
			"Employment terms",
			"Work policy",
			"Leave types and durations",
			"Approval flows",
			"Access roles",
		]);
		expect(
			within(list()).getByRole("heading", { name: "Settings" })
		).toBeVisible();
	});

	it("shows each area's level from what the role holds", () => {
		render(
			<Harness
				kind="LOCAL"
				initial={[
					...offeredKeys("leave", "LOCAL"),
					"report:read",
					"schedule:read",
				]}
			/>
		);

		expect(level("Leave")).toHaveTextContent("Can manage");
		expect(level("Reports")).toHaveTextContent("Can view");
		expect(level("Scheduling")).toHaveTextContent("Custom");
		expect(level("People")).toHaveTextContent("No access");
		expect(
			within(area("Scheduling")).getByRole("button", {
				name: "Details · 1 of 15",
			})
		).toBeVisible();
	});

	it("gives a level's whole bundle with what it works with, and says why on the area", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} kind="LOCAL" />);

		await chooseLevel(user, "Scheduling", "Can manage");

		expect(latest).toEqual(
			inCatalogueOrder([
				...offeredKeys("scheduling", "LOCAL"),
				"shift_preference:read",
				"approval:read",
				"approval:decide",
			])
		);
		expect(
			within(area("Scheduling")).getByText(
				"Also ticked “See people’s shift preferences”: the roster’s Preference row shows people’s shift preferences."
			)
		).toBeVisible();
		expect(level("Shift preferences")).toHaveTextContent("Can view");
		// Approvals came along for publishing; people events did not.
		expect(level("Dashboard")).toHaveTextContent("Custom");

		await chooseLevel(user, "Scheduling", "Can view");
		expect(latest).toEqual(
			inCatalogueOrder([
				"schedule:read",
				"shift:read",
				"constraint:read",
				"shift_preference:read",
				"approval:read",
				"approval:decide",
			])
		);

		await chooseLevel(user, "Scheduling", "No access");
		expect(latest).toEqual(
			inCatalogueOrder([
				"shift_preference:read",
				"approval:read",
				"approval:decide",
			])
		);
	});

	it("ticks what a permission needs and what its screens work with, and warns when that goes", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={[]}
				kind="LOCAL"
				unavailable={["shift_preference:read"]}
			/>
		);

		await openDetails(user, "Scheduling");
		await user.click(box("Scheduling", "Start a schedule"));

		expect(latest).toEqual(["schedule:read", "schedule:create", "shift:read"]);
		expect(
			within(area("Scheduling")).getByText(
				"Also ticked “See shifts”: the schedule wizard lists the department’s shifts."
			)
		).toBeVisible();

		// Clearing what is worked with leaves what uses it, and warns on its area.
		await user.click(box("Scheduling", "See shifts"));

		expect(latest).toEqual(["schedule:read", "schedule:create"]);
		expect(
			within(area("Scheduling")).getByText(
				"Without “See shifts”, holders can’t see the shifts step of the schedule wizard."
			)
		).toBeVisible();
		expect(screen.queryByText(/^Also ticked/)).not.toBeInTheDocument();
	});

	it("doesn't tick what a permission works with when it can't be given", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={[]}
				kind="LOCAL"
				unavailable={["shift:read", "shift_preference:read"]}
			/>
		);

		await openDetails(user, "Scheduling");
		await user.click(box("Scheduling", "Start a schedule"));

		expect(latest).toEqual(["schedule:read", "schedule:create"]);
		expect(screen.queryByText(/^Also ticked/)).not.toBeInTheDocument();
	});

	it("says what needs a permission, and asks before clearing it with them", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={["branch:read", "branch:update", "department:read"]}
				kind="COMPANY"
			/>
		);
		await openDetails(user, "Organisation");

		expect(box("Organisation", "See branches")).toHaveAccessibleDescription(
			"Their code, city, country, status and heads. Needed by “Edit branches”"
		);

		await user.click(box("Organisation", "See branches"));
		const dialog = screen.getByRole("dialog", {
			name: "Remove “See branches”?",
		});
		expect(within(dialog).getByText("Edit branches")).toBeVisible();

		await user.click(within(dialog).getByRole("button", { name: "Keep them" }));
		expect(box("Organisation", "See branches")).toBeChecked();
		expect(latest).toEqual([]);

		await user.click(box("Organisation", "See branches"));
		await user.click(screen.getByRole("button", { name: "Remove all 2" }));
		expect(latest).toEqual(["department:read"]);
	});

	it("clears a permission nothing needs without asking", async () => {
		const user = userEvent.setup();
		render(
			<Harness initial={["branch:read", "branch:update"]} kind="COMPANY" />
		);
		await openDetails(user, "Organisation");

		await user.click(box("Organisation", "Edit branches"));

		expect(latest).toEqual(["branch:read"]);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("never gives what can't be given, by its box or a level", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={[]}
				kind="LOCAL"
				unavailable={["leave_request:review", "member_note:read"]}
			/>
		);

		await user.click(level("Leave"));
		expect(screen.getByRole("option", { name: "Can manage" })).toHaveAttribute(
			"aria-disabled",
			"true"
		);
		await user.click(screen.getByRole("option", { name: "Can view" }));
		expect(latest).toEqual(["leave_request:read"]);

		await openDetails(user, "Leave");
		expect(box("Leave", "Approve or reject leave")).toBeDisabled();

		await openDetails(user, "People");
		expect(box("People", "Add notes")).toHaveAccessibleDescription(
			"About a person. Needs “Read notes about people”, which you can’t give"
		);
		expect(box("People", "Add notes")).toBeDisabled();
	});

	it("names a local role's whole-company areas once and leaves their keys out", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[]} kind="LOCAL" />);

		expect(
			screen.getByText(
				"Only for whole-company roles: Company details, Employment terms, Work policy and Approval flows."
			)
		).toBeVisible();
		expect(areaNames()).not.toContain("Work policy");
		expect(
			within(area("Organisation")).getByText(
				"Parts of this can’t be given at a department: Details says which."
			)
		).toBeVisible();

		await openDetails(user, "Organisation");
		expect(
			within(area("Organisation")).queryByRole("checkbox", {
				name: "Create branches",
			})
		).not.toBeInTheDocument();
		expect(box("Organisation", "See branches")).toHaveAccessibleDescription(
			"Their code, city, country, status and heads. Not at departments"
		);

		await chooseLevel(user, "Access roles", "Can manage");
		expect(latest).toEqual(["access_role:read", "access_role:assign"]);
	});

	it("marks areas with whole-company parts until a kind is chosen", () => {
		render(<Harness initial={[]} />);

		expect(
			within(area("Organisation")).getByText(
				"Parts of this are for whole-company roles only."
			)
		).toBeVisible();
		expect(
			within(area("Leave")).queryByText(/whole-company/)
		).not.toBeInTheDocument();
	});

	it("shows keys this app doesn't know as ticked and locked, and never hands them back", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={["branch:read"]}
				kind="COMPANY"
				unknown={["leave:approve"]}
			/>
		);

		const unknown = area("Not recognised");
		expect(
			within(unknown).getByRole("checkbox", { name: "leave:approve" })
		).toBeChecked();
		expect(
			within(unknown).getByRole("checkbox", { name: "leave:approve" })
		).toBeDisabled();

		await openDetails(user, "Organisation");
		await user.click(box("Organisation", "Edit branches"));
		expect(latest).toEqual(["branch:read", "branch:update"]);
	});

	it("lets nothing be changed when disabled", async () => {
		const user = userEvent.setup();
		render(<Harness disabled initial={["branch:read"]} kind="COMPANY" />);

		for (const button of within(list()).getAllByRole("button", {
			name: /^Level for /,
		}))
			expect(button).toBeDisabled();
		await openDetails(user, "Organisation");
		for (const item of within(area("Organisation")).getAllByRole("checkbox"))
			expect(item).toBeDisabled();
		expect(box("Organisation", "See branches")).toBeChecked();
	});
});
