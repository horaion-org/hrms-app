import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DatesPlan } from "@/features/scheduling/dates/api";
import {
	memberProfileIdsToSend,
	peopleProblemOf,
	peopleSummaryOf,
	type ChosenPeople,
	type PeopleProblem,
} from "@/features/scheduling/dates/people";
import { PeopleChoiceDialog } from "@/features/scheduling/createSchedule/PeopleChoiceDialog/PeopleChoiceDialog";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { WeekChoiceSummary } from "@/features/scheduling/WeekChoiceSummary";

/** Who a schedule by dates rosters, as the page needs it. */
export type PeopleChoice = {
	/** The member profile ids the bodies send; undefined rosters everyone. */
	idsToSend: Array<string> | undefined;
	/** Why Next waits; the People line says it. */
	problem: PeopleProblem | undefined;
	/** The People line, with Choose people and its dialog; none until the plan lists people. */
	line: ReactNode;
};

/** The ids chosen, with the Department they were chosen in. */
type ChosenInDepartment = { departmentId: string; ids: Array<string> };

const key = "scheduling.dates.people";

/**
 * The People row of Setup's Dates: everyone, or the people the manager
 * chose in PeopleChoiceDialog. Another Department starts again at everyone.
 * Once the run's first days are saved as a draft (`savedDraft`), the row
 * shows that draft's people and can't be changed.
 */
export const usePeopleChoice = (
	department: { departmentId: string; name: string } | undefined,
	plan: DatesPlan | undefined,
	savedDraft: Schedule | undefined
): PeopleChoice => {
	const { t } = useTranslation();
	const [chosen, setChosen] = useState<ChosenInDepartment>();
	const [choosing, setChoosing] = useState(false);
	const people = plan?.people ?? [];
	const chosenHere: ChosenPeople =
		chosen?.departmentId === department?.departmentId ? chosen?.ids : undefined;
	const value: ChosenPeople = savedDraft
		? (savedDraft.memberProfileIds ?? undefined)
		: chosenHere;
	const idsToSend = memberProfileIdsToSend(value, people);
	const problem = peopleProblemOf(value, people, plan?.weeks ?? []);
	if (!department || people.length === 0)
		return { idsToSend, problem, line: undefined };

	const summary = peopleSummaryOf(value, people);
	const line = (
		<div className="flex flex-col gap-2">
			<WeekChoiceSummary
				actionLabel={savedDraft ? undefined : t(`${key}.choose`)}
				line={
					summary.everyone
						? t(`${key}.everyone`, {
								department: department.name,
								count: summary.total,
							})
						: t(`${key}.chosen`, {
								chosen: summary.chosen,
								count: summary.total,
							})
				}
				onAction={() => {
					setChoosing(true);
				}}
			/>
			{savedDraft && (
				<p className="text-sm text-neutral-800">{t(`${key}.savedDraft`)}</p>
			)}
			{problem && (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.${problem}`)}
				</p>
			)}
			{choosing && (
				<PeopleChoiceDialog
					departmentName={department.name}
					people={people}
					value={value}
					onApply={(ids) => {
						setChosen({ departmentId: department.departmentId, ids });
						setChoosing(false);
					}}
					onClose={() => {
						setChoosing(false);
					}}
				/>
			)}
		</div>
	);
	return { idsToSend, problem, line };
};
