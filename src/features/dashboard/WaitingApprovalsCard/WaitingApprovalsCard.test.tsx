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
	it("names what waits, whose it is, its step and since when, and marks a stalled step", () => {
		render(
			<WaitingApprovalsCard
				approvals={{
					status: "ready",
					data: [waitingApprovalFixture({ stalled: true })],
				}}
			/>
		);

		expect(screen.getByText("Leave request from Kent Tan")).toBeInTheDocument();
		expect(screen.getByText("Stalled")).toBeInTheDocument();
		expect(
			screen.getByText(/^Sales · step 1 of 2 · waiting since /)
		).toBeInTheDocument();
	});

	it("says so calmly when nothing waits", () => {
		render(<WaitingApprovalsCard approvals={{ status: "ready", data: [] }} />);

		expect(
			screen.getByText("No approval waits in your units.")
		).toBeInTheDocument();
	});

	it("is left out where approvals may not be read", () => {
		const { container } = render(
			<WaitingApprovalsCard approvals={{ status: "hidden" }} />
		);

		expect(container).toBeEmptyDOMElement();
	});
});
