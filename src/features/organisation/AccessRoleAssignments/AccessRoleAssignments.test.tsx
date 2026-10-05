import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	AccessRoleAssignments,
	type AccessRoleAssignmentsProps,
} from "@/features/organisation/AccessRoleAssignments";

const assignments = [
	{ assignmentId: "a-1", membershipId: "m-1", displayName: "Priya Nair" },
	{
		assignmentId: "a-2",
		membershipId: "m-2",
		displayName: "Marcus Lim",
		branchName: "Orchard",
	},
	{
		assignmentId: "a-3",
		membershipId: "m-3",
		displayName: "Daniel Tan",
		branchName: "Orchard",
		departmentName: "Kitchen",
	},
];

const show = (props: Partial<AccessRoleAssignmentsProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AccessRoleAssignments assignments={assignments} {...props} />
		</I18nextProvider>
	);
};

describe("AccessRoleAssignments", () => {
	it("shows one row per person with every place they have the role, in words", () => {
		show({
			assignments: [
				...assignments,
				{
					assignmentId: "a-4",
					membershipId: "m-3",
					displayName: "Daniel Tan",
					branchName: "Tampines",
				},
			],
		});

		const rows = within(
			screen.getByRole("table", { name: "People with this role" })
		)
			.getAllByRole("row")
			.slice(1);
		expect(
			rows.map((row) =>
				within(row)
					.getAllByRole("listitem")
					.map((item) => item.textContent)
			)
		).toEqual([
			["Whole company"],
			["Orchard"],
			["Orchard › Kitchen", "Tampines"],
		]);
		expect(screen.getByText("3 people")).toBeVisible();
	});

	it("offers assigning and removing a single place only when given a way to do them", async () => {
		const user = userEvent.setup();
		const onAssign = vi.fn();
		const onRemove = vi.fn();
		show({ onAssign, onRemove });

		await user.click(screen.getByRole("button", { name: "Assign role" }));
		await user.click(
			within(
				screen.getByRole("list", { name: "Where Daniel Tan has this role" })
			).getByRole("button", { name: "Remove Orchard › Kitchen" })
		);

		expect(onAssign).toHaveBeenCalledOnce();
		expect(onRemove).toHaveBeenCalledWith(assignments[2]);
	});

	it("shows no actions to someone who can only view", () => {
		show();

		expect(
			screen.queryByRole("button", { name: "Assign role" })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
	});

	it("says so when nobody has the role", () => {
		show({ assignments: [] });

		expect(screen.getByText("Nobody has this role yet.")).toBeVisible();
		expect(screen.getByText("0 people")).toBeVisible();
	});
});
