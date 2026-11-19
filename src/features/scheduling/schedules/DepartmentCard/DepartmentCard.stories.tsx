import type { Meta, StoryObj } from "@storybook/react-vite";
import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import {
	DAY_STRIP_LENGTH,
	type DayMark,
	type DepartmentCardEntry,
} from "@/features/scheduling/schedules/departmentCards";
import { DepartmentCard } from "@/features/scheduling/schedules/DepartmentCard";
import "@/common/i18n";

const TODAY = "2026-11-18";

/** A day's mark: the first `published` days, then `toReview` days, then none. */
const markOf = (
	index: number,
	published: number,
	toReview: number
): DayMark => {
	if (index < published) return "published";
	return index < published + toReview ? "toReview" : "none";
};

/** The strip from today with `published` days, then `toReview` days, then none. */
const strip = (
	published: number,
	toReview: number
): DepartmentCardEntry["dayStrip"] =>
	Array.from({ length: DAY_STRIP_LENGTH }, (_, index) => ({
		day: dayjs(TODAY).add(index, "day").format(ISO_DATE_FORMAT),
		mark: markOf(index, published, toReview),
	}));

/** Front Desk published two weeks ahead, nothing to review. */
const publishedAhead: DepartmentCardEntry = {
	departmentId: "d-1",
	departmentName: "Front Desk",
	publishedUpTo: "2026-12-06",
	publishedStanding: "upTo",
	toReviewDays: 0,
	waitingDays: undefined,
	scheduledUpTo: "2026-12-06",
	firstToReviewDay: undefined,
	dayStrip: strip(19, 0),
};

const meta = {
	title: "Features/Scheduling/Timeline/DepartmentCard",
	component: DepartmentCard,
	decorators: [withMemoryRouter],
	args: { card: publishedAhead, today: TODAY, className: "w-96" },
} satisfies Meta<typeof DepartmentCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Published up to Sunday 6 December, nothing waiting. */
export const PublishedAhead: Story = {};
/** Published this week, the two weeks after it to review. */
export const DaysToReview: Story = {
	args: {
		card: {
			...publishedAhead,
			publishedUpTo: "2026-11-22",
			toReviewDays: 14,
			waitingDays: { from: "2026-11-23", to: "2026-12-06" },
			firstToReviewDay: "2026-11-23",
			dayStrip: strip(5, 14),
		},
	},
};
/** A Department with no roster at all. */
export const NoRosterYet: Story = {
	args: {
		card: {
			...publishedAhead,
			departmentId: "d-2",
			departmentName: "Security",
			publishedUpTo: undefined,
			publishedStanding: "nothing",
			scheduledUpTo: undefined,
			dayStrip: strip(0, 0),
		},
	},
};
