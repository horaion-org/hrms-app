import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { Button } from "@/components/ui/Button";
import {
	DownloadIcon,
	GridIcon,
	HistoryIcon,
	ListIcon,
	UploadIcon,
} from "@/components/ui/Icon";
import {
	rolesOf,
	type Allocations,
	type ForecastMode,
	type TimeBlockDemand,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import { ShiftAllocationTable } from "@/features/scheduling/ShiftAllocationTable";
import { StepPanel } from "@/features/scheduling/StepPanel";
import { TimeBlockGrid } from "@/features/scheduling/TimeBlockGrid";

export type ForecastStepProps = {
	mode: ForecastMode;
	onModeChange: (mode: ForecastMode) => void;
	/** The shifts this schedule includes. */
	shifts: Array<ScheduleShift>;
	allocations: Allocations;
	onAllocationChange: (
		shiftId: string,
		jobTitleId: string,
		allocated: number
	) => void;
	demand: TimeBlockDemand;
	onDemandChange: (
		slotStart: string,
		jobTitleId: string,
		staff: number
	) => void;
	onAutoFill: () => void;
	/** The schedule's week, e.g. "13 – 19 Apr 2026". */
	periodLabel: string;
};

const isForecastMode = (value: string): value is ForecastMode =>
	value === "SHIFT" || value === "BLOCKS";

/**
 * How many staff the schedule needs, either per shift or per time block.
 * Importing, exporting and reusing forecasts wait for the scheduling API.
 */
export const ForecastStep = ({
	mode,
	onModeChange,
	shifts,
	allocations,
	onAllocationChange,
	demand,
	onDemandChange,
	onAutoFill,
	periodLabel,
}: ForecastStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const questionId = useId();
	const choose = (value: string): void => {
		if (isForecastMode(value)) onModeChange(value);
	};

	return (
		<>
			<StepPanel
				description={t("scheduling.forecast.description")}
				title={t("scheduling.forecast.title")}
				actions={
					mode === "SHIFT" ? (
						<>
							<Button
								disabled
								className="min-w-34"
								leadingIcon={<UploadIcon />}
								size="sm"
								variant="secondary"
							>
								{t("scheduling.forecast.import")}
							</Button>
							<Button
								disabled
								className="min-w-34"
								leadingIcon={<DownloadIcon />}
								size="sm"
								variant="secondary"
							>
								{t("scheduling.forecast.export")}
							</Button>
						</>
					) : (
						<Button disabled leadingIcon={<HistoryIcon />} size="sm">
							{t("scheduling.forecast.useExisting")}
						</Button>
					)
				}
			>
				<p
					className="mt-8 text-sm font-semibold text-neutral-900"
					id={questionId}
				>
					{t("scheduling.forecast.question")}
				</p>
				<div
					aria-labelledby={questionId}
					className="mt-5 grid gap-6 md:grid-cols-2"
					role="radiogroup"
				>
					<RadioCard
						checked={mode === "SHIFT"}
						icon={<ListIcon />}
						label={t("scheduling.forecast.byShift")}
						name={`${questionId}-mode`}
						value="SHIFT"
						description={
							<>
								{t("scheduling.forecast.byShiftDescription")}
								<br />
								{t("scheduling.forecast.byShiftBenefit")}
							</>
						}
						onChange={choose}
					/>
					<RadioCard
						checked={mode === "BLOCKS"}
						icon={<GridIcon />}
						label={t("scheduling.forecast.blocks")}
						name={`${questionId}-mode`}
						value="BLOCKS"
						description={
							<>
								{t("scheduling.forecast.blocksDescription")}
								<br />
								{t("scheduling.forecast.blocksBenefit")}
							</>
						}
						onChange={choose}
					/>
				</div>
			</StepPanel>
			{mode === "SHIFT" ? (
				<ShiftAllocationTable
					allocations={allocations}
					className="mt-12"
					shifts={shifts}
					onAllocationChange={onAllocationChange}
				/>
			) : (
				<TimeBlockGrid
					className="mt-12"
					demand={demand}
					periodLabel={periodLabel}
					roles={rolesOf(shifts)}
					onAutoFill={onAutoFill}
					onDemandChange={onDemandChange}
				/>
			)}
		</>
	);
};
