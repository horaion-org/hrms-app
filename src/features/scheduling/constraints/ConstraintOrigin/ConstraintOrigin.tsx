import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import { Badge } from "@/components/ui/Badge";
import { LockIcon } from "@/components/ui/LockIcon";
import type { Constraint } from "@/features/scheduling/scheduleDraft";

export type ConstraintOriginProps = {
	constraint: Pick<
		Constraint,
		"level" | "lock" | "locked" | "overridesConstraintId"
	>;
	/** Names the level too ("Company · Locked"); the Scheduling policy's own list leaves it out. */
	showLevel?: boolean;
	className?: string;
};

/**
 * Where a constraint comes from and how firmly it binds (ADR-0058): a lock
 * for one every schedule must apply, then the company's lock, the
 * department's replacement of a company constraint ("Stricter here" for a
 * locked one, "Changed here" for a default), or the department's own.
 */
export const ConstraintOrigin = ({
	constraint,
	showLevel = true,
	className,
}: ConstraintOriginProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraints";
	const { level, lock, locked, overridesConstraintId } = constraint;
	const words =
		level === "COMPANY"
			? [
					showLevel ? t(`${key}.levels.COMPANY`) : undefined,
					lock === "LOCKED" || lock === "DEFAULT"
						? t(`${key}.locks.${lock}`)
						: undefined,
				]
					.filter(Boolean)
					.join(" · ")
			: undefined;
	return (
		<span
			className={joinClassNames(
				"inline-flex items-center gap-1.5 text-sm text-neutral-800",
				className
			)}
		>
			{locked && (
				<LockIcon
					className="size-4 shrink-0 text-neutral-700"
					title={t(`${key}.alwaysApplied`)}
				/>
			)}
			{level === "COMPANY" ? (
				words || t(`${key}.levels.COMPANY`)
			) : overridesConstraintId ? (
				<Badge tone="neutral">
					{t(locked ? `${key}.stricterHere` : `${key}.changedHere`)}
				</Badge>
			) : (
				<span className="text-neutral-700">
					{t(`${key}.levels.DEPARTMENT`)}
				</span>
			)}
		</span>
	);
};
