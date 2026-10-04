import dayjs from "dayjs";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CrossIcon, TickIcon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { formatPeriod } from "@/features/leave/dates";
import {
	leaveTypes,
	statusTone,
	type LeaveRequest,
	type LeaveType,
} from "@/features/leave/types";

export type LeaveRequestDialogProps = {
	request?: LeaveRequest;
	mode?: "view" | "reject" | "apply";
	employees?: Array<LeaveRequest>;
	onClose: () => void;
	onApprove: (request: LeaveRequest) => void;
	onReject: (request: LeaveRequest, reason: string) => void;
	onCreate: (request: LeaveRequest) => void;
};

export const LeaveRequestDialog = ({
	request,
	mode = "view",
	employees = [],
	onClose,
	onApprove,
	onReject,
	onCreate,
}: LeaveRequestDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const id = useId();
	const [rejecting, setRejecting] = useState(mode === "reject");
	const [reason, setReason] = useState("");
	const [error, setError] = useState(false);
	const [employeeId, setEmployeeId] = useState(employees[0]?.employeeId ?? "");
	const [type, setType] = useState<LeaveType>("annual");
	const [dates, setDates] = useState({
		start: "2026-06-15",
		end: "2026-06-15",
	});
	const applying = mode === "apply";
	const employee = employees.find((person) => person.employeeId === employeeId);
	if (!applying && !request) return null;
	return (
		<Modal
			open
			title={t(applying ? "leaveUi.apply" : "leaveUi.requestTitle")}
			footer={
				applying ? (
					<>
						<Button variant="secondary" onClick={onClose}>
							{t("leaveUi.cancel")}
						</Button>
						<Button disabled={!employee} form={id} type="submit">
							{t("leaveUi.submit")}
						</Button>
					</>
				) : rejecting ? (
					<>
						<Button
							variant="secondary"
							onClick={() => {
								setRejecting(false);
								setError(false);
							}}
						>
							{t("leaveUi.cancel")}
						</Button>
						<Button
							className="bg-error-600! hover:bg-error-700!"
							form={id}
							leadingIcon={<CrossIcon />}
							type="submit"
						>
							{t("leaveUi.confirmRejection")}
						</Button>
					</>
				) : request?.status === "pending" ? (
					<>
						<Button
							className="border-error-300! bg-error-50! text-error-600!"
							leadingIcon={<CrossIcon />}
							variant="secondary"
							onClick={() => {
								setRejecting(true);
							}}
						>
							{t("leaveUi.reject")}
						</Button>
						<Button
							leadingIcon={<TickIcon />}
							onClick={() => {
								onApprove(request);
							}}
						>
							{t("leaveUi.approve")}
						</Button>
					</>
				) : (
					<Button variant="secondary" onClick={onClose}>
						{t("leaveUi.close")}
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
						if (!employee) return;
						onCreate({
							...employee,
							id: `preview-${crypto.randomUUID()}`,
							start: dates.start,
							end: dates.end,
							days: dayjs(dates.end).diff(dayjs(dates.start), "day") + 1,
							requested: dayjs().format("YYYY-MM-DD"),
							status: "pending",
							type,
							reason: undefined,
						});
					}}
				>
					<p className="text-sm text-neutral-700">
						{t("leaveUi.previewApplication")}
					</p>
					<div className="space-y-2">
						<p className="text-sm font-medium" id={`${id}-employee`}>
							{t("leaveUi.employee")}
						</p>
						<Select
							aria-labelledby={`${id}-employee`}
							className="w-full"
							placeholder={t("leaveUi.chooseEmployee")}
							value={employeeId}
							options={[
								...new Map(
									employees.map((person) => [
										person.employeeId,
										{ value: person.employeeId, label: person.name },
									])
								).values(),
							]}
							onChange={setEmployeeId}
						/>
					</div>
					<div className="space-y-2">
						<p className="text-sm font-medium" id={`${id}-type`}>
							{t("leaveUi.type")}
						</p>
						<Select
							aria-labelledby={`${id}-type`}
							className="w-full"
							value={type}
							options={leaveTypes.map((value) => ({
								value,
								label: t(`leaveUi.types.${value}`),
							}))}
							onChange={(value) => {
								const next = leaveTypes.find((item) => item === value);
								if (next) setType(next);
							}}
						/>
					</div>
					<div className="space-y-2">
						<p className="text-sm font-medium">{t("leaveUi.applyPeriod")}</p>
						<DatePicker
							label={t("leaveUi.applyPeriod")}
							value={dates}
							onChange={setDates}
						/>
					</div>
				</form>
			) : (
				request && (
					<>
						<div className="px-6 py-8">
							<div className="mb-10 flex flex-wrap items-start justify-between gap-4">
								<div className="flex items-center gap-5">
									<Avatar className="size-16! text-2xl!" name={request.name} />
									<div>
										<p className="font-semibold">{request.name}</p>
										<p className="mt-2 text-sm">{request.employeeId}</p>
									</div>
								</div>
								<Badge
									className="mt-2 text-xs!"
									tone={statusTone[request.status]}
								>
									{t(`leaveUi.statuses.${request.status}`)}
								</Badge>
							</div>
							<dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-5 gap-y-4 text-sm sm:text-base">
								<dt className="text-neutral-800">{t("leaveUi.period")}</dt>
								<dd className="font-semibold">
									{formatPeriod(request.start, request.end, i18n.language)}
								</dd>
								<dt className="text-neutral-800">{t("leaveUi.requested")}</dt>
								<dd className="font-semibold">
									{formatPeriod(
										request.requested,
										request.requested,
										i18n.language
									)}
								</dd>
								<dt className="text-neutral-800">{t("leaveUi.duration")}</dt>
								<dd className="font-semibold">
									{t("leaveUi.days", { count: request.days })}
								</dd>
								<dt className="text-neutral-800">{t("leaveUi.type")}</dt>
								<dd className="font-semibold">
									{t(`leaveUi.types.${request.type}`)}
								</dd>
								<dt className="text-neutral-800">{t("leaveUi.attachments")}</dt>
								<dd className="font-semibold">{t("leaveUi.none")}</dd>
								{request.reason && (
									<>
										<dt className="text-neutral-800">{t("leaveUi.reason")}</dt>
										<dd className="break-words font-semibold">
											{request.reason}
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
										setError(true);
										return;
									}
									onReject(request, reason.trim());
								}}
							>
								<label
									className="mb-3 block text-sm font-medium text-neutral-800"
									htmlFor={`${id}-reason`}
								>
									{t("leaveUi.reason")}{" "}
									<span aria-hidden="true" className="text-error-600">
										*
									</span>
								</label>
								<Textarea
									required
									aria-describedby={error ? `${id}-error` : undefined}
									id={`${id}-reason`}
									maxLength={2000}
									placeholder={t("leaveUi.note")}
									status={error ? "error" : undefined}
									value={reason}
									onChange={(event) => {
										setReason(event.target.value);
										setError(false);
									}}
								/>
								{error && (
									<p
										className="mt-2 text-sm text-error-700"
										id={`${id}-error`}
										role="alert"
									>
										{t("leaveUi.required")}
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
