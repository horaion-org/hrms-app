import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { memberPreferenceWeekQuery } from "@/features/shiftPreferences/api";
import {
	FIXTURE_WEEK,
	fixtureWeek,
} from "@/features/shiftPreferences/fixtures";
import { MemberShiftPreferencesDialog } from "@/features/shiftPreferences/MemberShiftPreferencesDialog";

const COMPANY = "story-company";
/** A member whose Monday and Tuesday are already behind them. */
const STARTED_WEEK_MEMBER = "m-started-week";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	memberPreferenceWeekQuery(COMPANY, "m-1", FIXTURE_WEEK).queryKey,
	fixtureWeek()
);
client.setQueryData(
	memberPreferenceWeekQuery(COMPANY, STARTED_WEEK_MEMBER, FIXTURE_WEEK)
		.queryKey,
	{
		...fixtureWeek(),
		days: fixtureWeek().days.map((day, index) => ({
			...day,
			editable: index > 1,
		})),
	}
);

const meta = {
	title: "Features/ShiftPreferences/MemberShiftPreferencesDialog",
	component: MemberShiftPreferencesDialog,
	parameters: { layout: "fullscreen" },
	args: {
		companyId: COMPANY,
		membershipId: "m-1",
		name: "Alex Example",
		weekStartMonday: FIXTURE_WEEK,
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof MemberShiftPreferencesDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every day open: each one a button to its editor. */
export const OpenWeek: Story = {};

/** A week already under way: its past days are shown, never opened, and why. */
export const StartedWeek: Story = {
	args: { membershipId: STARTED_WEEK_MEMBER },
};
