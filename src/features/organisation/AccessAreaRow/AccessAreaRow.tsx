import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Disclosure } from "@/components/ui/Disclosure";
import type { AreaLevel } from "@/features/organisation/areaLevels";

/** One level the row's select offers. */
export type AreaLevelChoice = { level: AreaLevel; disabled?: boolean };

export type AccessAreaRowProps = {
	/** The area's name, as its menu entry reads. */
	name: string;
	/** What holders see there, in one line. */
	description: string;
	/** The level the role holds now; Custom is shown, never offered. */
	level: AreaLevel;
	/** The levels that can be chosen, in order. */
	levels: ReadonlyArray<AreaLevelChoice>;
	onLevelChange: (level: AreaLevel) => void;
	/** Shows the level without letting it change. */
	disabled?: boolean;
	/** Where the area can be given, said once for the row. */
	note?: string;
	/** What a change just did or what the row misses, said under the row. */
	messages?: ReactNode;
	/** The Details button's words, e.g. "Details · 3 of 7". */
	detailsTitle: string;
	/** The area's single permissions, behind Details. */
	children: ReactNode;
	className?: string;
};

/**
 * One menu area of an access role: its name and what holders see there, a
 * level (No access, Can view, Can manage; Custom when the single
 * permissions match neither), and the single permissions behind Details.
 * Stacks on a narrow screen.
 */
export const AccessAreaRow = ({
	name,
	description,
	level,
	levels,
	onLevelChange,
	disabled = false,
	note,
	messages,
	detailsTitle,
	children,
	className,
}: AccessAreaRowProps): FunctionComponent => {
	const { t } = useTranslation();
	const nameId = useId();
	const offered = levels.some((choice) => choice.level === level)
		? levels
		: [...levels, { level, disabled: true }];

	return (
		<div
			aria-labelledby={nameId}
			className={joinClassNames("px-4 py-4", className)}
			role="group"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
				<div className="min-w-0">
					<p className="font-semibold text-neutral-900" id={nameId}>
						{name}
					</p>
					<p className="mt-1 text-sm text-neutral-700">{description}</p>
					{note && <p className="mt-1 text-xs text-neutral-600">{note}</p>}
				</div>
				<Select
					aria-label={t("organisation.accessAreas.level", { area: name })}
					className="w-full shrink-0 sm:w-44"
					disabled={disabled}
					value={level}
					options={offered.map((choice) => ({
						value: choice.level,
						label: t(`organisation.accessAreas.levels.${choice.level}`),
						disabled: choice.disabled,
					}))}
					onChange={(next) => {
						const chosen = offered.find((choice) => choice.level === next);
						if (chosen && !chosen.disabled && next !== level)
							onLevelChange(chosen.level);
					}}
				/>
			</div>
			<div aria-live="polite">{messages}</div>
			<Disclosure className="mt-3" title={detailsTitle} variant="inline">
				{children}
			</Disclosure>
		</div>
	);
};
