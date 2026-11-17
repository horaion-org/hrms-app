import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { GiveDefaultAccessDialog } from "@/features/people/GiveDefaultAccessDialog";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/People/GiveDefaultAccessDialog",
	component: GiveDefaultAccessDialog,
	args: {
		companyId: "story-company",
		onGiven: fn(),
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
	beforeEach: (): (() => void) =>
		stubStoryApi(
			[
				{
					path: "/member-profiles",
					content: [
						{
							membershipId: "m-1",
							displayName: "Mei Tan",
							departmentName: "Housekeeping",
						},
						{
							membershipId: "m-2",
							displayName: "Aisha Rahman",
							departmentName: "Front Desk",
						},
						{
							membershipId: "m-3",
							displayName: "Daniel Wong",
							departmentName: null,
						},
					],
				},
			],
			false,
			client
		),
} satisfies Meta<typeof GiveDefaultAccessDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** People already here, ready to be ticked; the header box ticks everyone listed. */
export const Default: Story = {};
