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
import { CrossIcon, SearchIcon, TickIcon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import {
	APPROVAL_COMMENT_MAX_LENGTH,
	isLeaveType,
	LEAVE_NOTES_MAX_LENGTH,
	LEAVE_TYPES,
} from "@/features/leave/api";
import { formatPeriod } from "@/features/leave/dates";
import type { ApplyField, DecisionField } from "@/features/leave/leaveRefusal";
import {
	statusTone,
	type LeaveRequest,
	type LeaveRequestBody,
	type LeaveType,
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
	const [reason, setReason] = useState("");
	const [comment, setComment] = useState("");
	const [missingReason, setMissingReason] = useState(false);
	const [membershipId, setMembershipId] = useState("");
	const [type, setType] = useState<LeaveType>("ANNUAL");
	const today = dayjs().format("YYYY-MM-DD");
	const [dates, setDates] = useState({ start: today, end: today });
	const [notes, setNotes] = useState("");
	const applying = mode === "apply";
	const own = applying && employees === undefined;
	const chosen = employees?.options.find(
		(person) => person.membershipId === membershipId
	);
	const fields = refusal?.fields ?? {};
	const employeeError = fields.employee ? `${id}-employee-error` : undefined;
	const rejecting = step === "reject";
	const deciding = step !== "review";
	const reasonError = missingReason ? t("leave.required") : fields.reason;
	const decisionError = rejecting ? reasonError : fields.comment;
	const notesIds = formRowIds(`${id}-notes`);
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
							disabled={(!own && !chosen) || busy}
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
								setMissingReason(false);
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
						if (!own && !chosen) return;
						const remarks = notes.trim();
						onCreate(own ? null : (chosen?.membershipId ?? null), {
							leaveType: type,
							startDate: dates.start,
							endDate: dates.end,
							...(remarks === "" ? {} : { notes: remarks }),
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
						<Select
							aria-labelledby={`${id}-type`}
							className="w-full"
							value={type}
							options={LEAVE_TYPES.map((value) => ({
								value,
								label: t(`leave.types.${value}`),
							}))}
							onChange={(value) => {
								if (isLeaveType(value)) setType(value);
							}}
						/>
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
						counter={t("leave.remarksCounter", { count: notes.length })}
						error={fields.notes}
						hint={t("leave.remarksHint")}
						htmlFor={`${id}-notes`}
						label={t("leave.remarksOptional")}
						layout="stacked"
					>
						<Textarea
							id={`${id}-notes`}
							maxLength={LEAVE_NOTES_MAX_LENGTH}
							placeholder={t("leave.remarksPlaceholder")}
							status={fields.notes ? "error" : undefined}
							value={notes}
							aria-describedby={
								fields.notes ? notesIds.errorId : notesIds.hintId
							}
							onChange={(event) => {
								setNotes(event.target.value);
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
								<dd className="font-semibold">
									{t(`leave.types.${request.leaveType}`)}
								</dd>
								<dt className="text-neutral-800">{t("leave.remarks")}</dt>
								<dd className="whitespace-pre-line break-words font-semibold">
									{request.notes ?? t("leave.none")}
								</dd>
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
										onApprove(request, comment.trim());
										return;
									}
									if (!reason.trim()) {
										setMissingReason(true);
										return;
									}
									onReject(request, reason.trim());
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
									aria-describedby={decisionError ? `${id}-error` : undefined}
									id={`${id}-decision-note`}
									placeholder={t("leave.note")}
									required={rejecting}
									status={decisionError ? "error" : undefined}
									value={rejecting ? reason : comment}
									maxLength={
										rejecting
											? REJECTION_REASON_MAX_LENGTH
											: APPROVAL_COMMENT_MAX_LENGTH
									}
									onChange={(event) => {
										if (rejecting) {
											setReason(event.target.value);
											setMissingReason(false);
										} else setComment(event.target.value);
									}}
								/>
								{decisionError && (
									<p
										className="mt-2 text-sm text-error-700"
										id={`${id}-error`}
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
