import dayjs from "dayjs";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Icon";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { RosterShift } from "@/features/scheduling/RosterGrid/RosterShift";
import { rosterLooks } from "@/features/scheduling/rosterLooks";
import {
	rosteredHours,
	type RosterGroup,
	type RosterShift as Shift,
	type RosterStaff,
} from "@/features/scheduling/schedules";

export type RosterGridProps = {
	groups: Array<RosterGroup>;
	/** The seven ISO dates shown, Monday first. */
	days: Array<string>;
	selectedShiftId?: string;
	onShiftSelect: (staff: RosterStaff, shift: Shift) => void;
	className?: string;
};

/**
 * Who works when in one week: a row per person, grouped by department, and
 * a column per day. Groups fold away; a day without a shift is a day off.
 */
export const RosterGrid = ({
	groups,
	days,
	selectedShiftId,
	onShiftSelect,
	className,
}: RosterGridProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const [collapsed, setCollapsed] = useState(
		() =>
			new Set(
				groups.filter((group) => group.staff.length === 0).map((g) => g.groupId)
			)
	);
	const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
	const dayMonth = new Intl.DateTimeFormat(language, {
		day: "numeric",
		month: "short",
	});
	const toggle = (groupId: string): void => {
		setCollapsed((current) => {
			const next = new Set(current);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);
			return next;
		});
	};

	return (
		<div
			className={joinClassNames(
				"min-w-0 overflow-x-auto rounded-lg border border-neutral-400",
				className
			)}
		>
			<table className="w-full min-w-200 table-fixed border-collapse text-neutral-900">
				<caption className="sr-only">{t("scheduling.detail.roster")}</caption>
				<colgroup>
					<col className="w-50" />
				</colgroup>
				<thead>
					<tr className="bg-neutral-200">
						<th className="h-16 px-3 text-left text-sm font-bold" scope="col">
							{t("scheduling.detail.staff")}
						</th>
						{days.map((date) => (
							<th key={date} className="h-16 px-2 text-center" scope="col">
								<span className="block text-sm font-bold">
									{weekday.format(dayjs(date).toDate())}
								</span>
								<span className="mt-1 block text-xs font-normal">
									{dayMonth.format(dayjs(date).toDate())}
								</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{groups.map((group) => {
						const open = !collapsed.has(group.groupId);
						return (
							<Fragment key={group.groupId}>
								<tr className="border-t border-neutral-400">
									<th
										className="h-12 bg-ink-blue-50 px-3 text-left"
										colSpan={8}
										scope="rowgroup"
									>
										<span className="flex items-center gap-3">
											<button
												aria-expanded={open}
												className="flex cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ink-blue-500"
												type="button"
												aria-label={t(
													open
														? "scheduling.detail.collapse"
														: "scheduling.detail.expand",
													{ name: group.name }
												)}
												onClick={() => {
													toggle(group.groupId);
												}}
											>
												{open ? (
													<ChevronDownIcon className="size-4" />
												) : (
													<ChevronRightIcon className="size-4" />
												)}
											</button>
											<span className="flex-1 text-xs font-semibold">
												{group.name}
											</span>
											<span className="flex size-5 items-center justify-center rounded-full bg-ink-blue-100 text-[0.625rem] font-semibold text-ink-blue-900">
												{group.headcount}
											</span>
										</span>
									</th>
								</tr>
								{open && group.staff.length === 0 && (
									<tr className="border-t border-neutral-400">
										<td
											className="px-3 py-4 text-sm text-neutral-700"
											colSpan={8}
										>
											{t("scheduling.detail.noStaff")}
										</td>
									</tr>
								)}
								{open &&
									group.staff.map((person) => {
										const week = person.shifts.filter((shift) =>
											days.includes(shift.date)
										);
										return (
											<tr
												key={person.staffId}
												className="border-t border-neutral-400"
											>
												<th
													className="bg-neutral-50 px-3 py-3 text-left font-normal"
													scope="row"
												>
													<span className="flex items-center gap-3">
														<Avatar
															className="size-10! text-base!"
															name={person.name}
														/>
														<span className="min-w-0">
															<span className="block truncate text-xs font-semibold">
																{person.name}
															</span>
															<span className="mt-0.5 block truncate text-[0.625rem]">
																{person.jobTitle}
															</span>
															<span className="block text-[0.625rem]">
																{t("scheduling.detail.hours", {
																	count: rosteredHours(week),
																})}
															</span>
														</span>
													</span>
												</th>
												{days.map((date) => {
													const shift = week.find((item) => item.date === date);
													return (
														<td key={date} className="p-3 align-middle">
															{shift ? (
																<RosterShift
																	selected={shift.shiftId === selectedShiftId}
																	shift={shift}
																	label={t("scheduling.detail.shiftLabel", {
																		name: person.name,
																		day: weekday.format(dayjs(date).toDate()),
																		time: formatTimeRange(
																			{
																				startTime: shift.start,
																				endTime: shift.end,
																			},
																			t
																		),
																	})}
																	timeRange={formatTimeRange(
																		{
																			startTime: shift.start,
																			endTime: shift.end,
																		},
																		t
																	)}
																	onSelect={() => {
																		onShiftSelect(person, shift);
																	}}
																/>
															) : (
																<span
																	className={joinClassNames(
																		"flex h-14 items-center justify-center rounded border text-xs font-medium",
																		rosterLooks.off
																	)}
																>
																	{t("scheduling.detail.off")}
																</span>
															)}
														</td>
													);
												})}
											</tr>
										);
									})}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
