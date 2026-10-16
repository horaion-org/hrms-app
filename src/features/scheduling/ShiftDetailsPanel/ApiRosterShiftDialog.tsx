import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useShiftRoleOptions } from "@/features/scheduling/shifts/useShiftRoleOptions";
import {
	RosterShiftDialog,
	type RosterShiftDialogProps,
} from "@/features/scheduling/ShiftDetailsPanel/RosterShiftDialog";
import { workspaceQuery } from "@/features/workspace/api";
import { BranchSelector } from "@/features/workspace/BranchSelector";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";
import { departmentChoices } from "@/features/workspace/unitChoices";
import { retry } from "@/features/workspace/retry";

const KEYS = ["shift:read"] as const;
const key = "scheduling.detail.shiftAction";

/** Reference choices come from the API; the preview still applies changes in memory. */
export const ApiRosterShiftDialog = (
	props: RosterShiftDialogProps
): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const companyId = useCurrentCompanyId();
	const { data: workspace, isError } = useQuery({ ...workspaceQuery, retry });
	const [branchId, setBranchId] = useState(props.shift.branchId);
	const [departmentId, setDepartmentId] = useState(props.shift.departmentId);
	const [jobTitleId, setJobTitleId] = useState(props.shift.jobTitleId);
	const departments = workspace
		? departmentChoices(workspace, companyId, KEYS, { activeOnly: true })
		: [];
	const department = departments.find(
		(item) => item.departmentId === departmentId && item.branchId === branchId
	);
	const roles = useShiftRoleOptions(
		companyId,
		department,
		props.action === "edit"
	);
	const role =
		roles.status === "ready"
			? roles.items.find((item) => item.jobTitleId === jobTitleId)
			: undefined;
	const assignment =
		department && role
			? {
					branchId: department.branchId,
					departmentId: department.departmentId,
					jobTitleId: role.jobTitleId,
					location: department.branchName,
					role: role.name,
				}
			: undefined;
	return (
		<RosterShiftDialog
			{...props}
			assignment={assignment}
			assignmentFields={
				<>
					<p className="text-sm text-neutral-700">{t(`${key}.apiChoices`)}</p>
					{isError ? (
						<p role="alert">{t(`${key}.optionsError`)}</p>
					) : !workspace ? (
						<p role="status">{t(`${key}.optionsLoading`)}</p>
					) : departments.length === 0 ? (
						<p>{t(`${key}.noLocations`)}</p>
					) : (
						<>
							<BranchSelector
								activeOnly
								companyId={companyId}
								keys={KEYS}
								label={t(`${key}.location`)}
								value={branchId}
								onChange={(value) => {
									setBranchId(value);
									setDepartmentId(undefined);
									setJobTitleId(undefined);
								}}
							/>
							<FormRow
								htmlFor={`${id}-department`}
								label={t(`${key}.department`)}
								layout="stacked"
							>
								<DepartmentSelector
									activeOnly
									aria-labelledby={formRowIds(`${id}-department`).labelId}
									branchId={branchId}
									companyId={companyId}
									disabled={!branchId}
									keys={KEYS}
									placeholder={t(`${key}.choose`)}
									value={department?.departmentId}
									onChange={(value) => {
										const selected = departments.find(
											(item) => item.departmentId === value
										);
										setBranchId(selected?.branchId);
										setDepartmentId(value);
										setJobTitleId(undefined);
									}}
								/>
							</FormRow>
							<FormRow
								htmlFor={`${id}-role`}
								label={t(`${key}.role`)}
								layout="stacked"
							>
								<Select
									aria-labelledby={formRowIds(`${id}-role`).labelId}
									className="w-full"
									disabled={!department || roles.status !== "ready"}
									placeholder={t(`${key}.choose`)}
									value={role?.jobTitleId ?? ""}
									options={
										roles.status === "ready"
											? roles.items.map((item) => ({
													value: item.jobTitleId,
													label: item.name,
												}))
											: []
									}
									onChange={setJobTitleId}
								/>
							</FormRow>
							{department && (
								<p role={roles.status === "error" ? "alert" : "status"}>
									{roles.status !== "ready"
										? t(`${key}.roles.${roles.status}`)
										: roles.items.length === 0
											? t(`${key}.roles.empty`)
											: null}
								</p>
							)}
						</>
					)}
				</>
			}
		/>
	);
};
