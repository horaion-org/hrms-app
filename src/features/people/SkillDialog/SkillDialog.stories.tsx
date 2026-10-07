import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { SkillDialog } from "@/features/people/SkillDialog";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/People/SkillDialog",
	component: SkillDialog,
	args: {
		companyId: "story-company",
		name: "Kent Chua",
		skills: [{ name: "Baking", proficiency: 8 }],
		onSubmit: fn(() => Promise.resolve()),
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
	beforeEach: (): (() => void) =>
		stubStoryApi(
			[
				{
					path: "/skills",
					content: [
						{ skillId: "s-1", name: "Baking" },
						{ skillId: "s-2", name: "Customer service" },
						{ skillId: "s-3", name: "Pastry art" },
					],
				},
			],
			false,
			client
		),
} satisfies Meta<typeof SkillDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Saving fails, so the dialog's alert shows. */
export const Refused: Story = {
	args: { onSubmit: fn(() => Promise.reject(new Error("offline"))) },
};
