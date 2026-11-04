import dayjs from "dayjs";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { CrossIcon, SearchIcon, TickIcon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import {
	APPROVAL_COMMENT_MAX_LENGTH,
	LEAVE_NOTES_MAX_LENGTH,
	type CompanyLeaveType,
} from "@/features/leave/api";
import { formatPeriod } from "@/features/leave/dates";
import type { ApplyField, DecisionField } from "@/features/leave/leaveRefusal";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";
import { leaveTypeOptions } from "@/features/leave/leaveTypeOptions";
import {
	statusTone,
	type LeaveRequest,
	type LeaveRequestBody,
} from "@/features/leave/types";
import type { Refusal } from "@/features/organisation/refusal";

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

/** The longest rejection reason the API keeps, in characters. */
const REJECTION_REASON_MAX_LENGTH = 2000;

/** Where a review stands: reading the request, or confirming a decision with its note. */
type ReviewStep = "review" | "reject" | "approve";

export type LeaveRequestDialogProps = {
	request?: LeaveRequest;
	/** `reject` and `approve` open straight at that decision's confirmation step. */
	mode?: "view" | "reject" | "approve" | "apply";
	/** Who leave may be applied for; left out in `apply` mode when the caller applies for themself. */
	employees?: ApplyEmployees;
	/**
	 * The company's leave types, for `apply` mode. Only active types that are
	 * not the scheduler's own are offered, grouped by how they are counted.
	 */
	leaveTypes?: ReadonlyArray<CompanyLeaveType>;
	/**
	 * How reading `leaveTypes` stands, in `apply` mode: the Type field says
	 * it is loading while "pending", and offers `onRetryLeaveTypes` on "error".
	 */
	leaveTypesStatus?: "pending" | "error" | "success";
	onRetryLeaveTypes?: () => void;
	/** Whether the person may decide the shown request; Approve and Reject are offered only then. */
	canReview?: boolean;
	/** While a decision or an application is being sent. */
	busy?: boolean;
	/** Why the last decision or application was refused: on a field, or as the dialog's alert. */
	refusal?: Refusal<ApplyField | DecisionField>;
	onClose: () => void;
	/** `comment` is trimmed, and empty when the reviewer wrote none. */
	onApprove: (request: LeaveRequest, comment: string) => void;
	onReject: (request: LeaveRequest, reason: string) => void;
	/** `membershipId` is null when the caller applies for themself. */
	onCreate: (membershipId: string | null, body: LeaveRequestBody) => void;
};

/**
 * One request to review, approve with an optional comment, reject with a
 * reason, or a new application on a person's behalf. Both decisions ask for
 * confirmation in a second step. The dialog only collects and shows; the caller sends and
 * hands back what the API answered.
 */
export const LeaveRequestDialog = ({
	request,
	mode = "view",
	employees,
	leaveTypes = [],
	leaveTypesStatus = "success",
	onRetryLeaveTypes,
	canReview = false,
	busy = false,
	refusal,
	onClose,
	onApprove,
	onReject,
	onCreate,
}: LeaveRequestDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const id = useId();
	const [step, setStep] = useState<ReviewStep>(
		mode === "reject" || mode === "approve" ? mode : "review"
	);
	const [rejectionReason, setRejectionReason] = useState("");
	const [approvalComment, setApprovalComment] = useState("");
	const [missingRejectionReason, setMissingRejectionReason] = useState(false);
	const [membershipId, setMembershipId] = useState("");
	const [chosenType, setChosenType] = useState<string | null>(null);
	const today = dayjs().format("YYYY-MM-DD");
	const [dates, setDates] = useState({ start: today, end: today });
	// The applicant's remarks, sent as the API's `notes`. A leave type that asks for a reason makes them required
	// and relabels them "Reason for leave"; that is not the reviewer's rejection reason above.
	const [remarks, setRemarks] = useState("");
	const [missingRemarks, setMissingRemarks] = useState(false);
	const applying = mode === "apply";
	const own = applying && employees === undefined;
	const chosen = employees?.options.find(
		(person) => person.membershipId === membershipId
	);
	const fields = refusal?.fields ?? {};
	const employeeError = fields.employee ? `${id}-employee-error` : undefined;
	const rejecting = step === "reject";
	const deciding = step !== "review";
	const rejectionReasonError = missingRejectionReason
		? t("leave.required")
		: fields.reason;
	const decisionError = rejecting ? rejectionReasonError : fields.comment;
	const remarksIds = formRowIds(`${id}-remarks`);
	const typeOptions = leaveTypeOptions(leaveTypes, t);
	// Until the person picks one, the first type offered is chosen, even if the catalogue arrives after opening.
	const typeCode = chosenType ?? typeOptions[0]?.value ?? "";
	const remarksRequired =
		leaveTypes.find((leaveType) => leaveType.code === typeCode)
			?.requiresReason ?? false;
	const remarksError =
		missingRemarks && remarksRequired
			? t("leave.leaveReasonRequired")
			: fields.notes;
	const typeError = fields.type ? `${id}-type-error` : undefined;
	if (!applying && !request) return null;
	const alert = refusal?.message && (
		<p className="text-sm text-error-700" role="alert">
			{refusal.message}
		</p>
	);
	return (
		<Modal
			open
			footer={
				applying ? (
					<>
						<Button variant="cancel" onClick={onClose}>
							{t("leave.cancel")}
						</Button>
						<Button
							disabled={(!own && !chosen) || typeCode === "" || busy}
							form={id}
							type="submit"
						>
							{t("leave.submit")}
						</Button>
					</>
				) : deciding ? (
					<>
						<Button
							variant="cancel"
							onClick={() => {
								setStep("review");
								setMissingRejectionReason(false);
							}}
						>
							{t("leave.cancel")}
						</Button>
						<Button
							disabled={busy}
							form={id}
							leadingIcon={rejecting ? <CrossIcon /> : <TickIcon />}
							type="submit"
							className={
								rejecting ? "bg-error-600! hover:bg-error-700!" : undefined
							}
						>
							{t(
								rejecting ? "leave.confirmRejection" : "leave.confirmApproval"
							)}
						</Button>
					</>
				) : request?.status === "PENDING" && canReview ? (
					<>
						<Button
							className="border-error-300! bg-error-50! text-error-600!"
							disabled={busy}
							leadingIcon={<CrossIcon />}
							variant="secondary"
							onClick={() => {
								setStep("reject");
							}}
						>
							{t("leave.reject")}
						</Button>
						<Button
							disabled={busy}
							leadingIcon={<TickIcon />}
							onClick={() => {
								setStep("approve");
							}}
						>
							{t("leave.approve")}
						</Button>
					</>
				) : (
					<Button variant="secondary" onClick={onClose}>
						{t("leave.close")}
					</Button>
				)
			}
			title={t(
				own ? "leave.applyOwn" : applying ? "leave.apply" : "leave.requestTitle"
			)}
			onClose={onClose}
		>
			{applying ? (
				<form
					className="space-y-6 p-6"
					id={id}
					onSubmit={(event) => {
						event.preventDefault();
						if ((!own && !chosen) || typeCode === "") return;
						const trimmedRemarks = remarks.trim();
						if (remarksRequired && trimmedRemarks === "") {
							setMissingRemarks(true);
							return;
						}
						onCreate(own ? null : (chosen?.membershipId ?? null), {
							leaveType: typeCode,
							startDate: dates.start,
							endDate: dates.end,
							...(trimmedRemarks === "" ? {} : { notes: trimmedRemarks }),
						});
					}}
				>
					{alert}
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
								value={employees?.search ?? ""}
								onChange={(event) => {
									employees?.onSearch(event.target.value);
								}}
							/>
							<Select
								aria-describedby={employeeError}
								aria-labelledby={`${id}-employee`}
								className="w-full"
								placeholder={t("leave.chooseEmployee")}
								status={fields.employee ? "error" : undefined}
								value={membershipId}
								options={(employees?.options ?? []).map((person) => ({
									value: person.membershipId,
									label: `${person.displayName} · ${person.employeeCode}`,
								}))}
								onChange={setMembershipId}
							/>
							{employees &&
								employees.options.length === 0 &&
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
					<FormRow
						counter={t("leave.remarksCounter", { count: remarks.length })}
						error={remarksError}
						htmlFor={`${id}-remarks`}
						layout="stacked"
						required={remarksRequired}
						hint={t(
							remarksRequired ? "leave.leaveReasonHint" : "leave.remarksHint"
						)}
						label={t(
							remarksRequired ? "leave.leaveReason" : "leave.remarksOptional"
						)}
					>
						<Textarea
							id={`${id}-remarks`}
							maxLength={LEAVE_NOTES_MAX_LENGTH}
							required={remarksRequired}
							status={remarksError ? "error" : undefined}
							value={remarks}
							aria-describedby={
								remarksError ? remarksIds.errorId : remarksIds.hintId
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
			) : (
				request && (
					<>
						<div className="px-6 py-8">
							{alert && <div className="mb-6">{alert}</div>}
							<div className="mb-10 flex flex-wrap items-start justify-between gap-4">
								<div className="flex items-center gap-5">
									<Avatar
										className="size-16! text-2xl!"
										name={request.displayName}
									/>
									<div>
										<p className="font-semibold">{request.displayName}</p>
										<p className="mt-2 text-sm">{request.employeeCode}</p>
									</div>
								</div>
								<Badge
									className="mt-2 text-xs!"
									tone={statusTone[request.status]}
								>
									{t(`leave.statuses.${request.status}`)}
								</Badge>
							</div>
							<dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-5 gap-y-4 text-sm sm:text-base">
								<dt className="text-neutral-800">{t("leave.period")}</dt>
								<dd className="font-semibold">
									{formatPeriod(
										request.startDate,
										request.endDate,
										i18n.language
									)}
								</dd>
								<dt className="text-neutral-800">{t("leave.requested")}</dt>
								<dd className="font-semibold">
									{formatPeriod(
										request.requestedAt.slice(0, 10),
										request.requestedAt.slice(0, 10),
										i18n.language
									)}
								</dd>
								<dt className="text-neutral-800">{t("leave.requestedBy")}</dt>
								<dd className="font-semibold">
									{request.requestedBy.displayName}
								</dd>
								<dt className="text-neutral-800">{t("leave.duration")}</dt>
								<dd className="font-semibold">
									{t("leave.days", { count: request.workingDays })}
								</dd>
								<dt className="text-neutral-800">{t("leave.type")}</dt>
								<dd className="font-semibold">{leaveTypeLabel(request, t)}</dd>
								{request.notes && (
									<>
										<dt className="text-neutral-800">{t("leave.remarks")}</dt>
										<dd className="whitespace-pre-line break-words font-semibold">
											{request.notes}
										</dd>
									</>
								)}
								{request.reviewedBy && (
									<>
										<dt className="text-neutral-800">
											{t("leave.reviewedBy")}
										</dt>
										<dd className="font-semibold">
											{request.reviewedBy.displayName}
										</dd>
									</>
								)}
								{request.rejectionReason && (
									<>
										<dt className="text-neutral-800">{t("leave.reason")}</dt>
										<dd className="whitespace-pre-line break-words font-semibold">
											{request.rejectionReason}
										</dd>
									</>
								)}
								{request.approvalComment && (
									<>
										<dt className="text-neutral-800">
											{t("leave.approvalComment")}
										</dt>
										<dd className="whitespace-pre-line break-words font-semibold">
											{request.approvalComment}
										</dd>
									</>
								)}
							</dl>
						</div>
						{deciding && (
							<form
								className="border-t border-neutral-400 px-6 py-8"
								id={id}
								onSubmit={(event) => {
									event.preventDefault();
									if (!rejecting) {
										onApprove(request, approvalComment.trim());
										return;
									}
									if (!rejectionReason.trim()) {
										setMissingRejectionReason(true);
										return;
									}
									onReject(request, rejectionReason.trim());
								}}
							>
								<label
									className="mb-3 block text-sm font-medium text-neutral-800"
									htmlFor={`${id}-decision-note`}
								>
									{t(rejecting ? "leave.reason" : "leave.comment")}
									{rejecting && (
										<>
											{" "}
											<span aria-hidden="true" className="text-error-600">
												*
											</span>
										</>
									)}
								</label>
								<Textarea
									id={`${id}-decision-note`}
									placeholder={t("leave.note")}
									required={rejecting}
									status={decisionError ? "error" : undefined}
									value={rejecting ? rejectionReason : approvalComment}
									aria-describedby={
										decisionError ? `${id}-decision-error` : undefined
									}
									maxLength={
										rejecting
											? REJECTION_REASON_MAX_LENGTH
											: APPROVAL_COMMENT_MAX_LENGTH
									}
									onChange={(event) => {
										if (rejecting) {
											setRejectionReason(event.target.value);
											setMissingRejectionReason(false);
										} else setApprovalComment(event.target.value);
									}}
								/>
								{decisionError && (
									<p
										className="mt-2 text-sm text-error-700"
										id={`${id}-decision-error`}
										role="alert"
									>
										{decisionError}
									</p>
								)}
							</form>
						)}
					</>
				)
			)}
		</Modal>
	);
};
