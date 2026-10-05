import { useId, useImperativeHandle, useRef, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { WarningIcon } from "@/components/ui/Icon";
import {
	inCatalogueOrder,
	PERMISSION_ACTIONS,
	PERMISSION_CATALOGUE,
	permissionKey,
} from "@/features/organisation/permissionCatalogue";

export type PermissionsGridProps = {
	/** The group's visible name, e.g. "Permissions". */
	legend: string;
	/** Chosen keys, such as `branch:read`. */
	value: Array<string>;
	/** Receives the chosen keys in catalogue order. */
	onChange: (value: Array<string>) => void;
	/** Keys the person may grant; every other box is disabled. */
	grantable: ReadonlySet<string>;
	/** Shown under the grid while there is no error. */
	hint?: string;
	/** Visual count only. */
	counter?: string;
	error?: string;
	required?: boolean;
	disabled?: boolean;
	className?: string;
	/** Focuses the first box that can be changed, e.g. after a validation error. */
	ref?: Ref<{ focus: () => void }>;
};

/**
 * Chooses permissions from the catalogue: one row per resource, one column
 * per action, and an empty cell where a resource lacks that action.
 */
export const PermissionsGrid = ({
	legend,
	value,
	onChange,
	grantable,
	hint,
	counter,
	error,
	required = false,
	disabled = false,
	className,
	ref,
}: PermissionsGridProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const hintId = `${id}-hint`,
		errorId = `${id}-error`;
	const table = useRef<HTMLTableElement>(null);
	useImperativeHandle(ref, () => ({
		focus: (): void => {
			table.current
				?.querySelector<HTMLInputElement>("input:not(:disabled)")
				?.focus();
		},
	}));
	const chosen = new Set(value);
	const describedBy = error ? errorId : hint ? hintId : undefined;
	return (
		<fieldset
			aria-describedby={describedBy}
			aria-invalid={Boolean(error) || undefined}
			className={joinClassNames("flex min-w-0 flex-col gap-2", className)}
			disabled={disabled}
		>
			<legend className="mb-2 text-sm font-bold text-neutral-800">
				{legend}
				{required && (
					<span aria-hidden="true" className="ml-1 text-error-700">
						*
					</span>
				)}
			</legend>
			<div
				className={joinClassNames(
					"overflow-x-auto rounded-lg border",
					error ? "border-error-600" : "border-neutral-300"
				)}
			>
				<table ref={table} className="w-full border-collapse text-sm">
					<thead className="bg-neutral-100">
						<tr>
							<th
								className="px-3 py-2 text-left font-bold text-neutral-800"
								scope="col"
							>
								{t("organisation.permissions.area")}
							</th>
							{PERMISSION_ACTIONS.map((action) => (
								<th
									key={action}
									className="px-2 py-2 text-center font-bold text-neutral-800"
									scope="col"
								>
									{t(`organisation.permissions.actions.${action}`)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{PERMISSION_CATALOGUE.map(({ resource, actions }) => {
							const resourceLabel = t(
								`organisation.permissions.resources.${resource}`
							);
							return (
								<tr key={resource} className="border-t border-neutral-200">
									<th
										className="px-3 py-2 text-left font-semibold whitespace-nowrap text-neutral-900"
										scope="row"
									>
										{resourceLabel}
									</th>
									{PERMISSION_ACTIONS.map((action) => {
										if (!(actions as ReadonlyArray<string>).includes(action))
											return <td key={action} />;
										const key = permissionKey(resource, action);
										const allowed = grantable.has(key);
										return (
											<td key={action} className="px-2 py-2">
												<Checkbox
													hideLabel
													aria-describedby={describedBy}
													checked={chosen.has(key)}
													className="justify-center"
													disabled={!allowed}
													name={key}
													label={t("organisation.permissions.cell", {
														resource: resourceLabel,
														action: t(
															`organisation.permissions.actionNames.${action}`
														),
													})}
													onChange={(event) => {
														const next = new Set(chosen);
														if (event.target.checked) next.add(key);
														else next.delete(key);
														onChange(inCatalogueOrder(next));
													}}
												/>
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			{(error || hint || counter) && (
				<div className="flex items-start justify-between gap-4 text-xs">
					{!error && hint && (
						<p className="min-w-0 text-neutral-600" id={hintId}>
							{hint}
						</p>
					)}
					{error && (
						<p
							className="flex min-w-0 items-start gap-1.5 text-error-700"
							id={errorId}
							role="alert"
						>
							<WarningIcon className="size-4 shrink-0" />
							<span>{error}</span>
						</p>
					)}
					{counter && (
						<span
							aria-hidden="true"
							className="ml-auto shrink-0 text-neutral-500"
						>
							{counter}
						</span>
					)}
				</div>
			)}
		</fieldset>
	);
};
