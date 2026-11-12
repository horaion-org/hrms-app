import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import type { ConstraintTypeOption } from "@/features/scheduling/constraints/api";
import type { MonthChoices } from "@/features/scheduling/months/monthGeneration";
import {
	WeekChoiceLists,
	type WeekChoiceConstraintRow,
	type WeekChoiceShiftRow,
} from "@/features/scheduling/WeekChoiceDialog";
import {
	leftOutCount,
	weekChoiceProblem,
	type WeekChoiceIds,
} from "@/features/scheduling/weekChoice";

/** One week of the dialog: its Monday, and its dates as the page writes them ("9 – 15 Nov"). */
export type MonthChoiceWeek = { periodStart: string; label: string };

export type MonthChoiceDialogProps = {
	/** The month's name, e.g. "November". */
	monthName: string;
	/** The weeks to choose for: the ones the month run will create. */
	weeks: Array<MonthChoiceWeek>;
	shifts: Array<WeekChoiceShiftRow>;
	constraints: Array<WeekChoiceConstraintRow>;
	/** The constraint types, so a rule's sentence says who it covers. */
	constraintTypes?: ReadonlyArray<ConstraintTypeOption>;
	/** Each week's choice now, by Monday; every week has one. */
	value: MonthChoices;
	/** Called with every week's choice; the caller closes the dialog. */
	onApply: (choices: MonthChoices) => void;
	onClose: () => void;
};

const key = "scheduling.months.choice";

/**
 * What each week of a month uses of its Department's shifts and constraints:
 * one tab per week, everything ticked by default, and "Use this week's choice
 * for every week". The choices are kept here until "Use for November"; it
 * waits while any week's choice would roster nobody, and names that week.
 * Each tab says how much its week leaves out.
 */
export const MonthChoiceDialog = ({
	monthName,
	weeks,
	shifts,
	constraints,
	constraintTypes,
	value,
	onApply,
	onClose,
}: MonthChoiceDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const [working, setWorking] = useState(value);
	const [selected, setSelected] = useState(0);
	const choiceOf = (week: MonthChoiceWeek): WeekChoiceIds | undefined =>
		working[week.periodStart];
	const selectedWeek = weeks[selected];
	const problemWeek = weeks.find((week) => {
		const choice = choiceOf(week);
		return (
			choice !== undefined &&
			weekChoiceProblem(choice, constraints) !== undefined
		);
	});
	const problemChoice = problemWeek && choiceOf(problemWeek);
	const problem =
		problemWeek && problemChoice
			? t(`${key}.weekProblem`, {
					week: problemWeek.label,
					problem: t(
						weekChoiceProblem(problemChoice, constraints) === "noShift"
							? "scheduling.week.noShift"
							: "scheduling.week.noStaffing"
					),
				})
			: undefined;

	return (
		<Dialog
			open
			className="md:max-w-288"
			description={t(`${key}.intro`)}
			title={t(`${key}.title`, { month: monthName })}
			footer={
				<div className="grid gap-6 sm:grid-cols-2">
					<Button variant="secondary" onClick={onClose}>
						{t("scheduling.week.cancel")}
					</Button>
					<Button
						disabled={problem !== undefined}
						onClick={() => {
							onApply(working);
						}}
					>
						{t(`${key}.apply`, { month: monthName })}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<Tabs selectedIndex={selected} onChange={setSelected}>
				<TabList aria-label={t(`${key}.weeks`, { month: monthName })}>
					{weeks.map((week) => {
						const choice = choiceOf(week);
						const leftOut = choice
							? leftOutCount(choice, shifts, constraints)
							: 0;
						return (
							<Tab key={week.periodStart}>
								{leftOut > 0
									? t(`${key}.weekLeftOut`, {
											week: week.label,
											count: leftOut,
										})
									: week.label}
							</Tab>
						);
					})}
				</TabList>
				<TabPanels className="mt-6">
					{weeks.map((week) => {
						const choice = choiceOf(week);
						return (
							<TabPanel key={week.periodStart}>
								{choice && (
									<WeekChoiceLists
										constraintTypes={constraintTypes}
										constraints={constraints}
										shifts={shifts}
										value={choice}
										onChange={(next) => {
											setWorking({ ...working, [week.periodStart]: next });
										}}
									/>
								)}
							</TabPanel>
						);
					})}
				</TabPanels>
			</Tabs>
			{weeks.length > 1 && selectedWeek && (
				<Button
					className="mt-6 max-sm:w-full"
					variant="secondary"
					onClick={() => {
						const choice = choiceOf(selectedWeek);
						if (!choice) return;
						setWorking(
							Object.fromEntries(
								weeks.map((week) => [week.periodStart, choice])
							)
						);
					}}
				>
					{t(`${key}.useForEveryWeek`)}
				</Button>
			)}
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
		</Dialog>
	);
};
