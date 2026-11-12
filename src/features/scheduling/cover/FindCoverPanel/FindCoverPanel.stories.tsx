import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { fn } from "storybook/test";
import {
	coverOptionsQuery,
	type CoverOptions,
} from "@/features/scheduling/cover/api";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import { rosterChangePreviewQuery } from "@/features/scheduling/rosterChanges/api";
import { rosterChangePreviewFixture } from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import { FindCoverPanel } from "./FindCoverPanel";
import "@/common/i18n";

const TARGET = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "r-1",
};
const GAP = {
	shiftId: coverOptionsFixture().gap.shiftId,
	day: coverOptionsFixture().gap.day,
};
const roster = scheduleAssignmentsFixture();

/** A client holding the list (and the first option's preview), never asking the API again. */
const seeded = (options: CoverOptions): QueryClient => {
	const client = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				refetchOnMount: false,
				refetchOnWindowFocus: false,
			},
		},
	});
	client.setQueryData(coverOptionsQuery(TARGET, GAP, 1).queryKey, options);
	const [first] = options.options;
	if (first)
		client.setQueryData(
			rosterChangePreviewQuery(
				TARGET.companyId,
				TARGET.unit,
				TARGET.scheduleId,
				{
					expectedRevision: 1,
					cells: first.cells,
				}
			).queryKey,
			rosterChangePreviewFixture({ cells: [] })
		);
	return client;
};

const withList =
	(options: CoverOptions) =>
	(Story: () => ReactElement): ReactElement => (
		<QueryClientProvider client={seeded(options)}>
			<div className="max-w-96">
				<Story />
			</div>
		</QueryClientProvider>
	);

const meta = {
	title: "Features/Scheduling/Cover/FindCoverPanel",
	component: FindCoverPanel,
	args: {
		target: TARGET,
		revision: 1,
		gap: GAP,
		assignments: roster,
		dayRow: roster.find((row) => row.day === GAP.day)!,
		shifts: frozenShiftsFixture(),
		onPreviewDays: fn(),
		onApplied: fn(),
		onCoverRecorded: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof FindCoverPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A draft: the suggested option chosen and previewed, with Apply. */
export const Draft: Story = { decorators: [withList(coverOptionsFixture())] };

/** A published roster: Send offer and They agreed in place of Apply. */
export const Published: Story = {
	decorators: [withList(coverOptionsFixture())],
	args: { coverOffers: { offers: [], timeZone: "Asia/Singapore" } },
};

/** An offer already out to the suggested person: who, by when, and Withdraw. */
export const OfferOut: Story = {
	decorators: [withList(coverOptionsFixture())],
	args: {
		coverOffers: {
			offers: [coverOfferFixture({ rosterDate: GAP.day })],
			timeZone: "Asia/Singapore",
		},
	},
};

/** Nobody can cover: the sentence, and Can't help open with every reason. */
export const NobodyCanCover: Story = {
	decorators: [withList(coverOptionsFixture({ options: [] }))],
};

/** The shift was covered elsewhere since: say so, with Close. */
export const CoveredNow: Story = {
	decorators: [
		withList(
			coverOptionsFixture({
				gap: {
					...coverOptionsFixture().gap,
					shortBy: 0,
					shortSinceGeneration: 0,
				},
				options: [],
				unavailable: [],
			})
		),
	],
};

/** A draft on a phone: the cards and buttons at full width. */
export const DraftOnAPhone: Story = {
	decorators: [withList(coverOptionsFixture())],
	parameters: { viewport: { defaultViewport: "mobile1" } },
};
