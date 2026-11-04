import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { GenerationFailurePanel } from "@/features/scheduling/GenerationFailurePanel";
import {
	generationFindingsFixture,
	generationFixture,
} from "@/features/scheduling/schedules/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("GenerationFailurePanel", () => {
	it("given_aFailedRun_when_rendered_then_explainsItsCode", () => {
		render(
			<GenerationFailurePanel
				generation={generationFixture({
					status: "FAILED",
					errorCode: "snapshot_invalid",
					findings: null,
				})}
			/>
		);

		const panel = screen.getByRole("region", {
			name: "Why it wasn’t generated",
		});
		expect(panel).toHaveTextContent(
			"The engine couldn’t use this schedule’s shifts and constraints."
		);
		expect(panel).toHaveTextContent("Error code: snapshot_invalid");
	});

	it("given_anInfeasibleRun_when_rendered_then_quotesTheEnginesReasonAndErrors", () => {
		render(
			<GenerationFailurePanel
				generation={generationFixture({
					engineOutcome: "INFEASIBLE",
					findings: generationFindingsFixture({
						scheduleStatus: "INFEASIBLE",
						failureReason: "No roster satisfies the staffing rules",
					}),
				})}
			/>
		);

		const panel = screen.getByRole("region", {
			name: "Why it wasn’t generated",
		});
		expect(panel).not.toHaveTextContent("Error code");
		expect(
			within(panel).getByText("No roster satisfies the staffing rules").tagName
		).toBe("BLOCKQUOTE");
		expect(
			within(panel).getByRole("region", { name: "Notes by member" })
		).toHaveTextContent("Ben Ong");
	});

	it("given_aWayToRegenerate_when_rendered_then_offersToGenerateAgainAsTheNextStep", async () => {
		const onRegenerate = vi.fn();
		const failed = generationFixture({ status: "FAILED", findings: null });
		const { rerender } = render(<GenerationFailurePanel generation={failed} />);
		expect(screen.queryByRole("button", { name: "Generate again" })).toBeNull();

		rerender(
			<GenerationFailurePanel generation={failed} onRegenerate={onRegenerate} />
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Generate again" })
		);

		expect(onRegenerate).toHaveBeenCalledOnce();
	});
});
