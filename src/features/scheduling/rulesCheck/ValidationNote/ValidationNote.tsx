import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
	changesUnchecked,
	type ValidationStanding,
} from "@/features/scheduling/rulesCheck/issuesFromValidation";
import {
	brokenRuleCount,
	RETRYABLE_CHECK_REFUSALS,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

export type ValidationNoteProps = {
	/** How the list on screen compares with the roster on screen. */
	standing: ValidationStanding;
	/** Validate schedule's state: asking, refused, and the last answer. */
	validation: RosterValidation;
};

const key = "scheduling.rulesCheck";

/**
 * The status card at the head of Issues, one short sentence in its own tone:
 * hand changes not validated in this visit, so the list is only the
 * generation's (warning, with Validate schedule as the main action); out of
 * date since the schedule changed (neutral, with Validate schedule); may
 * be incomplete (warning, with Validate again); broken, counting the rules
 * (error; the rules themselves are rows below); what the engine could not
 * check (info); or holds (success). While validating or refused, a line
 * saying so. Nothing while the list is still the generation's and nothing
 * has changed.
 */
export const ValidationNote = ({
	standing,
	validation,
}: ValidationNoteProps): FunctionComponent => {
	const { t } = useTranslation();
	if (validation.status === "loading")
		return (
			<p aria-live="polite" className="text-neutral-800">
				{t(`${key}.loading`)}
			</p>
		);
	if (validation.status === "refused")
		return (
			<div className="flex flex-col items-start gap-2" role="alert">
				<p className="text-neutral-800">
					{t(`${key}.refusal.${validation.refusal}`)}
				</p>
				{RETRYABLE_CHECK_REFUSALS.includes(validation.refusal) && (
					<Button variant="textlink" onClick={validation.ask}>
						{t("scheduling.rosterEdit.tryAgain")}
					</Button>
				)}
			</div>
		);
	if (changesUnchecked(standing, validation.last))
		return (
			<Callout tone="warning">
				<span className="block">{t(`${key}.changesUnchecked`)}</span>
				<Button
					className="mt-2"
					size="sm"
					variant="primary"
					onClick={validation.ask}
				>
					{t(`${key}.check`)}
				</Button>
			</Callout>
		);
	if (standing === "outOfDate")
		return (
			<Callout tone="neutral">
				<span className="block">{t(`${key}.outOfDate`)}</span>
				<Button
					className="mt-2"
					size="sm"
					variant="secondary"
					onClick={validation.ask}
				>
					{t(`${key}.check`)}
				</Button>
			</Callout>
		);
	const check = validation.last?.check;
	if (standing !== "current" || !check) return null;
	// The engine ran out of time: what it found holds, but the list may not be all of it.
	if (check.mayBeShort)
		return (
			<Callout tone="warning">
				<span className="block">{t(`${key}.mayBeShort`)}</span>
				<Button
					className="mt-2"
					size="sm"
					variant="secondary"
					onClick={validation.ask}
				>
					{t(`${key}.validateAgain`)}
				</Button>
			</Callout>
		);
	// Broken: the card counts the rules; each one is a row under Must fix. A roster
	// broken with no rule named counts as one, listed for the whole roster.
	if (check.status === "BROKEN")
		return (
			<Callout tone="error">
				{t(`${key}.brokenCount`, { count: brokenRuleCount(check) })}
			</Callout>
		);
	const lines = [
		check.status === "UNCHECKED" ? t(`${key}.rulesUnchecked`) : undefined,
		check.staffingGaps === null ? t(`${key}.staffingUnchecked`) : undefined,
	].filter((line): line is string => line !== undefined);
	if (lines.length > 0)
		return (
			<Callout tone="info">
				{lines.map((line) => (
					<span key={line} className="block">
						{line}
					</span>
				))}
			</Callout>
		);
	return <Callout tone="success">{t(`${key}.validated`)}</Callout>;
};
