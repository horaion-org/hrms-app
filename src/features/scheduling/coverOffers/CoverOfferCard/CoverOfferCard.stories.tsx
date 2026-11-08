import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CoverOfferCard } from "@/features/scheduling/coverOffers/CoverOfferCard";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/CoverOffers/CoverOfferCard",
	component: CoverOfferCard,
	parameters: { layout: "padded" },
	args: {
		offer: coverOfferFixture(),
		timeZone: "Asia/Singapore",
		now: BEFORE_DEADLINE,
		was: "Day off",
		onAccept: fn(),
		onDecline: fn(),
	},
	decorators: [
		(Story): React.ReactElement => (
			<div className="max-w-xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof CoverOfferCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open: Accept in one tap, or Decline with an optional reason. */
export const Open: Story = {};

/** Accepting: the button waits for the API. */
export const Accepting: Story = { args: { pending: "accept" } };

/** The roster changed since the offer was made: it stays open. */
export const Stale: Story = { args: { refusal: "stale" } };

export const Accepted: Story = {
	args: {
		offer: coverOfferFixture({
			status: "APPLIED",
			answeredAt: "2026-10-16T05:12:00Z",
		}),
	},
};

export const Declined: Story = {
	args: {
		offer: coverOfferFixture({
			status: "DECLINED",
			answeredAt: "2026-10-16T05:12:00Z",
		}),
	},
};

export const Expired: Story = {
	args: { offer: coverOfferFixture({ status: "EXPIRED" }) },
};

/** Someone else took the shift, or the manager withdrew the offer. */
export const Withdrawn: Story = {
	args: { offer: coverOfferFixture({ status: "WITHDRAWN" }) },
};
