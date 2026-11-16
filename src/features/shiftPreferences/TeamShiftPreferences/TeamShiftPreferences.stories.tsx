import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { teamPreferencesQuery } from "@/features/shiftPreferences/api";
import {
	FIXTURE_WEEK,
	fixtureTeamPage,
} from "@/features/shiftPreferences/fixtures";
import { TeamShiftPreferences } from "@/features/shiftPreferences/TeamShiftPreferences";

const COMPANY = "story-company";
const DEPARTMENT = "d-1";
/** A Department none of whose members are in the person's reach. */
const EMPTY_DEPARTMENT = "d-empty";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
const firstPageOf = (
	departmentId: string
): ReturnType<typeof teamPreferencesQuery>["queryKey"] =>
	teamPreferencesQuery(COMPANY, {
		weekStartMonday: FIXTURE_WEEK,
		departmentId,
		page: 0,
	}).queryKey;
client.setQueryData(firstPageOf(DEPARTMENT), fixtureTeamPage());
client.setQueryData(firstPageOf(EMPTY_DEPARTMENT), {
	content: [],
	page: { totalElements: 0 },
});

const meta = {
	title: "Features/ShiftPreferences/TeamShiftPreferences",
	component: TeamShiftPreferences,
	parameters: { layout: "padded", permissions: ["shift_preference:read"] },
	args: {
		companyId: COMPANY,
		departmentId: DEPARTMENT,
		weekStartMonday: FIXTURE_WEEK,
	},
	decorators: [storyCompany(client, COMPANY), storyProviders(client)],
} satisfies Meta<typeof TeamShiftPreferences>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OneMember: Story = {};

export const NoMembers: Story = { args: { departmentId: EMPTY_DEPARTMENT } };

/** Without `shift_preference:read` anywhere, the list says so and asks for nothing. */
export const NoAccess: Story = { parameters: { permissions: [] } };
