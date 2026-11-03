import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TimeIcon } from "@/components/ui/Icon";
import { AvailabilityDialog } from "@/features/availability/AvailabilityDialog";
import {
	byDay,
	formatWeekStart,
	formatWindow,
	PATTERN_SCOPE,
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

export type MyAvailabilityProps = {
	companyId: string;
	/** The caller's own name, for the editor's description. */
	name: string;
	/** The week shown, as its Monday. */
	weekStartMonday: string;
	className?: string;
};

const key = "availability.mine";

/**
 * A part-timer's own availability for one week: the seven days, Monday
 * first, each with its windows or "—", and whether the week follows their
 * default pattern or has hours of its own. They change this week, or the
 * pattern every week follows, through the editor, saving straight away
 * through their own routes: nothing granted is needed.
 */
export const MyAvailability = ({
	companyId,
	name,
	weekStartMonday,
	className,
}: MyAvailabilityProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [editing, setEditing] = useState<AvailabilityScope | null>(null);
	const availability = useMyAvailability(companyId, weekStartMonday);
	const replace = useReplaceMyAvailability(companyId);
	const replaceWeek = useReplaceMyWeekAvailability(companyId);
	const resetWeek = useResetMyWeekAvailability(companyId);
	const date = formatWeekStart(
		weekStartMonday,
		i18n.resolvedLanguage ?? i18n.language
	);
	const ready = availability.status === "ready" ? availability : undefined;
	const weekScope: AvailabilityScope = { kind: "week", weekStartMonday };

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
		<>
			<Card
				className={className}
				icon={TimeIcon}
				title={t(`${key}.title`, { date })}
				action={
					ready && (
						<div className="flex flex-wrap gap-4">
							<Button
								variant="hyperlink"
								onClick={() => {
									setEditing(weekScope);
								}}
							>
								{t("availability.editWeek")}
							</Button>
							<Button
								variant="hyperlink"
								onClick={() => {
									setEditing(PATTERN_SCOPE);
								}}
							>
								{t("availability.editPattern")}
							</Button>
						</div>
					)
				}
			>
				{availability.status === "error" ? (
					<p className="text-sm text-error-700" role="alert">
						{t("availability.failed")}
					</p>
				) : !ready ? (
					<p className="text-sm text-neutral-700">
						{t("availability.loading")}
					</p>
				) : (
					<>
						<p className="flex items-center gap-2 text-sm text-neutral-800">
							{ready.overridden && <Badge>{t("availability.custom")}</Badge>}
							{ready.overridden
								? t(`${key}.customWeek`)
								: windowsOf(ready.pattern).length === 0
									? t(`${key}.empty`)
									: t(`${key}.patternWeek`)}
						</p>
						<dl className="grid gap-3 lg:grid-cols-7 lg:gap-4">
							{byDay(ready.week).map(({ day, windows }) => (
								<div key={day} className="flex gap-4 lg:flex-col lg:gap-2">
									<dt className="w-28 shrink-0 text-sm font-semibold text-neutral-900 lg:w-auto">
										{t(`weekdays.${day}`)}
									</dt>
									<dd className="text-sm text-neutral-900">
										{windows.length === 0 ? (
											<>
												<span aria-hidden="true" className="text-neutral-600">
													—
												</span>
												<span className="sr-only">
													{t("availability.none")}
												</span>
											</>
										) : (
											windows.map((window) => (
												<span key={window.startTime} className="block">
													{formatWindow(window)}
												</span>
											))
										)}
									</dd>
								</div>
							))}
						</dl>
					</>
				)}
			</Card>
			{editing && ready && (
				<AvailabilityDialog
					name={name}
					scope={editing}
					windows={
						editing.kind === "week" ? ready.week : windowsOf(ready.pattern)
					}
					onSubmit={(windows) => save(editing, windows)}
					onClose={() => {
						setEditing(null);
					}}
					onReset={
						editing.kind === "week" && ready.overridden
							? (): Promise<unknown> => resetWeek.mutateAsync(weekStartMonday)
							: undefined
					}
				/>
			)}
		</>
	);
};
