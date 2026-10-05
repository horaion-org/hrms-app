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

const show = (props: Partial<AccessRoleFormProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AccessRoleForm
				initial={{ name: "Manager", permissions: ["branch:read"] }}
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

describe("AccessRoleForm", () => {
	it("starts a new role empty and submits the trimmed name with its permissions", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		show({ mode: "create", initial: { name: "", permissions: [] }, onSubmit });
		const submit = screen.getByRole("button", { name: "Create role" });

		expect(submit).toBeDisabled();
		expect(screen.getByText("Choose at least one permission.")).toBeVisible();

		await user.click(box("Branches", "Edit"));
		expect(submit).toBeDisabled();
		await user.type(nameField(), " Supervisor ");
		expect(submit).toBeEnabled();
		// A new role has nothing to compare against, so no changes are counted.
		expect(screen.queryByText(/added/)).not.toBeInTheDocument();
		await user.click(submit);

		expect(onSubmit).toHaveBeenCalledWith({
			name: "Supervisor",
			permissions: ["branch:read", "branch:update"],
		});
	});

	it("counts changes to an existing role and needs one before saving", async () => {
		const user = userEvent.setup();
		show();
		const submit = screen.getByRole("button", { name: "Save changes" });

		expect(submit).toBeDisabled();
		await user.click(box("Branches", "Create"));

		expect(screen.getByText("1 added")).toBeVisible();
		expect(submit).toBeEnabled();
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

		expect(nameField()).toBeDisabled();
		expect(box("Branches", "View")).toBeDisabled();
		expect(
			screen.queryByRole("button", { name: "Save changes" })
		).not.toBeInTheDocument();
	});
});
