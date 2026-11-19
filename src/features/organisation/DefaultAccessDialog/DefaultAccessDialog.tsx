import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
	DEFAULT_ACCESS_APPLIES_TO,
	type AccessRole,
	type DefaultAccessAppliesTo,
	type DefaultAccessRuleBody,
} from "@/features/organisation/api";
import {
	placeKey,
	type AssignmentTarget,
} from "@/features/organisation/assignmentTargets";
import {
	defaultAccessBodyOf,
	roleFitsDefault,
} from "@/features/organisation/defaultAccess";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import { isPermissionKey } from "@/features/workspace/permissionKeys";

export type DefaultAccessDialogProps = {
	/** The company's roles; only those that can be default access for the chosen reach are offered. */
	roles: Array<AccessRole>;
	/** The places a default can be set for, the whole company first, as `assignmentTargets` lists them. */
	places: Array<AssignmentTarget>;
	/** Why the last attempt was refused, in the app's words. */
	error?: string;
	/** True while an attempt is being sent. */
	submitting?: boolean;
	onAdd: (body: DefaultAccessRuleBody) => void;
	onClose: () => void;
};

const key = "organisation.accessRoles.defaults";
/** The whole company's value in the "Who gets it" choice, which has no unit id. */
const COMPANY = "company";
const valueOf = (place: AssignmentTarget): string => placeKey(place) || COMPANY;

/**
 * Adds a default (API ADR-0118): a role that everyone who receives
 * default access gets, when they sit in the place chosen ("Who gets it"),
 * in their own department or branch ("Applies to"). It shows what the role
 * allows; defaults add up and never take anything away.
 */
export const DefaultAccessDialog = ({
	roles,
	places,
	error,
	submitting = false,
	onAdd,
	onClose,
}: DefaultAccessDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const roleId = useId();
	const placeId = useId();
	const appliesToId = useId();
	const [appliesTo, setAppliesTo] =
		useState<DefaultAccessAppliesTo>("OWN_DEPARTMENT");
	const [chosenRoleId, setChosenRoleId] = useState("");
	const [chosenPlace, setChosenPlace] = useState(COMPANY);
	const offered = roles.filter((role) => roleFitsDefault(role, appliesTo));
	// A role chosen for one reach is dropped when it doesn't fit the next.
	const role = offered.find((item) => item.accessRoleId === chosenRoleId);
	const place = places.find((item) => valueOf(item) === chosenPlace);

	return (
		<Dialog
			open
			description={t(`${key}.dialog.description`)}
			preventClose={submitting}
			title={t(`${key}.dialog.title`)}
			footer={
				<div className="flex justify-end gap-3">
					<Button disabled={submitting} variant="cancel" onClick={onClose}>
						{t("organisation.list.cancel")}
					</Button>
					<Button
						disabled={!role || !place}
						loading={submitting}
						onClick={() => {
							if (role && place)
								onAdd(defaultAccessBodyOf(role.accessRoleId, appliesTo, place));
						}}
					>
						{t(`${key}.dialog.submit`)}
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
					htmlFor={placeId}
					label={t(`${key}.columns.setFor`)}
					layout="stacked"
				>
					<Select
						aria-labelledby={formRowIds(placeId).labelId}
						className="w-full"
						disabled={submitting}
						placeholder={t(`${key}.dialog.placePlaceholder`)}
						value={chosenPlace}
						options={places.map((item) => ({
							value: valueOf(item),
							label:
								valueOf(item) === COMPANY
									? t(`${key}.setFor.COMPANY`)
									: t(`${key}.setFor.unit`, { place: item.label }),
						}))}
						onChange={setChosenPlace}
					/>
				</FormRow>
				<FormRow
					required
					hint={t(`${key}.dialog.appliesToHint`)}
					htmlFor={appliesToId}
					label={t(`${key}.columns.appliesTo`)}
					layout="stacked"
				>
					<Select
						aria-describedby={formRowIds(appliesToId).hintId}
						aria-labelledby={formRowIds(appliesToId).labelId}
						className="w-full"
						disabled={submitting}
						placeholder={t(`${key}.appliesTo.OWN_DEPARTMENT`)}
						value={appliesTo}
						options={DEFAULT_ACCESS_APPLIES_TO.map((value) => ({
							value,
							label: t(`${key}.appliesTo.${value}`),
						}))}
						onChange={(value) => {
							const chosen = DEFAULT_ACCESS_APPLIES_TO.find(
								(item) => item === value
							);
							if (chosen) setAppliesTo(chosen);
						}}
					/>
				</FormRow>
				<FormRow
					required
					htmlFor={roleId}
					label={t(`${key}.columns.role`)}
					layout="stacked"
				>
					<Select
						aria-labelledby={formRowIds(roleId).labelId}
						className="w-full"
						disabled={submitting || offered.length === 0}
						placeholder={t(`${key}.dialog.rolePlaceholder`)}
						value={role?.accessRoleId ?? ""}
						options={offered.map((item) => ({
							value: item.accessRoleId,
							label: item.name,
						}))}
						onChange={setChosenRoleId}
					/>
				</FormRow>
				{offered.length === 0 && (
					<p className="text-sm text-neutral-700">
						{t(`${key}.dialog.noRoleFits.${appliesTo}`)}
					</p>
				)}
				{role && (
					<PermissionSummary
						permissions={role.permissions.filter(isPermissionKey)}
						title={t(`${key}.dialog.allows`)}
					/>
				)}
			</div>
		</Dialog>
	);
};
