import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { teamCoverOfferFixture } from "@/features/dashboard/fixtures";
import { OpenCoverOffersCard } from "@/features/dashboard/OpenCoverOffersCard";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/OpenCoverOffersCard",
	component: OpenCoverOffersCard,
	decorators: [withMemoryRouter],
	args: {
		className: "max-w-md",
		teamOffers: { status: "ready", data: [teamCoverOfferFixture()] },
		myOffers: { status: "ready", data: [] },
	},
} satisfies Meta<typeof OpenCoverOffersCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithTheirOwnOffer: Story = {
	args: {
		myOffers: {
			status: "ready",
			data: [coverOfferFixture({ status: "OPEN" })],
		},
	},
};
export const Failed: Story = { args: { teamOffers: { status: "error" } } };
