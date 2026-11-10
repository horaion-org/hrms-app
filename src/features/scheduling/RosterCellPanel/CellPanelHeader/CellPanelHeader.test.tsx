import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { CellPanelHeader } from "./CellPanelHeader";

describe("CellPanelHeader", () => {
	it("given_aDayOpens_when_rendered_then_focusesItsTitleAndCloses", async () => {
		const onClose = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<CellPanelHeader
					focusKey="a-1"
					title="Aisha Rahman · Mon 12 Oct"
					titleId="title"
					onClose={onClose}
				/>
			</I18nextProvider>
		);

		expect(
			screen.getByRole("heading", { name: "Aisha Rahman · Mon 12 Oct" })
		).toHaveFocus();
		await userEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(onClose).toHaveBeenCalledOnce();
	});
});
