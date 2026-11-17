import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { weekScheduleLink } from "@/features/scheduling/months/rosterWeeks";
import type {
	PartLine,
	PartLineAction,
} from "@/features/scheduling/schedules/partLines";

export type WeekPartsCalloutProps = {
	/** What the part says of its week's other days (`partLinesOf`). */
	lines: ReadonlyArray<PartLine>;
	/** The schedule's Department: the other schedules open there, and new days are scheduled there. */
	departmentId: string;
	/** Whether the viewer may create a schedule here, which "Schedule {{rest}}" does. */
	mayCreateHere: boolean;
	className?: string;
};

/** A line's action: a link to the schedule holding its days, or a button scheduling them where allowed. */
const LineAction = ({
	action,
	departmentId,
	mayCreateHere,
}: {
	action: PartLineAction;
	departmentId: string;
	mayCreateHere: boolean;
}): FunctionComponent => {
	if (action.kind === "openSchedule")
		return (
			<Button
				{...weekScheduleLink(action.part, departmentId)}
				variant="textlink"
			>
				{action.label}
			</Button>
		);
	if (!mayCreateHere) return null;
	return (
		<Button
			className="my-1"
			size="sm"
			to="/scheduling/new"
			variant="secondary"
			search={{
				department: departmentId,
				for: "dates",
				firstDay: action.days.from,
				lastDay: action.days.to,
			}}
		>
			{action.label}
		</Button>
	);
};

/**
 * What a part of its week says of the week's other days (API ADR-0113), one
 * line each, with a link to the schedule holding them or a button to
 * schedule them; nothing when there is nothing to say.
 */
export const WeekPartsCallout = ({
	lines,
	departmentId,
	mayCreateHere,
	className,
}: WeekPartsCalloutProps): FunctionComponent => {
	if (lines.length === 0) return null;
	return (
		<Callout className={className}>
			{lines.map((line) => (
				<span key={line.text} className="flex flex-wrap items-center gap-x-2">
					<span>{line.text}</span>
					{line.action && (
						<LineAction
							action={line.action}
							departmentId={departmentId}
							mayCreateHere={mayCreateHere}
						/>
					)}
				</span>
			))}
		</Callout>
	);
};
