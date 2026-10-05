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
	{
		assignmentId: "a-1",
		membershipId: "m-1",
		name: "Priya Nair",
		status: "ACTIVE" as const,
	},
	{
		assignmentId: "a-2",
		membershipId: "m-2",
		name: "Marcus Lim",
		status: "ACTIVE" as const,
		branchName: "Orchard",
	},
	{
		assignmentId: "a-3",
		membershipId: "m-3",
		name: "Daniel Tan",
		status: "ACTIVE" as const,
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
					name: "Daniel Tan",
					status: "ACTIVE" as const,
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

	it("offers the same Edit and More actions as the other lists when given a way to change things", async () => {
		const user = userEvent.setup();
		const onAssign = vi.fn();
		const onEdit = vi.fn();
		const onSetStatus = vi.fn();
		const onRemove = vi.fn();
		show({ onAssign, onEdit, onSetStatus, onRemove });
		const daniel = {
			membershipId: "m-3",
			name: "Daniel Tan",
			status: "ACTIVE",
			places: [assignments[2]],
		};

		await user.click(screen.getByRole("button", { name: "Assign role" }));
		await user.click(screen.getByRole("button", { name: "Edit Daniel Tan" }));
		expect(onAssign).toHaveBeenCalledOnce();
		expect(onEdit).toHaveBeenCalledWith(daniel);

		await user.click(
			screen.getByRole("button", { name: "More actions for Daniel Tan" })
		);
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Deactivate", "Delete"]);
		await user.click(screen.getByRole("menuitem", { name: "Deactivate" }));
		expect(onSetStatus).toHaveBeenCalledWith(daniel);

		await user.click(
			screen.getByRole("button", { name: "More actions for Daniel Tan" })
		);
		await user.click(screen.getByRole("menuitem", { name: "Delete" }));
		expect(onRemove).toHaveBeenCalledWith(daniel);
	});

	it("shows a person as inactive only when the role is off for them everywhere, and then offers Activate and no editing", async () => {
		const user = userEvent.setup();
		show({
			onEdit: vi.fn(),
			onSetStatus: vi.fn(),
			onRemove: vi.fn(),
			assignments: [
				{ ...assignments[0]!, status: "INACTIVE" },
				// Off at one place, still on at the other.
				{ ...assignments[2]!, status: "INACTIVE" },
				{
					...assignments[2]!,
					assignmentId: "a-4",
					branchName: "Tampines",
					departmentName: undefined,
				},
			],
		});
		const rows = screen.getAllByRole("row").slice(1);

		expect(within(rows[0]!).getByText("Inactive")).toBeVisible();
		expect(within(rows[1]!).getByText("Active")).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Edit Priya Nair" })
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Edit Daniel Tan" })
		).toBeEnabled();

		await user.click(
			screen.getByRole("button", { name: "More actions for Priya Nair" })
		);
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Activate", "Delete"]);
	});

	it("shows no actions to someone who can only view", () => {
		show();

		expect(
			screen.queryByRole("button", { name: "Assign role" })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
		expect(
			screen.queryByRole("columnheader", { name: "Actions" })
		).not.toBeInTheDocument();
	});

	it("says so when nobody has the role", () => {
		show({ assignments: [] });

		expect(screen.getByText("Nobody has this role yet.")).toBeVisible();
		expect(screen.getByText("0 people")).toBeVisible();
	});
});
