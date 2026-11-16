import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { HistoryIcon } from "@/components/ui/Icon";
import type { WaitingApproval } from "@/features/dashboard/api";
import {
	failedLineClasses,
	HOME_ROW_COUNT,
	rowAsideClasses,
	rowClasses,
	rowLeadClasses,
	rowListClasses,
	rowTextClasses,
} from "@/features/dashboard/cardStyles";
import type { GuardedRead } from "@/features/dashboard/guardedRead";

const key = "dashboard.cards.waitingApprovals";

/** The subjects the card names in its own words; anything else reads as "Approval". */
type SubjectWords = "LEAVE_REQUEST" | "SCHEDULE_PUBLICATION" | "OTHER";

/** The words an approval's subject is named with. */
const subjectWordsOf = (subjectType: string): SubjectWords =>
	subjectType === "LEAVE_REQUEST" || subjectType === "SCHEDULE_PUBLICATION"
		? subjectType
		: "OTHER";

export type WaitingApprovalsCardProps = {
	/** The approvals waiting in the person's units, oldest first, less any listed elsewhere on Home. */
	approvals: GuardedRead<Array<WaitingApproval>>;
	className?: string;
};

/** When a step began to wait, e.g. "16 Nov". */
const sinceLabel = (waitingSince: string, language: string): string =>
	new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(
		new Date(waitingSince)
	);

/**
 * The approvals waiting in the person's units, oldest first, a line each:
 * whose it is, what waits and at which step, and since when on the right.
 * A stalled step is marked in the day's place, since its flow's managers
 * were already told.
 */
export const WaitingApprovalsCard = ({
	approvals,
	className,
}: WaitingApprovalsCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	if (approvals.status === "hidden") return null;
	return (
		<Card className={className} icon={HistoryIcon} title={t(`${key}.title`)}>
			{approvals.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{approvals.status === "ready" && (
				<ExpandableList
					collapsedCount={HOME_ROW_COUNT}
					itemClassName={rowClasses}
					items={approvals.data}
					keyOf={(approval) => approval.approvalInstanceId}
					listClassName={rowListClasses}
					renderItem={(approval) => (
						<>
							<span className={rowTextClasses}>
								<span className={rowLeadClasses}>
									{approval.memberDisplayName ?? t(`${key}.formerMember`)}
								</span>
								{" · "}
								{t(`${key}.subjects.${subjectWordsOf(approval.subjectType)}`)}
								{" · "}
								{t(`${key}.step`, {
									step: approval.currentStepOrder,
									total: approval.stepCount,
								})}
							</span>
							{approval.stalled ? (
								<Badge className="shrink-0" tone="warning">
									{t(`${key}.stalled`)}
								</Badge>
							) : (
								<span className={rowAsideClasses}>
									{t(`${key}.since`, {
										since: sinceLabel(approval.waitingSince, language),
									})}
								</span>
							)}
						</>
					)}
				/>
			)}
		</Card>
	);
};
