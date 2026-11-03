import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AvailabilityDialog } from "@/features/availability/AvailabilityDialog";

const PATTERN = [
	{ day: "MON", startTime: "09:00", endTime: "13:00" },
	{ day: "WED", startTime: "09:00", endTime: "13:00" },
	{ day: "FRI", startTime: "22:00", endTime: "06:00" },
] as const;

const meta = {
	title: "Features/Availability/AvailabilityDialog",
	component: AvailabilityDialog,
	args: {
		name: "Kent Chua",
		weekStartMonday: "2026-11-09",
		weekWindows: PATTERN,
		patternWindows: PATTERN,
		overridden: false,
		onSubmit: fn(() => Promise.resolve()),
		onReset: fn(() => Promise.resolve()),
		onClose: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AvailabilityDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A week on the pattern: opens on this week only. */
export const ThisWeek: Story = {};

/** A week with hours of its own: it can be reset to the pattern or marked not available. */
export const CustomWeek: Story = {
	args: {
		overridden: true,
		weekWindows: [{ day: "SAT", startTime: "10:00", endTime: "14:00" }],
	},
};

/** Nothing set at all: opens on every week, so the first hours become the pattern. */
export const NothingSet: Story = {
	args: { weekWindows: [], patternWindows: [] },
};

/** A colleague's custom week whose pattern is still loading: only the week can be changed. */
export const PatternLoading: Story = {
	args: {
		overridden: true,
		patternWindows: undefined,
		patternNote: "Loading the default pattern…",
	},
};
