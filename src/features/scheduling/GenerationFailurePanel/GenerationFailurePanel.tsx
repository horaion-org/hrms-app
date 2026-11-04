import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WarningIcon } from "@/components/ui/Icon";
import { MemberNotes } from "@/features/scheduling/MemberNotes";
import { findingsByMember } from "@/features/scheduling/roster/findingsByMember";
import { generationFailure } from "@/features/scheduling/roster/generationFailure";
import type { ScheduleGeneration } from "@/features/scheduling/schedules/api";

export type GenerationFailurePanelProps = {
	/** The schedule's newest run, or null when it has none. */
	generation: ScheduleGeneration | null;
	/** Offers to generate the schedule again, as the next step; left out when it can't be. */
	onRegenerate?: () => void;
	className?: string;
};

const key = "scheduling.generation";

/**
 * Why the newest run produced no roster: the app's copy for its error code,
 * then the engine's own explanation and errors, quoted, and the offer to
 * generate it again.
 */
export const GenerationFailurePanel = ({
	generation,
	onRegenerate,
	className,
}: GenerationFailurePanelProps): FunctionComponent => {
	const { t } = useTranslation();
	const { message, code } = generationFailure(generation, t);
	const findings = generation?.findings ?? null;
	const groups = findings ? findingsByMember(findings) : [];
	return (
		<Card
			className={className}
			icon={WarningIcon}
			title={t(`${key}.failedTitle`)}
		>
			<div className="text-sm text-neutral-800">
				<p>{message}</p>
				{code && (
					<p className="mt-1 text-xs text-neutral-700">
						{t(`${key}.code`, { code })}
					</p>
				)}
			</div>
			{findings?.failureReason && (
				<figure className="text-sm">
					<figcaption className="font-semibold text-neutral-800">
						{t(`${key}.engineSaid`)}
					</figcaption>
					<blockquote className="mt-2 border-l-4 border-neutral-400 pl-4 text-neutral-900">
						{findings.failureReason}
					</blockquote>
				</figure>
			)}
			{groups.length > 0 && <MemberNotes groups={groups} />}
			{onRegenerate && (
				<div>
					<Button size="sm" onClick={onRegenerate}>
						{t("scheduling.regenerate.retry")}
					</Button>
				</div>
			)}
		</Card>
	);
};
