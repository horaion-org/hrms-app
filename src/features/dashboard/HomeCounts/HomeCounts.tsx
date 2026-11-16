import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import {
	HOME_SECTIONS,
	type HomeSection,
} from "@/features/dashboard/homeSections";

const key = "dashboard.counts";

const countLinkClasses =
	"text-base font-semibold text-ink-blue-700 underline underline-offset-2 hover:text-ink-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

/** The sections the line counts: every one with something to act on or to know today. */
export type CountedSection = Exclude<HomeSection, "people-events">;

export type HomeCountsProps = {
	/** How much each section has to act on; a section left out or at 0 is not named. */
	counts: Partial<Record<CountedSection, number>>;
	className?: string;
};

/**
 * Home at a glance: one line of what needs the person, each count a link
 * to its list on the page. Who is off today has no list on Home, so it
 * leads to the team's leave timeline.
 */
export const HomeCounts = ({
	counts,
	className,
}: HomeCountsProps): FunctionComponent => {
	const { t } = useTranslation();
	const named = HOME_SECTIONS.filter(
		(section): section is CountedSection =>
			section !== "people-events" && (counts[section] ?? 0) > 0
	);
	if (named.length === 0) return null;
	return (
		<nav aria-label={t(`${key}.label`)} className={className}>
			<ul className="flex flex-wrap gap-x-6 gap-y-2">
				{named.map((section) => {
					const label = t(`${key}.${section}`, { count: counts[section] ?? 0 });
					return (
						<li key={section}>
							{section === "off-today" ? (
								<Link
									className={countLinkClasses}
									search={{ view: "timeline" }}
									to="/leave"
								>
									{label}
								</Link>
							) : (
								<Link className={countLinkClasses} hash={section} to=".">
									{label}
								</Link>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
};
