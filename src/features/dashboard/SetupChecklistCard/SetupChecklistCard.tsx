import { Link, type LinkProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CloseIcon, TickIcon } from "@/components/ui/Icon";
import {
	SETUP_STEP_COUNT,
	type SetupCounts,
	type SetupProgress,
} from "@/features/dashboard/setupChecklist";
import { unitCountsText } from "@/features/organisation/import/importText";

export type SetupChecklistCardProps = {
	counts: SetupCounts;
	progress: SetupProgress;
	/** Offers the organisation import; without it the step links to Branches only. */
	canImportOrganisation: boolean;
	/** Offers the people import; without it the step links to People only. */
	canImportPeople: boolean;
	onDismiss: () => void;
	className?: string;
};

const linkClasses =
	"text-sm font-semibold text-ink-blue-700 underline underline-offset-2 hover:text-ink-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

/** One step: ticked with what exists once done, otherwise its import and the way by hand. */
const SetupStep = ({
	title,
	done,
	doneDetail,
	importLabel,
	importTo,
	byHandLabel,
	byHandTo,
}: {
	title: string;
	done: boolean;
	doneDetail: string;
	importLabel: string | undefined;
	importTo: NonNullable<LinkProps["to"]>;
	byHandLabel: string;
	byHandTo: LinkProps["to"];
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
			<span className="flex min-w-48 items-center gap-3 text-base font-semibold text-neutral-900">
				{done ? (
					<TickIcon aria-hidden className="size-5 shrink-0 text-ink-blue-700" />
				) : (
					<span
						aria-hidden
						className="size-5 shrink-0 rounded-full border-2 border-neutral-500"
					/>
				)}
				{title}
				<span className="sr-only">
					{done ? t("dashboard.setup.stepDone") : t("dashboard.setup.stepToDo")}
				</span>
			</span>
			{done ? (
				<span className="text-sm text-neutral-800">{doneDetail}</span>
			) : (
				<span className="flex flex-wrap items-center gap-4">
					{importLabel !== undefined && (
						<Button size="sm" to={importTo}>
							{importLabel}
						</Button>
					)}
					<Link className={linkClasses} to={byHandTo}>
						{byHandLabel}
					</Link>
				</span>
			)}
		</li>
	);
};

/**
 * "Set up your company": the two steps that make a new company usable, in
 * dependency order (structure, then people), each ticked from data and each
 * with a way to do it by hand. The caller hides it once both are done.
 */
export const SetupChecklistCard = ({
	counts,
	progress,
	canImportOrganisation,
	canImportPeople,
	onDismiss,
	className,
}: SetupChecklistCardProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<section
			aria-labelledby="setup-checklist-heading"
			className={joinClassNames(
				"rounded-xl border border-neutral-300 p-6",
				className
			)}
		>
			<div className="flex items-center justify-between gap-4">
				<h2
					className="text-base font-semibold text-ink-blue-600"
					id="setup-checklist-heading"
				>
					{t("dashboard.setup.title")}
				</h2>
				<span className="flex items-center gap-2">
					<span className="text-sm text-neutral-800">
						{t("dashboard.setup.progress", {
							done: progress.doneCount,
							total: SETUP_STEP_COUNT,
						})}
					</span>
					<Button
						aria-label={t("dashboard.setup.dismiss")}
						variant="icon"
						onClick={onDismiss}
					>
						<CloseIcon />
					</Button>
				</span>
			</div>
			<ol className="mt-2 divide-y divide-neutral-300">
				<SetupStep
					byHandLabel={t("dashboard.setup.organisation.byHand")}
					byHandTo="/organisation/branches"
					done={progress.organisationDone}
					doneDetail={unitCountsText(counts, t)}
					importTo="/settings/data/import-organisation"
					title={t("dashboard.setup.organisation.title")}
					importLabel={
						canImportOrganisation
							? t("dashboard.setup.organisation.action")
							: undefined
					}
				/>
				<SetupStep
					byHandLabel={t("dashboard.setup.people.byHand")}
					byHandTo="/people"
					done={progress.peopleDone}
					importTo="/settings/data/import-people"
					title={t("dashboard.setup.people.title")}
					doneDetail={t("dashboard.setup.people.done", {
						count: counts.members,
					})}
					importLabel={
						canImportPeople ? t("dashboard.setup.people.action") : undefined
					}
				/>
			</ol>
		</section>
	);
};
