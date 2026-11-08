import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { formatDate } from "@/components/forms/Calendar";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import {
	memberTermsQuery,
	myTermsQuery,
	type HistoryEntry,
	type MemberTerms,
} from "@/features/employmentTerms/api";
import { ChangeEmploymentTermsDialog } from "@/features/employmentTerms/ChangeEmploymentTermsDialog";
import { EmploymentTermsHistoryDialog } from "@/features/employmentTerms/EmploymentTermsHistoryDialog";
import { formatHours } from "@/features/employmentTerms/hours";
import { memberTermsRefusal } from "@/features/employmentTerms/refusals";
import { termsSentence } from "@/features/employmentTerms/summary";
import { useMemberTermsActions } from "@/features/employmentTerms/useMemberTermsActions";
import type { MemberProfileDetail } from "@/features/people/api";
import { personScope } from "@/features/people/profileEditAccess";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type EmploymentTermsRowProps = {
	companyId: string;
	profile: Pick<
		MemberProfileDetail,
		| "membershipId"
		| "displayName"
		| "departmentId"
		| "employmentType"
		| "hireDate"
	>;
	/** The caller's own profile: read from `/me`, never changed. */
	self?: boolean;
};

type Open =
	| { kind: "change" }
	| { kind: "history" }
	| { kind: "correct"; entry: HistoryEntry }
	| { kind: "cancel"; entry: HistoryEntry };

const key = "employmentTerms.row";

/**
 * The Employment card's "Employment terms" value: the terms a person works
 * on today in plain words, since when, their own hours and any change ahead,
 * with Change… and History for whoever may change their terms. The terms'
 * name opens them in Settings › Employment for whoever may read the
 * catalogue. On My profile it is read-only.
 */
export const EmploymentTermsRow = ({
	companyId,
	profile,
	self = false,
}: EmploymentTermsRowProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const access = useAccess();
	const canChange =
		!self && access.can("member_employment_terms:update", personScope(profile));
	const canViewCatalogue = access.can("employment_terms:read", COMPANY_SCOPE);
	// My profile never links into Settings.
	const linksToSettings = !self && canViewCatalogue;
	const mine = useQuery(myTermsQuery(companyId, self));
	const member = useQuery(
		memberTermsQuery(companyId, profile.membershipId, !self)
	);
	const terms = self ? mine : member;
	const actions = useMemberTermsActions(companyId, profile.membershipId);
	const [open, setOpen] = useState<Open | null>(null);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	if (terms.isPending) return <>{t(`${key}.loading`)}</>;
	if (terms.isError)
		// Your own row stays quiet (the API may not offer it yet); someone else's says it failed.
		return self ? (
			<span className="text-neutral-700">{t(`${key}.selfUnavailable`)}</span>
		) : (
			<span className="text-error-700">{t(`${key}.failed`)}</span>
		);
	const current: MemberTerms = terms.data;
	const inForce = current.inForce;
	// History is newest first, so the next change ahead is the last scheduled entry.
	const upcoming = [...current.history]
		.reverse()
		.find((entry) => entry.scheduled);
	const name = inForce ? inForce.name : t(`${key}.unset`);
	return (
		<span className="flex min-w-0 flex-col gap-1">
			<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
				{inForce && linksToSettings ? (
					<Button
						aria-label={t(`${key}.viewTerms`, { name: inForce.name })}
						search={{ section: "employment", terms: inForce.termsId }}
						to="/settings"
						variant="textlink"
					>
						{name}
					</Button>
				) : (
					<span>{name}</span>
				)}
				{canChange && (
					<Button
						variant="textlink"
						onClick={() => {
							setOpen({ kind: "change" });
						}}
					>
						{t(inForce ? `${key}.change` : `${key}.set`)}
					</Button>
				)}
				{canChange && current.history.length > 0 && (
					<Button
						variant="textlink"
						onClick={() => {
							setOpen({ kind: "history" });
						}}
					>
						{t(`${key}.history`)}
					</Button>
				)}
			</span>
			{inForce && (
				<span className="text-xs text-neutral-700">
					{termsSentence(inForce, current.reference, t, language)}
				</span>
			)}
			<span className="text-xs text-neutral-700">
				{[
					inForce?.since
						? t(`${key}.since`, { date: formatDate(inForce.since, language) })
						: undefined,
					inForce?.contractedWeekMinutes
						? t(self ? `${key}.selfOwnHours` : `${key}.ownHours`, {
								week: formatHours(inForce.contractedWeekMinutes, language),
							})
						: undefined,
					upcoming
						? t(`${key}.upcoming`, {
								date: formatDate(upcoming.effectiveFrom, language),
								name: upcoming.termsName,
							})
						: undefined,
				]
					.filter(Boolean)
					.join(" · ")}
			</span>
			{current.mismatch && (
				<Callout className="mt-1" tone="warning">
					{t(
						current.mismatch.employmentType === "PART_TIME"
							? `${key}.mismatch.partTimeOnFullTerms`
							: `${key}.mismatch.fullTimeOnPartTerms`,
						{
							week: formatHours(
								current.mismatch.effectiveWeekMinutes,
								language
							),
						}
					)}
				</Callout>
			)}
			{(open?.kind === "change" || open?.kind === "correct") && (
				<ChangeEmploymentTermsDialog
					companyId={companyId}
					correcting={open.kind === "correct" ? open.entry : undefined}
					current={current}
					person={profile}
					onSaved={notify}
					onClose={() => {
						setOpen(null);
					}}
				/>
			)}
			{open?.kind === "history" && (
				<EmploymentTermsHistoryDialog
					canChange={canChange}
					displayName={profile.displayName}
					history={current.history}
					onCancelChange={(entry) => {
						setOpen({ kind: "cancel", entry });
					}}
					onClose={() => {
						setOpen(null);
					}}
					onCorrect={(entry) => {
						setOpen({ kind: "correct", entry });
					}}
				/>
			)}
			{open?.kind === "cancel" && (
				<ConfirmDialog
					cancelLabel={t("employmentTerms.history.keep")}
					confirmLabel={t("employmentTerms.history.cancelConfirm")}
					description={t("employmentTerms.history.cancelDescription")}
					submitting={actions.cancel.isPending}
					tone="danger"
					error={
						actions.cancel.error
							? memberTermsRefusal(actions.cancel.error, t).message
							: undefined
					}
					title={t("employmentTerms.history.cancelTitle", {
						name: open.entry.termsName,
						date: formatDate(open.entry.effectiveFrom, language),
					})}
					onClose={() => {
						actions.cancel.reset();
						setOpen({ kind: "history" });
					}}
					onConfirm={() => {
						actions.cancel.mutate(open.entry.id, {
							onSuccess: () => {
								actions.cancel.reset();
								setOpen({ kind: "history" });
								notify(t("employmentTerms.change.toast.cancelled"));
							},
						});
					}}
				/>
			)}
			{toast && (
				<Toast
					key={toast.id}
					onDismiss={() => {
						setToast(undefined);
					}}
				>
					{toast.message}
				</Toast>
			)}
		</span>
	);
};
