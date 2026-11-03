import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { WEEKDAYS } from "@/common/weekdays";
import { storyProviders } from "@/features/organisation/storyApi";
import type { MemberProfileDetail } from "@/features/people/api";
import { memberAvailabilityQuery } from "@/features/people/availability/api";
import { MemberAvailabilityCard } from "@/features/people/availability/MemberAvailabilityCard";
import { storyCompany } from "@/features/people/storyCompany";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(memberAvailabilityQuery(COMPANY, "m-1").queryKey, {
	membershipId: "m-1",
	days: WEEKDAYS.map((day) => ({
		day,
		windows:
			day === "MON" || day === "WED"
				? [
						{ startTime: "09:00", endTime: "13:00" },
						{ startTime: "17:00", endTime: "21:00" },
					]
				: day === "FRI"
					? [{ startTime: "22:00", endTime: "06:00" }]
					: [],
	})),
});

const meta = {
	title: "Features/People/MemberAvailabilityCard",
	component: MemberAvailabilityCard,
	parameters: {
		layout: "padded",
		permissions: ["work_availability:read", "member_profile:update"],
	},
	args: {
		companyId: COMPANY,
		changeable: true,
		profile: {
			membershipId: "m-1",
			displayName: "Kent Chua",
			branchId: "b-1",
			departmentId: "d-1",
			employmentType: "PART_TIME",
		} as MemberProfileDetail,
	},
	decorators: [storyCompany(client, COMPANY), storyProviders(client)],
} satisfies Meta<typeof MemberAvailabilityCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Changeable: Story = {};

export const ReadOnly: Story = { args: { changeable: false } };
