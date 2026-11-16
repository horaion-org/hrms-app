import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	AccessAreaRow,
	type AccessAreaRowProps,
} from "@/features/organisation/AccessAreaRow";

const renderRow = (props: Partial<AccessAreaRowProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AccessAreaRow
				description="Other people’s leave requests"
				detailsTitle="Details · 1 of 3"
				level="VIEW"
				levels={[{ level: "NONE" }, { level: "VIEW" }, { level: "MANAGE" }]}
				name="Leave"
				onLevelChange={vi.fn()}
				{...props}
			>
				<p>See leave requests</p>
			</AccessAreaRow>
		</I18nextProvider>
	);
};

describe("AccessAreaRow", () => {
	it("names the area, says what it holds and shows its level", () => {
		renderRow({ note: "Not at departments" });
		expect(screen.getByRole("group", { name: "Leave" })).toBeInTheDocument();
		expect(screen.getByText("Other people’s leave requests")).toBeVisible();
		expect(screen.getByText("Not at departments")).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Level for Leave" })
		).toHaveTextContent("Can view");
	});

	it("reports a level chosen, and never one that can't be chosen", async () => {
		const user = userEvent.setup();
		const onLevelChange = vi.fn();
		renderRow({
			levels: [
				{ level: "NONE" },
				{ level: "VIEW" },
				{ level: "MANAGE", disabled: true },
			],
			onLevelChange,
		});
		await user.click(screen.getByRole("button", { name: "Level for Leave" }));
		await user.click(screen.getByRole("option", { name: "Can manage" }));
		expect(onLevelChange).not.toHaveBeenCalled();
		await user.click(screen.getByRole("option", { name: "No access" }));
		expect(onLevelChange).toHaveBeenCalledWith("NONE");
	});

	it("shows Custom when the single permissions match no level, without offering it", async () => {
		const user = userEvent.setup();
		renderRow({ level: "CUSTOM" });
		const select = screen.getByRole("button", { name: "Level for Leave" });
		expect(select).toHaveTextContent("Custom");
		await user.click(select);
		expect(screen.getByRole("option", { name: "Custom" })).toHaveAttribute(
			"aria-disabled",
			"true"
		);
	});

	it("keeps the single permissions behind Details", async () => {
		const user = userEvent.setup();
		renderRow();
		expect(screen.queryByText("See leave requests")).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Details · 1 of 3" }));
		expect(screen.getByText("See leave requests")).toBeVisible();
	});
});
