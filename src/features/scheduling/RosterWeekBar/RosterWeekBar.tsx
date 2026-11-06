import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import {
	formatPeriod,
	type SchedulePeriod,
} from "@/features/scheduling/periods";
import type { RosterLegendEntry } from "@/features/scheduling/roster/roster";
import { rosterLooks } from "@/features/scheduling/rosterLooks";

export type RosterWeekBarProps = {
	/** The weeks the schedule covers, Monday first. */
	weeks: Array<SchedulePeriod>;
	/** The shown week's Monday. */
	week: string;
	onWeekChange: (week: string) => void;
	/** Shows the week holding today, or the first week when today is outside the schedule. */
	onToday: () => void;
	/** What the roster's colours mean: a day off, leave and each shift. */
	legend: Array<RosterLegendEntry>;
	/** At the end of the bar, before Legend: the roster's Issues and Changed buttons. */
	children?: ReactNode;
	className?: string;
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
	const language = i18n.resolvedLanguage ?? i18n.language;
	const index = weeks.findIndex((item) => item.start === week);
	const swatches = legend.map((entry): Swatch =>
		entry.kind === "shift"
			? { key: entry.shiftId, label: entry.name, colour: entry.colour }
			: {
					key: entry.kind,
					label: t(`scheduling.detail.kinds.${entry.kind}`),
					look: rosterLooks[entry.kind],
				}
	);
	const step = (by: number): void => {
		const next = weeks[index + by];
		if (next) onWeekChange(next.start);
	};

	return (
		<div
			className={joinClassNames("flex flex-wrap items-center gap-4", className)}
		>
			<Button size="sm" variant="secondary" onClick={onToday}>
				{t("scheduling.detail.today")}
			</Button>
			<Button
				aria-label={t("scheduling.detail.previousWeek")}
				className="size-12! rounded-full! border border-neutral-500"
				disabled={index <= 0}
				variant="icon"
				onClick={() => {
					step(-1);
				}}
			>
				<ChevronLeftIcon />
			</Button>
			<Button
				aria-label={t("scheduling.detail.nextWeek")}
				className="size-12! rounded-full! border border-neutral-500"
				disabled={index === -1 || index >= weeks.length - 1}
				variant="icon"
				onClick={() => {
					step(1);
				}}
			>
				<ChevronRightIcon />
			</Button>
			<Select
				aria-label={t("scheduling.detail.week")}
				className="h-12! w-58 rounded-full!"
				value={week}
				options={weeks.map((item) => ({
					value: item.start,
					label: formatPeriod(item, language),
				}))}
				onChange={onWeekChange}
			/>
			<div className="ml-auto flex flex-wrap items-center gap-3">
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
