import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import type { ChangeDay } from "@/features/scheduling/roster/changeTimeline";

export type ChangeTimelineProps = {
	/** The hand changes by the day applied, newest first (`changeTimeline`). */
	days: ReadonlyArray<ChangeDay>;
};

/** Changed as a time rail: each day applied, then its changes with what each day was and is now. */
export const ChangeTimeline = ({
	days,
}: ChangeTimelineProps): FunctionComponent => (
	<ol className="flex flex-col">
		{days.map((day) => (
			<li key={day.appliedOn}>
				<h3 className="my-2 text-xs font-semibold text-neutral-700">
					{day.label}
				</h3>
				<ol>
					{day.entries.map((entry) => (
						<li
							key={entry.key}
							className="relative flex gap-3 pb-4 before:absolute before:top-4 before:bottom-0 before:left-1.5 before:w-0.5 before:bg-neutral-300"
						>
							<span
								aria-hidden="true"
								className="mt-1 size-3 shrink-0 rounded-full bg-ink-blue-700"
							/>
							<div className="flex min-w-0 flex-col">
								<span className="text-sm font-semibold text-neutral-900">
									{entry.title}
								</span>
								<span className="text-xs text-neutral-700">{entry.byline}</span>
								<span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
									<Badge compact>{entry.before}</Badge>
									<span aria-hidden="true">→</span>
									<Badge compact>{entry.after}</Badge>
								</span>
							</div>
						</li>
					))}
				</ol>
			</li>
		))}
	</ol>
);
