import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { WEEKDAYS } from "@/common/weekdays";
import { storyProviders } from "@/features/organisation/storyApi";
import { myAvailabilityQuery } from "@/features/people/availability/api";
import { MyAvailabilityCard } from "@/features/people/availability/MyAvailabilityCard";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(myAvailabilityQuery(COMPANY).queryKey, {
	membershipId: "m-1",
	overrideWeeks: [],
	days: WEEKDAYS.map((day) => ({
		day,
		windows:
			day === "SAT" || day === "SUN"
				? [{ startTime: "08:00", endTime: "14:00" }]
				: [],
	})),
});

const meta = {
	title: "Features/People/MyAvailabilityCard",
	component: MyAvailabilityCard,
	parameters: { layout: "padded" },
	args: { companyId: COMPANY, profile: { employmentType: "PART_TIME" } },
	decorators: [storyProviders(client)],
} satisfies Meta<typeof MyAvailabilityCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PartTimer: Story = {};
