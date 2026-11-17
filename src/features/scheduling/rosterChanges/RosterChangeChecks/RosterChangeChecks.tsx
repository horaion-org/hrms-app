import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type {
	RosterCheck,
	RosterCheckSeverity,
} from "@/features/scheduling/rosterChanges/api";
import {
	checkSentence,
	type CheckNames,
} from "@/features/scheduling/rosterChanges/checkSentence";

export type RosterChangeChecksProps = {
	/** The preview's checks, the most serious first. */
	checks: ReadonlyArray<RosterCheck>;
	names: CheckNames;
};

/** Existing tones only: what can't happen or needs a remark reads as an error, a tick as a warning. */
const SEVERITY_TONES: Record<RosterCheckSeverity, BadgeTone> = {
	REFUSED: "error",
	NEEDS_REMARK: "error",
	NEEDS_ACKNOWLEDGEMENT: "warning",
	INFO: "neutral",
};

const key = "scheduling.rosterEdit";

/**
 * What a hand change would run into, one line each with what it asks of the
 * person: plain facts about leave, roles, availability and coverage. Rules
 * are never judged here.
 */
export const RosterChangeChecks = ({
	checks,
	names,
}: RosterChangeChecksProps): FunctionComponent => {
	const { t } = useTranslation();
	if (checks.length === 0)
		return <p className="text-sm text-neutral-800">{t(`${key}.noProblems`)}</p>;
	return (
		<ul className="flex flex-col gap-3 text-sm">
			{checks.map((check, index) => {
				const sentence = checkSentence(check, names);
				return (
					<li
						// A check has no id of its own; the list is replaced, never reordered.
						key={index}
						className="flex items-start gap-2"
					>
						<Badge className="shrink-0" tone={SEVERITY_TONES[check.severity]}>
							{t(`${key}.severity.${check.severity}`)}
						</Badge>
						<span className="text-neutral-900">
							{t(sentence.key, sentence.values)}
						</span>
					</li>
				);
			})}
		</ul>
	);
};
