import type { TFunction } from "i18next";
import { useCallback, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { todayDate } from "@/components/forms/Calendar";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	describeList,
	isStatusFilter,
	statusFilterChips,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";
import { mapRefusal } from "@/features/organisation/refusal";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import type { SkillOverview } from "@/features/skills/api";
import { skillColumns } from "@/features/skills/skillColumns";
import { SkillSettingsDialog } from "@/features/skills/SkillSettingsDialog";
import {
	useDeleteSkill,
	useSkillCategories,
	useSkillOverview,
	useUpdateSkill,
} from "@/features/skills/useSkillCatalogue";
import { filterChip } from "@/features/workspace/filterChips";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** The option value standing for every category; never a real one. */
const ALL_CATEGORIES = "";

/** What a confirm about one row asks; deleting a held skill says how many lose it. */
type RowAction = { kind: "status" | "delete"; skill: SkillOverview };

const confirmCopy = (
	{ kind, skill }: RowAction,
	t: TFunction
): { title: string; description: string; confirmLabel: string } => {
	const key = "organisation.skills";
	if (kind === "delete")
		return {
			title: t(`${key}.delete.title`, { name: skill.name }),
			description:
				skill.holders > 0
					? t(`${key}.delete.descriptionHeld`, {
							count: skill.holders,
							name: skill.name,
						})
					: t(`${key}.delete.description`),
			confirmLabel: t(`${key}.delete.confirm`),
		};
	if (skill.status === "INACTIVE")
		return {
			title: t(`${key}.status.activateTitle`, { name: skill.name }),
			description: t(`${key}.status.activateDescription`),
			confirmLabel: t(`${key}.status.activateConfirm`),
		};
	return {
		title: t(`${key}.status.deactivateTitle`, { name: skill.name }),
		description: t(`${key}.status.deactivateDescription`, {
			count: skill.holders,
		}),
		confirmLabel: t(`${key}.status.deactivateConfirm`),
	};
};

/**
 * The company's skill catalogue: the skills and licences people hold, how
 * they are measured, and how many people hold each, with credentials
 * expiring soon or expired. Search, status and category stay on the page.
 * Managed company-wide under the `skill` keys.
 */
export const Skills = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t, i18n } = useTranslation();
	const access = useAccess();
	const canCreate = access.can("skill:create", COMPANY_SCOPE);
	const canUpdate = access.can("skill:update", COMPANY_SCOPE);
	const canDelete = access.can("skill:delete", COMPANY_SCOPE);
	const canEdit = useCallback(() => canUpdate, [canUpdate]);
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState<SkillOverview>();
	const [action, setAction] = useState<RowAction>();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [category, setCategory] = useState(ALL_CATEGORIES);
	const [today] = useState(() => todayDate(Date.now()));
	const categoryId = useId();
	const list = useSkillOverview(companyId, {
		status: status === "all" ? undefined : status,
		category: category || undefined,
		asOf: today,
	});
	const categories = useSkillCategories(companyId);
	const update = useUpdateSkill(companyId);
	const remove = useDeleteSkill(companyId);
	const closeAction = (): void => {
		update.reset();
		remove.reset();
		setAction(undefined);
	};
	const chips = [
		...statusFilterChips(t, status, () => {
			setStatus("all");
		}),
		...(category
			? [
					filterChip(
						"category",
						t("organisation.skills.category"),
						category,
						() => {
							setCategory(ALL_CATEGORIES);
						},
						t
					),
				]
			: []),
	];
	const view = describeList(
		list,
		search,
		chips.length > 0,
		t("organisation.skills.empty"),
		t
	);
	const columns = useMemo(
		() =>
			skillColumns(
				t,
				i18n.language,
				(skill) => (
					<>
						<OverflowMenuItem
							disabled={!canUpdate || skill.status === "UNKNOWN"}
							onClick={() => {
								setAction({ kind: "status", skill });
							}}
						>
							{t(
								skill.status === "INACTIVE"
									? "organisation.list.activateItem"
									: "organisation.list.deactivateItem"
							)}
						</OverflowMenuItem>
						<OverflowMenuItem
							disabled={!canDelete}
							onClick={() => {
								setAction({ kind: "delete", skill });
							}}
						>
							{t("organisation.list.deleteItem")}
						</OverflowMenuItem>
					</>
				),
				canEdit,
				setEditing
			),
		[t, i18n.language, canUpdate, canDelete, canEdit]
	);
	const pending = update.isPending || remove.isPending;
	const failure = update.error ?? remove.error;

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("organisation.skills.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.skills.subtitle")}
			</p>
			<ListToolbar
				chips={chips}
				className="mt-10"
				createLabel={t("organisation.skills.create")}
				search={search}
				searchLabel={t("organisation.skills.search")}
				filter={{
					label: t("organisation.list.showing"),
					value: status,
					options: statusFilterOptions(t, t("organisation.skills.all")),
					onChange: (value) => {
						if (isStatusFilter(value)) setStatus(value);
					},
				}}
				filterFields={
					(categories.data?.length ?? 0) > 0 && (
						<FormRow
							htmlFor={categoryId}
							label={t("organisation.skills.category")}
							layout="stacked"
						>
							<Select
								aria-labelledby={formRowIds(categoryId).labelId}
								className="w-full font-semibold"
								value={category}
								options={[
									{
										value: ALL_CATEGORIES,
										label: t("organisation.skills.allCategories"),
									},
									...(categories.data ?? []).map((name) => ({
										value: name,
										label: name,
									})),
								]}
								onChange={setCategory}
							/>
						</FormRow>
					)
				}
				onSearchChange={setSearch}
				onClearFilters={() => {
					setStatus("all");
					setCategory(ALL_CATEGORIES);
				}}
				onCreate={
					canCreate
						? (): void => {
								setCreating(true);
							}
						: undefined
				}
			/>
			{creating && canCreate && (
				<SkillSettingsDialog
					key={companyId}
					companyId={companyId}
					onClose={() => {
						setCreating(false);
					}}
				/>
			)}
			{editing && (
				<SkillSettingsDialog
					key={editing.skillId}
					companyId={companyId}
					editing={editing}
					onClose={() => {
						setEditing(undefined);
					}}
				/>
			)}
			{action && (
				<ConfirmDialog
					{...confirmCopy(action, t)}
					cancelLabel={t("organisation.list.cancel")}
					submitting={pending}
					tone={action.kind === "delete" ? "danger" : "default"}
					error={
						failure
							? mapRefusal(failure, {
									alerts: {
										"404 SKILL_NOT_FOUND": t("organisation.skills.dialog.gone"),
									},
									forbidden: t(`organisation.skills.${action.kind}.forbidden`),
									failed: t(`organisation.skills.${action.kind}.failed`),
								}).message
							: undefined
					}
					onClose={closeAction}
					onConfirm={() => {
						const { skill } = action;
						if (action.kind === "delete") {
							remove.mutate(skill.skillId, { onSuccess: closeAction });
							return;
						}
						update.mutate(
							{
								skillId: skill.skillId,
								body: {
									name: skill.name,
									category: skill.category,
									description: skill.description,
									proficiencyScale:
										skill.proficiencyScale === "NONE" ? "NONE" : "ONE_TO_TEN",
									tracksExpiry: skill.tracksExpiry,
									validityMonths: skill.validityMonths,
									status: skill.status === "INACTIVE" ? "ACTIVE" : "INACTIVE",
								},
							},
							{ onSuccess: closeAction }
						);
					}}
				/>
			)}
			{view.problem ? (
				<p
					className="mt-8 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={view.problem.alert || undefined}
					role={view.problem.alert ? "alert" : undefined}
				>
					{view.problem.message}
				</p>
			) : (
				<>
					<DataTable
						className="mt-8"
						columns={columns}
						data={view.rows}
						defaultSort={{ id: "name", desc: false }}
						emptyState={view.empty}
						getRowId={(skill) => skill.skillId}
						label={t("organisation.skills.label")}
					/>
					{view.truncated && (
						<p className="mt-4 text-sm text-neutral-700">{view.truncated}</p>
					)}
				</>
			)}
		</>
	);
};
