import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { AvailabilityFormValues } from "@/features/availability/AvailabilityDialog/schema";
import { WindowRow } from "@/features/availability/AvailabilityDialog/WindowRow";

const Row = ({
	error,
	onRemove,
}: {
	error?: string;
	onRemove: () => void;
}): FunctionComponent => {
	const { control } = useForm<AvailabilityFormValues>({
		defaultValues: {
			rows: [{ days: ["MON"], startTime: "22:00", endTime: "06:00" }],
		},
	});
	return (
		<WindowRow control={control} error={error} index={0} onRemove={onRemove} />
	);
};

const show = (error?: string): ReturnType<typeof vi.fn> => {
	const onRemove = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<Row error={error} onRemove={onRemove} />
		</I18nextProvider>
	);
	return onRemove;
};

describe("WindowRow", () => {
	it("given_aWindow_when_shown_then_labelsItsDaysAndTimes", () => {
		show();

		expect(screen.getByRole("group", { name: "Window 1" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Days" })).toHaveTextContent(
			"Monday"
		);
		expect(
			screen.getByRole("button", { name: "Start time" })
		).toHaveTextContent("22:00");
		expect(screen.getByRole("button", { name: "End time" })).toHaveTextContent(
			"06:00"
		);
	});

	it("given_aProblem_when_shown_then_describesTheControlsWithIt", () => {
		show("Choose at least one day.");

		expect(
			screen.getByRole("button", { name: "Days" })
		).toHaveAccessibleDescription("Choose at least one day.");
	});

	it("given_removeClicked_when_pressed_then_asksToRemoveTheRow", async () => {
		const user = userEvent.setup();
		const onRemove = show();

		await user.click(screen.getByRole("button", { name: "Remove window 1" }));

		expect(onRemove).toHaveBeenCalled();
	});
});
