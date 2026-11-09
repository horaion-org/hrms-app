import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { EditIcon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { AvailabilityDialog } from "@/features/availability/AvailabilityDialog";
import {
	byDay,
	windowsOf,
	type AvailabilityScope,
	type WeeklyWindow,
} from "@/features/availability/availabilityModel";
import {
	useMyAvailability,
	useReplaceMyAvailability,
	useReplaceMyWeekAvailability,
	useResetMyWeekAvailability,
} from "@/features/availability/useAvailability";
import { WeekGrid } from "@/features/availability/WeekGrid";

export type MyAvailabilityProps = {
	companyId: string;
	/** The caller's own name, for the editor's description. */
	name: string;
	/** The week shown, as its Monday. */
	weekStartMonday: string;
	/** False for a week that has ended: it is shown, never changed. */
	editable?: boolean;
	/** The one day shown below `md`, as the page's `DaySwitcher` picks it. */
	shownDay?: string;
	className?: string;
};

const key = "availability.mine";

/**
 * A part-timer's own week as a strip of seven days, "Custom" when it has
 * hours of its own in place of their pattern, and one Edit that changes
 * this week or every week. Saves straight away through their own routes:
 * nothing granted is needed.
 */
export const MyAvailability = ({
	companyId,
	name,
	weekStartMonday,
	editable = true,
	shownDay,
	className,
}: MyAvailabilityProps): FunctionComponent => {
	const { t } = useTranslation();
	const [editing, setEditing] = useState(false);
	const availability = useMyAvailability(companyId, weekStartMonday);
	const replace = useReplaceMyAvailability(companyId);
	const replaceWeek = useReplaceMyWeekAvailability(companyId);
	const resetWeek = useResetMyWeekAvailability(companyId);

	if (availability.status === "error")
		return (
			<p className="text-sm text-error-700" role="alert">
				{t("availability.failed")}
			</p>
		);
	if (availability.status !== "ready")
		return (
			<div aria-busy="true" className={className}>
				<span className="sr-only">{t("availability.loading")}</span>
				<Skeleton className="mb-4 h-6 w-72" />
				<Skeleton className="h-36 w-full rounded-lg" />
			</div>
		);

	const { pattern, week, overridden } = availability;
	const nothingSet = !overridden && windowsOf(pattern).length === 0;
	const save = (
		scope: AvailabilityScope,
		windows: Array<WeeklyWindow>
	): Promise<unknown> =>
		scope.kind === "week"
			? replaceWeek.mutateAsync({
					weekStartMonday: scope.weekStartMonday,
					request: { windows },
				})
			: replace.mutateAsync({ windows });

	return (
		<section aria-label={t(`${key}.label`)} className={className}>
			<div className="mb-4 flex min-h-12 flex-wrap items-center justify-between gap-4">
				{!editable ? (
					<Callout className="flex-1">{t("availability.pastWeek")}</Callout>
				) : nothingSet ? (
					<Callout className="flex-1" tone="warning">
						{t(`${key}.empty`)}
					</Callout>
				) : (
					<p className="flex items-center gap-2 text-sm text-neutral-800">
						{overridden && <Badge>{t("availability.custom")}</Badge>}
						{t(overridden ? `${key}.customWeek` : `${key}.patternWeek`)}
					</p>
				)}
				{editable && (
					<Button
						leadingIcon={<EditIcon />}
						size="sm"
						onClick={() => {
							setEditing(true);
						}}
					>
						{t("availability.edit")}
					</Button>
				)}
			</div>
			<WeekGrid
				label={t(`${key}.label`)}
				rows={[{ id: "mine", days: byDay(week) }]}
				shownDay={shownDay}
				weekStartMonday={weekStartMonday}
			/>
			{editing && (
				<AvailabilityDialog
					name={name}
					overridden={overridden}
					patternWindows={windowsOf(pattern)}
					weekStartMonday={weekStartMonday}
					weekWindows={week}
					onReset={() => resetWeek.mutateAsync(weekStartMonday)}
					onSubmit={save}
					onClose={() => {
						setEditing(false);
					}}
				/>
			)}
		</section>
	);
};
