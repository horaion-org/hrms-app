import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CoverOfferActions } from "@/features/scheduling/coverOffers/CoverOfferActions";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import "@/common/i18n";

const ben = {
	...coverOfferFixture().member!,
	membershipId: "m-2",
	displayName: "Ben Ong",
};

const meta = {
	title: "Features/Scheduling/CoverOffers/CoverOfferActions",
	component: CoverOfferActions,
	parameters: { layout: "padded" },
	args: {
		name: "Aisha Rahman",
		timeZone: "Asia/Singapore",
		ready: true,
		onSend: fn(),
		onRecord: fn(),
		now: (): Date => BEFORE_DEADLINE,
	},
	// As wide as the roster's side panel.
	decorators: [
		(Story): React.ReactElement => (
			<div className="w-full rounded-lg border border-neutral-400 p-4 lg:w-96">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof CoverOfferActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In place of Apply on a published roster: They agreed, or Send offer. */
export const Footer: Story = {};

/** Another offer is out for the same shift: the first yes wins. */
export const Racing: Story = {
	args: { rivals: [coverOfferFixture({ offerId: "o-2", member: ben })] },
};

/** Three offers are out: no more are sent. */
export const GroupFull: Story = {
	args: {
		rivals: ["o-2", "o-3", "o-4"].map((offerId) =>
			coverOfferFixture({ offerId, member: ben })
		),
	},
};

export const Refused: Story = { args: { refusal: "alreadyOpen" } };
