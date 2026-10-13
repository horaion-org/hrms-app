import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { ConstraintCategory } from "@/features/scheduling/constraints/api";

export type ConstraintTypeTagProps = {
	category: ConstraintCategory;
	className?: string;
};

const dotClasses: Record<ConstraintCategory, string> = {
	STAFFING: "bg-blue-600",
	ROLE_COVERAGE: "bg-violet-500",
	SHIFT_PATTERN: "bg-teal-500",
	WORKING_HOURS: "bg-amber-500",
};

/** The category a constraint's type is listed under, with its colour key; hovering says what it covers. */
export const ConstraintTypeTag = ({
	category,
	className,
}: ConstraintTypeTagProps): FunctionComponent => {
	const { t } = useTranslation();

	return (
		<span
			title={t(`scheduling.constraints.categoryHints.${category}`)}
			className={joinClassNames(
				"inline-flex min-w-0 items-center gap-2 font-medium",
				className
			)}
		>
			<span
				aria-hidden="true"
				className={joinClassNames(
					"size-1.5 shrink-0 rounded-full",
					dotClasses[category]
				)}
			/>
			<span className="truncate">
				{t(`scheduling.constraints.categories.${category}`)}
			</span>
		</span>
	);
};
