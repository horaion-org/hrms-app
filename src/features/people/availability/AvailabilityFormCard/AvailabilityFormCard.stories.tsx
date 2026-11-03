import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { WEEKDAYS } from "@/common/weekdays";
import { storyProviders } from "@/features/organisation/storyApi";
import type { MemberProfileDetail } from "@/features/people/api";
import { AvailabilityFormCard } from "@/features/people/availability/AvailabilityFormCard";
import { memberAvailabilityQuery } from "@/features/people/availability/api";
import { storyCompany } from "@/features/people/storyCompany";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(memberAvailabilityQuery(COMPANY, "m-1").queryKey, {
	membershipId: "m-1",
	days: WEEKDAYS.map((day) => ({ day, windows: [] })),
});

const meta = {
	title: "Features/People/AvailabilityFormCard",
	component: AvailabilityFormCard,
	parameters: {
		layout: "padded",
		permissions: ["work_availability:read", "member_profile:update"],
	},
	args: {
		companyId: COMPANY,
		employmentType: "PART_TIME",
		draft: undefined,
		onDraftChange: fn(),
		profile: {
			membershipId: "m-1",
			displayName: "Kent Chua",
			branchId: "b-1",
			departmentId: "d-1",
			employmentType: "FULL_TIME",
		} as MemberProfileDetail,
	},
	decorators: [storyCompany(client, COMPANY), storyProviders(client)],
} satisfies Meta<typeof AvailabilityFormCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Part-time was just chosen for someone without any windows. */
export const JustMadePartTime: Story = {};

export const WithDraft: Story = {
	args: {
		draft: [
			{ day: "MON", startTime: "09:00", endTime: "13:00" },
			{ day: "SAT", startTime: "22:00", endTime: "06:00" },
		],
	},
};
