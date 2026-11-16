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
	it("lists who has not answered on one line, its action opening the roster", async () => {
		render(
			<MemoryRouterHarness>
				<OpenCoverOffersCard
					myOffers={{ status: "ready", data: [] }}
					teamOffers={{ status: "ready", data: [teamCoverOfferFixture()] }}
				/>
			</MemoryRouterHarness>
		);

		const link = await screen.findByRole("link", {
			name: /^Open roster: Kent Chua, Morning, /,
		});
		expect(link).toHaveAttribute("href", "/scheduling/s-1");
		expect(screen.getByRole("listitem")).toHaveTextContent(
			/^Kent Chua · Morning · .+ · by .+Open roster$/
		);
	});

	it("puts the person's own offers to answer first, in the same list", async () => {
		render(
			<MemoryRouterHarness>
				<OpenCoverOffersCard
					teamOffers={{ status: "ready", data: [teamCoverOfferFixture()] }}
					myOffers={{
						status: "ready",
						data: [coverOfferFixture({ status: "OPEN" })],
					}}
				/>
			</MemoryRouterHarness>
		);

		const rows = await screen.findAllByRole("listitem");
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent(/^You · .+Answer$/);
		expect(screen.getByRole("link", { name: /^Answer: / })).toBeInTheDocument();
	});

	it("shows the person's own offers where the team's are out of reach", async () => {
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

		expect(await screen.findAllByRole("listitem")).toHaveLength(1);
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
