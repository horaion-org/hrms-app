import { render, screen } from "@testing-library/react";
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
		permissions: ["branch:read", "department:read"],
		holderCount: 0,
	},
	{
		accessRoleId: "r-2",
		name: "Supervisor",
		protectedRole: false,
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
		await user.click(await screen.findByRole("option", { name: "Orchard" }));
		await user.click(
			await screen.findByRole("option", { name: "Orchard › Kitchen" })
		);
		await user.keyboard("{Escape}");
		await user.click(submit);

		expect(onAssign).toHaveBeenCalledWith("r-1", "m-2", [
			targets[1],
			targets[2],
		]);
	});
});
