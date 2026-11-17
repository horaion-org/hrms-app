import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { AccessRole } from "@/features/organisation/api";
import {
	DefaultAccessDialog,
	type DefaultAccessDialogProps,
} from "@/features/organisation/DefaultAccessDialog";

const role = (
	accessRoleId: string,
	name: string,
	overrides: Partial<AccessRole> = {}
): AccessRole => ({
	accessRoleId,
	name,
	protectedRole: false,
	kind: "LOCAL",
	status: "ACTIVE",
	permissions: ["department:read"],
	holderCount: 0,
	...overrides,
});

const roles = [
	role("r-staff", "Staff"),
	role("r-branch", "Branch reader", { permissions: ["branch:read"] }),
	role("r-audit", "Auditor", {
		kind: "COMPANY",
		permissions: ["audit_event:read"],
	}),
	role("r-admin", "System Admin", { protectedRole: true, kind: "COMPANY" }),
	role("r-old", "Retired", { status: "INACTIVE" }),
];
const places = [
	{ label: "Whole company" },
	{ label: "Orchard", branchId: "b-1" },
	{ label: "Orchard › Kitchen", branchId: "b-1", departmentId: "d-1" },
];

const show = (
	props: Partial<DefaultAccessDialogProps> = {}
): { onAdd: ReturnType<typeof vi.fn> } => {
	const onAdd = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<DefaultAccessDialog
				places={places}
				roles={roles}
				onAdd={onAdd}
				onClose={vi.fn()}
				{...props}
			/>
		</I18nextProvider>
	);
	return { onAdd };
};

const optionsOf = async (field: RegExp): Promise<Array<string | null>> => {
	await userEvent.click(screen.getByRole("button", { name: field }));
	const options = (await screen.findAllByRole("option")).map(
		(option) => option.textContent
	);
	await userEvent.keyboard("{Escape}");
	return options;
};

describe("DefaultAccessDialog", () => {
	it("offers only active local custom roles that fit their own department", async () => {
		show();

		expect(await optionsOf(/^Role/)).toEqual(["Staff"]);
	});

	it("offers a role with a branch-only key once it applies to their own branch", async () => {
		show();
		await userEvent.click(screen.getByRole("button", { name: /^Applies to/ }));
		await userEvent.click(
			await screen.findByRole("option", { name: "Their own branch" })
		);

		expect(await optionsOf(/^Role/)).toEqual(["Staff", "Branch reader"]);
	});

	it("names each place by whose people it covers", async () => {
		show();

		expect(await optionsOf(/^Who gets it/)).toEqual([
			"Everyone in the company",
			"Everyone in Orchard",
			"Everyone in Orchard › Kitchen",
		]);
	});

	it("sends the role, the reach and only the department for a department", async () => {
		const { onAdd } = show();
		await userEvent.click(screen.getByRole("button", { name: /^Who gets it/ }));
		await userEvent.click(
			await screen.findByRole("option", {
				name: "Everyone in Orchard › Kitchen",
			})
		);
		await userEvent.click(screen.getByRole("button", { name: /^Role/ }));
		await userEvent.click(await screen.findByRole("option", { name: "Staff" }));

		expect(screen.getByText("This role allows")).toBeVisible();
		await userEvent.click(
			screen.getByRole("button", { name: "Add default access" })
		);

		expect(onAdd).toHaveBeenCalledWith({
			accessRoleId: "r-staff",
			appliesTo: "OWN_DEPARTMENT",
			departmentId: "d-1",
		});
	});

	it("keeps Add off until a role is chosen", () => {
		show();

		expect(
			screen.getByRole("button", { name: "Add default access" })
		).toBeDisabled();
	});

	it("says why when no role fits", () => {
		show({
			roles: roles.filter((item) => item.kind === "COMPANY"),
		});

		expect(
			screen.getByText(
				"No role can apply to their own department. Use an active role for branches or departments, without branch-only permissions."
			)
		).toBeVisible();
	});

	it("shows a refusal in an alert", () => {
		show({ error: "That role is already default access there." });

		expect(
			within(screen.getByRole("dialog")).getByRole("alert")
		).toHaveTextContent("That role is already default access there.");
	});
});
