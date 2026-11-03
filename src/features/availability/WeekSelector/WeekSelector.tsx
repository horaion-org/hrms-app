import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import {
	formatWeekStart,
	upcomingMondays,
} from "@/features/availability/availabilityModel";

export type WeekSelectorProps = {
	/** The chosen week's Monday, "YYYY-MM-DD". */
	value: string;
	onChange: (weekStartMonday: string) => void;
	/** The day the weeks are counted from; now, on every render, when left out. */
	today?: Date;
	className?: string;
};

const key = "availability.week";

/**
 * Chooses the week the Availability page shows: one of the next six, this
 * one first. The weeks are counted from `today` on every render, so a page
 * left open across a Monday moves on with it. A week the URL names outside
 * those six is offered too, in its place by date, so it can be read.
 */
export const WeekSelector = ({
	value,
	onChange,
	today,
	className,
}: WeekSelectorProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const upcoming = upcomingMondays(today ?? new Date());
	const mondays = upcoming.includes(value)
		? upcoming
		: [...upcoming, value].sort();
	return (
		<Select
			aria-label={t(`${key}.label`)}
			className={className}
			value={value}
			options={mondays.map((monday) => ({
				value: monday,
				label: t(`${key}.of`, { date: formatWeekStart(monday, language) }),
			}))}
			onChange={onChange}
		/>
	);
};
