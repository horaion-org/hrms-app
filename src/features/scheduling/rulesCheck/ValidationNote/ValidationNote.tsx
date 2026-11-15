import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { ValidationStanding } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

export type ValidationNoteProps = {
	/** How the list on screen compares with the roster on screen. */
	standing: ValidationStanding;
	/** Validate schedule's state: asking, refused, and the last answer. */
	validation: RosterValidation;
};

const key = "scheduling.rulesCheck";

/**
 * The one line at the head of Issues that says how the list stands: being
 * validated; refused (Try again when the engine failed); out of date since
 * the schedule changed, with Validate schedule right there; validated, with
 * what the engine could not check, or that nothing needs a look. Nothing
 * while the list is still the generation's and nothing has changed.
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
				{validation.refusal === "failed" && (
					<Button variant="textlink" onClick={validation.ask}>
						{t("scheduling.rosterEdit.tryAgain")}
					</Button>
				)}
			</div>
		);
	if (standing === "outOfDate")
		return (
			<Callout tone="warning">
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
	return <p className="text-neutral-700">{t(`${key}.validated`)}</p>;
};
