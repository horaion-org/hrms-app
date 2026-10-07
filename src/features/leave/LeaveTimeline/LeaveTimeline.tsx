import dayjs from "dayjs";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	SortIcon,
} from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import type { DateRange } from "@/components/forms/Calendar";
import { formatPeriod, rangeDays, shiftRange } from "@/features/leave/dates";
import type { LeaveRequest } from "@/features/leave/types";

export type LeaveTimelineProps = {
	/** Every request sharing a day with `range`; rejected ones are not drawn. */
	requests: Array<LeaveRequest>;
	range: DateRange;
	onRangeChange: (range: DateRange) => void;
	onOpen: (request: LeaveRequest) => void;
};

const barClasses = {
	APPROVED: "border-success-600 bg-success-200",
	PENDING: "border-warning-600 bg-warning-200",
};
const blockedStyle = {
	backgroundImage:
		"repeating-linear-gradient(135deg, transparent, transparent 4px, var(--color-neutral-400) 4px, var(--color-neutral-400) 5px)",
};

/**
 * One row per person with a request in the window, a bar per pending or
 * approved request clipped to it, weekends hatched as blocked. The window
 * is the caller's: moving it asks the API for that window.
 */
export const LeaveTimeline = ({
	requests,
	range,
	onRangeChange,
	onOpen,
}: LeaveTimelineProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const tooltipId = useId();
	const [page, setPage] = useState(1);
	const [ascending, setAscending] = useState<boolean | null>(null);
	const days = rangeDays(range);
	const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) =>
		days.slice(index * 7, index * 7 + 7)
	);
	const drawn = requests.filter((request) => request.status !== "REJECTED");
	const employees = [
		...new Map(
			drawn.map((request) => [request.membershipId, request])
		).values(),
	];
	if (ascending !== null)
		employees.sort(
			(a, b) =>
				a.displayName.localeCompare(b.displayName, i18n.language) *
				(ascending ? 1 : -1)
		);
	const currentPage = Math.min(
		page,
		Math.max(1, Math.ceil(employees.length / 10))
	);
	const today = dayjs().format("YYYY-MM-DD");
	const grid = { gridTemplateColumns: `repeat(${days.length}, 40px)` };
	const month = new Intl.DateTimeFormat(i18n.language, { month: "short" });
	return (
		<section aria-label={t("leave.timeline")}>
			<div className="mb-8 flex flex-wrap items-center justify-between gap-5">
				<div className="flex min-w-0 items-center gap-2">
					<Button
						aria-label={t("leave.previousPeriod")}
						variant="icon"
						onClick={() => {
							onRangeChange(shiftRange(range, -1));
						}}
					>
						<ChevronLeftIcon />
					</Button>
					<DatePicker
						label={t("leave.dateRange")}
						value={range}
						onChange={onRangeChange}
					/>
					<Button
						aria-label={t("leave.nextPeriod")}
						variant="icon"
						onClick={() => {
							onRangeChange(shiftRange(range, 1));
						}}
					>
						<ChevronRightIcon />
					</Button>
				</div>
				<ul
					aria-label={t("leave.legend")}
					className="flex flex-wrap gap-5 text-xs text-neutral-800"
				>
					<li className="flex items-center gap-2">
						<span className="size-3 rounded-full bg-success-500" />
						{t("leave.statuses.APPROVED")}
					</li>
					<li className="flex items-center gap-2">
						<span className="size-3 rounded-full bg-warning-400" />
						{t("leave.statuses.PENDING")}
					</li>
					<li className="flex items-center gap-2">
						<span
							className="size-3 rounded-full border border-neutral-400"
							style={blockedStyle}
						/>
						{t("leave.statuses.blocked")}
					</li>
				</ul>
			</div>
			<div
				aria-label={t("leave.timeline")}
				className="overflow-x-auto rounded-lg border border-neutral-400 focus-visible:outline-2 focus-visible:outline-ink-blue-500"
				role="region"
				tabIndex={0}
			>
				<table
					className="table-fixed border-separate border-spacing-0 text-xs"
					style={{ width: 204 + days.length * 40 }}
				>
					<thead>
						<tr>
							<th
								className="sticky left-0 z-20 w-51 border-r border-b border-neutral-400 bg-neutral-200 px-3 text-left text-sm"
								rowSpan={2}
								scope="col"
								aria-sort={
									ascending === null
										? "none"
										: ascending
											? "ascending"
											: "descending"
								}
							>
								<Button
									className="w-full justify-between! text-neutral-900!"
									trailingIcon={<SortIcon />}
									variant="textlink"
									onClick={() => {
										setAscending(ascending !== true);
										setPage(1);
									}}
								>
									{t("leave.employee")}
								</Button>
							</th>
							{weeks.map((week) => (
								<th
									key={week[0]}
									className="h-9 border-r border-b border-neutral-400 bg-neutral-200 text-sm"
									colSpan={week.length}
									scope="colgroup"
								>
									{month.format(new Date(`${week[0]}T12:00:00`))}
									{week[0]?.slice(0, 7) !==
										week[week.length - 1]?.slice(0, 7) &&
										` / ${month.format(new Date(`${week[week.length - 1]}T12:00:00`))}`}
								</th>
							))}
						</tr>
						<tr>
							{days.map((date) => (
								<th
									key={date}
									className="h-9 min-w-10 border-r border-b border-neutral-400 bg-neutral-200 text-sm font-medium"
									scope="col"
								>
									<time
										dateTime={date}
										title={`${formatPeriod(date, date, i18n.language)}${dayjs(date).day() === 0 || dayjs(date).day() === 6 ? ` · ${t("leave.weekend")}` : ""}`}
									>
										{date.slice(-2)}
									</time>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{employees
							.slice((currentPage - 1) * 10, currentPage * 10)
							.map((employee) => (
								<tr key={employee.membershipId}>
									<th
										className="sticky left-0 z-20 h-16 border-r border-b border-neutral-400 bg-white px-3 text-left font-normal"
										scope="row"
									>
										<div className="flex items-center gap-3">
											<Avatar
												className="size-10! text-base!"
												name={employee.displayName}
											/>
											<div>
												<p className="font-semibold">{employee.displayName}</p>
												<p className="mt-1">{employee.employeeCode}</p>
											</div>
										</div>
									</th>
									<td
										className="relative border-b border-neutral-400 p-0"
										colSpan={days.length}
									>
										<div className="relative grid h-16" style={grid}>
											{days.map((date, index) => (
												<div
													key={date}
													aria-hidden="true"
													className="col-auto row-start-1 border-r border-neutral-400"
													style={{
														gridColumn: index + 1,
														...(dayjs(date).day() === 0 ||
														dayjs(date).day() === 6
															? blockedStyle
															: {}),
													}}
												>
													{date === today && (
														<span
															className="absolute inset-y-0 z-10 border-l border-ink-blue-300"
															title={t("leave.today")}
														/>
													)}
												</div>
											))}
											{drawn
												.filter(
													(request) =>
														request.membershipId === employee.membershipId &&
														request.endDate >= range.start &&
														request.startDate <= range.end
												)
												.map((request) => {
													const start = Math.max(
														0,
														dayjs(request.startDate).diff(
															dayjs(range.start),
															"day"
														)
													);
													const end = Math.min(
														days.length,
														dayjs(request.endDate).diff(
															dayjs(range.start),
															"day"
														) + 1
													);
													const period = formatPeriod(
														request.startDate,
														request.endDate,
														i18n.language
													);
													return (
														<div
															key={request.leaveRequestId}
															className="group relative z-10 row-start-1 mx-0.5 self-center"
															style={{
																gridColumn: `${start + 1} / ${end + 1}`,
															}}
														>
															<button
																aria-describedby={`${tooltipId}-${request.leaveRequestId}`}
																className={`block h-4 w-full cursor-pointer rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-900 ${barClasses[request.status === "APPROVED" ? "APPROVED" : "PENDING"]}`}
																type="button"
																aria-label={t("leave.timelineEntry", {
																	name: request.displayName,
																	type: t(`leave.types.${request.leaveType}`),
																	period,
																	status: t(`leave.statuses.${request.status}`),
																})}
																onClick={() => {
																	onOpen(request);
																}}
															/>
															<span
																className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-max max-w-64 rounded-lg border border-neutral-400 bg-white px-3 py-2 text-center text-xs shadow-md group-focus-within:block group-hover:block"
																id={`${tooltipId}-${request.leaveRequestId}`}
																role="tooltip"
															>
																<span className="block">{period}</span>
																<span className="mt-1 block font-semibold">
																	{t(`leave.types.${request.leaveType}`)}
																</span>
															</span>
														</div>
													);
												})}
										</div>
									</td>
								</tr>
							))}
						{employees.length === 0 && (
							<tr>
								<td
									className="p-8 text-center text-neutral-700"
									colSpan={days.length + 1}
								>
									{t("leave.empty")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<Pagination
				page={currentPage}
				pageSize={10}
				total={employees.length}
				onPageChange={setPage}
			/>
		</section>
	);
};
