import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { formatDayAndMonth } from "@/features/scheduling/months/monthWeeks";

/** What is known of the hours worked this month before a roster. */
export type OpeningHoursState =
	/** No draft to read them from yet; `carried` when a roster covers the week before. */
	| { kind: "notRead"; carried: boolean }
	/** The read failed. */
	| { kind: "failed" }
	/** The roster starts on the 1st: nothing carries over. */
	| { kind: "notNeeded" }
	/** Read: how many people's hours are still unknown. */
	| { kind: "read"; unknownCount: number };

export type OpeningHoursCalloutProps = {
	/** The roster's first day; the hours are those worked this month before it. Unread when the read failed. */
	asOf: string;
	hours: OpeningHoursState;
	/** Opens the hours; left out when they can't be changed here. */
	onAdd?: () => void;
	/** The button waits while `onAdd`'s own work is under way, such as saving the first week's draft. */
	adding?: boolean;
	/** Reads the hours again after a failure. */
	onRetry?: () => void;
	className?: string;
};

const key = "scheduling.openingHours";

/**
 * The line about the hours people already worked this month before a roster
 * (the nearest analogue: StartingContextCallout, a warning with its button on
 * its own line). Unknown hours warn, name how many people, why it matters,
 * and offer to add them; known hours read calmly with a link to edit; a
 * failed read says so with a retry. It never blocks generating.
 */
export const OpeningHoursCallout = ({
	asOf,
	hours,
	onAdd,
	adding = false,
	onRetry,
	className,
}: OpeningHoursCalloutProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	/** A button on its own line under the words. */
	const button = (
		label: string,
		onClick: (() => void) | undefined,
		busy = false
	): FunctionComponent =>
		onClick === undefined ? null : (
			<span className="mt-3 block">
				<Button disabled={busy} size="sm" variant="secondary" onClick={onClick}>
					{label}
				</Button>
			</span>
		);

	if (hours.kind === "failed")
		return (
			<Callout className={className} tone="warning">
				<span className="block">{t(`${key}.readFailed`)}</span>
				{button(t(`${key}.retry`), onRetry)}
			</Callout>
		);

	if (hours.kind === "notNeeded")
		return <Callout className={className}>{t(`${key}.notNeeded`)}</Callout>;

	const day = formatDayAndMonth(asOf, formattingLocale(i18n));

	if (hours.kind === "notRead" && hours.carried)
		return (
			<Callout className={className}>
				<span className="block">{t(`${key}.fromWeekBefore`, { day })}</span>
				{button(t(`${key}.addHours`), onAdd, adding)}
			</Callout>
		);

	if (hours.kind === "read" && hours.unknownCount === 0)
		return (
			<Callout className={className}>
				<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
					<span>{t(`${key}.allKnown`, { day })}</span>
					{onAdd && (
						<Button variant="textlink" onClick={onAdd}>
							{t(`${key}.edit`)}
						</Button>
					)}
				</span>
			</Callout>
		);

	return (
		<Callout className={className} tone="warning">
			<span className="block">
				{hours.kind === "read"
					? t(`${key}.unknown`, { count: hours.unknownCount, day })
					: t(`${key}.notAddedYet`, { day })}
			</span>
			<span className="mt-1 block font-normal">
				{t(`${key}.unknownRisk`, { day })}
			</span>
			{button(
				t(hours.kind === "read" ? `${key}.add` : `${key}.addHours`),
				onAdd,
				adding
			)}
		</Callout>
	);
};
