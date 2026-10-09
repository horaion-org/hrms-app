import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { CreateJobTitleDialog } from "@/features/organisation/CreateJobTitleDialog";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { workspaceQuery } from "@/features/workspace/api";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/Organisation/CreateJobTitleDialog",
	component: CreateJobTitleDialog,
	args: { companyId: "story-company", onClose: fn() },
	decorators: [storyProviders(client)],
	beforeEach: ({ parameters }): (() => void) => {
		const stop = stubStoryApi([], Boolean(parameters["pending"]), client);
		// One Department the person may add job titles to, so it is chosen for them.
		client.setQueryData(workspaceQuery.queryKey, {
			companies: [
				{
					uuid: "story-company",
					name: "Story company",
					permissions: ["job_title:create"],
					branches: [
						{
							uuid: "b-1",
							name: "Orchard Road",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [
								{
									uuid: "d-1",
									name: "Kitchen",
									status: "ACTIVE",
									permissions: [],
								},
							],
						},
					],
				},
			],
		});
		return stop;
	},
} satisfies Meta<typeof CreateJobTitleDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const type = async (body: HTMLElement, name: string): Promise<void> => {
	await userEvent.type(
		await within(body).findByLabelText("Job title name"),
		name
	);
};
const submit = async (body: HTMLElement): Promise<void> => {
	await userEvent.click(
		within(body).getByRole("button", { name: "Create job title" })
	);
};

export const Empty: Story = {};
export const NameEntered: Story = {
	play: async ({ canvasElement }) => {
		await type(canvasElement.ownerDocument.body, "Shift supervisor");
	},
};
export const InvalidName: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await type(body, "Supervisor_1");
		await submit(body);
	},
};
export const Submitting: Story = {
	parameters: { pending: true },
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await type(body, "Shift supervisor");
		await submit(body);
	},
};
export const FormError: Story = { play: Submitting.play };
