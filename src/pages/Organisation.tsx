import { Link, type LinkProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ActivityItem } from "@/components/ui/ActivityItem";
import { StatCard } from "@/components/ui/StatCard";
import { describeActivity, timeAgo } from "@/features/organisation/activity";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import {
	useOrganisationOverview,
	type Visible,
} from "@/features/organisation/useOrganisationOverview";

export const Organisation = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t, i18n } = useTranslation();
	const overview = useOrganisationOverview(companyId);
	const numbers = new Intl.NumberFormat(i18n.language);
	const figure = (stat: Visible<{ count: number | undefined }>): string =>
		!stat.hidden && stat.count !== undefined
			? numbers.format(stat.count)
			: t("organisation.unknownCount");
	const now = new Date();
	const viewAll = (to: LinkProps["to"]): FunctionComponent => (
		<Link
			className="shrink-0 text-base font-semibold text-ink-blue-900 underline decoration-2 underline-offset-2 hover:text-ink-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
			to={to}
		>
			{t("organisation.viewAll")}
		</Link>
	);

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("organisation.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.subtitle")}
			</p>
			{overview.status === "error" && (
				<p className="mt-10 text-sm text-error-700" role="alert">
					{t("organisation.failed")}
				</p>
			)}
			{overview.status === "ready" && (
				<>
					<div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
						{!overview.branches.hidden && (
							<StatCard
								action={viewAll("/organisation/branches")}
								caption={t("organisation.branches.caption")}
								title={t("organisation.branches.title")}
								value={figure(overview.branches)}
							/>
						)}
						{!overview.departments.hidden && (
							<StatCard
								action={viewAll("/organisation/departments")}
								caption={t("organisation.departments.caption")}
								title={t("organisation.departments.title")}
								value={figure(overview.departments)}
							/>
						)}
						<StatCard
							action={viewAll("/organisation/job-titles")}
							caption={t("organisation.jobTitles.caption")}
							title={t("organisation.jobTitles.title")}
							value={t("organisation.unknownCount")}
						/>
						{!overview.accessRoles.hidden && (
							<StatCard
								action={viewAll("/organisation/system-roles")}
								caption={t("organisation.accessRoles.caption")}
								title={t("organisation.accessRoles.title")}
								value={figure(overview.accessRoles)}
							/>
						)}
					</div>
					{!overview.activity.hidden && (
						<section aria-labelledby="recent-activity" className="mt-12">
							<h2
								className="text-base text-ink-blue-600 uppercase"
								id="recent-activity"
							>
								{t("organisation.activity.title")}
							</h2>
							{overview.activity.failed && (
								<p className="mt-6 text-sm text-error-700" role="alert">
									{t("organisation.activity.failed")}
								</p>
							)}
							{overview.activity.events?.length === 0 && (
								<p className="mt-6 text-sm text-neutral-700">
									{t("organisation.activity.empty")}
								</p>
							)}
							{overview.activity.events !== undefined &&
								overview.activity.events.length > 0 && (
									<ul className="mt-6 flex flex-col gap-7">
										{overview.activity.events.map((event) => {
											const activity = describeActivity(event, t);
											if (!activity) return null;
											return (
												<li key={activity.id}>
													<ActivityItem
														icon={activity.icon}
														title={activity.title}
														details={[
															event.actorDisplayName &&
																t("organisation.activity.by", {
																	name: event.actorDisplayName,
																}),
															<time key="time" dateTime={event.occurredAt}>
																{timeAgo(
																	event.occurredAt,
																	now,
																	i18n.language
																) ?? t("organisation.activity.justNow")}
															</time>,
														]}
													/>
												</li>
											);
										})}
									</ul>
								)}
						</section>
					)}
				</>
			)}
		</>
	);
};
