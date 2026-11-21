import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import type {
	DayTypeRetype,
	IssueFixes,
} from "@/features/scheduling/roster/dayTypeFix";
import { ChangeTilePairs } from "./ChangeTilePairs";

export type RetypeFixProps = {
	retype: DayTypeRetype;
	fixes: Pick<IssueFixes, "onFix" | "busy">;
};

/**
 * A rest-day or day-off row's fix: the day drawn as one before → after pair,
 * "Sun, Oct 18  Day off → Rest day", and Apply, which makes
 * it as the fix always has (applied, or on a published roster opened in the
 * day's editor).
 */
export const RetypeFix = ({
	retype,
	fixes,
}: RetypeFixProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<ChangeTilePairs
				groups={[
					{
						membershipId: retype.membershipId,
						name: "",
						days: [
							{
								key: retype.issueKey,
								day: retype.day,
								before: { kind: "day", label: dayTypeLabel(retype.from, t) },
								after: { kind: "day", label: dayTypeLabel(retype.to, t) },
							},
						],
					},
				]}
			/>
			<Button
				disabled={fixes.busy}
				size="sm"
				onClick={(): void => {
					fixes.onFix(retype);
				}}
			>
				{t("scheduling.rosterEdit.apply")}
			</Button>
		</div>
	);
};
