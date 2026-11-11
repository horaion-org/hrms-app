import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";

/** A setup tab narrowed to the week's department. */
export type SetupLink = {
	to: "/scheduling";
	search: {
		view: "shifts" | "constraints";
		branch: string;
		department: string;
	};
};

export type WeekChoiceSummaryProps = {
	/** What the week uses, as `usesLineOf` words it. */
	line: string;
	/** The action after the line, e.g. "Choose for this week"; none when left out. */
	actionLabel?: string;
	onAction?: () => void;
	/** Opens the Shifts tab on the department; left out without `shift:read` there. */
	editShifts?: SetupLink;
	/** Opens the Constraints tab on the department; left out without `constraint:read` there. */
	editConstraints?: SetupLink;
	className?: string;
};

/**
 * One line saying what the week uses of its department's setup, with the
 * action that opens the week's choice, and under it the links to edit the
 * department's shifts and constraints, each only where it may be opened.
 */
export const WeekChoiceSummary = ({
	line,
	actionLabel,
	onAction,
	editShifts,
	editConstraints,
	className,
}: WeekChoiceSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.week";
	return (
		<div className={className}>
			<p className="text-sm text-neutral-800">
				{line}
				{actionLabel && onAction && (
					<>
						{" "}
						<Button variant="textlink" onClick={onAction}>
							{actionLabel}
						</Button>
					</>
				)}
			</p>
			{(editShifts || editConstraints) && (
				<p className="mt-1 text-sm text-neutral-700">
					{editShifts && (
						<Button
							search={editShifts.search}
							to={editShifts.to}
							variant="textlink"
						>
							{t(`${key}.editShifts`)}
						</Button>
					)}
					{editShifts && editConstraints && " · "}
					{editConstraints && (
						<Button
							search={editConstraints.search}
							to={editConstraints.to}
							variant="textlink"
						>
							{t(`${key}.editConstraints`)}
						</Button>
					)}
				</p>
			)}
		</div>
	);
};
