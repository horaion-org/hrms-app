import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { ConstraintType } from "@/features/scheduling/constraints/api";
import { constraintTypeLookOf } from "@/features/scheduling/constraints/constraintTypeLooks";

export type ChosenConstraintTypeProps = {
	type: ConstraintType;
	/** Goes back to the chooser; left out where the kind can't change. */
	onChange?: () => void;
	/** Why the kind can't change, said under it. */
	note?: string;
	disabled?: boolean;
};

/**
 * The kind of constraint being filled in, kept at the top of the form with
 * its icon and what it does, so the person always knows which rule this is;
 * Change returns to the chooser.
 */
export const ChosenConstraintType = ({
	type,
	onChange,
	note,
	disabled = false,
}: ChosenConstraintTypeProps): FunctionComponent => {
	const { t } = useTranslation();
	const look = constraintTypeLookOf(type, t);
	return (
		<div className="flex items-start gap-3 rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-3">
			<span
				aria-hidden="true"
				className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-blue-50 text-ink-blue-900 [&_svg]:size-6"
			>
				<look.Icon />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold text-neutral-900">{look.label}</p>
				{look.description && (
					<p className="text-xs text-neutral-800">{look.description}</p>
				)}
				{look.example && (
					<p className="mt-1 text-xs text-neutral-700">{look.example}</p>
				)}
				{note && <p className="mt-1 text-xs text-neutral-700">{note}</p>}
			</div>
			{onChange && (
				<Button
					disabled={disabled}
					variant="textlink"
					aria-label={t("scheduling.constraints.dialog.changeTypeLabel", {
						type: look.label,
					})}
					onClick={onChange}
				>
					{t("scheduling.constraints.dialog.changeType")}
				</Button>
			)}
		</div>
	);
};
