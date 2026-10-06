import { useState } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	AiIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	SchedulingIcon,
} from "@/components/ui/Icon";
import {
	TIME_BLOCK_GROUPS,
	demandLevel,
	slotsOf,
	type DemandLevel,
	type ShiftRole,
	type TimeBlockDemand,
} from "@/features/scheduling/scheduleDraft";

export type TimeBlockGridProps = {
	/** One column per job role. */
	roles: Array<Pick<ShiftRole, "roleId" | "name">>;
	demand: TimeBlockDemand;
	onDemandChange: (slotStart: string, roleId: string, staff: number) => void;
	/** Fills every slot from the staff the shifts allocate. */
	onAutoFill: () => void;
	/** The schedule's week, e.g. "13 – 19 Apr 2026". */
	periodLabel: string;
	className?: string;
};

const MAX_STAFF = 99;

const levelClasses: Record<DemandLevel, string> = {
	none: "border-neutral-400 bg-white",
	low: "border-success-200 bg-success-50",
	medium: "border-warning-200 bg-warning-50",
	high: "border-error-200 bg-error-50",
};

const LEGEND = ["low", "medium", "high"] as const;

const headerCellClasses =
	"h-16 border-l border-neutral-400 bg-neutral-200 px-3 py-2 text-left align-top text-sm font-bold text-neutral-900 first:border-l-0";

/**
 * Staff wanted in each 30-minute slot of the day, per job role, shaded from
 * low to high. Slots are grouped by part of the day; each group collapses.
 */
export const TimeBlockGrid = ({
	roles,
	demand,
	onDemandChange,
	onAutoFill,
	periodLabel,
	className,
}: TimeBlockGridProps): FunctionComponent => {
	const { t } = useTranslation();
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
	const toggle = (groupId: string): void => {
		setCollapsed((current) => {
			const next = new Set(current);
			if (!next.delete(groupId)) next.add(groupId);
			return next;
		});
	};

	return (
		<div className={className}>
			<div className="flex flex-wrap items-center gap-4">
				<span className="inline-flex h-12 items-center gap-3 rounded-full bg-ink-blue-50 px-6 text-sm font-medium text-ink-blue-900 [&_svg]:size-5.5">
					<SchedulingIcon />
					{periodLabel}
				</span>
				<Button
					leadingIcon={<AiIcon />}
					size="sm"
					variant="secondary"
					onClick={onAutoFill}
				>
					{t("scheduling.forecast.autoFill")}
				</Button>
				<ul className="flex flex-wrap gap-4 text-xs font-medium text-neutral-800 sm:ml-auto">
					{LEGEND.map((level) => (
						<li key={level} className="flex items-center gap-2">
							<span
								aria-hidden="true"
								className={joinClassNames(
									"size-2.5 rounded-xs border",
									levelClasses[level]
								)}
							/>
							{t(`scheduling.forecast.levels.${level}`)}
						</li>
					))}
				</ul>
			</div>
			<div className="mt-7 overflow-x-auto rounded-lg border border-neutral-400">
				<table
					aria-label={t("scheduling.forecast.blocksLabel")}
					className="w-full min-w-270 table-fixed border-collapse"
				>
					<thead>
						<tr>
							<th
								className={joinClassNames(headerCellClasses, "w-50")}
								scope="col"
							>
								{t("scheduling.forecast.time")}
							</th>
							{roles.map((role) => (
								<th key={role.roleId} className={headerCellClasses} scope="col">
									{role.name}
								</th>
							))}
						</tr>
					</thead>
					{TIME_BLOCK_GROUPS.map((group) => {
						const open = !collapsed.has(group.groupId);
						const range = t("scheduling.timeRange", {
							start: group.start,
							end: group.end,
						});
						return (
							<tbody key={group.groupId}>
								<tr className="border-t border-neutral-400">
									<th
										className="bg-neutral-100 px-3 py-2 text-left"
										colSpan={roles.length + 1}
										scope="rowgroup"
									>
										<button
											aria-expanded={open}
											className="flex items-center gap-3 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
											type="button"
											onClick={() => {
												toggle(group.groupId);
											}}
										>
											{open ? (
												<ChevronUpIcon className="size-4 shrink-0" />
											) : (
												<ChevronDownIcon className="size-4 shrink-0" />
											)}
											<span className="flex flex-col">
												<span className="text-sm font-bold text-neutral-900">
													{t(`scheduling.forecast.groups.${group.groupId}`)}
												</span>
												<span className="text-xs font-medium text-neutral-800">
													{range}
												</span>
											</span>
										</button>
									</th>
								</tr>
								{open &&
									slotsOf(group).map((slot) => {
										const slotLabel = t("scheduling.timeRange", slot);
										return (
											<tr
												key={slot.start}
												className="border-t border-neutral-400"
											>
												<th
													className="bg-white px-3 py-2 pl-10 text-left text-xs font-medium text-neutral-900"
													scope="row"
												>
													{slotLabel}
												</th>
												{roles.map((role) => {
													const staff = demand[slot.start]?.[role.roleId] ?? 0;
													return (
														<td
															key={role.roleId}
															className="border-l border-neutral-400 bg-white p-1.5"
														>
															<input
																inputMode="numeric"
																max={MAX_STAFF}
																min={0}
																type="number"
																value={staff}
																aria-label={t(
																	"scheduling.forecast.demandCell",
																	{
																		role: role.name,
																		slot: slotLabel,
																	}
																)}
																className={joinClassNames(
																	"h-9 w-full rounded-md border px-2 text-center text-sm font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink-blue-500",
																	levelClasses[demandLevel(staff)]
																)}
																onChange={(event) => {
																	const next = Number.parseInt(
																		event.target.value,
																		10
																	);
																	onDemandChange(
																		slot.start,
																		role.roleId,
																		Number.isNaN(next)
																			? 0
																			: Math.min(MAX_STAFF, Math.max(0, next))
																	);
																}}
															/>
														</td>
													);
												})}
											</tr>
										);
									})}
							</tbody>
						);
					})}
				</table>
			</div>
			<p className="mt-5 text-xs font-medium text-neutral-800">
				{t("scheduling.forecast.scrollHint")}
			</p>
		</div>
	);
};
