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
import { rosterLooks } from "@/features/scheduling/rosterLooks";

export type RosterWeekBarProps = {
	/** The weeks the schedule covers, Monday first. */
	weeks: Array<SchedulePeriod>;
	/** The shown week's Monday. */
	week: string;
	onWeekChange: (week: string) => void;
	/** Shows the week holding today, or the first week when today is outside the schedule. */
	onToday: () => void;
	className?: string;
};

const LEGEND = ["full", "half", "off", "open"] as const;

/** Moves a roster between its weeks, and keys its colours. */
export const RosterWeekBar = ({
	weeks,
	week,
	onWeekChange,
	onToday,
	className,
}: RosterWeekBarProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const index = weeks.findIndex((item) => item.start === week);
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
			<ul
				aria-label={t("scheduling.detail.legend")}
				className="ml-auto flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-neutral-800"
			>
				{LEGEND.map((kind) => (
					<li key={kind} className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className={joinClassNames(
								"size-2.5 rounded-xs border",
								rosterLooks[kind]
							)}
						/>
						{t(`scheduling.detail.kinds.${kind}`)}
					</li>
				))}
			</ul>
		</div>
	);
};
