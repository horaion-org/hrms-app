import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import {
	isLeaveStatus,
	LEAVE_STATUSES,
	type LeaveStatus,
} from "@/features/leave/api";

export type LeaveStatusFilterProps = {
	/** The status shown, or every status. */
	status?: LeaveStatus;
	onChange: (status: LeaveStatus | undefined) => void;
};

/** The requests tables' "Showing" filter: every status, or one, labelled above its select. */
export const LeaveStatusFilter = ({
	status,
	onChange,
}: LeaveStatusFilterProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	return (
		<FormRow
			className="w-full sm:w-40"
			htmlFor={id}
			label={t("leave.showing")}
			layout="stacked"
		>
			<Select
				aria-labelledby={formRowIds(id).labelId}
				className="w-full font-semibold"
				value={status ?? "all"}
				options={[
					{ value: "all", label: t("leave.all") },
					...LEAVE_STATUSES.map((value) => ({
						value,
						label: t(`leave.statuses.${value}`),
					})),
				]}
				onChange={(value) => {
					onChange(isLeaveStatus(value) ? value : undefined);
				}}
			/>
		</FormRow>
	);
};
