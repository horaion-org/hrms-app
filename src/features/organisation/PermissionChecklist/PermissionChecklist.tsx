import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AccessAreaRow } from "@/features/organisation/AccessAreaRow";
import type { AccessRoleKind } from "@/features/organisation/api";
import {
	areaLevel,
	canChooseLevel,
	choosableLevels,
	offeredKeys,
	withAreaLevel,
} from "@/features/organisation/areaLevels";
import {
	AREAS,
	areaOf,
	isSettingsArea,
	type PermissionArea,
} from "@/features/organisation/permissionAreas";
import {
	blockedBy,
	canTick,
	hintKeyOf,
	labelKeyOf,
	missingUses,
	permissionLabel,
	permissionList,
	scopeHintOf,
	type TickedAlong,
	tickUses,
	togglePermission,
} from "@/features/organisation/PermissionChecklist/groups";
import {
	dependingOn,
	isAboveDepartments,
	isCompanyOnly,
	PERMISSION_KEYS,
	type PermissionKey,
	type PermissionUse,
} from "@/features/workspace/permissionKeys";

const NONE: ReadonlyArray<never> = [];
const COMPANY_ONLY = PERMISSION_KEYS.filter(isCompanyOnly);
const areasKey = "organisation.accessAreas";

/** A key whose clearing waits for the person to confirm, and the keys that go with it. */
type PendingRemoval = { key: PermissionKey; dependants: Array<PermissionKey> };

export type PermissionChecklistProps = {
	/** Names the whole list for assistive technology. */
	label: string;
	/** The ticked permissions. */
	value: ReadonlyArray<PermissionKey>;
	/** Receives the new selection, in the catalog's order. */
	onChange: (value: Array<PermissionKey>) => void;
	/** Shows the selection without letting it be changed. */
	disabled?: boolean;
	/** Permissions that can't be ticked, e.g. ones the person may not grant. */
	unavailable?: ReadonlyArray<PermissionKey>;
	/**
	 * The role's kind. A local role's areas leave out company-only keys, and
	 * an area left without keys is named once as for whole-company roles; an
	 * area with keys that can't be given at a Department says so. A company
	 * role marks nothing. Until a kind is chosen, every key is shown and
	 * company-only keys are marked.
	 */
	kind?: AccessRoleKind;
	/**
	 * Keys the role holds that this app's catalog doesn't know. They are
	 * shown ticked and locked: the caller keeps them in what it saves.
	 */
	unknown?: ReadonlyArray<string>;
	/** The list's id, e.g. for a label or hint pointing at it. */
	id?: string;
	/** Ids of text describing the whole list, e.g. a hint or an error. */
	describedBy?: string;
	className?: string;
	/** Focuses the first control that can be changed, e.g. after a validation error. */
	ref?: Ref<{ focus: () => void }>;
};

/**
 * A role's permissions as the app's menu areas, in the menu's order, each
 * with a level (`AccessAreaRow`) and its single permissions behind Details.
 * Choosing a level or ticking a permission ticks what it needs, as the
 * API's contract declares, and what its screens work with (`worksWith`),
 * saying why on the row. A permission others need says so, and clearing it
 * asks first, naming what goes with it. A permission whose prerequisite
 * can't be given is unavailable with the reason beside it.
 */
export const PermissionChecklist = ({
	label,
	value,
	onChange,
	disabled = false,
	unavailable: notGrantable = NONE,
	kind,
	unknown = NONE,
	id,
	describedBy,
	className,
	ref,
}: PermissionChecklistProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const list = useRef<HTMLDivElement>(null);
	// What the last change ticked along, said until the next change.
	const [alsoTicked, setAlsoTicked] = useState<Array<TickedAlong>>([]);
	const [removal, setRemoval] = useState<PendingRemoval>();
	useImperativeHandle(ref, () => ({
		focus: (): void => {
			list.current
				?.querySelector<HTMLElement>(
					"button:not(:disabled), input:not(:disabled)"
				)
				?.focus();
		},
	}));
	const language = i18n.resolvedLanguage ?? i18n.language;
	// A local role can never hold a company-only key, whatever a tick implies.
	const unavailable =
		kind === "LOCAL"
			? [
					...notGrantable,
					...COMPANY_ONLY.filter((key) => !notGrantable.includes(key)),
				]
			: notGrantable;
	const tickable = (key: PermissionKey): boolean =>
		canTick(key, value, unavailable);
	// Whatever a change implies, an unavailable permission is never added.
	const change = (next: Array<PermissionKey>): void => {
		const allowed = next.filter(
			(key) => value.includes(key) || !unavailable.includes(key)
		);
		const withUses = tickUses(value, allowed, unavailable);
		setAlsoTicked(withUses.alsoTicked);
		onChange(withUses.selected);
	};
	const names = (keys: ReadonlyArray<PermissionKey>): string =>
		permissionList(keys, t, language);
	const phraseOf = (use: PermissionUse, part: "why" | "without"): string =>
		t(`organisation.permissions.uses.${use.reason}.${part}`);
	// The ticked keys that need `key`, besides itself.
	const neededBy = (key: PermissionKey): Array<PermissionKey> =>
		dependingOn(key).filter((item) => item !== key && value.includes(item));
	const describe = (key: PermissionKey): string => {
		const missing = unavailable.includes(key)
			? []
			: blockedBy(key, value, unavailable);
		const hint = scopeHintOf(key, kind);
		const needing = value.includes(key) ? neededBy(key) : [];
		return [
			t(hintKeyOf(key)),
			hint && t(`organisation.permissions.${hint}`),
			needing.length > 0 &&
				t(`${areasKey}.neededBy`, { permissions: names(needing) }),
			missing.length > 0 &&
				t("organisation.permissions.blockedBy", {
					prerequisites: names(missing),
				}),
		]
			.filter(Boolean)
			.join(". ");
	};
	const toggle = (key: PermissionKey, checked: boolean): void => {
		const dependants = checked ? [] : neededBy(key);
		if (dependants.length > 0) {
			setRemoval({ key, dependants });
			return;
		}
		change(togglePermission(value, key, checked, unavailable));
	};
	const areaNote = (
		offered: ReadonlyArray<PermissionKey>
	): string | undefined => {
		if (kind === "LOCAL" && offered.some(isAboveDepartments))
			return t(`${areasKey}.notAtDepartments`);
		if (kind === undefined && offered.some(isCompanyOnly))
			return t(`${areasKey}.companyOnlyPart`);
		return undefined;
	};

	const renderArea = (area: PermissionArea): FunctionComponent => {
		const offered = offeredKeys(area, kind);
		const name = t(`${areasKey}.${area}.name`);
		const held = offered.filter((key) => value.includes(key)).length;
		return (
			<AccessAreaRow
				key={area}
				className="border-t border-neutral-300 first:border-t-0"
				description={t(`${areasKey}.${area}.description`)}
				disabled={disabled}
				level={areaLevel(offered, value)}
				name={name}
				note={areaNote(offered)}
				detailsTitle={t(`${areasKey}.details`, {
					count: held,
					total: offered.length,
				})}
				levels={choosableLevels(offered).map((level) => ({
					level,
					disabled: !canChooseLevel(offered, level, value, unavailable),
				}))}
				messages={
					<>
						{/* Said on the area whose change ticked it, where the person is looking. */}
						{alsoTicked
							.filter((use) => areaOf(use.by) === area)
							.map((use) => (
								<p
									key={`${use.key}-${use.reason}`}
									className="mt-2 text-xs text-neutral-700"
								>
									{t("organisation.permissions.alsoTicked", {
										permission: permissionLabel(use.key, t),
										reason: phraseOf(use, "why"),
									})}
								</p>
							))}
						{missingUses(offered, value).map((use) => (
							<p
								key={`${use.key}-${use.reason}`}
								className="mt-2 text-xs text-warning-800"
							>
								{t("organisation.permissions.missingUse", {
									permission: permissionLabel(use.key, t),
									consequence: phraseOf(use, "without"),
								})}
							</p>
						))}
					</>
				}
				onLevelChange={(level) => {
					change(withAreaLevel(value, offered, level, unavailable));
				}}
			>
				<div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
					{offered.map((key) => (
						<Checkbox
							key={key}
							checked={value.includes(key)}
							className="min-w-0"
							description={describe(key)}
							disabled={disabled || !tickable(key)}
							label={t(labelKeyOf(key))}
							onChange={(event) => {
								toggle(key, event.target.checked);
							}}
						/>
					))}
				</div>
			</AccessAreaRow>
		);
	};

	const withKeys = AREAS.filter((area) => offeredKeys(area, kind).length > 0);
	const companyOnlyAreas = AREAS.filter(
		(area) => offeredKeys(area, kind).length === 0
	);

	return (
		<div
			ref={list}
			aria-describedby={describedBy}
			aria-label={label}
			id={id}
			role="group"
			className={joinClassNames(
				"overflow-hidden rounded-lg border border-neutral-400 bg-white",
				className
			)}
		>
			{withKeys.filter((area) => !isSettingsArea(area)).map(renderArea)}
			<h3 className="border-t border-neutral-400 bg-neutral-100 px-4 py-3 text-base font-semibold text-neutral-900">
				{t(`${areasKey}.settings`)}
			</h3>
			{withKeys.filter(isSettingsArea).map(renderArea)}
			{companyOnlyAreas.length > 0 && (
				<p className="border-t border-neutral-300 px-4 py-4 text-sm text-neutral-700">
					{t(`${areasKey}.companyOnlyAreas`, {
						areas: new Intl.ListFormat(language, {
							type: "conjunction",
						}).format(
							companyOnlyAreas.map((area) => t(`${areasKey}.${area}.name`))
						),
					})}
				</p>
			)}
			{unknown.length > 0 && (
				<div
					aria-label={t("organisation.permissions.unknown.name")}
					className="flex flex-col gap-3 border-t border-neutral-400 bg-warning-50 p-4 xl:flex-row xl:items-start xl:gap-6"
					role="group"
				>
					<div className="xl:w-80 xl:shrink-0">
						<p className="font-semibold text-neutral-900">
							{t("organisation.permissions.unknown.name")}
						</p>
						<p className="mt-1 text-sm text-neutral-700">
							{t("organisation.permissions.unknown.description")}
						</p>
					</div>
					<div className="mt-1 grid min-w-0 flex-1 grid-cols-3 content-start items-start gap-x-6 gap-y-2 border-t border-neutral-200 pt-4 xl:mt-0 xl:border-t-0 xl:pt-0">
						{unknown.map((key) => (
							<Checkbox
								key={key}
								checked
								disabled
								readOnly
								className="min-w-0"
								label={key}
							/>
						))}
					</div>
				</div>
			)}
			{removal && (
				<ConfirmDialog
					cancelLabel={t(`${areasKey}.remove.keep`)}
					description={t(`${areasKey}.remove.description`)}
					tone="danger"
					confirmLabel={t(`${areasKey}.remove.confirm`, {
						count: removal.dependants.length + 1,
					})}
					title={t(`${areasKey}.remove.title`, {
						permission: permissionLabel(removal.key, t),
					})}
					onClose={() => {
						setRemoval(undefined);
					}}
					onConfirm={() => {
						change(togglePermission(value, removal.key, false));
						setRemoval(undefined);
					}}
				>
					<ul className="list-disc pl-5 text-sm text-neutral-800">
						{removal.dependants.map((key) => (
							<li key={key}>{t(labelKeyOf(key))}</li>
						))}
					</ul>
				</ConfirmDialog>
			)}
		</div>
	);
};
