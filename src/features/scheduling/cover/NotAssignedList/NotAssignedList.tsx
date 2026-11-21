import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Disclosure } from "@/components/ui/Disclosure";
import type { NotAssignedPerson } from "@/features/scheduling/cover/engineRepairApi";
import {
	couldTakeTheShift,
	notAssignedInOrder,
	notAssignedReasonLine,
} from "@/features/scheduling/cover/notAssignedWords";

export type NotAssignedListProps = {
	/** Why each person with the gap's job title was not assigned; null or left out when the engine could not work it out. */
	people?: Array<NotAssignedPerson> | null;
	/** The fold's words; "Why nobody was assigned" without. */
	title?: string;
	/** Starts open, as when no option can be shown and this is all there is to read. */
	defaultOpen?: boolean;
};

const key = "scheduling.cover.engine.whyNot";

/**
 * Under the engine's repair options, closed until opened (or open from the
 * start when asked): why nobody was assigned, one person a line with their
 * reasons in plain words, those who could take the shift first; "Could take
 * this shift." only for someone the engine gives no reason for. Nothing when the engine could not work it out;
 * a plain line when nobody else holds the job title.
 */
export const NotAssignedList = ({
	people,
	title,
	defaultOpen = false,
}: NotAssignedListProps): FunctionComponent => {
	const { t } = useTranslation();
	if (people === null || people === undefined) return null;
	return (
		<Disclosure
			defaultOpen={defaultOpen}
			title={title ?? t(`${key}.title`)}
			variant="inline"
		>
			{people.length === 0 ? (
				<p className="text-neutral-800">{t(`${key}.nobodyElse`)}</p>
			) : (
				<ul className="flex flex-col gap-2">
					{notAssignedInOrder(people).map((person) => (
						<li key={person.memberProfileId}>
							<p className="font-semibold text-neutral-900">{person.name}</p>
							<ul className="text-neutral-800">
								{person.reasons.length === 0 && couldTakeTheShift(person) && (
									<li>{t(`${key}.couldTake`)}</li>
								)}
								{person.reasons.map((reason, place) => (
									// A reason has no id of its own; its place in the engine's list is stable.
									<li key={place}>{notAssignedReasonLine(reason, t)}</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			)}
		</Disclosure>
	);
};
