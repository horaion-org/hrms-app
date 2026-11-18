import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SearchIcon } from "@/components/ui/Icon";
import {
	ALL_DEPARTMENTS,
	departmentChoices,
	peopleToApplyFor,
	personDescription,
	shownDepartment,
	type PersonToApplyFor,
} from "./peopleToApplyFor";

export type ApplyForSomeoneDialogProps<Person extends PersonToApplyFor> = {
	/** The area's Apply action, e.g. "Apply shift preferences". */
	title: string;
	/** Everyone the area lists; undefined while they load. */
	people: ReadonlyArray<Person> | undefined;
	/** Why the people could not be listed; shown in place of the choice. */
	problem?: string;
	/** The page's own Department filter, which the picker starts on when someone offered is filed there. */
	departmentId?: string;
	/** Whether the caller may set this person's record, as the area's own row action decides. */
	maySetFor: (person: Person) => boolean;
	/** Goes on to the area's own dialog for the chosen person. */
	onChoose: (person: Person) => void;
	onClose: () => void;
};

const key = "people.applyFor";

/**
 * The first step of applying for someone else, as Leave's "Apply leave"
 * starts: a name search over the people the caller may set for, and a
 * choice of one of them, each named with their Department, job title and
 * employee code as far as the area's list knows them. With people offered
 * in more than one Department, a Department choice narrows the list; its
 * Departments come from the people already allowed, so it never widens it. It only chooses; the area's own dialog for that
 * person collects and sends.
 */
export const ApplyForSomeoneDialog = <Person extends PersonToApplyFor>({
	title,
	people,
	problem,
	departmentId: pageDepartmentId,
	maySetFor,
	onChoose,
	onClose,
}: ApplyForSomeoneDialogProps<Person>): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const [search, setSearch] = useState("");
	const [membershipId, setMembershipId] = useState("");
	const [pickedDepartment, setPickedDepartment] = useState<string>();
	const departments = departmentChoices(
		peopleToApplyFor(people ?? [], "", maySetFor)
	);
	const department = shownDepartment(
		pickedDepartment,
		departments,
		pageDepartmentId
	);
	const offered = peopleToApplyFor(people ?? [], search, maySetFor, department);
	const chosen = offered.find((person) => person.membershipId === membershipId);
	const loaded = people !== undefined && problem === undefined;
	const searched = search.trim() !== "";
	return (
		<Dialog
			open
			title={title}
			footer={
				<div className="flex justify-end gap-3">
					<Button variant="cancel" onClick={onClose}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						disabled={chosen === undefined}
						onClick={() => {
							if (chosen) onChoose(chosen);
						}}
					>
						{t(`${key}.continue`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			{problem ? (
				<p className="text-sm text-error-700" role="alert">
					{problem}
				</p>
			) : (
				<div className="space-y-2">
					<p className="text-sm font-medium" id={`${id}-employee`}>
						{t(`${key}.employee`)}
					</p>
					<div className="flex flex-col gap-2 sm:flex-row">
						{/* A name lookup: no saved entries over the list, and a Search key on a phone's keyboard. */}
						<Input
							aria-label={t(`${key}.search`)}
							autoComplete="off"
							enterKeyHint="search"
							leadingIcon={<SearchIcon />}
							placeholder={t(`${key}.search`)}
							type="search"
							value={search}
							onChange={(event) => {
								setSearch(event.target.value);
							}}
						/>
						{departments.length > 1 && (
							<Select
								aria-label={t(`${key}.department`)}
								value={department}
								options={[
									{ value: ALL_DEPARTMENTS, label: t(`${key}.allDepartments`) },
									...departments.map((choice) => ({
										value: choice.departmentId,
										label: choice.name,
									})),
								]}
								onChange={setPickedDepartment}
							/>
						)}
					</div>
					<Select
						aria-labelledby={`${id}-employee`}
						className="w-full"
						disabled={!loaded}
						placeholder={t(loaded ? `${key}.choose` : `${key}.loading`)}
						value={chosen?.membershipId ?? ""}
						options={offered.map((person) => ({
							value: person.membershipId,
							label: person.displayName,
							description: personDescription(person),
						}))}
						onChange={setMembershipId}
					/>
					{loaded && offered.length === 0 && (
						<p className="text-sm text-neutral-700">
							{t(searched ? `${key}.noMatches` : `${key}.nobody`)}
						</p>
					)}
				</div>
			)}
		</Dialog>
	);
};
