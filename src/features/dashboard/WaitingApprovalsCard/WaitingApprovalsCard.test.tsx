import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { waitingApprovalFixture } from "@/features/dashboard/fixtures";
import { WaitingApprovalsCard } from "@/features/dashboard/WaitingApprovalsCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("WaitingApprovalsCard", () => {
	it("names on one line whose it is, what waits and its step, with since when on the right", () => {
		render(
			<WaitingApprovalsCard
				approvals={{ status: "ready", data: [waitingApprovalFixture()] }}
			/>
		);

		expect(screen.getByRole("listitem")).toHaveTextContent(
			/^Kent Tan · Leave · step 1 of 2since .+$/
		);
	});

	it("marks a stalled step in the day's place", () => {
		render(
			<WaitingApprovalsCard
				approvals={{
					status: "ready",
					data: [waitingApprovalFixture({ stalled: true })],
				}}
			/>
		);

		expect(screen.getByRole("listitem")).toHaveTextContent(
			/^Kent Tan · Leave · step 1 of 2Stalled$/
		);
	});

	it("says when the read failed", () => {
		render(<WaitingApprovalsCard approvals={{ status: "error" }} />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t load the approvals waiting."
		);
	});

	it("is left out where approvals may not be read", () => {
		const { container } = render(
			<WaitingApprovalsCard approvals={{ status: "hidden" }} />
		);

		expect(container).toBeEmptyDOMElement();
	});
});
