import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { AccessRole } from "@/features/organisation/api";
import { placeKey, type PlaceRef } from "@/features/workspace/places";
import { AssignAccessRoleDialog } from "@/features/organisation/AssignAccessRoleDialog";

const people = [
	{ membershipId: "m-1", displayName: "Marcus Lim", status: "ACTIVE" as const },
	{ membershipId: "m-2", displayName: "Priya Nair", status: "ACTIVE" as const },
];
const targets = [
	{ label: "Whole company" },
	{ label: "Orchard", branchId: "b-1" },
	{ label: "Orchard › Kitchen", branchId: "b-1", departmentId: "d-1" },
];

const roles: Array<AccessRole> = [
	{
		accessRoleId: "r-1",
		name: "Manager",
		protectedRole: false,
		kind: "LOCAL",
		status: "ACTIVE",
		permissions: ["branch:read", "department:read"],
		holderCount: 0,
	},
	{
		accessRoleId: "r-2",
		name: "Auditor",
		protectedRole: false,
		kind: "COMPANY",
		status: "ACTIVE",
		permissions: ["audit_event:read"],
		holderCount: 0,
	},
	{
		accessRoleId: "r-3",
		name: "Leave approver",
		protectedRole: false,
		kind: "LOCAL",
		status: "ACTIVE",
		permissions: ["leave_request:read", "leave_request:review"],
		holderCount: 0,
	},
];
const LABELS = new Map(
	targets.map((target) => [placeKey(target), target.label])
);
const placeLabel = (place: PlaceRef): string | undefined =>
	LABELS.get(placeKey(place));
/** What a definition list says, as "term: line / line" for each row. */
const describedRows = (container: HTMLElement): Array<string> =>
	within(container)
		.getAllByRole("term")
		.map(
			(term) =>
				`${term.textContent}: ${[...(term.nextElementSibling?.children ?? [])]
					.map((line) => line.textContent)
					.join(" / ")}`
		);

describe("AssignAccessRoleDialog", () => {
	it("shows what the chosen role allows and assigns it to a person at several places", async () => {
		const user = userEvent.setup();
		const onAssign = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					people={people}
					query=""
					roles={roles}
					targets={targets}
					onAssign={onAssign}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const dialog = await screen.findByRole("dialog", { name: "Assign role" });
		const submit = screen.getByRole("button", { name: "Assign role" });

		// Nothing is promised until a role is chosen.
		expect(dialog).not.toHaveTextContent("There, they will be able to");
		await user.click(screen.getByRole("button", { name: "Role" }));
		await user.click(await screen.findByRole("option", { name: "Manager" }));

		expect(dialog).toHaveTextContent("There, they will be able to");
		expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
			["Organisation"]
		);
		expect(submit).toBeDisabled();

		await user.click(screen.getByLabelText("Person"));
		await user.click(await screen.findByRole("option", { name: "Priya Nair" }));
		expect(submit).toBeDisabled();
		await user.click(screen.getByLabelText("Applies to"));
		await user.click(
			await screen.findByRole("option", { name: "Whole company" })
		);
		await user.click(await screen.findByRole("option", { name: "Orchard" }));
		await user.keyboard("{Escape}");
		await user.click(submit);

		expect(onAssign).toHaveBeenCalledWith("r-1", "m-2", [
			targets[0],
			targets[1],
		]);
	});

	it("offers only the places every permission of the chosen role can be given at", async () => {
		const user = userEvent.setup();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					people={people}
					query=""
					roles={roles}
					targets={targets}
					onAssign={vi.fn()}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		await user.click(await screen.findByRole("button", { name: "Role" }));
		await user.click(await screen.findByRole("option", { name: "Manager" }));
		await user.click(screen.getByLabelText("Applies to"));

		// Branches: View can't be given at a single Department.
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Whole company", "Orchard"]);
	});

	it("names the permissions in the way when a local role fits none of the places", async () => {
		const user = userEvent.setup();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					people={people}
					query=""
					roles={[roles[0]!]}
					targets={targets.slice(2)}
					onAssign={vi.fn()}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const dialog = await screen.findByRole("dialog", { name: "Assign role" });

		expect(dialog).toHaveTextContent(
			"This role can’t be given at any place you may assign it: “See branches” can only be given more widely."
		);
		await user.click(screen.getByLabelText("Applies to"));
		expect(screen.queryByRole("option")).not.toBeInTheDocument();
	});

	it("offers a company role only at the whole company", async () => {
		const user = userEvent.setup();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					people={people}
					query=""
					roles={roles}
					targets={targets}
					onAssign={vi.fn()}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		await user.click(await screen.findByRole("button", { name: "Role" }));
		await user.click(await screen.findByRole("option", { name: "Auditor" }));
		await user.click(screen.getByLabelText("Applies to"));

		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Whole company"]);
	});

	it("says a company role can't be given when the whole company isn't a place the person may assign at", async () => {
		const user = userEvent.setup();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					people={people}
					query=""
					roles={[roles[1]!]}
					targets={targets.slice(1)}
					onAssign={vi.fn()}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const dialog = await screen.findByRole("dialog", { name: "Assign role" });

		expect(dialog).toHaveTextContent(
			"A company role can only be given at the whole company, and you can’t assign roles there."
		);
		// The kind is what's in the way, not its permissions.
		expect(dialog).not.toHaveTextContent("can only be given more widely");
		await user.click(screen.getByLabelText("Applies to"));
		expect(screen.queryByRole("option")).not.toBeInTheDocument();
	});

	it("previews the person's access after the change, place by place", async () => {
		const user = userEvent.setup();
		const onPersonChange = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					people={people}
					query=""
					roles={roles.slice(0, 2)}
					targets={targets}
					preview={{
						// Priya approves leave at Orchard; an inactive grant gives nothing.
						assignments: [
							{
								accessRoleAssignmentId: "a-1",
								accessRoleId: "r-3",
								status: "ACTIVE",
								branchId: "b-1",
								departmentId: null,
							},
							{
								accessRoleAssignmentId: "a-2",
								accessRoleId: "r-3",
								status: "INACTIVE",
								branchId: null,
								departmentId: null,
							},
						],
						roles,
						placeLabel,
					}}
					onAssign={vi.fn()}
					onClose={vi.fn()}
					onPersonChange={onPersonChange}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const dialog = await screen.findByRole("dialog", { name: "Assign role" });
		await user.click(screen.getByRole("button", { name: "Role" }));
		await user.click(await screen.findByRole("option", { name: "Manager" }));
		// Nothing is previewed until a person is chosen.
		expect(within(dialog).queryByRole("region")).not.toBeInTheDocument();
		await user.click(screen.getByLabelText("Person"));
		await user.click(await screen.findByRole("option", { name: "Priya Nair" }));

		expect(onPersonChange).toHaveBeenLastCalledWith(people[1]);
		const preview = within(dialog).getByRole("region", {
			name: "Priya Nair’s access after this change",
		});
		expect(preview).toHaveTextContent("Only places you can see are shown.");
		expect(describedRows(preview)).toEqual(["Orchard: Leave: Manage"]);

		await user.click(screen.getByLabelText("Applies to"));
		await user.click(
			await screen.findByRole("option", { name: "Whole company" })
		);
		await user.click(await screen.findByRole("option", { name: "Orchard" }));
		await user.keyboard("{Escape}");

		// The whole company first, then branches; what a place gives isn't repeated below it.
		expect(describedRows(preview)).toEqual([
			"Whole company: Organisation: View",
			"Orchard: Leave: Manage / Organisation: View",
		]);
	});

	it("previews no access once the last place a person holds anything is cleared", async () => {
		const user = userEvent.setup();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					editing={{ person: people[1]!, places: [targets[1]!] }}
					people={[]}
					query=""
					roles={[roles[0]!]}
					targets={targets}
					preview={{
						assignments: [
							{
								accessRoleAssignmentId: "a-1",
								accessRoleId: "r-1",
								status: "ACTIVE",
								branchId: "b-1",
								departmentId: null,
							},
						],
						roles,
						placeLabel,
					}}
					onAssign={vi.fn()}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const preview = await screen.findByRole("region", {
			name: "Priya Nair’s access after this change",
		});
		expect(describedRows(preview)).toEqual(["Orchard: Organisation: View"]);

		await user.click(screen.getByRole("button", { name: "Remove Orchard" }));

		expect(preview).toHaveTextContent(
			"No permissions at the places you can see."
		);
		expect(within(preview).queryByRole("term")).not.toBeInTheDocument();
	});

	it("edits where a person has the role, starting from the places they hold it", async () => {
		const user = userEvent.setup();
		const onAssign = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					editing={{ person: people[1]!, places: [targets[1]!] }}
					people={[]}
					query=""
					roles={[roles[0]!]}
					targets={targets}
					onAssign={onAssign}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit assignment",
		});

		// The person is fixed; only the places change.
		expect(within(dialog).getByLabelText("Person")).toBeDisabled();
		expect(dialog).toHaveTextContent("Priya Nair");
		await user.click(
			within(dialog).getByRole("button", { name: "Remove Orchard" })
		);
		expect(dialog).toHaveTextContent(
			"Saving with no places removes this role from Priya Nair."
		);
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(onAssign).toHaveBeenCalledWith("r-1", "m-2", []);
	});
});
