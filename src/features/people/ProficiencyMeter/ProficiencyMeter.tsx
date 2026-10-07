import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { PROFICIENCY_MAX } from "@/features/people/skills";

export type ProficiencyMeterProps = {
	/** The skill, which names the meter for assistive technology. */
	name: string;
	/** 1 to 10. */
	value: number;
	className?: string;
};

const SEGMENTS = Array.from({ length: PROFICIENCY_MAX }, (_, index) => index);

/**
 * How well a person does a skill, read-only: ten segments filled up to the
 * proficiency, with "8/10" beside them, read out as "Baking: 8 out of 10".
 */
export const ProficiencyMeter = ({
	name,
	value,
	className,
}: ProficiencyMeterProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<span
			aria-label={t("people.skills.levelText", { name, value })}
			className={joinClassNames("flex items-center gap-4", className)}
			role="img"
		>
			<span aria-hidden="true" className="flex flex-1 gap-0.5">
				{SEGMENTS.map((segment) => (
					<span
						key={segment}
						className="h-2.5 flex-1 bg-neutral-200 first:rounded-l-full last:rounded-r-full data-filled:bg-ink-blue-500"
						data-filled={segment < value || undefined}
					/>
				))}
			</span>
			<span aria-hidden="true" className="shrink-0 text-xs text-ink-blue-700">
				{t("people.skills.level", { value })}
			</span>
		</span>
	);
};
