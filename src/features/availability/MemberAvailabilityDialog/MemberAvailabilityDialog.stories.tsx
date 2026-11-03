import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { memberAvailabilityQuery } from "@/features/availability/api";
import {
	FIXTURE_WEEK,
	MEMBER_WEEK_FIXTURES,
	WEEKDAY_MORNINGS,
	weeklyAvailabilityFixture,
} from "@/features/availability/fixtures";
import { MemberAvailabilityDialog } from "@/features/availability/MemberAvailabilityDialog";
import { storyProviders } from "@/features/organisation/storyApi";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	memberAvailabilityQuery(COMPANY, "m-aisha").queryKey,
	weeklyAvailabilityFixture(WEEKDAY_MORNINGS, { membershipId: "m-aisha" })
);

const [aisha, cheryl] = MEMBER_WEEK_FIXTURES;

const meta = {
	title: "Features/Availability/MemberAvailabilityDialog",
	component: MemberAvailabilityDialog,
	parameters: { layout: "fullscreen" },
	args: {
		companyId: COMPANY,
		member: aisha ?? MEMBER_WEEK_FIXTURES[0],
		scope: { kind: "week", weekStartMonday: FIXTURE_WEEK },
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof MemberAvailabilityDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThisWeek: Story = {};

export const CustomWeek: Story = { args: { member: cheryl } };

export const DefaultPattern: Story = { args: { scope: { kind: "pattern" } } };
