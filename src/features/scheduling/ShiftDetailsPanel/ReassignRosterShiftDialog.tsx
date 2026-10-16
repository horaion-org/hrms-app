import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import {
	RosterShiftDialog,
	type RosterShiftDialogProps,
} from "@/features/scheduling/ShiftDetailsPanel/RosterShiftDialog";
import { useReassignmentStaff } from "@/features/scheduling/ShiftDetailsPanel/useReassignmentStaff";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";
import { departmentChoices } from "@/features/workspace/unitChoices";
import { retry } from "@/features/workspace/retry";

const KEYS = ["member_profile:read"] as const;
const key = "scheduling.detail.shiftAction";

export const ReassignRosterShiftDialog = (
	props: RosterShiftDialogProps
): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const companyId = useCurrentCompanyId();
	const [departmentId, setDepartmentId] = useState(props.shift.departmentId);
	const { data: workspace, isError } = useQuery({ ...workspaceQuery, retry });
	const choices = workspace
		? departmentChoices(workspace, companyId, KEYS, { activeOnly: true })
		: [];
	const unit = choices.find(
		(item) =>
			item.departmentId === departmentId &&
			(!props.shift.branchId || item.branchId === props.shift.branchId)
	);
	const list = useReassignmentStaff(companyId, unit);
	const staff =
		list.status === "ready"
			? list.members
					.filter((member) => member.membershipId !== props.staffId)
					.map((member) => ({
						staffId: member.membershipId,
						name: member.displayName,
						jobTitle: member.jobTitleName ?? "",
						departmentName: member.departmentName ?? "",
						shifts:
							props.staff.find(
								(person) => person.staffId === member.membershipId
							)?.shifts ?? [],
					}))
			: [];
	return (
		<RosterShiftDialog
			{...props}
			key={unit?.departmentId ?? "unselected"}
			reassignReady={list.status === "ready" && staff.length > 0}
			staff={staff}
			reassignFields={
				<>
					<p className="text-sm text-neutral-700">
						{t(`${key}.reassignUnitHelp`)}
					</p>
					{props.shift.departmentId ? (
						<p>
							{unit
								? `${unit.branchName} › ${unit.name}`
								: t(`${key}.staff.hidden`)}
						</p>
					) : (
						<FormRow
							htmlFor={id}
							label={t(`${key}.branchDepartment`)}
							layout="stacked"
						>
							<DepartmentSelector
								activeOnly
								aria-labelledby={formRowIds(id).labelId}
								branchId={props.shift.branchId}
								companyId={companyId}
								keys={KEYS}
								placeholder={t(`${key}.choose`)}
								value={unit?.departmentId}
								onChange={setDepartmentId}
							/>
						</FormRow>
					)}
					{isError ? (
						<p role="alert">{t(`${key}.optionsError`)}</p>
					) : !workspace ? (
						<p role="status">{t(`${key}.optionsLoading`)}</p>
					) : choices.length === 0 ? (
						<p>{t(`${key}.staff.hidden`)}</p>
					) : (
						unit && (
							<p role={list.status === "error" ? "alert" : "status"}>
								{list.status !== "ready"
									? t(`${key}.staff.${list.status}`)
									: staff.length === 0
										? t(`${key}.staff.empty`)
										: null}
							</p>
						)
					)}
				</>
			}
			onApply={(staffId, shift) => {
				const person = staff.find((member) => member.staffId === staffId);
				if (unit && person)
					props.onApply(
						staffId,
						{
							...shift,
							branchId: unit.branchId,
							departmentId: unit.departmentId,
							location: unit.branchName,
						},
						person
					);
			}}
		/>
	);
};
