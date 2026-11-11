import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import { Badge } from "@/components/ui/Badge";
import { LockIcon } from "@/components/ui/LockIcon";
import type { Constraint } from "@/features/scheduling/scheduleDraft";

export type ConstraintOriginProps = {
	constraint: Pick<
		Constraint,
		| "level"
		| "lock"
		| "locked"
		| "overridesConstraintId"
		| "replacementStatus"
		| "replacesCompanyConstraint"
	>;
	/** Names the source too ("Work policy · Locked"); the work policy's own list leaves it out. */
	showLevel?: boolean;
	className?: string;
};

/**
 * Whether a department constraint stands in for a company one: a frozen copy
 * says so itself, a live one by its status, and one from an API that predates
 * the status by naming the company constraint it replaces.
 */
const standsIn = (constraint: ConstraintOriginProps["constraint"]): boolean => {
	if (constraint.replacesCompanyConstraint !== undefined) {
		return constraint.replacesCompanyConstraint;
	}
	if (constraint.replacementStatus) {
		return constraint.replacementStatus === "STANDS_IN";
	}
	return Boolean(constraint.overridesConstraintId);
};

/**
 * Where a constraint comes from and how firmly it binds (ADR-0058), as a
 * Badge, or muted text for the department's own:
 * - a work-policy constraint names its lock ("Work policy · Locked"), with a
 *   lock titled "Set in the work policy" when it is locked;
 * - a department's replacement reads "Stricter here" (a locked one) or
 *   "Changed here" (a default);
 * - a replacement the company constraint has since been tightened past reads
 *   "Company rule applies" in the warning tone: both are applied now.
 */
export const ConstraintOrigin = ({
	constraint,
	showLevel = true,
	className,
}: ConstraintOriginProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraints";
	const { level, lock, locked } = constraint;
	const companyLabel = [
		showLevel ? t(`${key}.levels.COMPANY`) : undefined,
		lock === "LOCKED" || lock === "DEFAULT"
			? t(`${key}.locks.${lock}`)
			: undefined,
	]
		.filter(Boolean)
		.join(" · ");
	const label = (): FunctionComponent => {
		if (level === "COMPANY") {
			return companyLabel ? (
				<Badge tone="neutral">{companyLabel}</Badge>
			) : (
				<span className="text-neutral-700">—</span>
			);
		}
		if (constraint.replacementStatus === "NO_LONGER_STRICTER") {
			return (
				<Badge title={t(`${key}.companyRuleAppliesHint`)} tone="warning">
					{t(`${key}.companyRuleApplies`)}
				</Badge>
			);
		}
		if (standsIn(constraint)) {
			return (
				<Badge tone="neutral">
					{t(locked ? `${key}.stricterHere` : `${key}.changedHere`)}
				</Badge>
			);
		}
		return (
			<span className="text-neutral-700">{t(`${key}.levels.DEPARTMENT`)}</span>
		);
	};
	return (
		<span
			className={joinClassNames(
				"inline-flex min-w-0 items-center gap-1.5 text-sm",
				className
			)}
		>
			{level === "COMPANY" &&
				(lock === "LOCKED" || (lock == null && locked)) && (
					<LockIcon
						className="size-4 shrink-0 text-neutral-700"
						title={t(`${key}.setByCompany`)}
					/>
				)}
			{label()}
		</span>
	);
};
