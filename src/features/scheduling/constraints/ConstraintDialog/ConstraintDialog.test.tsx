import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import { constraintSchema } from "@/features/scheduling/constraints/ConstraintDialog/schema";
import {
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS,
	CONSTRAINT_TYPE_OPTIONS,
} from "@/features/scheduling/constraints/fixtures";
import type { ConstraintOptionsState } from "@/features/scheduling/constraints/useConstraintOptions";

const options: ConstraintOptionsState = {
	status: "ready",
	options: CONSTRAINT_OPTIONS,
};

const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

const renderDialog = (
	props: Partial<Parameters<typeof ConstraintDialog>[0]> = {}
): { onSave: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } => {
	const onSave = vi.fn().mockResolvedValue(undefined);
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ConstraintDialog
				options={options}
				onClose={onClose}
				onSave={onSave}
				{...props}
			/>
		</I18nextProvider>
	);
	return { onSave, onClose };
};

const trigger = (name: RegExp): HTMLElement =>
	screen.getByRole("button", { name });

/** Opens a select and picks each option, closing it again. */
const pick = async (
	user: ReturnType<typeof userEvent.setup>,
	name: RegExp,
	...labels: Array<string>
): Promise<void> => {
	await user.click(trigger(name));
	await labels.reduce(
		(previous, label) =>
			previous.then(async () => {
				await user.click(await screen.findByRole("option", { name: label }));
			}),
		Promise.resolve()
	);
	if (screen.queryByRole("listbox")) await user.keyboard("{Escape}");
};

/** Names the constraint and chooses its type, as every new constraint starts. */
const start = async (
	user: ReturnType<typeof userEvent.setup>,
	type: string
): Promise<void> => {
	await screen.findByRole("dialog", { name: "Add constraint" });
	await user.type(screen.getByLabelText("Constraint name"), "Morning cover");
	await pick(user, /^Constraint type/, type);
};

const constraint = (
	constraintId: string
): (typeof CONSTRAINT_FIXTURES)[number] =>
	CONSTRAINT_FIXTURES.find((item) => item.constraintId === constraintId) ??
	CONSTRAINT_FIXTURES[0]!;

describe("ConstraintDialog", () => {
	it("given_noTypeYet_when_rendered_then_offersEveryTypeLabelledByItsCategory", async () => {
		const user = userEvent.setup();
		renderDialog();
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(screen.queryByRole("spinbutton")).toBeNull();
		expect(screen.queryByRole("button", { name: /^Status/ })).toBeNull();
		await user.click(trigger(/^Constraint type/));

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"Staffing: Shift staffing",
			"Staffing: Shift staffing with stand-ins",
			"Role coverage: Role presence",
			"Shift pattern: Days off per period",
			"Shift pattern: Avoid days off on",
			"Working hours: Rest between shifts",
		]);
	});

	it("given_aType_when_chosen_then_rendersOneRowPerFieldOfItsSpecByKind", async () => {
		const user = userEvent.setup();
		renderDialog();
		await start(user, "Staffing: Shift staffing with stand-ins");

		expect(trigger(/^Requirement/)).toBeVisible();
		expect(trigger(/^Status/)).toHaveTextContent("Active");
		expect(
			screen.getByRole("spinbutton", { name: /Headcount/ })
		).toHaveAttribute("max", "999");
		expect(
			screen.getByRole("spinbutton", { name: /Stand-ins per person/ })
		).toHaveAttribute("min", "1");
		expect(screen.getByText("A whole number from 1 to 10.")).toBeVisible();
		expect(trigger(/^Job titles/)).toBeVisible();
		expect(trigger(/^Stand-in job titles/)).toBeVisible();
		expect(trigger(/^Shifts/)).toBeVisible();
		expect(screen.queryByRole("button", { name: /^Comparison/ })).toBeNull();
	});

	it("given_onlyANameAndType_when_saved_then_asksForEachFieldAsItsSpecSaysAndSendsNothing", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Staffing: Shift staffing");

		await user.click(screen.getByRole("button", { name: "Save" }));

		const alerts = await screen.findAllByRole("alert");
		expect(alerts.map((alert) => alert.textContent)).toEqual([
			"Choose must or should.",
			"Choose one.",
			"Enter a whole number from 0 to 999.",
			"Choose at least one.",
			"Choose at least one.",
		]);
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_everyField_when_saved_then_sendsOneValueRowPerValueAndReadsItBack", async () => {
		const user = userEvent.setup();
		const { onSave, onClose } = renderDialog();
		await start(user, "Staffing: Shift staffing");

		await pick(user, /^Requirement/, "Must");
		await pick(user, /^Comparison/, "At least");
		await user.type(screen.getByRole("spinbutton", { name: /Headcount/ }), "2");
		await pick(user, /^Job titles/, "Front Desk Staff", "Front Desk Lead");
		await pick(user, /^Shifts/, "Front Desk AM");
		expect(
			screen.getByText("Complete").closest("section")?.querySelector("p")
		).toHaveTextContent(
			"Staff on Front Desk AM, counting Front Desk Lead and Front Desk Staff, must total at least 2."
		);
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				name: "Morning cover",
				type: "SHIFT_STAFFING",
				requirement: "MUST",
				status: "ACTIVE",
				values: [
					{ field: "COMPARISON", value: "AT_LEAST" },
					{ field: "HEADCOUNT", value: "2" },
					{ field: "JOB_TITLE", value: "front-desk-lead" },
					{ field: "JOB_TITLE", value: "front-desk-staff" },
					{ field: "SHIFT", value: "front-desk-am" },
				],
			});
		});
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("given_aTypeWithoutARequirement_when_saved_then_offersNoneAndSendsNone", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Shift pattern: Avoid days off on");

		expect(screen.queryByRole("button", { name: /^Requirement/ })).toBeNull();
		await pick(user, /^Days/, "Saturday", "Friday");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "AVOID_DAYS_OFF_ON",
					requirement: null,
					// Monday first, whatever order they were chosen in.
					values: [
						{ field: "WEEKDAY", value: "FRI" },
						{ field: "WEEKDAY", value: "SAT" },
					],
				})
			);
		});
	});

	it("given_aNumberOutsideItsRange_when_saved_then_saysTheRangeFromTheSpec", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog();
		await start(user, "Working hours: Rest between shifts");

		await user.type(
			screen.getByRole("spinbutton", { name: /Rest in hours/ }),
			"25"
		);
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText("Enter a whole number from 1 to 24.")
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("given_aConstraint_when_editing_then_startsFromItsValuesChecksAcrossFieldsAndResetReturnsToThem", async () => {
		const user = userEvent.setup();
		const { onSave } = renderDialog({ editing: constraint("two-days-off") });
		await screen.findByRole("dialog", { name: "Edit constraint" });
		const daysOff = screen.getByRole("spinbutton", { name: /^Days off/ });

		expect(screen.getByLabelText("Constraint name")).toHaveValue(
			"Two days off"
		);
		expect(trigger(/^Constraint type/)).toHaveTextContent(
			"Shift pattern: Days off per period"
		);
		expect(trigger(/^Requirement/)).toHaveTextContent("Must");
		expect(trigger(/^Comparison/)).toHaveTextContent("At least");
		expect(daysOff).toHaveValue(2);

		await user.clear(daysOff);
		await user.type(daysOff, "8");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText(
				"Days off can’t be more than the days in the period."
			)
		).toBeVisible();
		expect(onSave).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Reset" }));
		expect(daysOff).toHaveValue(2);
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				name: "Two days off",
				type: "DAYS_OFF_PER_PERIOD",
				requirement: "MUST",
				status: "ACTIVE",
				values: [
					{ field: "COMPARISON", value: "AT_LEAST" },
					{ field: "DAYS_OFF", value: "2" },
					{ field: "PERIOD_DAYS", value: "7" },
				],
			});
		});
	});

	it.each([
		[
			"CONSTRAINT_TYPE_ALREADY_USED",
			"This department already has a constraint of this type. Edit that one instead.",
		],
		[
			"CONSTRAINT_NAME_CONFLICT",
			'A constraint named "Rest between shifts" already exists in this department. Choose a different name.',
		],
	])(
		"given_%s_when_saved_then_putsItOnItsFieldAndStaysOpen",
		async (code, copy) => {
			const user = userEvent.setup();
			const { onClose } = renderDialog({
				editing: constraint("rest-between-shifts"),
				onSave: vi.fn().mockRejectedValue(problem(409, code)),
			});
			await screen.findByRole("dialog", { name: "Edit constraint" });

			await user.click(screen.getByRole("button", { name: "Save" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(copy);
			expect(onClose).not.toHaveBeenCalled();
		}
	);

	it("given_optionsHidden_when_rendered_then_saysSoAndOffersNoType", async () => {
		renderDialog({ options: { status: "hidden" } });
		await screen.findByRole("dialog", { name: "Add constraint" });

		expect(
			screen.getByText(
				"You don’t have permission to see this department’s constraint types."
			)
		).toBeVisible();
		expect(trigger(/^Constraint type/)).toBeDisabled();
		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
	});
});

describe("constraintSchema", () => {
	const t = authTestI18n.t;
	const standIns = CONSTRAINT_TYPE_OPTIONS[1]!;
	const valid = {
		name: "Lunch cover",
		type: "SHIFT_STAFFING_WITH_STAND_INS",
		requirement: "SHOULD",
		status: "ACTIVE" as const,
		values: {
			HEADCOUNT: ["2"],
			STAND_INS_PER_PERSON: ["2"],
			JOB_TITLE: ["supervisor"],
			STAND_IN_JOB_TITLE: ["service-staff"],
			SHIFT: ["lunch-rush"],
			// Left from another type; never sent.
			COMPARISON: ["AT_LEAST"],
		},
	};

	it("given_valuesOfTheType_when_parsed_then_yieldsTheBodyWithItsFieldsOnly", () => {
		const parsed = constraintSchema(standIns, t).safeParse(valid);

		expect(parsed.data?.values.map((value) => value.field)).toEqual([
			"HEADCOUNT",
			"STAND_INS_PER_PERSON",
			"JOB_TITLE",
			"STAND_IN_JOB_TITLE",
			"SHIFT",
		]);
	});

	it("given_aStandInAlsoCounted_when_parsed_then_refusesItOnTheStandIns", () => {
		const parsed = constraintSchema(standIns, t).safeParse({
			...valid,
			values: { ...valid.values, STAND_IN_JOB_TITLE: ["supervisor"] },
		});

		expect(parsed.error?.issues).toEqual([
			expect.objectContaining({
				path: ["values", "STAND_IN_JOB_TITLE"],
				message:
					"A stand-in job title can’t also be one of the counted job titles.",
			}),
		]);
	});

	it("given_moreValuesThanTheSpecAllows_when_parsed_then_saysTheMost", () => {
		const parsed = constraintSchema(standIns, t).safeParse({
			...valid,
			values: {
				...valid.values,
				SHIFT: Array.from({ length: 21 }, (_, index) => `shift-${index}`),
			},
		});

		expect(parsed.error?.issues[0]?.message).toBe("Choose at most 20.");
	});
});
