import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { TickIcon } from "@/components/ui/Icon";
import { validationMark } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { LastValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

export type ValidateScheduleButtonProps = {
	/** The roster revision on screen. */
	revision: number;
	/** The latest validation this visit, and the revision it was for; none before the first. */
	last?: LastValidation;
	/** Whether the roster carries hand changes, which prompt a first validation. */
	hasChanges: boolean;
	/** Whether Issues, which it validates into, is open beside the grid, for `aria-expanded`. */
	open: boolean;
	/** The panel's id, for `aria-controls` while open. */
	panelId: string;
	onClick: (from: HTMLElement) => void;
};

const key = "scheduling.rulesCheck";

/**
 * Validate schedule in the week bar, beside Issues and Changed and built as
 * they are; pressing it validates and opens Issues, which then shows the
 * validation's gaps and broken rules. It lights up (the primary look) while the roster changed since it
 * was last validated in this visit, or has hand changes and was never
 * validated, and says so in its name; once the roster on screen is validated
 * it is plain again, with the problems' count, as Issues shows its count, or
 * a tick when there are none.
 */
export const ValidateScheduleButton = ({
	revision,
	last,
	hasChanges,
	open,
	panelId,
	onClick,
}: ValidateScheduleButtonProps): FunctionComponent => {
	const { t } = useTranslation();
	const changedSinceValidated = last ? last.revision !== revision : hasChanges;
	const mark =
		!changedSinceValidated && last ? validationMark(last.check) : undefined;
	const label = (): string => {
		if (changedSinceValidated) return t(`${key}.changedSinceValidated`);
		if (mark?.kind === "problems")
			return t(`${key}.problemsFound`, { count: mark.count });
		if (mark?.kind === "clean") return t(`${key}.allClear`);
		return t(`${key}.check`);
	};
	return (
		<Button
			aria-controls={open ? panelId : undefined}
			aria-expanded={open}
			aria-label={label()}
			size="sm"
			variant={changedSinceValidated ? "primary" : "secondary"}
			onClick={(event) => {
				onClick(event.currentTarget);
			}}
		>
			{t(`${key}.check`)}
			{mark?.kind === "problems" && (
				<CountBadge aria-hidden="true" count={mark.count} tone="inactive" />
			)}
			{mark?.kind === "clean" && (
				<TickIcon aria-hidden="true" className="text-success-500" />
			)}
		</Button>
	);
};
