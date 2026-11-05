import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { SkillDialog } from "@/features/people/SkillDialog";
import {
	heldLicenceFixture,
	heldSkillFixture,
	licenceFixture,
	skillFixture,
} from "@/features/skills/fixtures";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/People/SkillDialog",
	component: SkillDialog,
	args: {
		companyId: "story-company",
		name: "Kent Chua",
		held: [heldSkillFixture({ skillId: "s-baking", name: "Baking" })],
		canCreateSkills: true,
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
						skillFixture(),
						licenceFixture(),
						skillFixture({ skillId: "s-pastry", name: "Pastry art" }),
					],
				},
			],
			false,
			client
		),
} satisfies Meta<typeof SkillDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Giving a skill: pick one of the catalogue's active skills. */
export const Add: Story = {};

/** Changing a rated skill: the slider and notes. */
export const EditRated: Story = {
	args: { editing: heldSkillFixture({ notes: "Trains new starters" }) },
};

/** Changing a licence: its dates instead of a rating. */
export const EditLicence: Story = {
	args: { editing: heldLicenceFixture() },
};

/** Saving fails, so the dialog's alert shows. */
export const Refused: Story = {
	args: {
		editing: heldSkillFixture(),
		onSubmit: fn(() => Promise.reject(new Error("offline"))),
	},
};
