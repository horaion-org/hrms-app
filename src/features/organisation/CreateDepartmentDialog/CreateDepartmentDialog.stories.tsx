import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { CreateDepartmentDialog } from "@/features/organisation/CreateDepartmentDialog";
import {
	STORY_PEOPLE,
	storyProviders,
	stubStoryApi,
} from "@/features/organisation/storyApi";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const branches = [
	{
		branchId: "b-1",
		name: "Orchard Road",
		status: "ACTIVE",
		code: "ORC",
		city: "Singapore",
		country: "SG",
	},
	{
		branchId: "b-2",
		name: "Tampines",
		status: "ACTIVE",
		code: "TAM",
		city: "Singapore",
		country: "SG",
	},
];
const meta = {
	title: "Features/Organisation/CreateDepartmentDialog",
	component: CreateDepartmentDialog,
	args: { companyId: "story-company", onClose: fn() },
	decorators: [storyProviders(client)],
	parameters: { branches },
	beforeEach: ({ parameters }): (() => void) =>
		stubStoryApi(
			[
				{
					path: "/branches",
					content: parameters["branches"] as Array<unknown>,
				},
				{ path: "/me/colleagues", content: STORY_PEOPLE },
			],
			Boolean(parameters["pending"]),
			client
		),
} satisfies Meta<typeof CreateDepartmentDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const fill = async (body: HTMLElement): Promise<void> => {
	const page = within(body);
	await userEvent.click(await page.findByRole("button", { name: "Branch" }));
	await userEvent.click(
		await page.findByRole("option", { name: "Orchard Road" })
	);
	await userEvent.type(
		page.getByLabelText("Department name"),
		"Front of house"
	);
	await userEvent.click(page.getByLabelText("Department heads"));
	await userEvent.click(
		await page.findByRole("option", { name: "Marcus Lim" })
	);
	await userEvent.keyboard("{Escape}");
};

export const Empty: Story = {};
export const Editing: Story = {
	args: {
		editing: {
			departmentId: "d-1",
			branchId: "b-1",
			name: "Front of house",
			status: "ACTIVE",
		},
	},
};
/** One active branch is chosen for the person. */
export const OnlyBranch: Story = { parameters: { branches: [branches[0]] } };
export const NoActiveBranch: Story = { parameters: { branches: [] } };
export const ChoosingBranch: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement.ownerDocument.body).findByRole("button", {
				name: "Branch",
			})
		);
	},
};
export const Filled: Story = {
	play: async ({ canvasElement }) => {
		await fill(canvasElement.ownerDocument.body);
	},
};
export const ValidationErrors: Story = {
	play: async ({ canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		await userEvent.type(await page.findByLabelText("Department name"), "B_");
		await userEvent.click(
			page.getByRole("button", { name: "Create department" })
		);
	},
};
export const Submitting: Story = {
	parameters: { pending: true },
	play: async ({ canvasElement }) => {
		await fill(canvasElement.ownerDocument.body);
		await userEvent.click(
			within(canvasElement.ownerDocument.body).getByRole("button", {
				name: "Create department",
			})
		);
	},
};
export const FormError: Story = { play: Submitting.play };
