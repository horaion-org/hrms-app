import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SearchIcon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import {
	LEAVE_NOTES_MAX_LENGTH,
	LEAVE_REMARK_MAX_LENGTH,
	rosteredDaysQuery,
	type CompanyLeaveType,
} from "@/features/leave/api";
import type { ApplyField } from "@/features/leave/leaveRefusal";
import { leaveTypeOptions } from "@/features/leave/leaveTypeOptions";
import type { LeaveRequestBody } from "@/features/leave/types";
import type { Refusal } from "@/features/organisation/refusal";
import { RosteredDaysNotice } from "../RosteredDaysNotice";

/** The people offered when applying: a search the caller owns and its current answer. */
export type ApplyEmployees = {
	search: string;
	onSearch: (text: string) => void;
	options: Array<{
		membershipId: string;
		displayName: string;
		employeeCode: string;
	}>;
};

/** How reading the leave types stands. */
export type LeaveTypesStatus = "pending" | "error" | "success";

export type LeaveApplyFormProps = {
	/** With it, the form tells which chosen days hold a shift. */
	companyId?: string;
	/** A reviewer records approved leave: a required remark, and rostered days must be confirmed. */
	recording?: boolean;
	/** Who leave may be applied for; left out when the caller applies for themself. */
	employees?: ApplyEmployees;
	/**
	 * The company's leave types. Only active types that are not the
	 * scheduler's own are offered, grouped by how they are counted.
	 */
	leaveTypes: ReadonlyArray<CompanyLeaveType>;
	/** The Type field says the types are loading while "pending", and offers `onRetryLeaveTypes` on "error". */
	leaveTypesStatus?: LeaveTypesStatus;
	onRetryLeaveTypes?: () => void;
	/** While the application is being sent. */
	busy: boolean;
	/** Why the last application was refused: on a field, or as the form's alert. */
	refusal?: Refusal<ApplyField>;
	onClose: () => void;
	/** `membershipId` is null when the caller applies for themself. */
	onCreate: (membershipId: string | null, body: LeaveRequestBody) => void;
};

/**
 * A new leave application, for the caller or on a person's behalf: the
 * person, the leave type, the dates and the remarks, which a type with
 * `requiresReason` asks for as a reason. It only collects; the caller sends.
 */
export const LeaveApplyForm = ({
	companyId,
	recording = false,
	employees,
	leaveTypes,
	leaveTypesStatus = "success",
	onRetryLeaveTypes,
	busy,
	refusal,
	onClose,
	onCreate,
}: LeaveApplyFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const [membershipId, setMembershipId] = useState("");
	const [chosenType, setChosenType] = useState<string | null>(null);
	const today = dayjs().format("YYYY-MM-DD");
	const [dates, setDates] = useState({ start: today, end: today });
	// The applicant's remarks, sent as the API's `notes`. A leave type that asks for a reason makes them required
	// and relabels them "Reason for leave"; that is not the reviewer's rejection reason.
	const [remarks, setRemarks] = useState("");
	const [missingRemarks, setMissingRemarks] = useState(false);
	const [takeOffConfirmed, setTakeOffConfirmed] = useState(false);
	const own = employees === undefined;
	const chosen = employees?.options.find(
		(person) => person.membershipId === membershipId
	);
	const fields = refusal?.fields ?? {};
	const employeeError = fields.employee ? `${id}-employee-error` : undefined;
	const remarksIds = formRowIds(`${id}-remarks`);
	const typeOptions = leaveTypeOptions(leaveTypes, t);
	// Until the person picks one, the first type offered is chosen, even if the catalogue arrives after opening.
	const typeCode = chosenType ?? typeOptions[0]?.value ?? "";
	const remarksRequired =
		recording ||
		(leaveTypes.find((leaveType) => leaveType.code === typeCode)
			?.requiresReason ??
			false);
	const remarksError =
		missingRemarks && remarksRequired
			? t("leave.leaveReasonRequired")
			: fields.notes;
	const typeError = fields.type ? `${id}-type-error` : undefined;
	const rosterReadable =
		companyId !== undefined && (own || chosen !== undefined);
	const rostered = useQuery(
		rosteredDaysQuery(
			companyId ?? "",
			dates,
			chosen?.membershipId,
			rosterReadable
		)
	);
	// Before a person is chosen the key falls back to the reader's own days: never show those.
	const rosteredDays = rosterReadable ? (rostered.data ?? []) : [];
	// Recording on days not read yet is how a 409 comes back with nothing to confirm.
	const rosterUnknown =
		recording && rosterReadable && (rostered.isFetching || rostered.isError);
	const incomplete =
		(!own && !chosen) ||
		typeCode === "" ||
		rosterUnknown ||
		(recording && rosteredDays.length > 0 && !takeOffConfirmed);
	return (
		<Modal
			open
			footer={
				<>
					<Button variant="cancel" onClick={onClose}>
						{t("leave.cancel")}
					</Button>
					<Button disabled={incomplete || busy} form={id} type="submit">
						{t(recording ? "leave.recordConfirm" : "leave.submit")}
					</Button>
				</>
			}
			title={t(
				recording
					? "leave.recordAction"
					: own
						? "leave.applyOwn"
						: "leave.apply"
			)}
			onClose={onClose}
		>
			<form
				className="space-y-6 p-6"
				id={id}
				onSubmit={(event) => {
					event.preventDefault();
					if (incomplete) return;
					const trimmedRemarks = remarks.trim();
					if ((remarksRequired || recording) && trimmedRemarks === "") {
						setMissingRemarks(true);
						return;
					}
					onCreate(own ? null : (chosen?.membershipId ?? null), {
						leaveType: typeCode,
						startDate: dates.start,
						endDate: dates.end,
						...(trimmedRemarks === "" ? {} : { notes: trimmedRemarks }),
						...(recording
							? { takeOffRosteredDays: rosteredDays.length > 0 }
							: {}),
					});
				}}
			>
				{refusal?.message && (
					<p className="text-sm text-error-700" role="alert">
						{refusal.message}
					</p>
				)}
				{!own && (
					<div className="space-y-2">
						<p className="text-sm font-medium" id={`${id}-employee`}>
							{t("leave.employee")}
						</p>
						<Input
							aria-label={t("leave.searchEmployee")}
							leadingIcon={<SearchIcon />}
							placeholder={t("leave.searchEmployee")}
							type="search"
							value={employees.search}
							onChange={(event) => {
								employees.onSearch(event.target.value);
							}}
						/>
						<Select
							aria-describedby={employeeError}
							aria-labelledby={`${id}-employee`}
							className="w-full"
							placeholder={t("leave.chooseEmployee")}
							status={fields.employee ? "error" : undefined}
							value={membershipId}
							options={employees.options.map((person) => ({
								value: person.membershipId,
								label: `${person.displayName} · ${person.employeeCode}`,
							}))}
							onChange={setMembershipId}
						/>
						{employees.options.length === 0 &&
							employees.search.trim() !== "" && (
								<p className="text-sm text-neutral-700">
									{t("leave.noEmployees")}
								</p>
							)}
						{fields.employee && (
							<p
								className="text-sm text-error-700"
								id={`${id}-employee-error`}
								role="alert"
							>
								{fields.employee}
							</p>
						)}
					</div>
				)}
				<div className="space-y-2">
					<p className="text-sm font-medium" id={`${id}-type`}>
						{t("leave.type")}
					</p>
					{leaveTypesStatus === "error" ? (
						<Callout role="alert" tone="warning">
							{t("leave.typesFailed")}{" "}
							<Button variant="textlink" onClick={onRetryLeaveTypes}>
								{t("leave.retry")}
							</Button>
						</Callout>
					) : (
						<Select
							aria-describedby={typeError}
							aria-labelledby={`${id}-type`}
							className="w-full"
							disabled={leaveTypesStatus === "pending"}
							options={typeOptions}
							status={fields.type ? "error" : undefined}
							value={typeCode}
							placeholder={
								leaveTypesStatus === "pending"
									? t("leave.typesLoading")
									: undefined
							}
							onChange={setChosenType}
						/>
					)}
					{fields.type && (
						<p
							className="text-sm text-error-700"
							id={`${id}-type-error`}
							role="alert"
						>
							{fields.type}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<p className="text-sm font-medium">{t("leave.applyPeriod")}</p>
					<DatePicker
						label={t("leave.applyPeriod")}
						value={dates}
						onChange={setDates}
					/>
					{fields.endDate && (
						<p className="text-sm text-error-700" role="alert">
							{fields.endDate}
						</p>
					)}
				</div>
				<RosteredDaysNotice
					confirmed={recording ? takeOffConfirmed : undefined}
					days={rosteredDays}
					name={chosen?.displayName}
					onConfirmedChange={setTakeOffConfirmed}
					onRetry={
						recording && rostered.isError
							? (): void => {
									void rostered.refetch();
								}
							: undefined
					}
				/>
				<FormRow
					error={remarksError}
					htmlFor={`${id}-remarks`}
					layout="stacked"
					required={remarksRequired}
					counter={
						recording
							? undefined
							: t("leave.remarksCounter", { count: remarks.length })
					}
					hint={
						recording
							? t("leave.remarkHintEmployee")
							: t(
									remarksRequired
										? "leave.leaveReasonHint"
										: "leave.remarksHint"
								)
					}
					label={
						recording
							? t("leave.remark")
							: t(
									remarksRequired
										? "leave.leaveReason"
										: "leave.remarksOptional"
								)
					}
				>
					<Textarea
						id={`${id}-remarks`}
						required={remarksRequired}
						status={remarksError ? "error" : undefined}
						value={remarks}
						aria-describedby={
							remarksError ? remarksIds.errorId : remarksIds.hintId
						}
						maxLength={
							recording ? LEAVE_REMARK_MAX_LENGTH : LEAVE_NOTES_MAX_LENGTH
						}
						placeholder={t(
							remarksRequired
								? "leave.leaveReasonPlaceholder"
								: "leave.remarksPlaceholder"
						)}
						onChange={(event) => {
							setRemarks(event.target.value);
							setMissingRemarks(false);
						}}
					/>
				</FormRow>
			</form>
		</Modal>
	);
};
