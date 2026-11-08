import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/CoverOffers/CoverOfferSent",
	component: CoverOfferSent,
	parameters: { layout: "padded" },
	args: {
		name: "Aisha Rahman",
		offer: coverOfferFixture(),
		timeZone: "Asia/Singapore",
		onWithdraw: fn(),
		now: (): Date => BEFORE_DEADLINE,
	},
} satisfies Meta<typeof CoverOfferSent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Who, by when, the remark, and Withdraw. */
export const Sent: Story = {};

export const WithdrawRefused: Story = { args: { refusal: "notOpen" } };
