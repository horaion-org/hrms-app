import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
	moveLine,
	type RepairNames,
} from "@/features/scheduling/cover/engineRepairWords";
import type {
	CoverCard,
	CoverCardBadge,
} from "@/features/scheduling/roster/coverCards";
import { ChangeTilePairs } from "./ChangeTilePairs";

export type CoverCardItemProps = {
	card: CoverCard;
	/** The short shift's name, which "Leaves <shift> 1 short" names. */
	shiftName: string;
	names: RepairNames;
	/** Opens the card's review inside the row; without it (an engine option on a published roster) it is made by hand. */
	onReview?: () => void;
};

const key = "scheduling.issues.cover";

/** Each badge's tone: within hours in green, extra hours and overtime in amber, a shift left short in red. */
const BADGE_TONES: Record<CoverCardBadge["kind"], BadgeTone> = {
	withinHours: "success",
	extraHours: "warning",
	overtime: "warning",
	leavesShort: "error",
	notRuleChecked: "neutral",
};

/**
 * One option: initials, the name with its one badge (and "Suggested" on the
 * one card suggested), the change drawn as before → after tiles, and Review.
 * An engine option the app cannot state says it is made by hand, in its words.
 */
export const CoverCardItem = ({
	card,
	shiftName,
	names,
	onReview,
}: CoverCardItemProps): FunctionComponent => {
	const { t } = useTranslation();
	const { badge, choice } = card;
	const reviewable =
		onReview !== undefined && (choice.kind === "backend" || choice.cells);
	return (
		<li
			className={joinClassNames(
				"grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border p-2.5",
				card.suggested ? "border-ink-blue-500" : "border-neutral-400"
			)}
		>
			<Avatar className="size-8! text-xs!" name={card.name} />
			<span className="flex min-w-0 flex-col gap-1">
				<span className="flex flex-wrap items-center gap-1.5">
					<span className="font-semibold text-neutral-900">{card.name}</span>
					<Badge compact tone={BADGE_TONES[badge.kind]}>
						{t(`${key}.badge.${badge.kind}`, {
							shift: shiftName,
							count: badge.kind === "leavesShort" ? badge.count : 0,
						})}
					</Badge>
					{card.suggested && (
						<Badge compact tone="neutral">
							{t("scheduling.cover.list.suggested")}
						</Badge>
					)}
				</span>
				{card.pairs.length > 0 ? (
					<ChangeTilePairs pairs={card.pairs} />
				) : (
					choice.kind === "engine" &&
					choice.option.moves.map((move) => (
						<span key={moveLine(move, names, t)} className="text-neutral-800">
							{moveLine(move, names, t)}
						</span>
					))
				)}
				{!reviewable && (
					<span className="text-neutral-700">
						{t("scheduling.cover.engine.byHand")}
					</span>
				)}
			</span>
			{reviewable && (
				<Button size="sm" variant="secondary" onClick={onReview}>
					{t(`${key}.review`)}
				</Button>
			)}
		</li>
	);
};
