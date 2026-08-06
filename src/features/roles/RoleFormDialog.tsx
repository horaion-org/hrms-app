import { useState } from "react";
import type { PermissionKey, Role } from "@/common/api";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/PageState";
import { PermissionMatrix } from "@/components/ui/PermissionMatrix";
import { usePermissionCatalogQuery } from "@/features/permissions/usePermissionsQuery";
import { useSaveRoleMutation } from "@/features/roles/useRolesQuery";
import { useWorkspace } from "@/features/session/workspace-context";

type RoleFormDialogProps = {
	role: Role | null;
	onClose: () => void;
};

/**
 * Mounted only while open, and keyed by the Role being edited, so the form
 * starts from the right values without an effect copying props into state.
 */
export const RoleFormDialog = ({
	role,
	onClose,
}: RoleFormDialogProps): FunctionComponent => {
	const { companyId, permissions } = useWorkspace();
	const catalogQuery = usePermissionCatalogQuery(companyId);
	const save = useSaveRoleMutation(companyId);
	const [name, setName] = useState(role?.name ?? "");
	const [selected, setSelected] = useState<ReadonlySet<PermissionKey>>(
		new Set(role?.permissions ?? [])
	);

	const toggle = (permission: PermissionKey, checked: boolean): void => {
		setSelected((current) => {
			const next = new Set(current);

			if (checked) {
				next.add(permission);
			} else {
				next.delete(permission);
			}

			return next;
		});
	};

	const submit = (): void => {
		save.mutate(
			{ id: role?.id, name, permissions: [...selected] },
			{ onSuccess: onClose }
		);
	};

	return (
		<Dialog
			open
			description="Only permissions you hold yourself can be added, because the API refuses a role that would grant more than you have."
			title={role === null ? "New role" : "Edit role"}
			onClose={onClose}
		>
			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Input
					required
					label="Role name"
					value={name}
					onChange={(event) => {
						setName(event.target.value);
					}}
				/>

				{catalogQuery.isPending ? <LoadingState /> : null}

				{catalogQuery.data === undefined ? null : (
					<div className="max-h-80 overflow-y-auto">
						<PermissionMatrix
							disabled={save.isPending}
							grantable={permissions}
							resources={catalogQuery.data}
							selected={selected}
							onChange={toggle}
						/>
					</div>
				)}

				<div className="flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button
						disabled={name.trim() === "" || selected.size === 0}
						loading={save.isPending}
						type="submit"
					>
						Save role
					</Button>
				</div>
			</form>
		</Dialog>
	);
};
