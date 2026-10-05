import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	AccessRoleStatusDialog,
	type AccessRoleStatusDialogProps,
} from "@/features/organisation/AccessRoleStatusDialog";

const role = {
	accessRoleId: "r-1",
	name: "Manager",
	protectedRole: false,
	status: "ACTIVE" as const,
	permissions: ["branch:read", "department:read"],
	holderCount: 2,
};
const holders = [
	{ assignmentId: "a-1", membershipId: "m-1", displayName: "Priya Nair" },
	{
		assignmentId: "a-2",
		membershipId: "m-2",
		displayName: "Daniel Tan",
		branchName: "Orchard",
		departmentName: "Kitchen",
	},
	{
		assignmentId: "a-3",
		membershipId: "m-2",
		displayName: "Daniel Tan",
		branchName: "Tampines",
	},
];

const show = (props: Partial<AccessRoleStatusDialogProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AccessRoleStatusDialog
				affectsSelf={false}
				holders={holders}
				role={role}
				onClose={vi.fn()}
				onConfirm={vi.fn()}
				{...props}
			/>
		</I18nextProvider>
	);
};

describe("AccessRoleStatusDialog", () => {
	it("shows who loses what, and where, before a role is deactivated", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		show({ onConfirm });
		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Manager",
		});

		// Daniel holds it at two places and is counted once.
		expect(dialog).toHaveTextContent(
			"Deactivating this role removes the access it gives 2 people."
		);
		expect(
			within(dialog)
				.getAllByRole("row")
				.slice(1)
				.map((row) =>
					within(row)
						.getAllByRole("listitem")
						.map((item) => item.textContent)
				)
		).toEqual([["Whole company"], ["Orchard › Kitchen", "Tampines"]]);
		expect(dialog).toHaveTextContent("They will no longer be able to");
		expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
			["Branches", "Departments"]
		);
		expect(dialog).toHaveTextContent(
			"Activating the role again gives the same people their access back."
		);
		expect(dialog).not.toHaveTextContent("You hold this role");
		// Nothing can be removed from here; it only shows who is affected.
		expect(within(dialog).queryByRole("button", { name: /Remove/ })).toBeNull();

		await user.click(
			screen.getByRole("button", {
				name: "Deactivate and remove access for 2 people",
			})
		);
		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it("warns the person when they hold the role themselves", async () => {
		show({ affectsSelf: true });

		expect(await screen.findByRole("dialog")).toHaveTextContent(
			"You hold this role. You will lose these permissions too."
		);
	});

	it("keeps it short when nobody holds the role", async () => {
		show({ holders: [] });
		const dialog = await screen.findByRole("dialog");

		expect(dialog).toHaveTextContent(
			"Nobody holds this role, so no one loses access."
		);
		expect(within(dialog).queryByRole("table")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Deactivate role" })
		).toBeEnabled();
	});

	it("can't be confirmed until it is known who holds the role", async () => {
		show({ holders: undefined });

		expect(await screen.findByRole("dialog")).toHaveTextContent(
			"Checking who holds this role…"
		);
		expect(
			screen.getByRole("button", { name: "Deactivate role" })
		).toBeDisabled();
	});

	it("says who gets access back before an inactive role is activated", async () => {
		show({ role: { ...role, status: "INACTIVE" } });
		const dialog = await screen.findByRole("dialog", {
			name: "Activate Manager",
		});

		expect(dialog).toHaveTextContent(
			"Activating this role gives 2 people their access back."
		);
		expect(dialog).toHaveTextContent("They will be able to");
		expect(
			screen.getByRole("button", {
				name: "Activate and give access to 2 people",
			})
		).toBeEnabled();
	});
});
