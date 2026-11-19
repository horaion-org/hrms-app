import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type {
	ChangeTileFace,
	ChangeTilePair,
} from "@/features/scheduling/roster/changeTiles";
import {
	rosterLooks,
	shiftTileStyle,
} from "@/features/scheduling/roster/rosterLooks";
import { formatTimeRange } from "@/features/scheduling/shifts/formatShift";
import { stretchHoursMark } from "@/features/scheduling/shifts/stretchWords";

/** One small tile: a shift in its colour with its times, or a day without one, dashed. */
const ChangeTile = ({ face }: { face: ChangeTileFace }): FunctionComponent => {
	const { t } = useTranslation();
	if (face.kind === "day")
		return (
			<span
				className={`max-w-full truncate rounded border border-dashed px-1.5 py-0.5 text-xs whitespace-nowrap ${rosterLooks.off}`}
				title={face.label}
			>
				{face.label}
			</span>
		);
	const time = formatTimeRange(
		{ startTime: face.times.start, endTime: face.times.end },
		t
	);
	const text = `${face.name} ${time}`;
	return (
		<span
			className="max-w-full truncate rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-neutral-900 tabular-nums"
			style={shiftTileStyle(face.colour)}
			title={text}
		>
			{text}
		</span>
	);
};

/**
 * A change drawn as the roster's own tiles, one before → after pair per day,
 * a stretch's "+2 h" after the tile it widens. A tile never grows past its
 * column: it is cut short, its title holding the whole of it.
 */
export const ChangeTilePairs = ({
	pairs,
}: {
	pairs: ReadonlyArray<ChangeTilePair>;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<span className="flex flex-col gap-1">
			{pairs.map(({ key, before, after }) => {
				const mark =
					after.kind === "shift"
						? stretchHoursMark(after.stretchMinutes, t)
						: undefined;
				return (
					<span key={key} className="flex flex-wrap items-center gap-1.5">
						<ChangeTile face={before} />
						<span aria-hidden="true" className="font-semibold text-neutral-600">
							→
						</span>
						<ChangeTile face={after} />
						{mark && (
							<span className="rounded bg-warning-100 px-1.5 py-0.5 text-xs font-semibold text-warning-900">
								{mark}
							</span>
						)}
					</span>
				);
			})}
		</span>
	);
};
