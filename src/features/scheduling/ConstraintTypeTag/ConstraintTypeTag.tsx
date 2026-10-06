import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { ConstraintType } from "@/features/scheduling/scheduleDraft";

export type ConstraintTypeTagProps = {
	type: ConstraintType;
	className?: string;
};

const dotClasses: Record<ConstraintType, string> = {
	STAFFING_REQUIREMENT: "bg-blue-600",
	ROLE_COVERAGE: "bg-violet-500",
	SHIFT_PATTERN: "bg-teal-500",
	WORKING_HOURS: "bg-amber-500",
};

/** A constraint's type with its colour key; hovering says what the type covers. */
export const ConstraintTypeTag = ({
	type,
	className,
}: ConstraintTypeTagProps): FunctionComponent => {
	const { t } = useTranslation();

	return (
		<span
			title={t(`scheduling.constraints.typeHints.${type}`)}
			className={joinClassNames(
				"inline-flex min-w-0 items-center gap-2 font-medium",
				className
			)}
		>
			<span
				aria-hidden="true"
				className={joinClassNames(
					"size-1.5 shrink-0 rounded-full",
					dotClasses[type]
				)}
			/>
			<span className="truncate">
				{t(`scheduling.constraints.types.${type}`)}
			</span>
		</span>
	);
};
