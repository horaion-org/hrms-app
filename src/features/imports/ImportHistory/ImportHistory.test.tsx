import { composeStories } from "@storybook/react-vite";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import * as stories from "./ImportHistory.stories";

const { Default } = composeStories(stories);

it("given_importsOfBothKinds_when_shown_then_listsEachAndOpensTheChosenOne", async () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<Default headingLevel={2} />
		</I18nextProvider>
	);

	expect(
		screen.getByRole("heading", { level: 2, name: "Import history" })
	).toBeVisible();
	const table = screen.getByRole("table", { name: "Import history" });
	const rows = within(table).getAllByRole("row");
	expect(rows.length).toBeGreaterThan(2);
	await userEvent.click(within(rows[1]!).getByRole("button", { name: "View" }));

	expect(Default.args.onOpen).toHaveBeenCalledOnce();
});
