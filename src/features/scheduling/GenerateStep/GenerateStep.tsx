import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { TickFilledIcon, TickIcon } from "@/components/ui/Icon";
import type { ScheduleSummary } from "@/features/scheduling/scheduleDraft";
import { StepPanel } from "@/features/scheduling/StepPanel";

export type GenerateStepProps = {
	summary: ScheduleSummary;
	className?: string;
};

const NEXT_KEYS = [
	"scheduling.generate.nextOptimise",
	"scheduling.generate.nextBalance",
	"scheduling.generate.nextReview",
] as const;

/** What the schedule will be generated from, and what happens once it is. */
export const GenerateStep = ({
	summary,
	className,
}: GenerateStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const figures = [
		{
			key: "shifts",
			label: t("scheduling.generate.shifts"),
			value: summary.shifts,
		},
		{
			key: "roles",
			label: t("scheduling.generate.roles"),
			value: summary.roles,
		},
		{
			key: "coverage",
			label: t("scheduling.generate.coverage"),
			value: t("scheduling.generate.coverageValue", {
				value: summary.coverage,
			}),
		},
	];

	return (
		<StepPanel
			className={className}
			description={t("scheduling.generate.description")}
			title={t("scheduling.generate.title")}
			icon={
				<span
					aria-hidden="true"
					className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success-500 text-white"
				>
					<TickIcon className="size-6" />
				</span>
			}
		>
			<dl
				aria-label={t("scheduling.generate.summary")}
				className="mt-7 grid grid-cols-2 gap-6 rounded-xl border border-neutral-400 p-6 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-neutral-400"
			>
				{figures.map(({ key, label, value }) => (
					<div key={key} className="lg:px-8 lg:first:pl-0">
						<dt className="text-sm font-semibold text-ink-blue-600 uppercase">
							{label}
						</dt>
						<dd className="mt-2 text-4xl font-medium text-neutral-900">
							{value}
						</dd>
					</div>
				))}
			</dl>
			<hr className="my-10 border-neutral-400" />
			<h3 className="text-xl font-semibold text-neutral-900">
				{t("scheduling.generate.nextTitle")}
			</h3>
			<ul className="mt-8 flex flex-col gap-5">
				{NEXT_KEYS.map((key) => (
					<li
						key={key}
						className="flex items-center gap-3 text-sm font-semibold text-neutral-900"
					>
						<TickFilledIcon className="size-5 shrink-0 text-success-500" />
						{t(key)}
					</li>
				))}
			</ul>
			<Callout className="mt-8">{t("scheduling.generate.note")}</Callout>
		</StepPanel>
	);
};
