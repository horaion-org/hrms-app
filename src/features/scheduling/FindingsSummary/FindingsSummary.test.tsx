import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { FindingsSummary } from "@/features/scheduling/FindingsSummary";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("FindingsSummary", () => {
	it.each([
		[
			{ roster: 3, setup: 2 },
			"The scheduling engine left 3 roster notes and 2 setup issues.",
		],
		[{ roster: 1, setup: 0 }, "The scheduling engine left 1 roster note."],
		[{ roster: 0, setup: 1 }, "The scheduling engine left 1 setup issue."],
	])("given_counts_%o_when_rendered_then_reads_%s", (counts, summary) => {
		render(
			<FindingsSummary
				counts={counts}
				expanded={false}
				panelId="findings"
				onToggle={vi.fn()}
			/>
		);

		expect(screen.getByRole("note")).toHaveTextContent(summary);
	});

	it("given_aClosedPanel_when_toggled_then_asksToOpenTheControlledPanel", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		render(
			<FindingsSummary
				counts={{ roster: 1, setup: 1 }}
				expanded={false}
				panelId="findings"
				onToggle={onToggle}
			/>
		);

		const toggle = screen.getByRole("button", { name: "Show details" });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(toggle).toHaveAttribute("aria-controls", "findings");
		await user.click(toggle);
		expect(onToggle).toHaveBeenCalledOnce();
	});

	it("given_anOpenPanel_when_rendered_then_offersToHideIt", () => {
		render(
			<FindingsSummary
				expanded
				counts={{ roster: 1, setup: 1 }}
				panelId="findings"
				onToggle={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Hide details" })
		).toHaveAttribute("aria-expanded", "true");
	});

	it("given_nothingFound_when_rendered_then_showsNothing", () => {
		const { container } = render(
			<FindingsSummary
				counts={{ roster: 0, setup: 0 }}
				expanded={false}
				panelId="findings"
				onToggle={vi.fn()}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
