import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import { OffersOutSection } from "@/features/scheduling/coverOffers/OffersOutSection";
import "@/common/i18n";

const client = new QueryClient();
const open = coverOfferFixture();

const meta = {
	title: "Features/Scheduling/CoverOffers/OffersOutSection",
	component: OffersOutSection,
	parameters: { layout: "padded" },
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={client}>
				<section className="w-full text-sm lg:w-96">
					<Story />
				</section>
			</QueryClientProvider>
		),
	],
	args: {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
		},
		assignments: [{ day: "2026-10-17", uncoveredShift: open.shift }],
		timeZone: "Asia/Singapore",
		now: BEFORE_DEADLINE,
		offers: [
			open,
			coverOfferFixture({
				offerId: "o-2",
				member: {
					...open.member!,
					membershipId: "m-2",
					displayName: "Ben Ong",
				},
				optionKind: "MOVE",
				status: "DECLINED",
				answeredAt: "2026-10-16T04:12:00Z",
				answerReason: "Exam tomorrow",
			}),
		],
	},
} satisfies Meta<typeof OffersOutSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A waiting offer and a decline under the short shift. */
export const WaitingAndDeclined: Story = {};

export const Failed: Story = { args: { failed: true, onRetry: () => {} } };
