import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import {
	generatedScheduleFixture,
	SCHEDULING_BRANCHES,
} from "@/features/scheduling/schedules/fixtures";
import { PublishDaysDialog } from "@/features/scheduling/timeline/PublishDaysDialog";
import { timelinePiecesOf } from "@/features/scheduling/timeline/timelineRows";

const COMPANY = "c-1";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

/** Monday to Wednesday and Friday to Sunday of one week, both to review. */
const pieces = Object.values(
	timelinePiecesOf(
		[
			generatedScheduleFixture({
				status: "GENERATED",
				coveredFrom: "2026-10-12",
				coveredTo: "2026-10-14",
			}),
			generatedScheduleFixture({
				scheduleId: "s-2",
				status: "GENERATED",
				coveredFrom: "2026-10-16",
				coveredTo: "2026-10-18",
			}),
		],
		[]
	)
);

const meta = {
	title: "Features/Scheduling/PublishDaysDialog",
	component: PublishDaysDialog,
	parameters: { permissions: ["schedule:read", "schedule:publish"] },
	args: { companyId: COMPANY, pieces, onClose: fn() },
	decorators: [
		storyCompany(client, COMPANY, SCHEDULING_BRANCHES),
		storyProviders(client),
	],
} satisfies Meta<typeof PublishDaysDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Several pieces to review: each is listed by its days with its own Publish. */
export const SeveralPieces: Story = {};

/** One piece to review opens its publish dialog at once. */
export const OnePiece: Story = { args: { pieces: pieces.slice(0, 1) } };

/** Nothing to review in the days shown. */
export const NothingToReview: Story = { args: { pieces: [] } };

/** Without `schedule:publish` no piece can be put forward. */
export const MayNotPublish: Story = {
	parameters: { permissions: ["schedule:read"] },
};
