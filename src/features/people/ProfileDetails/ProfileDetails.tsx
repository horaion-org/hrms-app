import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { formatDate } from "@/components/forms/Calendar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import {
	DescriptionList,
	type DescriptionListItem,
} from "@/components/ui/DescriptionList";
import {
	OrganisationIcon,
	PermissionsIcon,
	PhoneIcon,
	RoleIcon,
	UserIcon,
} from "@/components/ui/Icon";
import {
	groupSameAccess,
	type PlaceAccessText,
} from "@/features/organisation/accessSummary";
import type { MemberProfileDetail } from "@/features/people/api";
import { PROFILE_FIELD_WIDTH } from "@/features/people/profileLayout";

export type ProfileDetailsProps = {
	profile: MemberProfileDetail;
	/** The system roles they hold, in words; the row is left out when not given. */
	systemRoles?: string;
	/** Their employment terms (`EmploymentTermsRow`); the row is left out when not given. */
	employmentTerms?: ReactNode;
	/** Their time off earned (`TimeOffEarnedRow`); the row is left out when not given. */
	timeOffEarned?: ReactNode;
	/**
	 * Where their system roles give them permissions, one row per place the
	 * reader can see, or why that isn't shown (loading, failed). The Access
	 * card is left out when not given.
	 */
	access?: ReadonlyArray<PlaceAccessText> | string;
	className?: string;
};

const key = "people.form";

/**
 * The Employment type row: full-time or part-time from the terms, with a
 * Contract or Intern label beside it when set, e.g. "Part-time [From the
 * terms] · Contract". From an API before that, the stored type as it was.
 */
const employmentTypeValue = (
	profile: MemberProfileDetail,
	t: TFunction,
	notSet: string
): ReactNode => {
	const stored =
		profile.employmentType &&
		t(`${key}.employmentTypes.${profile.employmentType}`);
	if (profile.partTime === undefined || profile.partTime === null)
		return stored || notSet;
	const label =
		profile.employmentType === "CONTRACT" || profile.employmentType === "INTERN"
			? stored
			: undefined;
	return (
		<span className="inline-flex flex-wrap items-center gap-2">
			{t(
				`${key}.employmentTypes.${profile.partTime ? "PART_TIME" : "FULL_TIME"}`
			)}
			<Badge>{t(`${key}.employmentTypeFromTerms`)}</Badge>
			{label && <span>· {label}</span>}
		</span>
	);
};
const accessKey = "organisation.accessRoles.access";

// Plain text until hovered, like the People list's Contact links; on touch screens as tall as the copy button beside it.
const contactLinkClasses =
	"min-w-0 break-all text-neutral-900 underline-offset-4 hover:text-ink-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center";

/**
 * A person's profile, read-only, in the same four cards and rows as the
 * form that edits it, then what their system roles give them where: one
 * entry per place, or per set of places given the same roles and access,
 * naming the roles and showing what they allow as badges, as
 * `PermissionSummary` does. Anything not set reads as a dash.
 */
export const ProfileDetails = ({
	profile,
	systemRoles,
	employmentTerms,
	timeOffEarned,
	access,
	className,
}: ProfileDetailsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const notSet = t("people.notSet");
	const date = (value: string | null): string =>
		value ? formatDate(value, language) : notSet;
	/** A value that calls or writes when tapped (`scheme` is `tel:` or `mailto:`), with a button that copies it, or a dash. */
	const contactValue = (
		value: string | null,
		scheme: "tel:" | "mailto:",
		label: string
	): FunctionComponent =>
		value ? (
			<span className="flex min-w-0 items-center gap-1">
				<a className={contactLinkClasses} href={`${scheme}${value}`}>
					{value}
				</a>
				<CopyButton label={label} value={value} />
			</span>
		) : (
			<>{notSet}</>
		);
	const card = (
		title: string,
		icon: typeof UserIcon,
		items: Array<DescriptionListItem>
	): FunctionComponent => (
		<Card icon={icon} title={title}>
			<DescriptionList items={items} valueWidth={PROFILE_FIELD_WIDTH} />
		</Card>
	);

	return (
		<div className={joinClassNames("grid gap-6 xl:grid-cols-2", className)}>
			{card(t(`${key}.personal`), UserIcon, [
				{ label: t(`${key}.fullName`), value: profile.displayName },
				{ label: t(`${key}.dateOfBirth`), value: date(profile.dateOfBirth) },
				{ label: t(`${key}.employeeId`), value: profile.employeeCode },
			])}
			{card(t(`${key}.contact`), PhoneIcon, [
				{
					label: t(`${key}.phone`),
					value: contactValue(
						profile.phone,
						"tel:",
						t("people.profile.copyPhone")
					),
				},
				{
					label: t(`${key}.email`),
					value: contactValue(
						profile.email,
						"mailto:",
						t("people.profile.copyEmail")
					),
				},
			])}
			{card(t(`${key}.employment`), RoleIcon, [
				{
					label: t(`${key}.employmentType`),
					value: employmentTypeValue(profile, t, notSet),
				},
				...(employmentTerms === undefined
					? []
					: [
							{ label: t("employmentTerms.row.label"), value: employmentTerms },
						]),
				...(timeOffEarned === undefined
					? []
					: [
							{
								label: t("employmentTerms.timeOff.label"),
								value: timeOffEarned,
							},
						]),
				{ label: t(`${key}.hireDate`), value: date(profile.hireDate) },
				{
					label: t(`${key}.probationEndDate`),
					value: date(profile.probationEndDate),
				},
				{
					label: t(`${key}.employmentStatus`),
					value: t(`organisation.status.${profile.status}`),
				},
			])}
			{card(t(`${key}.placement`), OrganisationIcon, [
				{
					label: t(`${key}.jobTitle`),
					value: profile.jobTitleName ?? notSet,
				},
				{
					label: t(`${key}.department`),
					value: profile.departmentName ?? notSet,
				},
				{
					label: t(`${key}.manager`),
					value: profile.reportsTo?.displayName ?? notSet,
				},
				...(systemRoles === undefined
					? []
					: [{ label: t(`${key}.systemRole`), value: systemRoles }]),
			])}
			{access !== undefined && (
				<Card
					className="xl:col-span-2"
					icon={PermissionsIcon}
					title={t(`${accessKey}.title`)}
				>
					<div className="flex flex-col gap-4">
						<p className="text-sm text-neutral-700">{t(`${accessKey}.note`)}</p>
						{typeof access === "string" ? (
							<p className="text-base text-neutral-900">{access}</p>
						) : access.length === 0 ? (
							<div className="flex flex-col gap-1">
								<p className="text-base text-neutral-900">
									{t(`${accessKey}.none`)}
								</p>
								<p className="text-sm text-neutral-700">
									{t("organisation.accessRoles.baseline")}
								</p>
							</div>
						) : (
							<ul className="flex flex-col divide-y divide-neutral-300">
								{groupSameAccess(access).map(({ places, roles, lines }) => (
									<li
										key={places.join()}
										className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6"
									>
										<div className="flex min-w-0 flex-col gap-0.5 sm:w-2/5 sm:shrink-0">
											<span className="font-semibold text-neutral-900">
												{t(`${accessKey}.places`, { places })}
											</span>
											<span className="text-sm text-neutral-700">
												{t(`${accessKey}.through`, { roles })}
											</span>
										</div>
										<div className="flex min-w-0 flex-wrap gap-2">
											{lines.map((line) => (
												<Badge key={line}>{line}</Badge>
											))}
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</Card>
			)}
		</div>
	);
};
