import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
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
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
};

/**
 * A rest-day or day-off row's fix: the day drawn as one before → after pair,
 * "Sun, Oct 18 · Day off" → "Sun, Oct 18 · Rest day", and Apply, which makes
 * it as the fix always has (applied, or on a published roster opened in the
 * day's editor).
 */
export const RetypeFix = ({
	retype,
	fixes,
	language,
}: RetypeFixProps): FunctionComponent => {
	const { t } = useTranslation();
	const day = formatDay(retype.day, language);
	const labelOf = (dayType: string): string =>
		`${day} · ${dayTypeLabel(dayType, t)}`;
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<ChangeTilePairs
				pairs={[
					{
						key: retype.issueKey,
						before: { kind: "day", label: labelOf(retype.from) },
						after: { kind: "day", label: labelOf(retype.to) },
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
