import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { formatDate } from "@/components/forms/Calendar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import {
	termsOverviewQuery,
	type TermsOverviewItem,
} from "@/features/employmentTerms/api";
import {
	EmploymentTermsDialog,
	type TermsSaved,
} from "@/features/employmentTerms/EmploymentTermsDialog";
import { termsRowRefusal } from "@/features/employmentTerms/refusals";
import { useEmploymentTermsActions } from "@/features/employmentTerms/useEmploymentTermsActions";
import {
	employmentTermsColumns,
	type TermsRowAction,
} from "@/features/settings/EmploymentTermsSettings/employmentTermsColumns";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type EmploymentTermsSettingsProps = {
	companyId: string;
	/** Terms named by the URL (`?terms=`), opened for editing once listed. */
	openTermsId?: string;
	/** Drops `?terms=` once the terms it opened are closed. */
	onTermsClosed: () => void;
};

type Editing = { terms?: TermsOverviewItem; preferFromDate?: boolean };

const key = "employmentTerms.panel";

/** What each confirmation says and does, worded as the job titles list words it. */
const confirmCopy = (
	{ kind, terms }: TermsRowAction,
	t: TFunction
): { title: string; description: string; confirmLabel: string } => {
	if (kind === "default")
		return {
			title: t(`${key}.makeDefault.title`, { name: terms.name }),
			description: t(`${key}.makeDefault.description`, { name: terms.name }),
			confirmLabel: t(`${key}.makeDefault.confirm`),
		};
	if (kind === "delete")
		return {
			title: t(`${key}.delete.title`, { name: terms.name }),
			description: t(`${key}.delete.description`),
			confirmLabel: t(`${key}.delete.confirm`),
		};
	if (terms.status === "INACTIVE")
		return {
			title: t(`${key}.status.activateTitle`, { name: terms.name }),
			description: t(`${key}.status.activateDescription`),
			confirmLabel: t(`${key}.status.activateConfirm`),
		};
	const held = terms.holderCount + terms.scheduledCount;
	return {
		title: t(`${key}.status.deactivateTitle`, { name: terms.name }),
		description:
			held > 0
				? t(`${key}.status.deactivateDescriptionHeld`, { count: held })
				: t(`${key}.status.deactivateDescription`),
		confirmLabel:
			held > 0
				? t(`${key}.status.deactivateConfirmHeld`, { count: held })
				: t(`${key}.status.deactivateConfirm`),
	};
};

/**
 * Settings › Employment: the company's employment terms, the working week
 * each kind of contract sets, with how many people are on each. Read under
 * `employment_terms:read` and changed under `employment_terms:update`, both
 * held company-wide. People are given terms from their profile or the
 * People list, never here. Each count links to the People list filtered to
 * those terms across every Branch, only for whoever reads people and their
 * terms company-wide, so the list they land on matches the count.
 */
export const EmploymentTermsSettings = ({
	companyId,
	openTermsId,
	onTermsClosed,
}: EmploymentTermsSettingsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const access = useAccess();
	const canRead = access.can("employment_terms:read", COMPANY_SCOPE);
	const canUpdate = access.can("employment_terms:update", COMPANY_SCOPE);
	const canListHolders =
		access.can("member_profile:read", COMPANY_SCOPE) &&
		access.can("member_employment_terms:read", COMPANY_SCOPE);
	const overview = useQuery(termsOverviewQuery(companyId, canRead));
	const actions = useEmploymentTermsActions(companyId);
	const [editing, setEditing] = useState<Editing | null>(null);
	const [action, setAction] = useState<TermsRowAction | null>(null);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	const linked =
		canUpdate && openTermsId
			? overview.data?.terms.find((terms) => terms.id === openTermsId)
			: undefined;
	const dialog = editing ?? (linked ? { terms: linked } : null);
	const closeDialog = (): void => {
		setEditing(null);
		if (openTermsId) onTermsClosed();
	};
	const columns = useMemo(
		(): Array<DataTableColumn<TermsOverviewItem>> =>
			employmentTermsColumns(t, {
				language,
				canUpdate,
				canListHolders,
				onEdit: (terms) => {
					setEditing({ terms });
				},
				onChangeFromDate: (terms) => {
					setEditing({ terms, preferFromDate: true });
				},
				onRowAction: setAction,
			}),
		[t, language, canUpdate, canListHolders]
	);
	const forbidden =
		!canRead ||
		(overview.error instanceof ApiProblemError &&
			overview.error.status === 403);
	const problem = forbidden
		? t(`${key}.hidden`)
		: overview.isError
			? t(`${key}.failed`)
			: overview.data === undefined
				? t(`${key}.loading`)
				: undefined;
	const pendingAction =
		actions.changeStatus.isPending ||
		actions.makeDefault.isPending ||
		actions.remove.isPending;
	const actionError =
		actions.changeStatus.error ??
		actions.makeDefault.error ??
		actions.remove.error;
	const closeAction = (): void => {
		actions.changeStatus.reset();
		actions.makeDefault.reset();
		actions.remove.reset();
		setAction(null);
	};
	const savedMessage = (saved: TermsSaved): string =>
		saved.kind === "changedFromDate"
			? [
					t(`${key}.toast.changedFromDate`, {
						count: saved.moved,
						name: saved.name,
						date: formatDate(saved.fromDate, language),
					}),
					...(saved.ownHoursCleared > 0
						? [
								t(`${key}.toast.ownHoursCleared`, {
									count: saved.ownHoursCleared,
								}),
							]
						: []),
				].join(" ")
			: t(saved.kind === "added" ? `${key}.toast.added` : `${key}.toast.saved`);

	return (
		<>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">
						{t(`${key}.title`)}
					</h2>
					<p className="mt-3 text-sm text-neutral-800">
						<Trans
							i18nKey={`${key}.subtitle`}
							components={[
								<Button
									key="scheduling"
									search={{ section: "scheduling" }}
									to="/settings"
									variant="textlink"
								/>,
							]}
						/>
					</p>
				</div>
				{canUpdate && (
					<Button
						className="self-start"
						leadingIcon={<PlusIcon />}
						size="sm"
						onClick={() => {
							setEditing({});
						}}
					>
						{t(`${key}.add`)}
					</Button>
				)}
			</div>
			{problem ? (
				<p
					className="mt-8 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={overview.isError && !forbidden ? true : undefined}
					role={overview.isError && !forbidden ? "alert" : undefined}
				>
					{problem}
				</p>
			) : (
				<>
					<DataTable
						className="mt-8"
						columns={columns}
						data={overview.data?.terms ?? []}
						emptyState={t(`${key}.empty`)}
						getRowId={(terms) => terms.id}
						label={t(`${key}.label`)}
					/>
				</>
			)}
			{dialog && overview.data && (
				<EmploymentTermsDialog
					companyId={companyId}
					editing={dialog.terms}
					preferFromDate={dialog.preferFromDate}
					onClose={closeDialog}
					onSaved={(saved) => {
						notify(savedMessage(saved));
					}}
				/>
			)}
			{action && overview.data && (
				<ConfirmDialog
					{...confirmCopy(action, t)}
					cancelLabel={t("organisation.list.cancel")}
					error={actionError ? termsRowRefusal(actionError, t) : undefined}
					submitting={pendingAction}
					tone={action.kind === "delete" ? "danger" : "default"}
					onClose={closeAction}
					onConfirm={() => {
						const { terms } = action;
						const done = (message: string) => (): void => {
							closeAction();
							notify(message);
						};
						if (action.kind === "default") {
							actions.makeDefault.mutate(terms.id, {
								onSuccess: done(
									t(`${key}.toast.defaultMade`, { name: terms.name })
								),
							});
							return;
						}
						if (action.kind === "delete") {
							actions.remove.mutate(terms.id, {
								onSuccess: done(t(`${key}.toast.deleted`)),
							});
							return;
						}
						const activating = terms.status === "INACTIVE";
						actions.changeStatus.mutate(
							{
								termsId: terms.id,
								status: activating ? "ACTIVE" : "INACTIVE",
							},
							{
								onSuccess: done(
									t(
										activating
											? `${key}.toast.activated`
											: `${key}.toast.deactivated`
									)
								),
							}
						);
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
		</>
	);
};
