import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { BulkAssignSkillDialog } from "@/features/skills/BulkAssignSkillDialog";
import {
	licenceFixture,
	overviewFixture,
	skillFixture,
} from "@/features/skills/fixtures";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/Skills/BulkAssignSkillDialog",
	component: BulkAssignSkillDialog,
	args: {
		companyId: "story-company",
		skill: overviewFixture(skillFixture(), { holders: 1 }),
		onAssigned: fn(),
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
							displayName: "Jane Tan",
							departmentName: "Warehouse",
						},
						{
							membershipId: "m-2",
							displayName: "Ali Musa",
							departmentName: "Warehouse",
						},
						{
							membershipId: "m-3",
							displayName: "Priya Nair",
							departmentName: "Front desk",
						},
					],
				},
				{
					path: "/holders",
					content: [
						{
							membershipId: "m-1",
							proficiency: 8,
							issuedOn: null,
							expiresOn: null,
						},
					],
				},
			],
			false,
			client
		),
} satisfies Meta<typeof BulkAssignSkillDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A rated skill: one proficiency for everyone ticked. */
export const Rated: Story = {};

/** A licence: dates instead of a rating. */
export const Licence: Story = {
	args: { skill: overviewFixture(licenceFixture()) },
};
