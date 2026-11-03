import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AvailabilityDialog } from "@/features/people/availability/AvailabilityDialog";
import {
	formatWeekStart,
	type AvailabilityScope,
	type WeeklyWindow,
} from "@/features/people/availability/availabilityModel";

const show = (
	windows: Array<WeeklyWindow> = [],
	onSubmit = vi.fn().mockResolvedValue(undefined),
	week?: { scope: AvailabilityScope; onReset?: () => Promise<unknown> }
): {
	onSubmit: ReturnType<typeof vi.fn>;
	onClose: ReturnType<typeof vi.fn>;
} => {
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AvailabilityDialog
				name="Kent Chua"
				scope={week?.scope ?? { kind: "pattern" }}
				windows={windows}
				onClose={onClose}
				onReset={week?.onReset}
				onSubmit={onSubmit}
			/>
		</I18nextProvider>
	);
	return { onSubmit, onClose };
};

/** The editor row for window `number`, counting from 1. */
const windowRow = (number: number): HTMLElement =>
	screen.getByRole("group", { name: `Window ${number}` });

/** Opens a select in `row` and picks each option, closing it again. */
const pick = async (
	user: ReturnType<typeof userEvent.setup>,
	row: HTMLElement,
	name: string,
	...labels: Array<string>
): Promise<void> => {
	await user.click(within(row).getByRole("button", { name }));
	await labels.reduce(
		(previous, label) =>
			previous.then(async () => {
				await user.click(await screen.findByRole("option", { name: label }));
			}),
		Promise.resolve()
	);
	if (screen.queryByRole("listbox")) await user.keyboard("{Escape}");
};

describe("AvailabilityDialog", () => {
	it("given_aPattern_when_opened_then_windowsWithTheSameTimesShareARow", () => {
		show([
			{ day: "MON", startTime: "09:00", endTime: "17:00" },
			{ day: "FRI", startTime: "09:00", endTime: "17:00" },
		]);

		expect(screen.getAllByRole("group")).toHaveLength(1);
		expect(
			within(windowRow(1)).getByRole("button", { name: "Start time" })
		).toHaveTextContent("09:00");
	});

	it("given_aWindowAdded_when_saved_then_sendsTheWholeSetOneWindowPerDay", async () => {
		const user = userEvent.setup();
		const { onSubmit, onClose } = show([
			{ day: "MON", startTime: "09:00", endTime: "13:00" },
		]);

		await user.click(screen.getByRole("button", { name: "Add window" }));
		await pick(user, windowRow(2), "Days", "Tuesday", "Sunday");
		await pick(user, windowRow(2), "Start time", "22:00");
		await pick(user, windowRow(2), "End time", "06:00");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith([
				{ day: "MON", startTime: "09:00", endTime: "13:00" },
				{ day: "TUE", startTime: "22:00", endTime: "06:00" },
				{ day: "SUN", startTime: "22:00", endTime: "06:00" },
			]);
		});
		expect(onClose).toHaveBeenCalled();
	});

	it("given_anOverlappingWindow_when_saved_then_explainsItOnItsRowAndSendsNothing", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show([
			{ day: "WED", startTime: "09:00", endTime: "13:00" },
		]);

		await user.click(screen.getByRole("button", { name: "Add window" }));
		await pick(user, windowRow(2), "Days", "Wednesday");
		await pick(user, windowRow(2), "Start time", "12:00");
		await pick(user, windowRow(2), "End time", "15:00");
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await within(windowRow(2)).findByText(
				"This window overlaps another on Wednesday."
			)
		).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_aNewRowLeftEmpty_when_saved_then_asksForItsDays", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show();

		await user.click(screen.getByRole("button", { name: "Add window" }));
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await within(windowRow(1)).findByText("Choose at least one day.")
		).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_everyWindowRemoved_when_saved_then_sendsAnEmptySet", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show([
			{ day: "MON", startTime: "09:00", endTime: "13:00" },
		]);

		await user.click(screen.getByRole("button", { name: "Remove window 1" }));
		expect(
			screen.getByText(
				"No windows yet. Add one for each stretch of hours they can work."
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith([]);
		});
	});

	it("given_theApiRefusesAnEntry_when_saved_then_marksItsRowAndKeepsTheDialogOpen", async () => {
		const user = userEvent.setup();
		const { onClose } = show(
			[{ day: "MON", startTime: "09:00", endTime: "13:00" }],
			vi.fn().mockRejectedValue(
				new ApiProblemError({
					message: "Refused",
					status: 400,
					errorCode: "INVALID_WEEKLY_AVAILABILITY",
					fieldErrors: [{ field: "windows[0]", message: "Overlaps" }],
					reason: "validation",
				})
			)
		);

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Some windows were refused. Check the windows marked below."
		);
		expect(
			within(windowRow(1)).getByText(
				"This window was refused. Check that it doesn’t overlap another or crowd its day."
			)
		).toBeVisible();
		expect(onClose).not.toHaveBeenCalled();
	});

	describe("for one week", () => {
		const week: AvailabilityScope = {
			kind: "week",
			weekStartMonday: "2026-11-09",
		};
		const date = formatWeekStart("2026-11-09", "en");

		it("given_aWeek_when_opened_then_saysWhichWeekAndOffersNoResetWithoutAnOverride", () => {
			show([], undefined, { scope: week });

			expect(
				screen.getByRole("dialog", {
					name: `Edit availability · Week of ${date}`,
				})
			).toBeVisible();
			expect(
				screen.queryByRole("button", { name: "Reset to default" })
			).not.toBeInTheDocument();
		});

		it("given_notAvailableThisWeek_when_pressed_then_savesAnEmptyWeek", async () => {
			const user = userEvent.setup();
			const { onSubmit, onClose } = show(
				[{ day: "MON", startTime: "09:00", endTime: "13:00" }],
				undefined,
				{ scope: week }
			);

			await user.click(
				screen.getByRole("button", { name: "Not available this week" })
			);

			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalledWith([]);
			});
			expect(onClose).toHaveBeenCalled();
		});

		it("given_anOverride_when_resetIsConfirmed_then_returnsTheWeekToThePattern", async () => {
			const user = userEvent.setup();
			const onReset = vi.fn().mockResolvedValue(undefined);
			const { onSubmit, onClose } = show(
				[{ day: "MON", startTime: "09:00", endTime: "13:00" }],
				undefined,
				{ scope: week, onReset }
			);

			await user.click(
				screen.getByRole("button", { name: "Reset to default" })
			);
			expect(onReset).not.toHaveBeenCalled();
			const confirm = await screen.findByRole("dialog", {
				name: "Reset this week to the default pattern?",
			});
			await user.click(
				within(confirm).getByRole("button", { name: "Reset to default" })
			);

			await waitFor(() => {
				expect(onReset).toHaveBeenCalledOnce();
			});
			expect(onClose).toHaveBeenCalled();
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});
});
