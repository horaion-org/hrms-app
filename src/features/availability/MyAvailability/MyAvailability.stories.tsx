import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	MY_AVAILABILITY,
	myAvailabilityQuery,
	weekAvailabilityQuery,
} from "@/features/availability/api";
import { byDay } from "@/features/availability/availabilityModel";
import {
	FIXTURE_WEEK,
	WEEKDAY_MORNINGS,
	weeklyAvailabilityFixture,
} from "@/features/availability/fixtures";
import { MyAvailability } from "@/features/availability/MyAvailability";
import { storyProviders } from "@/features/organisation/storyApi";

const COMPANY = "story-company";
/** A company where the caller has set nothing at all. */
const NOTHING_SET_COMPANY = "story-company-nothing-set";
const CUSTOM_WEEK = "2026-11-16";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	myAvailabilityQuery(COMPANY).queryKey,
	weeklyAvailabilityFixture(WEEKDAY_MORNINGS, { overrideWeeks: [CUSTOM_WEEK] })
);
client.setQueryData(
	myAvailabilityQuery(NOTHING_SET_COMPANY).queryKey,
	weeklyAvailabilityFixture([])
);
client.setQueryData(
	weekAvailabilityQuery(COMPANY, MY_AVAILABILITY, CUSTOM_WEEK).queryKey,
	{
		membershipId: "m-me",
		weekStartMonday: CUSTOM_WEEK,
		days: byDay([{ day: "SAT", startTime: "10:00", endTime: "14:00" }]),
	}
);

const meta = {
	title: "Features/Availability/MyAvailability",
	component: MyAvailability,
	parameters: { layout: "padded" },
	args: {
		companyId: COMPANY,
		name: "Aisha Rahman",
		weekStartMonday: FIXTURE_WEEK,
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof MyAvailability>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FollowingThePattern: Story = {};

export const CustomWeek: Story = { args: { weekStartMonday: CUSTOM_WEEK } };

export const NothingSet: Story = { args: { companyId: NOTHING_SET_COMPANY } };

export const WeekThatHasEnded: Story = { args: { editable: false } };
