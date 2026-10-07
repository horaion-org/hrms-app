import dayjs from "dayjs";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CrossIcon, SearchIcon, TickIcon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { isLeaveType, LEAVE_TYPES } from "@/features/leave/api";
import { formatPeriod } from "@/features/leave/dates";
import type { ApplyField } from "@/features/leave/leaveRefusal";
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

export type LeaveRequestDialogProps = {
	request?: LeaveRequest;
	mode?: "view" | "reject" | "apply";
	/** Who leave may be applied for; required in `apply` mode. */
	employees?: ApplyEmployees;
	/** Whether the person may decide the shown request; Approve and Reject are offered only then. */
	canReview?: boolean;
	/** While a decision or an application is being sent. */
	busy?: boolean;
	/** Why the last decision or application was refused: on a field, or as the dialog's alert. */
	refusal?: Refusal<ApplyField | "reason">;
	onClose: () => void;
	onApprove: (request: LeaveRequest) => void;
	onReject: (request: LeaveRequest, reason: string) => void;
	onCreate: (membershipId: string, body: LeaveRequestBody) => void;
};

/**
 * One request to review, reject with a reason, or a new application on a
 * person's behalf. The dialog only collects and shows; the caller sends and
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
	const [rejecting, setRejecting] = useState(mode === "reject");
	const [reason, setReason] = useState("");
	const [missingReason, setMissingReason] = useState(false);
	const [membershipId, setMembershipId] = useState("");
	const [type, setType] = useState<LeaveType>("ANNUAL");
	const today = dayjs().format("YYYY-MM-DD");
	const [dates, setDates] = useState({ start: today, end: today });
	const applying = mode === "apply";
	const chosen = employees?.options.find(
		(person) => person.membershipId === membershipId
	);
	const fields = refusal?.fields ?? {};
	const employeeError = fields.employee ? `${id}-employee-error` : undefined;
	const reasonError = missingReason ? t("leave.required") : fields.reason;
	if (!applying && !request) return null;
	const alert = refusal?.message && (
		<p className="text-sm text-error-700" role="alert">
			{refusal.message}
		</p>
	);
	return (
		<Modal
			open
			title={t(applying ? "leave.apply" : "leave.requestTitle")}
			footer={
				applying ? (
					<>
						<Button variant="secondary" onClick={onClose}>
							{t("leave.cancel")}
						</Button>
						<Button disabled={!chosen || busy} form={id} type="submit">
							{t("leave.submit")}
						</Button>
					</>
				) : rejecting ? (
					<>
						<Button
							variant="secondary"
							onClick={() => {
								setRejecting(false);
								setMissingReason(false);
							}}
						>
							{t("leave.cancel")}
						</Button>
						<Button
							className="bg-error-600! hover:bg-error-700!"
							disabled={busy}
							form={id}
							leadingIcon={<CrossIcon />}
							type="submit"
						>
							{t("leave.confirmRejection")}
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
								setRejecting(true);
							}}
						>
							{t("leave.reject")}
						</Button>
						<Button
							disabled={busy}
							leadingIcon={<TickIcon />}
							onClick={() => {
								onApprove(request);
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
			onClose={onClose}
		>
			{applying ? (
				<form
					className="space-y-6 p-6"
					id={id}
					onSubmit={(event) => {
						event.preventDefault();
						if (!chosen) return;
						onCreate(chosen.membershipId, {
							leaveType: type,
							startDate: dates.start,
							endDate: dates.end,
						});
					}}
				>
					{alert}
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
								<dt className="text-neutral-800">{t("leave.attachments")}</dt>
								<dd className="font-semibold">{t("leave.none")}</dd>
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
										<dd className="break-words font-semibold">
											{request.rejectionReason}
										</dd>
									</>
								)}
							</dl>
						</div>
						{rejecting && (
							<form
								className="border-t border-neutral-400 px-6 py-8"
								id={id}
								onSubmit={(event) => {
									event.preventDefault();
									if (!reason.trim()) {
										setMissingReason(true);
										return;
									}
									onReject(request, reason.trim());
								}}
							>
								<label
									className="mb-3 block text-sm font-medium text-neutral-800"
									htmlFor={`${id}-reason`}
								>
									{t("leave.reason")}{" "}
									<span aria-hidden="true" className="text-error-600">
										*
									</span>
								</label>
								<Textarea
									required
									aria-describedby={reasonError ? `${id}-error` : undefined}
									id={`${id}-reason`}
									maxLength={2000}
									placeholder={t("leave.note")}
									status={reasonError ? "error" : undefined}
									value={reason}
									onChange={(event) => {
										setReason(event.target.value);
										setMissingReason(false);
									}}
								/>
								{reasonError && (
									<p
										className="mt-2 text-sm text-error-700"
										id={`${id}-error`}
										role="alert"
									>
										{reasonError}
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
