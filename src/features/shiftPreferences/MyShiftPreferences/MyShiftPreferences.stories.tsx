import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { storyProviders } from "@/features/organisation/storyApi";
import { myPreferenceWeekQuery } from "@/features/shiftPreferences/api";
import {
	FIXTURE_WEEK,
	fixtureWeek,
} from "@/features/shiftPreferences/fixtures";
import { MyShiftPreferences } from "@/features/shiftPreferences/MyShiftPreferences";

const COMPANY = "story-company";
/** A company where every day of the week is closed to change. */
const CLOSED_WEEK_COMPANY = "story-company-closed-week";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	myPreferenceWeekQuery(COMPANY, FIXTURE_WEEK).queryKey,
	fixtureWeek()
);
client.setQueryData(
	myPreferenceWeekQuery(CLOSED_WEEK_COMPANY, FIXTURE_WEEK).queryKey,
	{
		...fixtureWeek(),
		days: fixtureWeek().days.map((day) => ({ ...day, editable: false })),
	}
);

const meta = {
	title: "Features/ShiftPreferences/MyShiftPreferences",
	component: MyShiftPreferences,
	parameters: { layout: "padded" },
	args: { companyId: COMPANY, weekStartMonday: FIXTURE_WEEK },
	decorators: [storyProviders(client)],
} satisfies Meta<typeof MyShiftPreferences>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Each open day is one button that opens its dialog. */
export const OpenWeek: Story = {};

/** A week no day of which can be changed: read-only chips. */
export const ClosedWeek: Story = { args: { companyId: CLOSED_WEEK_COMPANY } };
