import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi, type Mock } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AvailabilityDialog } from "@/features/availability/AvailabilityDialog";
import type {
	AvailabilityScope,
	WeeklyWindow,
} from "@/features/availability/availabilityModel";

type Submit = (
	scope: AvailabilityScope,
	windows: Array<WeeklyWindow>
) => Promise<unknown>;

type Shown = {
	onSubmit: Mock<Submit>;
	onReset: Mock<() => Promise<unknown>>;
	onClose: Mock<() => void>;
};

const WEEK = "2026-11-09";
const WEEK_SCOPE: AvailabilityScope = { kind: "week", weekStartMonday: WEEK };

/**
 * Opens the editor on a week on its pattern unless told otherwise; the
 * pattern is the week's windows by default, and `null` offers none.
 */
const show = ({
	weekWindows = [],
	patternWindows = weekWindows,
	overridden = false,
	onSubmit = vi.fn<Submit>().mockResolvedValue(undefined),
}: {
	weekWindows?: Array<WeeklyWindow>;
	patternWindows?: Array<WeeklyWindow> | null;
	overridden?: boolean;
	onSubmit?: Mock<Submit>;
} = {}): Shown => {
	const onClose = vi.fn<() => void>();
	const onReset = vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AvailabilityDialog
				name="Kent Chua"
				overridden={overridden}
				patternNote="Loading the default pattern…"
				patternWindows={patternWindows ?? undefined}
				weekStartMonday={WEEK}
				weekWindows={weekWindows}
				onClose={onClose}
				onReset={onReset}
				onSubmit={onSubmit}
			/>
		</I18nextProvider>
	);
	return { onSubmit, onReset, onClose };
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
	it("given_aWeekOnThePattern_when_opened_then_editsThisWeekWithSameTimesSharingARow", () => {
		show({
			weekWindows: [
				{ day: "MON", startTime: "09:00", endTime: "17:00" },
				{ day: "FRI", startTime: "09:00", endTime: "17:00" },
			],
		});

		expect(
			screen.getByRole("dialog", { name: "Edit availability" })
		).toBeVisible();
		expect(screen.getByRole("radio", { name: "This week only" })).toBeChecked();
		expect(screen.getAllByRole("group")).toHaveLength(1);
		expect(
			within(windowRow(1)).getByRole("button", { name: "Start time" })
		).toHaveTextContent("09:00");
		expect(
			screen.queryByRole("button", { name: "Reset to default" })
		).not.toBeInTheDocument();
	});

	it("given_nothingSet_when_opened_then_editsEveryWeek", () => {
		show();

		expect(screen.getByRole("radio", { name: "Every week" })).toBeChecked();
		expect(
			screen.queryByRole("button", { name: "Not available this week" })
		).not.toBeInTheDocument();
	});

	it("given_aWeekWithItsOwnHours_when_opened_then_editsThatWeekAndOffersItsReset", () => {
		show({ overridden: true });

		expect(screen.getByRole("radio", { name: "This week only" })).toBeChecked();
		expect(
			screen.getByRole("button", { name: "Reset to default" })
		).toBeVisible();
	});

	it("given_noPatternToOffer_when_opened_then_onlyTheWeekCanBeChosen", () => {
		show({ overridden: true, patternWindows: null });

		expect(screen.getByRole("radio", { name: "Every week" })).toBeDisabled();
		expect(screen.getByText("Loading the default pattern…")).toBeVisible();
	});

	it("given_everyWeekChosen_when_saved_then_showsAndSendsThePattern", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show({
			overridden: true,
			weekWindows: [{ day: "SAT", startTime: "10:00", endTime: "14:00" }],
			patternWindows: [{ day: "MON", startTime: "09:00", endTime: "13:00" }],
		});

		await user.click(screen.getByRole("radio", { name: "Every week" }));
		expect(
			within(windowRow(1)).getByRole("button", { name: "Start time" })
		).toHaveTextContent("09:00");
		expect(
			screen.queryByRole("button", { name: "Reset to default" })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ kind: "pattern" }, [
				{ day: "MON", startTime: "09:00", endTime: "13:00" },
			]);
		});
	});

	it("given_aWindowAdded_when_saved_then_sendsTheWholeSetOneWindowPerDay", async () => {
		const user = userEvent.setup();
		const { onSubmit, onClose } = show({
			weekWindows: [{ day: "MON", startTime: "09:00", endTime: "13:00" }],
		});

		await user.click(screen.getByRole("button", { name: "Add window" }));
		await pick(user, windowRow(2), "Days", "Tuesday", "Sunday");
		await pick(user, windowRow(2), "Start time", "22:00");
		await pick(user, windowRow(2), "End time", "06:00");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(WEEK_SCOPE, [
				{ day: "MON", startTime: "09:00", endTime: "13:00" },
				{ day: "TUE", startTime: "22:00", endTime: "06:00" },
				{ day: "SUN", startTime: "22:00", endTime: "06:00" },
			]);
		});
		expect(onClose).toHaveBeenCalled();
	});

	it("given_aSecondSeparateWindowOnTheSameDay_when_saved_then_sendsBoth", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show({
			weekWindows: [{ day: "MON", startTime: "03:00", endTime: "05:00" }],
		});

		await user.click(screen.getByRole("button", { name: "Add window" }));
		await pick(user, windowRow(2), "Days", "Monday");
		await pick(user, windowRow(2), "Start time", "08:00");
		await pick(user, windowRow(2), "End time", "10:00");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(WEEK_SCOPE, [
				{ day: "MON", startTime: "03:00", endTime: "05:00" },
				{ day: "MON", startTime: "08:00", endTime: "10:00" },
			]);
		});
	});

	it("given_anOverlappingWindow_when_saved_then_explainsItOnItsRowAndSendsNothing", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show({
			weekWindows: [{ day: "WED", startTime: "09:00", endTime: "13:00" }],
		});

		await user.click(screen.getByRole("button", { name: "Add window" }));
		await pick(user, windowRow(2), "Days", "Wednesday");
		await pick(user, windowRow(2), "Start time", "12:00");
		await pick(user, windowRow(2), "End time", "15:00");
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await within(windowRow(2)).findByText(
				"This window overlaps Wednesday 09:00–13:00."
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
		const { onSubmit } = show({
			weekWindows: [{ day: "MON", startTime: "09:00", endTime: "13:00" }],
		});

		await user.click(screen.getByRole("button", { name: "Remove window 1" }));
		expect(
			screen.getByText(
				"No windows yet. Add one for each stretch of hours they can work."
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(WEEK_SCOPE, []);
		});
	});

	it("given_theApiRefusesAnEntry_when_saved_then_marksItsRowAndKeepsTheDialogOpen", async () => {
		const user = userEvent.setup();
		const { onClose } = show({
			weekWindows: [{ day: "MON", startTime: "09:00", endTime: "13:00" }],
			onSubmit: vi.fn<Submit>().mockRejectedValue(
				new ApiProblemError({
					message: "Refused",
					status: 400,
					errorCode: "INVALID_WEEKLY_AVAILABILITY",
					fieldErrors: [{ field: "windows[0]", message: "Overlaps" }],
					reason: "validation",
				})
			),
		});

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

	it("given_notAvailableThisWeek_when_pressed_then_savesAnEmptyWeek", async () => {
		const user = userEvent.setup();
		const { onSubmit, onClose } = show({
			weekWindows: [{ day: "MON", startTime: "09:00", endTime: "13:00" }],
		});

		await user.click(
			screen.getByRole("button", { name: "Not available this week" })
		);

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(WEEK_SCOPE, []);
		});
		expect(onClose).toHaveBeenCalled();
	});

	it("given_anOverride_when_resetIsConfirmed_then_returnsTheWeekToThePattern", async () => {
		const user = userEvent.setup();
		const { onSubmit, onReset, onClose } = show({
			overridden: true,
			weekWindows: [{ day: "MON", startTime: "09:00", endTime: "13:00" }],
		});

		await user.click(screen.getByRole("button", { name: "Reset to default" }));
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
