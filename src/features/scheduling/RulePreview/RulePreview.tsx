import { Trans, useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";

const RULE_SLOTS = [
	"requirement",
	"condition",
	"headcount",
	"roles",
	"shifts",
] as const;

export type RuleSlot = (typeof RULE_SLOTS)[number];

export type RulePreviewProps = {
	/** Each part of the rule in words; a missing or empty part shows its placeholder. */
	values: Partial<Record<RuleSlot, string>>;
	className?: string;
};

/**
 * A rule read back as a sentence while it is being built, with each part
 * marked as filled in or still to choose, and whether the rule is complete.
 */
export const RulePreview = ({
	values,
	className,
}: RulePreviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const complete = RULE_SLOTS.every((slot) => Boolean(values[slot]));
	const slots = Object.fromEntries(
		RULE_SLOTS.map((slot) => {
			const value = values[slot];
			return [
				slot,
				<span
					key={slot}
					className={joinClassNames(
						"inline-flex min-h-6 max-w-full items-center rounded border px-2 py-0.5 break-words",
						value
							? "border-ink-blue-200 bg-ink-blue-50 text-ink-blue-900"
							: "border-neutral-500 bg-neutral-300 text-neutral-600"
					)}
				>
					{value || t(`scheduling.constraints.preview.empty.${slot}`)}
				</span>,
			];
		})
	);

	return (
		<section
			aria-live="polite"
			className={joinClassNames(
				"rounded-lg border border-neutral-400 bg-neutral-100 px-4 py-3",
				className
			)}
		>
			<div className="flex items-center gap-3">
				<h3 className="text-sm font-semibold text-neutral-900">
					{t("scheduling.constraints.preview.title")}
				</h3>
				<Badge className="uppercase" tone={complete ? "success" : "error"}>
					{complete
						? t("scheduling.constraints.preview.complete")
						: t("scheduling.constraints.preview.incomplete")}
				</Badge>
			</div>
			<p className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-900">
				<Trans
					components={slots}
					i18nKey="scheduling.constraints.preview.sentence"
				/>
			</p>
		</section>
	);
};
