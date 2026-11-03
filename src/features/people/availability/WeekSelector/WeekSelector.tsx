import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Badge } from "@/components/ui/Badge";
import {
	formatWeekStart,
	hasOverride,
	PATTERN_SCOPE,
	upcomingMondays,
	type AvailabilityScope,
} from "@/features/people/availability/availabilityModel";

export type WeekSelectorProps = {
	scope: AvailabilityScope;
	/** The Mondays of the weeks that have an override. */
	overrideWeeks: ReadonlyArray<string>;
	onChange: (scope: AvailabilityScope) => void;
	disabled?: boolean;
	/** The day the weeks are counted from; now when left out. */
	today?: Date;
};

const PATTERN_VALUE = "pattern";
const key = "people.availability.week";

/**
 * Chooses what the availability card shows: the default pattern, or one of
 * the next six weeks, this one first. A chosen week reads "Custom" when it
 * has an override and "Default" when the pattern applies to it.
 */
export const WeekSelector = ({
	scope,
	overrideWeeks,
	onChange,
	disabled = false,
	today,
}: WeekSelectorProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [mondays] = useState(() => upcomingMondays(today ?? new Date()));
	const language = i18n.resolvedLanguage ?? i18n.language;
	const options = [
		{ value: PATTERN_VALUE, label: t(`${key}.pattern`) },
		...mondays.map((monday) => ({
			value: monday,
			label: t(`${key}.of`, { date: formatWeekStart(monday, language) }),
		})),
	];
	return (
		<span className="flex items-center gap-2">
			<Select
				aria-label={t(`${key}.label`)}
				className="w-40 font-semibold"
				disabled={disabled}
				options={options}
				value={scope.kind === "week" ? scope.weekStartMonday : PATTERN_VALUE}
				onChange={(value) => {
					onChange(
						value === PATTERN_VALUE
							? PATTERN_SCOPE
							: { kind: "week", weekStartMonday: value }
					);
				}}
			/>
			{scope.kind === "week" &&
				(hasOverride(scope, overrideWeeks) ? (
					<Badge>{t(`${key}.custom`)}</Badge>
				) : (
					<span className="text-sm text-neutral-700">
						{t(`${key}.default`)}
					</span>
				))}
		</span>
	);
};
