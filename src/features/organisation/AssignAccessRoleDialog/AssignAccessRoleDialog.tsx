import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Dialog } from "@/components/ui/Dialog";
import {
	accessSummary,
	assignmentsAfter,
	describeAccess,
} from "@/features/organisation/accessSummary";
import type {
	AccessRole,
	CompanyMember,
	MemberAccessRoleAssignment,
} from "@/features/organisation/api";
import {
	companyRoleOutOfReach,
	keysThatFitNowhere,
	placeKey,
	roleFitsScope,
	scopeOfPlace,
	type AssignmentTarget,
	type PlaceRef,
} from "@/features/organisation/assignmentTargets";
import { permissionList } from "@/features/organisation/PermissionChecklist/groups";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import { isPermissionKey } from "@/features/workspace/permissionKeys";

export type AssignAccessRoleDialogProps = {
	/** The roles that can be assigned. Given just one, it is the role and no choice is offered. */
	roles: Array<AccessRole>;
	/** The people matching `query`. */
	people: Array<CompanyMember>;
	query: string;
	onQueryChange: (query: string) => void;
	/**
	 * The places the person may give a role at, widest first. Only those the
	 * chosen role fits are offered: the whole company alone for a company
	 * role, which says so when that isn't among them. When a local role
	 * fits none, the keys in the way are named.
	 */
	targets: Array<AssignmentTarget>;
	/**
	 * Set to change where one person already has the role: the person is
	 * fixed and the form starts from the places they hold it that the person
	 * may change. `fixedPlaces` names the others, which are shown but never
	 * touched: leaving them out of the choice does not remove them.
	 */
	editing?: {
		person: CompanyMember;
		places: Array<AssignmentTarget>;
		fixedPlaces?: Array<string>;
	};
	/**
	 * What the chosen person holds now, to preview their access after this
	 * change; left out until it is known. `roles` is every role of the
	 * company; `placeLabel` names a place, and leaves out one the person
	 * can't see.
	 */
	preview?: {
		assignments: ReadonlyArray<MemberAccessRoleAssignment>;
		roles: ReadonlyArray<AccessRole>;
		placeLabel: (place: PlaceRef) => string | undefined;
	};
	/** Told when the person is chosen or cleared, e.g. to load `preview`. */
	onPersonChange?: (person: CompanyMember | null) => void;
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
const accessKey = "organisation.accessRoles.access";

/**
 * Gives one access role to one person at one or several places, or changes
 * the places a person already has it, showing what the role allows and,
 * given `preview`, what the person will have where once it is saved, so it
 * is clear what is being given.
 */
export const AssignAccessRoleDialog = ({
	roles,
	people,
	query,
	onQueryChange,
	targets,
	editing,
	preview,
	onPersonChange,
	error,
	submitting = false,
	onAssign,
	onClose,
}: AssignAccessRoleDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const roleId = useId();
	const personId = useId();
	const placesId = useId();
	const afterId = useId();
	const onlyRole = roles.length === 1 ? roles[0] : undefined;
	// Empty until a role is chosen, which keeps the Select controlled throughout.
	const [chosenRoleId, setChosenRoleId] = useState(
		onlyRole?.accessRoleId ?? ""
	);
	const [person, setPerson] = useState<CompanyMember | null>(
		editing?.person ?? null
	);
	const [places, setPlaces] = useState<Array<AssignmentTarget>>(
		editing?.places ?? []
	);
	const [placeQuery, setPlaceQuery] = useState("");
	const role = roles.find((item) => item.accessRoleId === chosenRoleId);
	const offered = role
		? targets.filter((target) => roleFitsScope(role, scopeOfPlace(target)))
		: targets;
	const misfits = role ? keysThatFitNowhere(role, targets) : [];
	const outOfReach = role ? companyRoleOutOfReach(role, targets) : false;
	// The role being given counts even when the company's list doesn't hold it.
	const after =
		role && person && preview
			? describeAccess(
					accessSummary(
						assignmentsAfter(
							preview.assignments,
							role.accessRoleId,
							places,
							editing?.places ?? []
						),
						[
							role,
							...preview.roles.filter(
								(item) => item.accessRoleId !== role.accessRoleId
							),
						]
					),
					preview.placeLabel,
					t
				)
			: undefined;

	return (
		<Dialog
			open
			description={t(editing ? `${key}.editDescription` : `${key}.description`)}
			preventClose={submitting}
			title={t(editing ? `${key}.editTitle` : `${key}.title`)}
			footer={
				<div className="flex justify-end gap-3">
					<Button disabled={submitting} variant="cancel" onClick={onClose}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						// Editing may clear every place, which removes the role from the person.
						disabled={!role || !person || (!editing && places.length === 0)}
						loading={submitting}
						onClick={() => {
							if (role && person)
								onAssign(role.accessRoleId, person.membershipId, places);
						}}
					>
						{t(editing ? `${key}.editSubmit` : `${key}.submit`)}
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
						disabled={submitting || editing !== undefined}
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
						onQueryChange={onQueryChange}
						onChange={(next): void => {
							setPerson(next);
							onPersonChange?.(next);
						}}
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
						getKey={placeKey}
						getLabel={(target) => target.label}
						id={placesId}
						placeholder={t(`${key}.placesPlaceholder`)}
						query={placeQuery}
						searchPlaceholder={t(`${key}.placesSearch`)}
						value={places}
						options={offered.filter((target) =>
							target.label
								.toLocaleLowerCase()
								.includes(placeQuery.trim().toLocaleLowerCase())
						)}
						onChange={setPlaces}
						onQueryChange={setPlaceQuery}
					/>
				</FormRow>
				{outOfReach && (
					<p className="text-sm text-neutral-700">
						{t(`${key}.companyRoleOutOfReach`)}
					</p>
				)}
				{misfits.length > 0 && (
					<p className="text-sm text-neutral-700">
						{t(`${key}.noFit`, {
							permissions: permissionList(
								misfits,
								t,
								i18n.resolvedLanguage ?? i18n.language
							),
						})}
					</p>
				)}
				{editing?.fixedPlaces && editing.fixedPlaces.length > 0 && (
					<p className="text-sm text-neutral-700">
						{t(`${key}.fixedPlaces`, {
							name: editing.person.displayName,
							places: editing.fixedPlaces.join(", "),
						})}
					</p>
				)}
				{editing &&
					places.length === 0 &&
					(editing.fixedPlaces ?? []).length === 0 && (
						<p className="text-sm font-semibold text-error-700">
							{t(`${key}.removesAll`, { name: editing.person.displayName })}
						</p>
					)}
				{role && (
					<PermissionSummary
						permissions={role.permissions.filter(isPermissionKey)}
						title={t(`${key}.allows`)}
					/>
				)}
				{after && person && (
					<section
						aria-labelledby={afterId}
						className="rounded-lg border border-neutral-400 p-4"
					>
						<p className="text-sm font-bold text-neutral-800" id={afterId}>
							{t(`${accessKey}.after`, { name: person.displayName })}
						</p>
						<p className="mt-1 text-sm text-neutral-700">
							{t(`${accessKey}.note`)}
						</p>
						{after.length === 0 ? (
							<p className="mt-3 text-sm text-neutral-700">
								{t(`${accessKey}.none`)}
							</p>
						) : (
							<DescriptionList
								className="mt-3"
								items={after.map(({ place, lines }) => ({
									label: place,
									value: lines.map((line) => (
										<span key={line} className="block">
											{line}
										</span>
									)),
								}))}
							/>
						)}
					</section>
				)}
			</div>
		</Dialog>
	);
};
