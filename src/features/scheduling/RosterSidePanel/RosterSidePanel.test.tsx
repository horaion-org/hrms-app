import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterSidePanel } from "@/features/scheduling/RosterSidePanel";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("RosterSidePanel", () => {
	it("given_aPanel_when_opened_then_focusesItsHeadingAndClosesOnEscapeOrTheButton", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<RosterSidePanel
				sections={[{ key: "body", content: <p>Body</p> }]}
				title="Issues"
				onClose={onClose}
			/>
		);

		expect(
			screen.getByRole("complementary", { name: "Issues" })
		).toHaveTextContent("Body");
		expect(screen.getByRole("heading", { name: "Issues" })).toHaveFocus();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Close Issues" }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it("given_sections_when_rendered_then_listsTheirItemsAndLeavesEmptyOnesOut", () => {
		render(
			<RosterSidePanel
				title="Changed"
				sections={[
					{ key: "empty", title: "Never shown", items: [] },
					{
						key: "days",
						title: "Days",
						items: [{ key: "a", title: "Aisha · Mon", lines: ["Off → AM"] }],
					},
				]}
				onClose={vi.fn()}
			/>
		);

		expect(screen.queryByRole("heading", { name: "Never shown" })).toBeNull();
		expect(screen.getByRole("listitem")).toHaveTextContent(
			"Aisha · MonOff → AM"
		);
	});
});
