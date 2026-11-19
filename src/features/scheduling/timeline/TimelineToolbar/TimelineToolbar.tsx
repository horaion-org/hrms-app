import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { DatePicker } from "@/components/forms/DatePicker";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import {
	DAYS_IN_VIEW,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";

const VIEWS = Object.keys(DAYS_IN_VIEW) as Array<TimelineView>;

/** One option of the joined zoom control: a divider before every option but the first. */
const zoomOptionClasses =
	"cursor-pointer px-4 text-sm whitespace-nowrap not-first:border-l not-first:border-neutral-500 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-blue-500";

export type TimelineToolbarProps = {
	view: TimelineView;
	/** The first day shown (ISO date), the date control's value. */
	firstDay: string;
	onToday: () => void;
	/** Moves the window one view's length earlier (-1) or later (1). */
	onStep: (step: 1 | -1) => void;
	/** Opens the window on a new first day: the Monday of the day picked in "Go to date". */
	onFromChange: (from: string) => void;
	onViewChange: (view: TimelineView) => void;
};

/**
 * Today, earlier and later days (styled as the week navigator), "Go to date"
 * and the zoom as one joined control.
 */
export const TimelineToolbar = ({
	view,
	firstDay,
	onToday,
	onStep,
	onFromChange,
	onViewChange,
}: TimelineToolbarProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.timeline.toolbar";
	return (
		<div
			aria-label={t(`${key}.label`)}
			className="flex flex-wrap items-center gap-3"
			role="group"
		>
			<Button size="sm" variant="secondary" onClick={onToday}>
				{t(`${key}.today`)}
			</Button>
			<Button
				aria-label={t(`${key}.previous`)}
				className="size-12! rounded-full! border border-neutral-500"
				variant="icon"
				onClick={() => {
					onStep(-1);
				}}
			>
				<ChevronLeftIcon />
			</Button>
			<Button
				aria-label={t(`${key}.next`)}
				className="size-12! rounded-full! border border-neutral-500"
				variant="icon"
				onClick={() => {
					onStep(1);
				}}
			>
				<ChevronRightIcon />
			</Button>
			<DatePicker
				className="w-44"
				label={t(`${key}.goToDate`)}
				mode="single"
				value={firstDay}
				onChange={(day) => {
					if (day !== "") onFromChange(mondayOf(day));
				}}
			/>
			{/* One joined control, as the approved design draws it; the app has no segmented control to reuse. */}
			<div
				aria-label={t(`${key}.zoom`)}
				className="inline-flex h-12 overflow-hidden rounded-full border border-neutral-500 bg-white"
				role="group"
			>
				{VIEWS.map((option) => (
					<button
						key={option}
						aria-pressed={option === view}
						type="button"
						className={joinClassNames(
							zoomOptionClasses,
							option === view
								? "bg-ink-blue-100 font-medium text-ink-blue-900"
								: "text-neutral-900 hover:text-ink-blue-700"
						)}
						onClick={() => {
							onViewChange(option);
						}}
					>
						{t(`${key}.views.${option}`)}
					</button>
				))}
			</div>
		</div>
	);
};
