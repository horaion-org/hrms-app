import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { FormRow } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
	activeLeaveTypesQuery,
	leaveHistoryQuery,
	LEAVE_REMARK_MAX_LENGTH,
	rosteredDaysQuery,
	type LeaveChange,
} from "@/features/leave/api";
import { formatPeriod, rangeDays } from "@/features/leave/dates";
import { changeRefusal } from "@/features/leave/leaveRefusal";
import { leaveTypeOptions } from "@/features/leave/leaveTypeOptions";
import type { LeaveRequest } from "@/features/leave/types";
import { useLeaveLifecycleActions } from "@/features/leave/useLeaveActions";
import { RosteredDaysNotice } from "../RosteredDaysNotice";

export type LeaveRequestLifecycleProps = {
	companyId: string;
	request: LeaveRequest;
	/** The reader's own request: history comes from the me route, and a pending one can be withdrawn. */
	own: boolean;
	/** Whether the reader may change or cancel this approved request. */
	canChange: boolean;
	/** The dialog closes and says what happened. */
	onDone: (message: string) => void;
};

const HISTORY_KINDS = [
	"RECORDED",
	"WITHDRAWN",
	"CANCELLED",
	"CHANGED",
	"DAY_CHANGED",
	"DAY_CANCELLED",
	"SPLIT_OFF",
] as const;

/** A kind this app doesn't know yet still reads as a change. */
const historyKindOf = (
	kind: string
): (typeof HISTORY_KINDS)[number] | "other" =>
	HISTORY_KINDS.find((known) => known === kind) ?? "other";

/** One line of the history: who did what, a type change, and the remark the reader may see. */
const HistoryLine = ({
	change,
}: {
	change: LeaveChange;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const day = change.affectedDay
		? formatPeriod(
				change.affectedDay,
				change.affectedDay,
				formattingLocale(i18n)
			)
		: "";
	const typeChanged = change.beforeLeaveTypeName !== change.afterLeaveTypeName;
	const datesChanged =
		change.beforeStartDate !== change.afterStartDate ||
		change.beforeEndDate !== change.afterEndDate;
	// The local calendar day: a late-evening change must not read as the next day.
	const changedOn = dayjs(change.changedAt).format("YYYY-MM-DD");
	return (
		<li className="text-sm text-neutral-800">
			<p className="font-medium">
				{t(`leave.historyKinds.${historyKindOf(change.kind)}`, {
					name: change.changedByName,
					day,
				})}
				{" · "}
				{formatPeriod(changedOn, changedOn, formattingLocale(i18n))}
			</p>
			{typeChanged && (
				<p>
					{t("leave.historyType", {
						before: change.beforeLeaveTypeName,
						after: change.afterLeaveTypeName,
					})}
				</p>
			)}
			{datesChanged &&
				change.beforeStartDate &&
				change.beforeEndDate &&
				change.afterStartDate &&
				change.afterEndDate && (
					<p>
						{t("leave.historyDates", {
							before: formatPeriod(
								change.beforeStartDate,
								change.beforeEndDate,
								formattingLocale(i18n)
							),
							after: formatPeriod(
								change.afterStartDate,
								change.afterEndDate,
								formattingLocale(i18n)
							),
						})}
					</p>
				)}
			{change.remark && <q className="block">{change.remark}</q>}
		</li>
	);
};

/** The required remark every change carries; the member reads it. */
const RemarkField = ({
	name,
	value,
	onChange,
}: {
	name: string;
	value: string;
	onChange: (value: string) => void;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<FormRow
			required
			hint={t("leave.remarkHint", { name })}
			htmlFor="leave-change-remark"
			label={t("leave.remark")}
			layout="stacked"
		>
			<Textarea
				required
				id="leave-change-remark"
				maxLength={LEAVE_REMARK_MAX_LENGTH}
				placeholder={t("leave.remarkPlaceholder")}
				value={value}
				onChange={(event) => {
					onChange(event.target.value);
				}}
			/>
		</FormRow>
	);
};

/** What a reviewer changes on approved leave; the confirmation's own state. */
const ChangeLeaveConfirmation = ({
	companyId,
	request,
	onClose,
	onDone,
}: Omit<LeaveRequestLifecycleProps, "own" | "canChange"> & {
	onClose: () => void;
}): FunctionComponent => {
	const { t } = useTranslation();
	const actions = useLeaveLifecycleActions(companyId);
	const leaveTypes = useQuery(activeLeaveTypesQuery(companyId));
	const [typeCode, setTypeCode] = useState(request.leaveType);
	const [dates, setDates] = useState({
		start: request.startDate,
		end: request.endDate,
	});
	const [remark, setRemark] = useState("");
	const [confirmed, setConfirmed] = useState(false);
	const rostered = useQuery(
		rosteredDaysQuery(companyId, dates, request.membershipId)
	);
	const oldDays = new Set(
		rangeDays({ start: request.startDate, end: request.endDate })
	);
	const addedRosteredDays = (rostered.data ?? []).filter(
		({ day }) => !oldDays.has(day)
	);
	const needsConfirmation = addedRosteredDays.length > 0;
	// Only moved dates can clash; confirming on days not read yet comes back as a 409 with nothing to tick.
	const datesMoved =
		dates.start !== request.startDate || dates.end !== request.endDate;
	const rosterUnknown = datesMoved && (rostered.isFetching || rostered.isError);
	const options = leaveTypeOptions(leaveTypes.data ?? [], t);
	return (
		<ConfirmDialog
			cancelLabel={t("leave.changeKeep")}
			confirmLabel={t("leave.changeConfirm")}
			description={t("leave.changeDescription", { name: request.displayName })}
			submitting={actions.change.isPending}
			title={t("leave.changeTitle", { name: request.displayName })}
			confirmDisabled={
				remark.trim() === "" ||
				rosterUnknown ||
				(needsConfirmation && !confirmed)
			}
			error={
				actions.change.error
					? changeRefusal(actions.change.error, t)
					: undefined
			}
			onClose={onClose}
			onConfirm={() => {
				actions.change.mutate(
					{
						request,
						body: {
							leaveType: typeCode,
							startDate: dates.start,
							endDate: dates.end,
							remark: remark.trim(),
							takeOffRosteredDays: needsConfirmation && confirmed,
						},
					},
					{
						onSuccess: () => {
							onDone(t("leave.changed", { name: request.displayName }));
						},
					}
				);
			}}
		>
			<div className="space-y-4">
				<FormRow
					htmlFor="leave-change-type"
					label={t("leave.type")}
					layout="stacked"
				>
					<Select
						aria-label={t("leave.type")}
						className="w-full"
						options={options}
						value={typeCode}
						onChange={setTypeCode}
					/>
				</FormRow>
				<DatePicker
					label={t("leave.applyPeriod")}
					value={dates}
					onChange={setDates}
				/>
				<RosteredDaysNotice
					confirmed={confirmed}
					days={addedRosteredDays}
					name={request.displayName}
					onConfirmedChange={setConfirmed}
					onRetry={
						datesMoved && rostered.isError
							? (): void => {
									void rostered.refetch();
								}
							: undefined
					}
				/>
				<RemarkField
					name={request.displayName}
					value={remark}
					onChange={setRemark}
				/>
			</div>
		</ConfirmDialog>
	);
};

/**
 * What can still happen to a request and what has: its history, Withdraw on the
 * member's own pending request, and Change and Cancel for a reviewer of an
 * approved one. Nothing shows when none of these applies.
 */
export const LeaveRequestLifecycle = ({
	companyId,
	request,
	own,
	canChange,
	onDone,
}: LeaveRequestLifecycleProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const actions = useLeaveLifecycleActions(companyId);
	const history = useQuery(
		leaveHistoryQuery(
			companyId,
			request.leaveRequestId,
			own ? undefined : request.membershipId
		)
	);
	const [asking, setAsking] = useState<"withdraw" | "change" | "cancel" | null>(
		null
	);
	const [remark, setRemark] = useState("");
	const period = formatPeriod(
		request.startDate,
		request.endDate,
		formattingLocale(i18n)
	);
	const close = (): void => {
		setAsking(null);
	};
	const lines = history.data ?? [];
	const changeable = canChange && request.status === "APPROVED";
	const withdrawable = own && request.status === "PENDING";
	return (
		<>
			{lines.length > 0 && (
				<section className="mt-8">
					<h3 className="mb-3 text-sm font-medium text-neutral-800">
						{t("leave.history")}
					</h3>
					<ul className="space-y-3">
						{lines.map((change) => (
							<HistoryLine
								key={`${change.changedAt}-${change.kind}`}
								change={change}
							/>
						))}
					</ul>
				</section>
			)}
			{(changeable || withdrawable) && (
				<div className="mt-6 flex flex-wrap gap-4">
					{changeable && (
						<>
							<Button
								variant="textlink"
								onClick={() => {
									setAsking("change");
								}}
							>
								{t("leave.changeAction")}
							</Button>
							<Button
								variant="textlink"
								onClick={() => {
									setAsking("cancel");
								}}
							>
								{t("leave.cancelAction")}
							</Button>
						</>
					)}
					{withdrawable && (
						<Button
							variant="textlink"
							onClick={() => {
								setAsking("withdraw");
							}}
						>
							{t("leave.withdraw")}
						</Button>
					)}
				</div>
			)}
			{asking === "withdraw" && (
				<ConfirmDialog
					cancelLabel={t("leave.withdrawKeep")}
					confirmLabel={t("leave.withdraw")}
					description={t("leave.withdrawDescription", { period })}
					submitting={actions.withdraw.isPending}
					title={t("leave.withdrawTitle")}
					tone="danger"
					error={
						actions.withdraw.error
							? changeRefusal(actions.withdraw.error, t)
							: undefined
					}
					onClose={close}
					onConfirm={() => {
						actions.withdraw.mutate(request, {
							onSuccess: () => {
								onDone(t("leave.withdrawn"));
							},
						});
					}}
				/>
			)}
			{asking === "cancel" && (
				<ConfirmDialog
					cancelLabel={t("leave.cancelKeep")}
					confirmDisabled={remark.trim() === ""}
					confirmLabel={t("leave.cancelConfirm")}
					submitting={actions.cancel.isPending}
					title={t("leave.cancelTitle", { name: request.displayName })}
					tone="danger"
					description={t("leave.cancelDescription", {
						period,
						name: request.displayName,
					})}
					error={
						actions.cancel.error
							? changeRefusal(actions.cancel.error, t)
							: undefined
					}
					onClose={close}
					onConfirm={() => {
						actions.cancel.mutate(
							{ request, remark: remark.trim() },
							{
								onSuccess: () => {
									onDone(
										t("leave.cancelledDone", { name: request.displayName })
									);
								},
							}
						);
					}}
				>
					<RemarkField
						name={request.displayName}
						value={remark}
						onChange={setRemark}
					/>
				</ConfirmDialog>
			)}
			{asking === "change" && (
				<ChangeLeaveConfirmation
					companyId={companyId}
					request={request}
					onClose={close}
					onDone={onDone}
				/>
			)}
		</>
	);
};
