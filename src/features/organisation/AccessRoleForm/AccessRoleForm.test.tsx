import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	AccessRoleForm,
	type AccessRoleFormProps,
} from "@/features/organisation/AccessRoleForm";
import {
	isCompanyOnly,
	PERMISSION_KEYS,
} from "@/features/workspace/permissionKeys";

const MANAGER: AccessRoleFormProps["initial"] = {
	kind: "LOCAL",
	name: "Manager",
	permissions: ["branch:read"],
};

const show = (props: Partial<AccessRoleFormProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AccessRoleForm
				initial={MANAGER}
				mode="edit"
				onSubmit={() => Promise.resolve()}
				{...props}
			/>
		</I18nextProvider>
	);
};

const box = (group: string, name: string): HTMLElement =>
	within(screen.getByRole("group", { name: group })).getByRole("checkbox", {
		name,
	});
const nameField = (): HTMLElement =>
	screen.getByRole("textbox", { name: /Role name/ });
const typeField = (): HTMLElement =>
	screen.getByRole("radiogroup", { name: "Where can this role be used?" });
const chooseType = async (
	user: ReturnType<typeof userEvent.setup>,
	type: "Across the whole company" | "In the branches or departments you choose"
): Promise<void> => {
	await user.click(within(typeField()).getByRole("radio", { name: type }));
};
const COMPANY_HINT =
	"Can include company settings, branches and access roles. It can only be given at the whole company.";
const LOCAL_HINT = "You pick the places when you give someone the role.";
// A local role is offered every key that isn't company-only.
const LOCAL_KEYS = PERMISSION_KEYS.filter((key) => !isCompanyOnly(key)).length;

describe("AccessRoleForm", () => {
	it("asks for the role type first, with no default, and locks the permissions until it is chosen", async () => {
		const user = userEvent.setup();
		show({ mode: "create", initial: { kind: "", name: "", permissions: [] } });

		for (const choice of within(typeField()).getAllByRole("radio"))
			expect(choice).not.toBeChecked();
		// Each answer explains itself, chosen or not.
		expect(
			within(typeField()).getByRole("radio", {
				name: "Across the whole company",
			})
		).toHaveAccessibleDescription(COMPANY_HINT);
		expect(
			within(typeField()).getByRole("radio", {
				name: "In the branches or departments you choose",
			})
		).toHaveAccessibleDescription(LOCAL_HINT);
		expect(
			screen.getByText(
				"Choose where this role can be used to see the permissions it can hold."
			)
		).toBeVisible();
		for (const item of screen.getAllByRole("checkbox"))
			expect(item).toBeDisabled();

		await chooseType(user, "Across the whole company");

		expect(
			within(typeField()).getByRole("radio", {
				name: "Across the whole company",
			})
		).toBeChecked();
		expect(
			screen.queryByText(
				"Choose where this role can be used to see the permissions it can hold."
			)
		).not.toBeInTheDocument();
		expect(box("Branches", "Create branches")).toBeEnabled();
		expect(
			screen.getByText(`0 of ${PERMISSION_KEYS.length} selected`)
		).toBeVisible();

		await chooseType(user, "In the branches or departments you choose");

		expect(
			within(typeField()).getByRole("radio", {
				name: "In the branches or departments you choose",
			})
		).toBeChecked();
		// A local role offers no company-only permission, and counts what it may hold.
		expect(screen.queryByRole("group", { name: "Company" })).toBeNull();
		expect(screen.getByText(`0 of ${LOCAL_KEYS} selected`)).toBeVisible();
	});

	it("starts a new role empty and submits its type, the trimmed name and its permissions", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		show({
			mode: "create",
			initial: { kind: "", name: "", permissions: [] },
			onSubmit,
		});
		const submit = screen.getByRole("button", { name: "Create role" });

		expect(submit).toBeDisabled();
		expect(screen.getByText("Choose at least one permission.")).toBeVisible();

		await chooseType(user, "In the branches or departments you choose");
		await user.click(box("Branches", "Edit branches"));
		expect(submit).toBeDisabled();
		await user.type(nameField(), " Supervisor ");
		expect(submit).toBeEnabled();
		// A new role has nothing to compare against, so no changes are counted.
		expect(screen.queryByText(/added/)).not.toBeInTheDocument();
		await user.click(submit);

		expect(onSubmit).toHaveBeenCalledWith({
			kind: "LOCAL",
			name: "Supervisor",
			permissions: ["branch:read", "branch:update"],
		});
	});

	it("counts changes to an existing role and needs one before saving", async () => {
		const user = userEvent.setup();
		show();
		const submit = screen.getByRole("button", { name: "Save changes" });

		expect(submit).toBeDisabled();
		await user.click(box("Branches", "Edit branches"));

		expect(screen.getByText("1 added")).toBeVisible();
		expect(submit).toBeEnabled();
	});

	it("clears a company role's company-only permissions when it becomes local, naming them", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		show({
			initial: {
				kind: "COMPANY",
				name: "Regional lead",
				permissions: [
					"company:read",
					"branch:read",
					"branch:create",
					"audit_event:read",
				],
			},
			onSubmit,
		});

		await chooseType(user, "In the branches or departments you choose");

		expect(
			screen.getByText(
				"A role for chosen places can’t hold company-wide permissions, so “See the workspace”, “Create branches”, and “See the activity record” were removed."
			)
		).toBeVisible();
		expect(box("Branches", "See branches")).toBeChecked();
		expect(
			screen.getByText("Where it can be used changed, 3 removed")
		).toBeVisible();

		// Going back to a company role doesn't bring them back, and the notice goes.
		await chooseType(user, "Across the whole company");
		expect(screen.queryByText(/were removed/)).not.toBeInTheDocument();
		expect(box("Branches", "Create branches")).not.toBeChecked();
		await chooseType(user, "In the branches or departments you choose");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(onSubmit).toHaveBeenCalledWith({
			kind: "LOCAL",
			name: "Regional lead",
			permissions: ["branch:read"],
		});
	});

	it("puts back the type and the cleared permissions when changes are discarded", async () => {
		const user = userEvent.setup();
		show({
			initial: {
				kind: "COMPANY",
				name: "Regional lead",
				permissions: ["branch:read", "branch:create"],
			},
		});

		await chooseType(user, "In the branches or departments you choose");
		await user.click(screen.getByRole("button", { name: "Discard changes" }));

		expect(
			within(typeField()).getByRole("radio", {
				name: "Across the whole company",
			})
		).toBeChecked();
		expect(box("Branches", "Create branches")).toBeChecked();
		expect(screen.queryByText(/was removed/)).not.toBeInTheDocument();
	});

	it("puts the API's refusal of the type on the Role type field", async () => {
		const user = userEvent.setup();
		show({
			onSubmit: () =>
				Promise.reject(
					new ApiProblemError({
						status: 400,
						errorCode: "ACCESS_ROLE_KIND_CONFLICT",
						fieldErrors: [],
						reason: "http",
						message: "Private server wording",
					})
				),
		});

		await chooseType(user, "Across the whole company");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(
			await screen.findByText(
				"This role is given at branches or departments, so it can’t become a whole-company role. Remove those assignments first, or keep it for chosen places."
			)
		).toBeVisible();
		expect(typeField()).toHaveFocus();
		expect(typeField()).toHaveAttribute("aria-invalid", "true");
		expect(
			screen.queryByText("Private server wording")
		).not.toBeInTheDocument();
	});

	it("explains a rejected submit in the app's own words and keeps what was entered", async () => {
		const user = userEvent.setup();
		show({
			onSubmit: () =>
				Promise.reject(
					new ApiProblemError({
						status: 409,
						errorCode: "ACCESS_ROLE_NAME_CONFLICT",
						fieldErrors: [],
						reason: "http",
						message: "Private server wording",
					})
				),
		});

		await user.type(nameField(), " two");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(
			await screen.findByText(
				'A role named "Manager two" already exists. Choose a different name.'
			)
		).toBeVisible();
		expect(nameField()).toHaveFocus();
		expect(nameField()).toHaveValue("Manager two");
		expect(
			screen.queryByText("Private server wording")
		).not.toBeInTheDocument();
	});

	it("offers no way to change a read-only role", () => {
		show({ readOnly: true });

		for (const choice of within(typeField()).getAllByRole("radio"))
			expect(choice).toBeDisabled();
		expect(nameField()).toBeDisabled();
		expect(box("Branches", "See branches")).toBeDisabled();
		expect(
			screen.queryByRole("button", { name: "Save changes" })
		).not.toBeInTheDocument();
	});
});
