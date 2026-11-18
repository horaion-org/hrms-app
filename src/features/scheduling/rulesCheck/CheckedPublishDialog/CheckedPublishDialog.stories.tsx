import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { CheckedPublishDialog } from "@/features/scheduling/rulesCheck/CheckedPublishDialog";
import {
	generatedScheduleFixture,
	SCHEDULING_BRANCHES,
} from "@/features/scheduling/schedules/fixtures";

const COMPANY = "c-1";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/CheckedPublishDialog",
	component: CheckedPublishDialog,
	parameters: { permissions: ["schedule:read", "constraint:read"] },
	args: {
		companyId: COMPANY,
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		onClose: fn(),
	},
	decorators: [
		storyCompany(client, COMPANY, SCHEDULING_BRANCHES),
		storyProviders(client),
	],
} satisfies Meta<typeof CheckedPublishDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * With no API behind the story the check is refused: the dialog says the
 * rules could not be checked and still lets the roster be published.
 */
export const Unchecked: Story = {};
