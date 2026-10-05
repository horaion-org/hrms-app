import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { AccessRole, CompanyMember } from "@/features/organisation/api";
import type { AssignmentTarget } from "@/features/organisation/assignmentTargets";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import { isPermissionKey } from "@/features/workspace/permissionKeys";

export type AssignAccessRoleDialogProps = {
	/** The roles that can be assigned. Given just one, it is the role and no choice is offered. */
	roles: Array<AccessRole>;
	/** The people matching `query`. */
	people: Array<CompanyMember>;
	query: string;
	onQueryChange: (query: string) => void;
	/** Every place a role can apply, widest first. */
	targets: Array<AssignmentTarget>;
	/** Why the last attempt was refused. */
	error?: string;
	/** True while an attempt is being sent. */
	submitting?: boolean;
	onAssign: (
		accessRoleId: string,
		membershipId: string,
		targets: Array<AssignmentTarget>
	) => void;
	onClose: () => void;
};

const key = "organisation.accessRoles.assignments.dialog";

/**
 * Gives one access role to one person at one or several places, showing
 * what the role allows so it is clear what is being given.
 */
export const AssignAccessRoleDialog = ({
	roles,
	people,
	query,
	onQueryChange,
	targets,
	error,
	submitting = false,
	onAssign,
	onClose,
}: AssignAccessRoleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const roleId = useId();
	const personId = useId();
	const placesId = useId();
	const onlyRole = roles.length === 1 ? roles[0] : undefined;
	// Empty until a role is chosen, which keeps the Select controlled throughout.
	const [chosenRoleId, setChosenRoleId] = useState(
		onlyRole?.accessRoleId ?? ""
	);
	const [person, setPerson] = useState<CompanyMember | null>(null);
	const [places, setPlaces] = useState<Array<AssignmentTarget>>([]);
	const [placeQuery, setPlaceQuery] = useState("");
	const role = roles.find((item) => item.accessRoleId === chosenRoleId);

	return (
		<Dialog
			open
			description={t(`${key}.description`)}
			preventClose={submitting}
			title={t(`${key}.title`)}
			footer={
				<div className="flex justify-end gap-3">
					<Button disabled={submitting} variant="secondary" onClick={onClose}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						disabled={!role || !person || places.length === 0}
						loading={submitting}
						onClick={() => {
							if (role && person)
								onAssign(role.accessRoleId, person.membershipId, places);
						}}
					>
						{t(`${key}.submit`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<div className="space-y-6">
				{error && (
					<p className="text-sm text-error-700" role="alert">
						{error}
					</p>
				)}
				<FormRow
					required
					htmlFor={roleId}
					label={t(`${key}.role`)}
					layout="stacked"
				>
					<Select
						aria-labelledby={formRowIds(roleId).labelId}
						className="w-full"
						disabled={submitting || onlyRole !== undefined}
						placeholder={t(`${key}.rolePlaceholder`)}
						value={chosenRoleId}
						options={roles.map((item) => ({
							value: item.accessRoleId,
							label: item.name,
						}))}
						onChange={setChosenRoleId}
					/>
				</FormRow>
				<FormRow
					required
					htmlFor={personId}
					label={t(`${key}.person`)}
					layout="stacked"
				>
					<Combobox
						aria-required
						aria-label={t(`${key}.person`)}
						disabled={submitting}
						emptyText={t(`${key}.noResults`)}
						getKey={(member) => member.membershipId}
						getLabel={(member) => member.displayName}
						id={personId}
						multiple={false}
						options={people}
						placeholder={t(`${key}.personPlaceholder`)}
						query={query}
						searchPlaceholder={t(`${key}.searchPlaceholder`)}
						value={person}
						onChange={setPerson}
						onQueryChange={onQueryChange}
					/>
				</FormRow>
				<FormRow
					required
					hint={t(`${key}.placesHint`)}
					htmlFor={placesId}
					label={t(`${key}.places`)}
					layout="stacked"
				>
					<Combobox
						aria-required
						aria-describedby={formRowIds(placesId).hintId}
						aria-label={t(`${key}.places`)}
						disabled={submitting}
						emptyText={t(`${key}.placesEmpty`)}
						getKey={(target) => target.departmentId ?? target.branchId ?? ""}
						getLabel={(target) => target.label}
						id={placesId}
						placeholder={t(`${key}.placesPlaceholder`)}
						query={placeQuery}
						searchPlaceholder={t(`${key}.placesSearch`)}
						value={places}
						options={targets.filter((target) =>
							target.label
								.toLocaleLowerCase()
								.includes(placeQuery.trim().toLocaleLowerCase())
						)}
						onChange={setPlaces}
						onQueryChange={setPlaceQuery}
					/>
				</FormRow>
				{role && (
					<PermissionSummary
						permissions={role.permissions.filter(isPermissionKey)}
						title={t(`${key}.allows`)}
					/>
				)}
			</div>
		</Dialog>
	);
};
