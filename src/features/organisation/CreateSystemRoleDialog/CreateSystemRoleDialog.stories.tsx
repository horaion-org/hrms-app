import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { CreateSystemRoleDialog } from "@/features/organisation/CreateSystemRoleDialog";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/Organisation/CreateSystemRoleDialog",
	component: CreateSystemRoleDialog,
	args: {
		companyId: "story-company",
		heldPermissions: new Set(PERMISSION_KEYS),
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
	beforeEach: ({ parameters }): (() => void) =>
		stubStoryApi([], Boolean(parameters["pending"]), client),
} satisfies Meta<typeof CreateSystemRoleDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const chooseType = async (
	body: HTMLElement,
	type: "Across the whole company" | "In the branches or departments you choose"
): Promise<void> => {
	await userEvent.click(await within(body).findByRole("radio", { name: type }));
};
const fill = async (body: HTMLElement): Promise<void> => {
	const page = within(body);
	await chooseType(body, "In the branches or departments you choose");
	await userEvent.type(
		await page.findByLabelText("Role name"),
		"Branch manager"
	);
	// Edit needs View, so both are chosen.
	await userEvent.click(
		within(page.getByRole("group", { name: "Branches" })).getByRole(
			"checkbox",
			{ name: "Edit branches" }
		)
	);
};
const submit = async (body: HTMLElement): Promise<void> => {
	await userEvent.click(
		within(body).getByRole("button", { name: "Create access role" })
	);
};

/** Nothing can be ticked until the role's type is chosen. */
export const Owner: Story = {};
/** A company role: the Company Owner holds every permission, so every box can be chosen. */
export const CompanyRole: Story = {
	play: async ({ canvasElement }) => {
		await chooseType(
			canvasElement.ownerDocument.body,
			"Across the whole company"
		);
	},
};
/** A local role: company-only permissions aren't offered. */
export const LocalRole: Story = {
	play: async ({ canvasElement }) => {
		await chooseType(
			canvasElement.ownerDocument.body,
			"In the branches or departments you choose"
		);
	},
};
/** A company role switched to local: its company-only permissions are cleared and named. */
export const SwitchedToLocal: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await chooseType(body, "Across the whole company");
		await userEvent.click(
			within(within(body).getByRole("group", { name: "Branches" })).getByRole(
				"checkbox",
				{ name: "Create branches" }
			)
		);
		await chooseType(body, "In the branches or departments you choose");
	},
};
/** A duplicate starts from the copied role's type, name and permissions. */
export const Duplicate: Story = {
	args: {
		initial: {
			kind: "LOCAL",
			name: "Manager copy",
			permissions: ["branch:read", "department:read"],
		},
	},
};
/** Someone with a narrower role can only grant what they hold. */
export const LimitedCreator: Story = {
	args: {
		heldPermissions: new Set([
			"branch:read",
			"department:read",
			"access_role:read",
			"access_role:create",
		]),
	},
	play: CompanyRole.play,
};
export const Chosen: Story = {
	play: async ({ canvasElement }) => {
		await fill(canvasElement.ownerDocument.body);
	},
};
export const NoPermissionChosen: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await chooseType(body, "In the branches or departments you choose");
		await userEvent.type(
			await within(body).findByLabelText("Role name"),
			"Auditor"
		);
		await submit(body);
	},
};
export const Submitting: Story = {
	parameters: { pending: true },
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await fill(body);
		await submit(body);
	},
};
export const FormError: Story = { play: Submitting.play };
/** Submitted without a type or permissions: both are asked for. */
export const NothingChosen: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await userEvent.type(
			await within(body).findByLabelText("Role name"),
			"Auditor"
		);
		await submit(body);
	},
};
