import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
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

const roles = [
	{
		accessRoleId: "r-1",
		name: "Manager",
		protectedRole: false,
		status: "ACTIVE" as const,
		permissions: ["branch:read", "department:read"],
		holderCount: 0,
	},
	{
		accessRoleId: "r-2",
		name: "Supervisor",
		protectedRole: false,
		status: "ACTIVE" as const,
		permissions: ["audit_event:read"],
		holderCount: 0,
	},
];

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
			["Branches", "Departments"]
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

	it("names the permissions in the way when the role fits none of the places", async () => {
		const user = userEvent.setup();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<AssignAccessRoleDialog
					people={people}
					query=""
					roles={roles.slice(1)}
					targets={targets.slice(1)}
					onAssign={vi.fn()}
					onClose={vi.fn()}
					onQueryChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const dialog = await screen.findByRole("dialog", { name: "Assign role" });

		expect(dialog).toHaveTextContent(
			"This role can’t be given at any place you may assign it: Activity: View can only be given more widely."
		);
		await user.click(screen.getByLabelText("Applies to"));
		expect(screen.queryByRole("option")).not.toBeInTheDocument();
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
