import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "@/components/ui/ProgressBar";

describe("ProgressBar", () => {
	it("given_aValue_when_rendered_then_reportsItAsANamedProgressbar", () => {
		render(<ProgressBar label="Coverage" tone="success" value={98.2} />);

		const bar = screen.getByRole("progressbar", { name: "Coverage" });
		expect(bar).toHaveAttribute("aria-valuenow", "98.2");
		expect(bar.firstElementChild).toHaveStyle({ width: "98.2%" });
		expect(bar.firstElementChild).toHaveClass("bg-success-600");
	});

	it("given_aValueOutOfRange_when_rendered_then_clampsIt", () => {
		render(<ProgressBar label="Coverage" value={140} />);

		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"100"
		);
	});

	it("given_aWhiteTrack_when_rendered_then_sitsOnATintedSurface", () => {
		render(
			<ProgressBar label="Resolved" tone="accent" track="white" value={64} />
		);

		const bar = screen.getByRole("progressbar", { name: "Resolved" });
		expect(bar).toHaveClass("bg-white");
		expect(bar.firstElementChild).toHaveClass("bg-ink-blue-300");
	});
});
