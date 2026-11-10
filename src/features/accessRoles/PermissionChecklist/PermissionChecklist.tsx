import { useId, useImperativeHandle, useRef, useState, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Checkbox } from "@/components/ui/Checkbox";
import type { AccessRoleKind } from "@/features/accessRoles/api";
import {
	blockedBy,
	canTick,
	dependenciesOf,
	hintKeyOf,
	labelKeyOf,
	missingUses,
	type PermissionGroup,
	permissionLabel,
	permissionList,
	scopeHintOf,
	sectionsFor,
	type TickedAlong,
	tickUses,
	toggleGroup,
	togglePermission,
} from "@/features/accessRoles/PermissionChecklist/groups";
import {
	isCompanyOnly,
	PERMISSION_KEYS,
	type PermissionKey,
	type PermissionUse,
} from "@/features/workspace/permissionKeys";

const NONE: ReadonlyArray<never> = [];
const COMPANY_ONLY = PERMISSION_KEYS.filter(isCompanyOnly);

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
	 * The role's kind. A local role's list leaves out company-only keys, and
	 * any row left without keys, and marks the keys that can't be given at
	 * a Department; a company role's marks nothing, since every key applies
	 * company-wide. Until a kind is chosen, every key is shown and
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
	/** Focuses the first box that can be changed, e.g. after a validation error. */
	ref?: Ref<{ focus: () => void }>;
};

/**
 * Every permission in the catalog, in one section per module (People,
 * Scheduling, …) and one row per resource inside it. A row's first box
 * ticks or clears the whole resource and shows a mixed state in between.
 * Ticking a permission ticks what it needs and clearing one clears what
 * needs it, as the API's contract declares; ticking one also ticks what its
 * screens use (`PERMISSION_USES`) and says so, and a row warns when what it
 * uses is missing. Each permission reads as a plain sentence with a hint;
 * one whose prerequisite can't be given is unavailable with the reason
 * beside it, and where a permission can be given is said beside it as the
 * role's `kind` needs.
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
	const sectionId = useId();
	// What the last change ticked along, said until the next change.
	const [alsoTicked, setAlsoTicked] = useState<Array<TickedAlong>>([]);
	useImperativeHandle(ref, () => ({
		focus: (): void => {
			list.current
				?.querySelector<HTMLInputElement>("input:not(:disabled)")
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
	// Whatever a tick implies, an unavailable permission is never added.
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
	const describe = (key: PermissionKey): string => {
		const missing = unavailable.includes(key)
			? []
			: blockedBy(key, value, unavailable);
		const hint = scopeHintOf(key, kind);
		return [
			t(hintKeyOf(key)),
			hint && t(`organisation.permissions.${hint}`),
			missing.length > 0 &&
				t("organisation.permissions.blockedBy", {
					prerequisites: names(missing),
				}),
		]
			.filter(Boolean)
			.join(". ");
	};

	const renderGroup = (group: PermissionGroup): FunctionComponent => {
		const name = t(`organisation.permissions.${group.resource}.name`);
		const total = group.keys.length;
		const count = group.keys.filter((key) => value.includes(key)).length;
		const open = group.keys.filter(tickable);
		const full = open.length > 0 && open.every((key) => value.includes(key));

		return (
			<div
				key={group.resource}
				aria-label={name}
				className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-neutral-400 p-4 hover:bg-neutral-50 xl:grid-cols-[18rem_minmax(0,1fr)_3.5rem] xl:gap-6"
				role="group"
			>
				<div className="min-w-0">
					<Checkbox
						checked={full}
						disabled={disabled || open.length === 0}
						indeterminate={count > 0 && !full}
						label={name}
						labelClassName="font-semibold"
						onChange={(event) => {
							change(
								toggleGroup(value, group, event.target.checked, unavailable)
							);
						}}
					/>
					<p className="mt-1 pl-6 text-sm text-neutral-700">
						{t(`organisation.permissions.${group.resource}.description`)}
					</p>
					{dependenciesOf(group.keys).map((dependency) => (
						<p
							key={dependency.prerequisites.join()}
							className="mt-1 pl-6 text-xs text-neutral-600"
						>
							{dependency.everyOther
								? t("organisation.permissions.needsAll", {
										prerequisites: names(dependency.prerequisites),
									})
								: t("organisation.permissions.needs", {
										count: dependency.keys.length,
										permissions: names(dependency.keys),
										prerequisites: names(dependency.prerequisites),
									})}
						</p>
					))}
					{/* Said on the row that was ticked, where the person is looking. */}
					<div aria-live="polite">
						{alsoTicked
							.filter((use) => group.keys.includes(use.by))
							.map((use) => (
								<p
									key={`${use.key}-${use.reason}`}
									className="mt-1 pl-6 text-xs text-neutral-700"
								>
									{t("organisation.permissions.alsoTicked", {
										permission: permissionLabel(use.key, t),
										reason: phraseOf(use, "why"),
									})}
								</p>
							))}
					</div>
					{missingUses(group.keys, value).map((use) => (
						<p
							key={`${use.key}-${use.reason}`}
							className="mt-1 pl-6 text-xs text-warning-800"
						>
							{t("organisation.permissions.missingUse", {
								permission: permissionLabel(use.key, t),
								consequence: phraseOf(use, "without"),
							})}
						</p>
					))}
				</div>
				<div className="col-span-2 row-start-2 mt-1 grid min-w-0 content-start items-start gap-x-6 gap-y-3 border-t border-neutral-200 pt-4 pl-6 sm:grid-cols-2 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:mt-0 xl:border-t-0 xl:pt-0 xl:pl-0">
					{group.keys.map((key) => (
						<Checkbox
							key={key}
							checked={value.includes(key)}
							className="min-w-0"
							description={describe(key)}
							disabled={disabled || !tickable(key)}
							label={t(labelKeyOf(key))}
							onChange={(event) => {
								change(
									togglePermission(
										value,
										key,
										event.target.checked,
										unavailable
									)
								);
							}}
						/>
					))}
				</div>
				<p className="col-start-2 row-start-1 text-right text-sm leading-6 text-neutral-700 xl:col-start-3">
					{t("organisation.permissions.groupCount", { count, total })}
				</p>
			</div>
		);
	};

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
			{sectionsFor(kind).map((section) => {
				const headingId = `${sectionId}-${section.module}`;
				const keys = section.groups.flatMap((group) => group.keys);
				const count = keys.filter((key) => value.includes(key)).length;
				return (
					<section
						key={section.module}
						aria-labelledby={headingId}
						className="border-t border-neutral-400 first-of-type:border-t-0"
					>
						<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 bg-neutral-100 px-4 py-3">
							<div className="min-w-0">
								<h3
									className="text-base font-semibold text-neutral-900"
									id={headingId}
								>
									{t(
										`organisation.permissions.sections.${section.module}.name`
									)}
								</h3>
								<p className="text-sm text-neutral-700">
									{t(
										`organisation.permissions.sections.${section.module}.description`
									)}
								</p>
							</div>
							<p className="text-sm text-neutral-700">
								{t("organisation.permissions.sectionCount", {
									count,
									total: keys.length,
								})}
							</p>
						</div>
						{section.groups.map(renderGroup)}
					</section>
				);
			})}
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
		</div>
	);
};
