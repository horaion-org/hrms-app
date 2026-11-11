import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	WeekChoiceSummary,
	type SetupLink,
	type WeekChoiceSummaryProps,
} from "@/features/scheduling/WeekChoiceSummary";

const link = (view: SetupLink["search"]["view"]): SetupLink => ({
	to: "/scheduling",
	search: { view, branch: "b-1", department: "d-1" },
});

const show = (props: Partial<WeekChoiceSummaryProps>): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MemoryRouterHarness>
				<WeekChoiceSummary
					line="Uses all 3 shifts and 5 constraints of Kitchen."
					{...props}
				/>
			</MemoryRouterHarness>
		</I18nextProvider>
	);
};

describe("WeekChoiceSummary", () => {
	it("given_anAction_when_clicked_then_callsIt", async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();
		show({ actionLabel: "Choose for this week", onAction });

		expect(
			await screen.findByText(
				/^Uses all 3 shifts and 5 constraints of Kitchen\./
			)
		).toBeVisible();
		await user.click(
			screen.getByRole("button", { name: "Choose for this week" })
		);
		expect(onAction).toHaveBeenCalled();
	});

	it("given_bothEditLinks_when_shown_then_opensEachTabOnTheDepartment", async () => {
		show({ editShifts: link("shifts"), editConstraints: link("constraints") });

		expect(
			await screen.findByRole("link", { name: "Edit shifts" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=shifts&branch=b-1&department=d-1"
		);
		expect(
			screen.getByRole("link", { name: "Edit constraints" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&branch=b-1&department=d-1"
		);
		expect(screen.getByText(/·/)).toBeVisible();
	});

	it("given_onlyOneLink_when_shown_then_offersItAlone", async () => {
		show({ editConstraints: link("constraints") });

		expect(
			await screen.findByRole("link", { name: "Edit constraints" })
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "Edit shifts" })).toBeNull();
		expect(screen.queryByText(/·/)).toBeNull();
	});

	it("given_noActionOrLinks_when_shown_then_isTheLineAlone", async () => {
		show({});

		await screen.findByText("Uses all 3 shifts and 5 constraints of Kitchen.");
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByRole("link")).toBeNull();
	});
});
