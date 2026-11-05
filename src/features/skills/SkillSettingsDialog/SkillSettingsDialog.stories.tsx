import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import {
	licenceFixture,
	overviewFixture,
	skillFixture,
} from "@/features/skills/fixtures";
import { SkillSettingsDialog } from "@/features/skills/SkillSettingsDialog";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/Skills/SkillSettingsDialog",
	component: SkillSettingsDialog,
	args: { companyId: "story-company", onClose: fn() },
	decorators: [storyProviders(client)],
	beforeEach: ({ parameters }): (() => void) =>
		stubStoryApi([], Boolean(parameters["pending"]), client),
} satisfies Meta<typeof SkillSettingsDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A new skill starts rated 1 to 10, without expiry. */
export const Create: Story = {};

/** A licence nobody holds yet: every field may change. */
export const EditUnheld: Story = {
	args: { editing: overviewFixture(licenceFixture()) },
};

/** People hold it, so how it is measured and expiry tracking are fixed. */
export const EditHeld: Story = {
	args: { editing: overviewFixture(skillFixture(), { holders: 6 }) },
};
