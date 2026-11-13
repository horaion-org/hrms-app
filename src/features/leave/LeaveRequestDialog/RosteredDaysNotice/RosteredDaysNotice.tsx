import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import type { RosteredDay } from "@/features/leave/api";
import { timeRangeText } from "@/features/leave/dayPortion";

export type RosteredDaysNoticeProps = {
	days: ReadonlyArray<RosteredDay>;
	/** Who is rostered; left out when it is the person reading. */
	name?: string;
	/** With a value, the reader must confirm taking the person off the shifts. */
	confirmed?: boolean;
	onConfirmedChange?: (confirmed: boolean) => void;
	/** With it, reading the days failed and they can't be confirmed: offers trying again. */
	onRetry?: () => void;
};

const dayFormat = (language: string): Intl.DateTimeFormat =>
	new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
		month: "short",
	});

/** A part-day leave's day whose shift approving would keep in part (the API's ADR-0077, part 4). */
const keptInPart = (
	days: ReadonlyArray<RosteredDay>
): RosteredDay | undefined => {
	const [day] = days;
	return days.length === 1 &&
		(day!.outcome === "SHORTENED" || day!.outcome === "WORKS_AROUND") &&
		day!.gap
		? day
		: undefined;
};

/** The shift's time, the time still worked and the hours that would need cover, in words. */
const partDayWords = (
	rostered: RosteredDay,
	t: TFunction
): { shift: string; time: string; gap: string } => ({
	shift:
		rostered.shiftStart && rostered.shiftEnd
			? timeRangeText(rostered.shiftStart, rostered.shiftEnd, t)
			: "",
	time: (rostered.workedTimes ?? [])
		.map((piece) => timeRangeText(piece.start, piece.end, t))
		.join(" · "),
	gap: timeRangeText(rostered.gap!.start, rostered.gap!.end, t),
});

/**
 * The rostered days of a leave period; nothing at all when there are none.
 * For part-day leave that keeps part of the shift, it says what approving
 * would do: the time still worked and the hours that would need cover.
 */
export const RosteredDaysNotice = ({
	days,
	name,
	confirmed,
	onConfirmedChange,
	onRetry,
}: RosteredDaysNoticeProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	if (onRetry)
		return (
			<Callout tone="warning">
				{t("leave.rosteredCheckFailed")}{" "}
				<Button variant="textlink" onClick={onRetry}>
					{t("leave.retry")}
				</Button>
			</Callout>
		);
	if (days.length === 0) return null;
	const format = dayFormat(formattingLocale(i18n));
	const list = new Intl.ListFormat(i18n.language).format(
		days.map(({ day }) => format.format(new Date(`${day}T12:00:00`)))
	);
	const partDay = keptInPart(days);
	const words = partDay ? partDayWords(partDay, t) : undefined;
	const message =
		name === undefined
			? words
				? t("leave.partDayOwn", { ...words, day: list })
				: t("leave.rosteredOwn", { days: list })
			: words
				? t("leave.partDayOther", { ...words, name })
				: t("leave.rosteredOther", { name, days: list });
	const confirmLabel =
		name === undefined
			? t("leave.rosteredConfirmEmployee")
			: words
				? t("leave.partDayConfirm", { ...words, name, day: list })
				: t("leave.rosteredConfirm", { name });
	return (
		<div className="space-y-3">
			<Callout tone={confirmed === undefined ? "info" : "warning"}>
				{message}
			</Callout>
			{confirmed !== undefined && (
				<Checkbox
					checked={confirmed}
					label={confirmLabel}
					onChange={(event) => {
						onConfirmedChange?.(event.target.checked);
					}}
				/>
			)}
		</div>
	);
};
