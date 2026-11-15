import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { brokenRuleLabel } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { RosterRulesCheckState } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

export type RosterRulesCheckProps = {
	/** Where the check stands, and how to ask (again). */
	check: RosterRulesCheckState & { ask: () => void };
	className?: string;
};

const key = "scheduling.rulesCheck";

/**
 * "Working-time rules" under the roster grid, for whoever may change the
 * roster: a "Check rules" button (the engine takes a moment), then whether
 * every rule holds, the rules broken (the company's own constraint name,
 * else the app's label, else a generic line), that one is broken with none
 * named, or that the rules could not be checked. A refusal says why, and a
 * failure offers to ask again. Follows the engine's repair options in Find
 * cover (`EngineRepairOptions`).
 */
export const RosterRulesCheck = ({
	check,
	className,
}: RosterRulesCheckProps): FunctionComponent => {
	const { t } = useTranslation();
	const titleId = useId();

	const result = (): ReactNode => {
		switch (check.status) {
			case "idle":
				return null;
			case "loading":
				return (
					<div aria-busy="true">
						<span className="sr-only">{t(`${key}.loading`)}</span>
						<Skeleton className="h-12 w-full rounded-xl" />
					</div>
				);
			case "refused":
				return (
					<div className="flex flex-col items-start gap-2" role="alert">
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
			default: {
				const { status, brokenRules } = check.check;
				if (status === "HOLDS")
					return <Callout tone="info">{t(`${key}.holds`)}</Callout>;
				if (status === "UNCHECKED")
					return <Callout tone="info">{t(`${key}.unchecked`)}</Callout>;
				if (brokenRules.length === 0)
					return <Callout tone="warning">{t(`${key}.brokenUnnamed`)}</Callout>;
				return (
					<Callout tone="warning">
						<span className="block">{t(`${key}.breaks`)}</span>
						<ul className="mt-1 list-disc pl-5 font-normal">
							{brokenRules
								.map((rule) => brokenRuleLabel(rule, t))
								.map((line) => (
									<li key={line}>{line}</li>
								))}
						</ul>
					</Callout>
				);
			}
		}
	};

	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"flex flex-col items-start gap-3 text-sm",
				className
			)}
		>
			<h2 className="font-bold text-neutral-900" id={titleId}>
				{t(`${key}.title`)}
			</h2>
			<Button
				disabled={check.status === "loading"}
				size="sm"
				variant="secondary"
				onClick={check.ask}
			>
				{t(`${key}.check`)}
			</Button>
			{result()}
		</section>
	);
};
