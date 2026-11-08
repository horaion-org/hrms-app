import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { myCoverOffersKey } from "@/features/scheduling/coverOffers/api";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import { MyCoverOffers } from "@/features/scheduling/coverOffers/MyCoverOffers";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

/** The member's offers, as `GET /me/cover-offers` would answer them, already read. */
const client = new QueryClient({
	defaultOptions: { queries: { staleTime: Infinity, retry: false } },
});
client.setQueryData(myCoverOffersKey("c-1"), [coverOfferFixture()]);

const meta = {
	title: "Features/Scheduling/CoverOffers/MyCoverOffers",
	component: MyCoverOffers,
	parameters: { layout: "padded" },
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={client}>
				<div className="max-w-xl">
					<Story />
				</div>
			</QueryClientProvider>
		),
	],
	args: {
		companyId: "c-1",
		scheduleId: "s-1",
		timeZone: "Asia/Singapore",
		assignments: scheduleAssignmentsFixture(),
		viewerMembershipId: "m-1",
		now: BEFORE_DEADLINE,
	},
} satisfies Meta<typeof MyCoverOffers>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One open offer at the top of the member's roster. */
export const OneOpenOffer: Story = {};
