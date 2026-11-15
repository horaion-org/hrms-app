import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDay } from "@/features/scheduling/periods";
import type {
	RosterRulesCheck as Check,
	StaffingGap,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import { brokenRuleLabel } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { RosterRulesCheckState } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

export type RosterRulesCheckProps = {
	/** Where the validation stands, and how to ask (again). */
	check: RosterRulesCheckState & { ask: () => void };
};

const key = "scheduling.rulesCheck";

/** One result under its own heading, as the side panel's sections read. */
const Part = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}): FunctionComponent => (
	<section className="flex flex-col gap-2">
		<h3 className="font-semibold text-neutral-800">{title}</h3>
		{children}
	</section>
);

/** The rules part: none broken (with what was checked), the rules broken, one broken unnamed, or not checked. */
const Rules = ({ check }: { check: Check }): FunctionComponent => {
	const { t } = useTranslation();
	if (check.status === "HOLDS")
		return (
			<>
				<p className="text-neutral-800">{t(`${key}.holds`)}</p>
				<p className="text-neutral-700">{t(`${key}.checkedRules`)}</p>
			</>
		);
	if (check.status === "UNCHECKED")
		return <p className="text-neutral-800">{t(`${key}.unchecked`)}</p>;
	if (check.brokenRules.length === 0)
		return <Callout tone="warning">{t(`${key}.brokenUnnamed`)}</Callout>;
	return (
		<Callout tone="warning">
			<span className="block">{t(`${key}.breaks`)}</span>
			<ul className="mt-1 list-disc pl-5 font-normal">
				{check.brokenRules
					.map((rule) => brokenRuleLabel(rule, t))
					.map((line) => (
						<li key={line}>{line}</li>
					))}
			</ul>
		</Callout>
	);
};

/** One gap's line: its day as the page writes days, the engine's sentence, and the company's rule when named. */
const gapLine = (gap: StaffingGap, language: string, t: TFunction): string =>
	[
		formatDay(gap.date, language),
		gap.message ?? t(`${key}.shortUnnamed`),
		gap.constraintName,
	]
		.filter((part): part is string => Boolean(part))
		.join(" · ");

/** The staffing part: every shift staffed, the gaps one per line, or not worked out. */
const Staffing = ({
	gaps,
}: {
	gaps: Check["staffingGaps"];
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	if (gaps === null)
		return <p className="text-neutral-800">{t(`${key}.staffingUnchecked`)}</p>;
	if (gaps.length === 0)
		return <p className="text-neutral-800">{t(`${key}.staffed`)}</p>;
	return (
		<Callout tone="warning">
			<span className="block">{t(`${key}.short`)}</span>
			<ul className="mt-1 list-disc pl-5 font-normal">
				{gaps.map((gap, index) => (
					// A gap has no id of its own here; its place in the engine's answer is stable.
					<li key={`${gap.date}-${index}`}>{gapLine(gap, language, t)}</li>
				))}
			</ul>
		</Callout>
	);
};

/**
 * Validate schedule's result, in the roster's side panel where Issues and
 * Changed open theirs: the working-time rules and the staffing, each under
 * its own heading, as the engine checked the roster as it stands. A roster
 * can keep every rule and still be short, so the two are never merged.
 * While asking, a skeleton; a refusal says why, and a failure offers to ask
 * again. Follows the engine's repair options (`EngineRepairOptions`).
 */
export const RosterRulesCheck = ({
	check,
}: RosterRulesCheckProps): FunctionComponent => {
	const { t } = useTranslation();
	switch (check.status) {
		case "idle":
		case "loading":
			return (
				<div aria-busy="true" className="flex flex-col gap-3 text-sm">
					<span className="sr-only">{t(`${key}.loading`)}</span>
					<Skeleton className="h-12 w-full rounded-xl" />
					<Skeleton className="h-12 w-full rounded-xl" />
				</div>
			);
		case "refused":
			return (
				<div className="flex flex-col items-start gap-2 text-sm" role="alert">
					<p className="text-neutral-800">
						{t(`${key}.refusal.${check.refusal}`)}
					</p>
					{check.refusal === "failed" && (
						<Button variant="textlink" onClick={check.ask}>
							{t("scheduling.rosterEdit.tryAgain")}
						</Button>
					)}
				</div>
			);
		default:
			return (
				<div className="flex flex-col gap-4 text-sm">
					<Part title={t(`${key}.rulesTitle`)}>
						<Rules check={check.check} />
					</Part>
					<Part title={t(`${key}.staffingTitle`)}>
						<Staffing gaps={check.check.staffingGaps} />
					</Part>
				</div>
			);
	}
};
