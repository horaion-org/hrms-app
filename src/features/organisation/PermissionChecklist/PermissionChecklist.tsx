import { useImperativeHandle, useRef, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	blockedBy,
	canTick,
	dependenciesOf,
	labelKeyOf,
	PERMISSION_GROUPS,
	permissionList,
	toggleGroup,
	togglePermission,
} from "@/features/organisation/PermissionChecklist/groups";
import {
	isCompanyOnly,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

const NONE: ReadonlyArray<never> = [];

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
 * Every permission in the catalog, one row per resource. A row's first box
 * ticks or clears the whole resource and shows a mixed state in between.
 * Ticking a permission ticks what it needs and clearing one clears what
 * needs it, as the API's contract declares; each row says which of its
 * permissions need another, a permission whose prerequisite can't be given
 * is unavailable with the reason beside it, and company-only permissions
 * say so.
 */
export const PermissionChecklist = ({
	label,
	value,
	onChange,
	disabled = false,
	unavailable = NONE,
	unknown = NONE,
	id,
	describedBy,
	className,
	ref,
}: PermissionChecklistProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const list = useRef<HTMLDivElement>(null);
	useImperativeHandle(ref, () => ({
		focus: (): void => {
			list.current
				?.querySelector<HTMLInputElement>("input:not(:disabled)")
				?.focus();
		},
	}));
	const language = i18n.resolvedLanguage ?? i18n.language;
	const tickable = (key: PermissionKey): boolean =>
		canTick(key, value, unavailable);
	// Whatever a tick implies, an unavailable permission is never added.
	const change = (next: Array<PermissionKey>): void => {
		onChange(
			next.filter((key) => value.includes(key) || !unavailable.includes(key))
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
			{PERMISSION_GROUPS.map((group) => {
				const name = t(`organisation.permissions.${group.resource}.name`);
				const total = group.keys.length;
				const count = group.keys.filter((key) => value.includes(key)).length;
				const open = group.keys.filter(tickable);
				const full =
					open.length > 0 && open.every((key) => value.includes(key));
				const names = (keys: ReadonlyArray<PermissionKey>): string =>
					permissionList(keys, t, language, group.resource);

				return (
					<div
						key={group.resource}
						aria-label={name}
						className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-neutral-400 p-4 first:border-t-0 hover:bg-neutral-50 xl:grid-cols-[20rem_minmax(0,1fr)_3.5rem] xl:gap-6"
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
									{t("organisation.permissions.needs", {
										count: dependency.keys.length,
										permissions: names(dependency.keys),
										prerequisites: names(dependency.prerequisites),
									})}
								</p>
							))}
						</div>
						<div className="col-span-2 row-start-2 mt-1 grid min-w-0 grid-cols-3 content-start items-start gap-x-6 gap-y-2 border-t border-neutral-200 pt-4 pl-6 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:mt-0 xl:border-t-0 xl:pt-0 xl:pl-0">
							{group.keys.map((key) => {
								const missing = unavailable.includes(key)
									? []
									: blockedBy(key, value, unavailable);
								const description = [
									isCompanyOnly(key) &&
										t("organisation.permissions.companyOnly"),
									missing.length > 0 &&
										t("organisation.permissions.blockedBy", {
											prerequisites: names(missing),
										}),
								]
									.filter(Boolean)
									.join(". ");
								return (
									<Checkbox
										key={key}
										checked={value.includes(key)}
										className="min-w-0"
										description={description || undefined}
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
								);
							})}
						</div>
						<p className="col-start-2 row-start-1 text-right text-sm leading-6 text-neutral-700 xl:col-start-3">
							{t("organisation.permissions.groupCount", { count, total })}
						</p>
					</div>
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
