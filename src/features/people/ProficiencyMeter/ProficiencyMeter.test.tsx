import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ProficiencyMeter } from "@/features/people/ProficiencyMeter";

describe("ProficiencyMeter", () => {
	it("fills as many of its ten segments as the proficiency and reads it out", () => {
		render(
			<I18nextProvider i18n={authTestI18n}>
				<ProficiencyMeter name="Baking" value={8} />
			</I18nextProvider>
		);

		const meter = screen.getByRole("img", { name: "Baking: 8 out of 10" });
		const segments = meter.firstElementChild?.children ?? [];
		expect(segments).toHaveLength(10);
		expect(
			[...segments].filter((segment) => segment.hasAttribute("data-filled"))
		).toHaveLength(8);
		expect(screen.getByText("8/10")).toHaveAttribute("aria-hidden", "true");
	});
});
