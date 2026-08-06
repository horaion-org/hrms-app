import type { CatalogResource, PermissionKey } from "@/common/api";
import { permissionKey } from "@/common/permissions";
import type { FunctionComponent } from "@/common/types";

type PermissionMatrixProps = {
	resources: Array<CatalogResource>;
	selected: ReadonlySet<PermissionKey>;
	/**
	 * Permissions the caller does not hold. The Permission Subset Rule means the
	 * API refuses a Role built from authority the caller lacks, so offering them
	 * would only produce a 403 on save.
	 */
	grantable?: ReadonlySet<PermissionKey>;
	disabled?: boolean;
	onChange: (permission: PermissionKey, checked: boolean) => void;
};

export const PermissionMatrix = ({
	resources,
	selected,
	grantable,
	disabled = false,
	onChange,
}: PermissionMatrixProps): FunctionComponent => {
	return (
		<fieldset className="space-y-4">
			<legend className="sr-only">Permissions</legend>
			{resources.map((resource) => (
				<div key={resource.key} className="rounded-md ring-1 ring-slate-200">
					<p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
						{resource.name}
					</p>
					<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
						{resource.actions.map((action) => {
							const key = permissionKey(resource.key, action.key);
							const withheld = grantable !== undefined && !grantable.has(key);

							return (
								<label
									key={key}
									className={`flex items-center gap-2 text-sm ${
										withheld ? "text-slate-400" : "text-slate-700"
									}`}
									title={
										withheld
											? "You cannot grant a permission you do not hold"
											: undefined
									}
								>
									<input
										checked={selected.has(key)}
										className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
										disabled={disabled || withheld}
										type="checkbox"
										onChange={(event) => {
											onChange(key, event.target.checked);
										}}
									/>
									{action.name}
								</label>
							);
						})}
					</div>
				</div>
			))}
		</fieldset>
	);
};
