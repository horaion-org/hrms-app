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
import { formatPeriod, rangeDays, shiftRange } from "@/features/leave/dates";
import { initialRange } from "@/features/leave/sampleData";
import type { LeaveRequest } from "@/features/leave/types";

export type LeaveTimelineProps = {
	requests: Array<LeaveRequest>;
	onOpen: (request: LeaveRequest) => void;
};

const barClasses = {
	approved: "border-success-600 bg-success-200",
	pending: "border-warning-600 bg-warning-200",
};
const blockedStyle = {
	backgroundImage:
		"repeating-linear-gradient(135deg, transparent, transparent 4px, var(--color-neutral-400) 4px, var(--color-neutral-400) 5px)",
};

export const LeaveTimeline = ({
	requests,
	onOpen,
}: LeaveTimelineProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const tooltipId = useId();
	const [range, setRange] = useState(initialRange);
	const [page, setPage] = useState(1);
	const [ascending, setAscending] = useState<boolean | null>(null);
	const days = rangeDays(range);
	const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) =>
		days.slice(index * 7, index * 7 + 7)
	);
	const employees = [
		...new Map(
			requests.map((request) => [request.employeeId, request])
		).values(),
	];
	if (ascending !== null)
		employees.sort(
			(a, b) =>
				a.name.localeCompare(b.name, i18n.language) * (ascending ? 1 : -1)
		);
	const currentPage = Math.min(
		page,
		Math.max(1, Math.ceil(employees.length / 10))
	);
	const today = dayjs().format("YYYY-MM-DD");
	const grid = { gridTemplateColumns: `repeat(${days.length}, 40px)` };
	const month = new Intl.DateTimeFormat(i18n.language, { month: "short" });
	return (
		<section aria-label={t("leaveUi.timeline")}>
			<div className="mb-8 flex flex-wrap items-center justify-between gap-5">
				<div className="flex min-w-0 items-center gap-2">
					<Button
						aria-label={t("leaveUi.previousPeriod")}
						variant="icon"
						onClick={() => {
							setRange(shiftRange(range, -1));
						}}
					>
						<ChevronLeftIcon />
					</Button>
					<DatePicker
						label={t("leaveUi.dateRange")}
						value={range}
						onChange={setRange}
					/>
					<Button
						aria-label={t("leaveUi.nextPeriod")}
						variant="icon"
						onClick={() => {
							setRange(shiftRange(range, 1));
						}}
					>
						<ChevronRightIcon />
					</Button>
				</div>
				<ul
					aria-label={t("leaveUi.legend")}
					className="flex flex-wrap gap-5 text-xs text-neutral-800"
				>
					<li className="flex items-center gap-2">
						<span className="size-3 rounded-full bg-success-500" />
						{t("leaveUi.statuses.approved")}
					</li>
					<li className="flex items-center gap-2">
						<span className="size-3 rounded-full bg-warning-400" />
						{t("leaveUi.statuses.pending")}
					</li>
					<li className="flex items-center gap-2">
						<span
							className="size-3 rounded-full border border-neutral-400"
							style={blockedStyle}
						/>
						{t("leaveUi.statuses.blocked")}
					</li>
				</ul>
			</div>
			<div
				aria-label={t("leaveUi.timeline")}
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
									{t("leaveUi.employee")}
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
										title={`${formatPeriod(date, date, i18n.language)}${dayjs(date).day() === 0 || dayjs(date).day() === 6 ? ` · ${t("leaveUi.weekend")}` : ""}`}
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
								<tr key={employee.employeeId}>
									<th
										className="sticky left-0 z-20 h-16 border-r border-b border-neutral-400 bg-white px-3 text-left font-normal"
										scope="row"
									>
										<div className="flex items-center gap-3">
											<Avatar
												className="size-10! text-base!"
												name={employee.name}
											/>
											<div>
												<p className="font-semibold">{employee.name}</p>
												<p className="mt-1">{employee.employeeId}</p>
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
															title={t("leaveUi.today")}
														/>
													)}
												</div>
											))}
											{requests
												.filter(
													(request) =>
														request.employeeId === employee.employeeId &&
														request.status !== "rejected" &&
														request.end >= range.start &&
														request.start <= range.end
												)
												.map((request) => {
													const start = Math.max(
														0,
														dayjs(request.start).diff(dayjs(range.start), "day")
													);
													const end = Math.min(
														days.length,
														dayjs(request.end).diff(dayjs(range.start), "day") +
															1
													);
													const period = formatPeriod(
														request.start,
														request.end,
														i18n.language
													);
													return (
														<div
															key={request.id}
															className="group relative z-10 row-start-1 mx-0.5 self-center"
															style={{
																gridColumn: `${start + 1} / ${end + 1}`,
															}}
														>
															<button
																aria-describedby={`${tooltipId}-${request.id}`}
																className={`block h-4 w-full cursor-pointer rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-900 ${barClasses[request.status === "approved" ? "approved" : "pending"]}`}
																type="button"
																aria-label={t("leaveUi.timelineEntry", {
																	name: request.name,
																	type: t(`leaveUi.types.${request.type}`),
																	period,
																	status: t(
																		`leaveUi.statuses.${request.status}`
																	),
																})}
																onClick={() => {
																	onOpen(request);
																}}
															/>
															<span
																className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-max max-w-64 rounded-lg border border-neutral-400 bg-white px-3 py-2 text-center text-xs shadow-md group-focus-within:block group-hover:block"
																id={`${tooltipId}-${request.id}`}
																role="tooltip"
															>
																<span className="block">{period}</span>
																<span className="mt-1 block font-semibold">
																	{t(`leaveUi.types.${request.type}`)}
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
									{t("leaveUi.empty")}
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
