import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { teamCoverOfferFixture } from "@/features/dashboard/fixtures";
import { OpenCoverOffersCard } from "@/features/dashboard/OpenCoverOffersCard";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("OpenCoverOffersCard", () => {
	it("lists who has not answered, each opening its roster", async () => {
		render(
			<MemoryRouterHarness>
				<OpenCoverOffersCard
					myOffers={{ status: "ready", data: [] }}
					teamOffers={{ status: "ready", data: [teamCoverOfferFixture()] }}
				/>
			</MemoryRouterHarness>
		);

		const link = await screen.findByRole("link", {
			name: /Kent Chua has not answered: Morning/,
		});
		expect(link).toHaveAttribute("href", "/scheduling/s-1");
		expect(screen.queryByText("Your offers to answer")).toBeNull();
	});

	it("shows the person's own offers only when they have some", async () => {
		render(
			<MemoryRouterHarness>
				<OpenCoverOffersCard
					teamOffers={{ status: "hidden" }}
					myOffers={{
						status: "ready",
						data: [coverOfferFixture({ status: "OPEN" })],
					}}
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByText("Your offers to answer")
		).toBeInTheDocument();
	});

	it("is left out when neither applies", () => {
		const { container } = render(
			<MemoryRouterHarness>
				<OpenCoverOffersCard
					myOffers={{ status: "ready", data: [] }}
					teamOffers={{ status: "hidden" }}
				/>
			</MemoryRouterHarness>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
