import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { KeyFigure, type KeyFigureTone } from "@/components/ui/KeyFigure";
import type { SectionState } from "@/features/dashboard/homeLayout";
import {
	HOME_SECTIONS,
	type HomeSection,
} from "@/features/dashboard/homeSections";

const key = "dashboard.counts";

/** The sections with a tile: every one that is a number of things to act on or to know today. */
export type CountedSection = Exclude<HomeSection, "people-events">;

/** How a tile's figure is drawn while it has something: to act on now, to do, or only to know. */
const TONES: Partial<Record<CountedSection, KeyFigureTone>> = {
	"short-shifts": "error",
	"leave-to-decide": "warning",
	"next-roster": "warning",
};

/** A tile that can be opened: the whole of it is the link, outlined when focused. */
const tileLinkClasses =
	"block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

/** The figure a tile shows while its count is not known. */
const UNKNOWN = "–";

export type HomeCountsProps = {
	/** What each section has to show; a section out of reach or hidden has no tile. */
	states: Record<HomeSection, SectionState>;
	/** How much each section has to act on, where it is known. */
	counts: Partial<Record<CountedSection, number>>;
	className?: string;
};

/**
 * Home at a glance: a row of equal tiles in Home's order, one for each
 * thing that can need the person, each a number and two or three words. A
 * tile with something leads to its list on the page; one at zero stays in
 * its place, drawn quietly, so the row keeps its shape. Who is off today
 * has no list on Home, so its tile leads to the team's leave timeline.
 */
export const HomeCounts = ({
	states,
	counts,
	className,
}: HomeCountsProps): FunctionComponent => {
	const { t } = useTranslation();
	const tiles = HOME_SECTIONS.filter(
		(section): section is CountedSection =>
			section !== "people-events" && states[section] !== "hidden"
	);
	if (tiles.length === 0) return null;
	return (
		<nav aria-label={t(`${key}.label`)} className={className}>
			{/* Two by two on a phone; from `lg` one row, every tile the same width however many there are. */}
			<ul className="grid grid-cols-2 gap-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
				{tiles.map((section) => {
					const count = counts[section] ?? 0;
					// A read that failed has a card that says so, and no number to show.
					const known =
						states[section] === "empty" ||
						(states[section] === "content" && count > 0);
					const waiting = known && count > 0;
					const figure = (
						<KeyFigure
							// Named by its link, not as a region of its own beside its card's.
							aria-labelledby={undefined}
							className="h-full"
							label={t(`${key}.${section}.label`)}
							tone={waiting ? TONES[section] : "quiet"}
							unit={t(`${key}.${section}.unit`, { count })}
							value={known ? String(count) : UNKNOWN}
						/>
					);
					return (
						<li key={section}>
							{!waiting && figure}
							{waiting && section === "off-today" && (
								<Link
									className={tileLinkClasses}
									search={{ view: "timeline" }}
									to="/leave"
								>
									{figure}
								</Link>
							)}
							{waiting && section !== "off-today" && (
								// The view stays as it is; only the place on the page changes.
								<Link search className={tileLinkClasses} hash={section} to=".">
									{figure}
								</Link>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
};
