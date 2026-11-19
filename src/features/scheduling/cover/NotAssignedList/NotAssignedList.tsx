import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { NotAssignedPerson } from "@/features/scheduling/cover/engineRepairApi";
import {
	couldTakeTheShift,
	notAssignedInOrder,
	notAssignedReasonLine,
} from "@/features/scheduling/cover/notAssignedWords";

export type NotAssignedListProps = {
	/** Why each person with the gap's job title was not assigned; null or left out when the engine could not work it out. */
	people?: Array<NotAssignedPerson> | null;
};

const key = "scheduling.cover.engine.whyNot";

/**
 * Under the engine's repair options: why nobody was assigned, one person a
 * line with their reasons in plain words, those who could take the shift
 * first. Nothing when the engine could not work it out; a plain line when
 * nobody else holds the job title.
 */
export const NotAssignedList = ({
	people,
}: NotAssignedListProps): FunctionComponent => {
	const { t } = useTranslation();
	const headingId = useId();
	if (people === null || people === undefined) return null;
	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-2">
			<h3 className="text-sm font-medium text-neutral-800" id={headingId}>
				{t(`${key}.title`)}
			</h3>
			{people.length === 0 ? (
				<p className="text-neutral-800">{t(`${key}.nobodyElse`)}</p>
			) : (
				<ul className="flex flex-col gap-2">
					{notAssignedInOrder(people).map((person) => (
						<li key={person.memberProfileId}>
							<p className="font-semibold text-neutral-900">{person.name}</p>
							<ul className="text-neutral-800">
								{couldTakeTheShift(person) && <li>{t(`${key}.couldTake`)}</li>}
								{person.reasons.map((reason, place) => (
									// A reason has no id of its own; its place in the engine's list is stable.
									<li key={place}>{notAssignedReasonLine(reason, t)}</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};
