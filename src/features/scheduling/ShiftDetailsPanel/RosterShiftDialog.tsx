import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useId, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { timeSteps } from "@/features/scheduling/scheduleDraft";
import type { RosterShift, RosterStaff } from "@/features/scheduling/schedules";
import type { SchedulePeriod } from "@/features/scheduling/periods";

export type RosterShiftAction = "edit" | "reassign" | "duplicate";

export type RosterShiftDialogProps = {
	action: RosterShiftAction;
	shift: RosterShift;
	staffId: string;
	staff: Array<RosterStaff>;
	period: SchedulePeriod;
	onClose: () => void;
	onApply: (staffId: string, shift: RosterShift, person?: RosterStaff) => void;
	reassignFields?: ReactNode;
	reassignReady?: boolean;
	assignmentFields?: ReactNode;
	assignment?: Pick<
		RosterShift,
		"role" | "location" | "branchId" | "departmentId" | "jobTitleId"
	>;
};

/** Interactive roster preview; the owning demo page keeps the changes in memory. */
export const RosterShiftDialog = ({
	action,
	shift,
	staffId,
	staff,
	period,
	onClose,
	onApply,
	assignmentFields,
	assignment,
	reassignFields,
	reassignReady = true,
}: RosterShiftDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const key = "scheduling.detail.shiftAction";
	const formId = useId();
	const schema = z.object({
		staffId: z.string().min(1, t(`${key}.required`)),
		date: z.string().min(1, t(`${key}.required`)),
		start: z.string().regex(/^\d{2}:\d{2}$/, t(`${key}.required`)),
		end: z.string().regex(/^\d{2}:\d{2}$/, t(`${key}.required`)),
		breakMinutes: z.number().int().min(0).max(1440),
		notes: z.string(),
	});
	type Values = z.infer<typeof schema>;
	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			...shift,
			notes: shift.notes ?? "",
			staffId: action === "reassign" ? "" : staffId,
			date: action === "duplicate" ? "" : shift.date,
		},
	});
	const dates = Array.from(
		{ length: dayjs(period.end).diff(dayjs(period.start), "day") + 1 },
		(_, index) => {
			const date = dayjs(period.start).add(index, "day");
			return {
				value: date.format("YYYY-MM-DD"),
				label: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
					weekday: "short",
					month: "short",
					day: "numeric",
				}).format(date.toDate()),
			};
		}
	);
	const times = [...new Set([...timeSteps(), shift.start, shift.end])]
		.sort()
		.map((time) => ({ value: time, label: time }));
	const select = (
		name: "staffId" | "date" | "start" | "end",
		options: Array<{ value: string; label: string }>
	): FunctionComponent => {
		const id = `${formId}-${name}`;
		return (
			<FormRow
				required
				error={form.formState.errors[name]?.message}
				htmlFor={id}
				label={t(`${key}.${name}`)}
				layout="stacked"
			>
				<Controller
					control={form.control}
					name={name}
					render={({ field }) => (
						<Select
							ref={field.ref}
							aria-labelledby={formRowIds(id).labelId}
							className="w-full"
							options={options}
							placeholder={t(`${key}.choose`)}
							value={field.value}
							aria-describedby={
								form.formState.errors[name] ? formRowIds(id).errorId : undefined
							}
							disabled={
								name === "staffId" && action === "reassign" && !reassignReady
							}
							onChange={field.onChange}
						/>
					)}
				/>
			</FormRow>
		);
	};
	return (
		<Dialog
			open
			description={t(`${key}.preview`)}
			title={t(`${key}.${action}`)}
			footer={
				<div className="flex justify-end gap-3">
					<Button variant="secondary" onClick={onClose}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						form={formId}
						type="submit"
						disabled={
							(action === "edit" && !assignment) ||
							(action === "reassign" && !reassignReady)
						}
					>
						{t(`${key}.confirm.${action}`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<form
				noValidate
				className="space-y-5"
				id={formId}
				onSubmit={form.handleSubmit((values) => {
					if (action === "reassign" && !reassignReady) return;
					if (action === "edit" && !assignment) return;
					const target = staff.find(
						(person) => person.staffId === values.staffId
					);
					if (
						!target ||
						(action === "reassign" && target.staffId === staffId)
					) {
						form.setError("staffId", { message: t(`${key}.required`) });
						return;
					}
					const occupied = target.shifts.some(
						(item) =>
							item.date === values.date &&
							(action === "duplicate" || item.shiftId !== shift.shiftId)
					);
					if (occupied) {
						form.setError(action === "reassign" ? "staffId" : "date", {
							message: t(`${key}.occupied`),
						});
						return;
					}
					onApply(target.staffId, {
						...shift,
						...(action === "edit" ? assignment : {}),
						date: values.date,
						start: values.start,
						end: values.end,
						breakMinutes: values.breakMinutes,
						notes: values.notes,
					});
				})}
			>
				{action === "reassign" && reassignFields}
				{action !== "edit" &&
					select(
						"staffId",
						staff
							.filter(
								(person) => action !== "reassign" || person.staffId !== staffId
							)
							.map((person) => ({ value: person.staffId, label: person.name }))
					)}
				{action !== "reassign" && select("date", dates)}
				{action === "reassign" && (
					<p className="text-sm text-neutral-700">
						{shift.date} · {shift.start} – {shift.end} · {shift.role}
					</p>
				)}
				{action === "edit" && (
					<>
						<div className="grid grid-cols-2 gap-4">
							{select("start", times)}
							{select("end", times)}
						</div>
						{assignmentFields}
						{(["breakMinutes", "notes"] as const).map((name) => {
							const id = `${formId}-${name}`;
							return (
								<FormRow
									key={name}
									htmlFor={id}
									label={t(`${key}.${name}`)}
									layout="stacked"
									error={
										form.formState.errors[name]
											? t(`${key}.invalid`)
											: undefined
									}
								>
									<Input
										{...form.register(
											name,
											name === "breakMinutes" ? { valueAsNumber: true } : {}
										)}
										id={id}
										min={name === "breakMinutes" ? 0 : undefined}
										type={name === "breakMinutes" ? "number" : "text"}
										aria-describedby={
											form.formState.errors[name]
												? formRowIds(id).errorId
												: undefined
										}
									/>
								</FormRow>
							);
						})}
					</>
				)}
			</form>
		</Dialog>
	);
};
