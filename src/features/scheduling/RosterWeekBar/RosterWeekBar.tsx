import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import {
	formatPeriod,
	type SchedulePeriod,
} from "@/features/scheduling/periods";
import type { RosterLegendEntry } from "@/features/scheduling/roster/roster";
import { rosterLooks } from "@/features/scheduling/rosterLooks";

/** A week the bar lists: its dates, with a state and whether it can be chosen when the bar steps through a month. */
export type RosterWeek = SchedulePeriod & {
	/** Shown after the dates in the picker, e.g. "Tentative"; none on a member's own roster. */
	state?: string;
	/** No schedule to open: listed, not chosen; the arrows step over it. */
	disabled?: boolean;
};

export type RosterWeekBarProps = {
	/** The weeks the bar steps through, Monday first: the schedule's own, or its Department's month. */
	weeks: Array<RosterWeek>;
	/** The shown week's Monday. */
	week: string;
	onWeekChange: (week: string) => void;
	/** Shows the week holding today, or the first week when today is outside the schedule. */
	onToday: () => void;
	/** What the roster's colours mean: each non-working day type, absent, leave and each shift. */
	legend: Array<RosterLegendEntry>;
	/** At the end of the bar, before Legend: the roster's Issues and Changed buttons. */
	children?: ReactNode;
	className?: string;
};

/** The nearest week in the direction `by` that can be chosen; none at the end. */
const neighbourOf = (
	weeks: ReadonlyArray<RosterWeek>,
	index: number,
	by: 1 | -1
): RosterWeek | undefined => {
	for (let at = index + by; at >= 0 && at < weeks.length; at += by) {
		const week = weeks[at];
		if (week && !week.disabled) return week;
	}
	return undefined;
};

/** One legend entry: a look from `rosterLooks`, or a shift's own colour. */
type Swatch = { key: string; label: string; look?: string; colour?: string };

/**
 * Moves a roster between its weeks, holds the roster's own buttons at its
 * end, and keys its colours on demand: the tiles already name their shift
 * and write out Off and Leave, so the key waits behind a "Legend" button
 * rather than sitting beside the grid.
 */
export const RosterWeekBar = ({
	weeks,
	week,
	onWeekChange,
	onToday,
	legend,
	children,
	className,
}: RosterWeekBarProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const index = weeks.findIndex((item) => item.start === week);
	const withStates = weeks.some((item) => item.state !== undefined);
	const swatches = legend.map((entry): Swatch => {
		if (entry.kind === "shift")
			return { key: entry.shiftId, label: entry.name, colour: entry.colour };
		if (entry.kind === "leave")
			return {
				key: entry.kind,
				label: t("scheduling.detail.kinds.leave"),
				look: rosterLooks.leave,
			};
		// Every non-working day and an absent day share the Off look; the words tell them apart.
		if (entry.kind === "absent")
			return {
				key: entry.kind,
				label: t("scheduling.detail.absent"),
				look: rosterLooks.off,
			};
		return {
			key: `off:${entry.dayType ?? ""}`,
			label:
				entry.dayType === null
					? t("scheduling.detail.kinds.off")
					: dayTypeLabel(entry.dayType, t),
			look: rosterLooks.off,
		};
	});
	const previous = index === -1 ? undefined : neighbourOf(weeks, index, -1);
	const next = index === -1 ? undefined : neighbourOf(weeks, index, 1);

	// On a phone the week takes one row, the picker between its arrows, and Today
	// joins the row of extras; the reading order stays Today, arrows, week.
	return (
		<div
			className={joinClassNames(
				"flex flex-wrap items-center gap-4 max-sm:gap-y-3",
				className
			)}
		>
			<Button
				className="max-sm:order-4"
				size="sm"
				variant="secondary"
				onClick={onToday}
			>
				{t("scheduling.detail.today")}
			</Button>
			<Button
				aria-label={t("scheduling.detail.previousWeek")}
				className="size-12! rounded-full! border border-neutral-500"
				disabled={previous === undefined}
				variant="icon"
				onClick={() => {
					if (previous) onWeekChange(previous.start);
				}}
			>
				<ChevronLeftIcon />
			</Button>
			<Button
				aria-label={t("scheduling.detail.nextWeek")}
				className="size-12! rounded-full! border border-neutral-500 max-sm:order-3"
				disabled={next === undefined}
				variant="icon"
				onClick={() => {
					if (next) onWeekChange(next.start);
				}}
			>
				<ChevronRightIcon />
			</Button>
			<Select
				aria-label={t("scheduling.detail.week")}
				value={week}
				className={joinClassNames(
					"h-12! rounded-full! max-sm:order-2 max-sm:w-auto max-sm:min-w-0 max-sm:grow max-sm:basis-40",
					// A week with its state ("30 Nov – 6 Dec 2026 · Generation failed") sizes the trigger to its label.
					withStates ? "w-auto" : "w-58"
				)}
				options={weeks.map((item) => ({
					value: item.start,
					label: item.state
						? t("scheduling.months.roster.weekWithState", {
								week: formatPeriod(item, language),
								state: item.state,
							})
						: formatPeriod(item, language),
					disabled: item.disabled,
				}))}
				onChange={onWeekChange}
			/>
			<div className="ml-auto flex flex-wrap items-center gap-3 max-sm:order-5">
				{children}
				{swatches.length > 0 && (
					<Popover>
						<PopoverButton as={Button} variant="textlink">
							{t("scheduling.detail.legend")}
						</PopoverButton>
						<PopoverPanel
							anchor="bottom end"
							className="z-60 max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-400 bg-white p-4 shadow-lg [--anchor-gap:8px] [--anchor-padding:16px]"
						>
							<ul
								aria-label={t("scheduling.detail.legend")}
								className="flex flex-col gap-2 text-xs font-medium text-neutral-800"
							>
								{swatches.map(({ key, label, look, colour }) => (
									<li key={key} className="flex items-center gap-2">
										<span
											aria-hidden="true"
											className={joinClassNames(
												"size-2.5 shrink-0 rounded-xs border",
												look
											)}
											style={
												colour
													? { backgroundColor: colour, borderColor: colour }
													: undefined
											}
										/>
										{label}
									</li>
								))}
							</ul>
						</PopoverPanel>
					</Popover>
				)}
			</div>
		</div>
	);
};
