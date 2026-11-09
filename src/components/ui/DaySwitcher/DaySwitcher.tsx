import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type DaySwitcherProps = {
	/** Every day that can be shown, in order, as ISO dates. */
	days: ReadonlyArray<string>;
	/** The day shown. */
	day: string;
	onDayChange: (day: string) => void;
	className?: string;
};

/** How many day chips fit across a 360 px phone, each a 44 px target. */
const DAYS_ACROSS = 7;

/**
 * Picks the one day a week grid shows on a phone, every day one tap away:
 * one row of day chips, filling the width for a week and scrolling sideways
 * for a longer window, with the chosen day kept in view. Shown below `md`
 * only, where the grid hides every other day's column; from `md` the grid
 * shows them all. The caller owns the day, in the URL.
 */
export const DaySwitcher = ({
	days,
	day,
	onDayChange,
	className,
}: DaySwitcherProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const fullDay = new Intl.DateTimeFormat(language, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
	const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
	const dayOfMonth = new Intl.DateTimeFormat(language, { day: "numeric" });
	const toDate = (date: string): Date => dayjs(date).toDate();
	const scrolls = days.length > DAYS_ACROSS;
	const listRef = useRef<HTMLUListElement>(null);

	// In a row that scrolls, the chosen day's chip is brought to the middle. Never
	// scrollIntoView: it can scroll the page too.
	useEffect(() => {
		const list = listRef.current;
		const chip = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
		if (!scrolls || !list || !chip) return;
		list.scrollTo({
			left: chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2,
			behavior: "instant",
		});
	}, [day, scrolls]);

	return (
		<div
			aria-label={t("daySwitcher.label")}
			className={joinClassNames("md:hidden", className)}
			role="group"
		>
			{/* The chips say the day; screen readers also hear it when it changes. */}
			<p aria-live="polite" className="sr-only">
				{fullDay.format(toDate(day))}
			</p>
			{/* Seven 44 px targets across a 360 px phone: hence the narrow gap. Relative, so a chip's offset is the row's. */}
			<ul
				ref={listRef}
				className={
					scrolls
						? "relative flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						: "grid grid-cols-7 gap-0.5"
				}
			>
				{days.map((date) => (
					<li
						key={date}
						// Scrolling, each chip keeps a week's width: a seventh of the row less the gaps.
						className={scrolls ? "w-[calc((100%-0.75rem)/7)] shrink-0" : undefined}
					>
						<button
							aria-label={fullDay.format(toDate(date))}
							aria-pressed={date === day}
							type="button"
							className={joinClassNames(
								"flex min-h-11 w-full cursor-pointer flex-col items-center justify-center rounded-lg text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500",
								date === day
									? "bg-ink-blue-700 text-white"
									: "bg-neutral-200 text-neutral-900 hover:text-ink-blue-700"
							)}
							onClick={() => {
								onDayChange(date);
							}}
						>
							<span className="font-bold">{weekday.format(toDate(date))}</span>
							<span>{dayOfMonth.format(toDate(date))}</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
};
