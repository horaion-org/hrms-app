import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { formatDate } from "@/components/forms/Calendar";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import {
	DescriptionList,
	type DescriptionListItem,
} from "@/components/ui/DescriptionList";
import {
	OrganisationIcon,
	PhoneIcon,
	RoleIcon,
	UserIcon,
} from "@/components/ui/Icon";
import type { PlaceAccessText } from "@/features/accessRoles/accessSummary";
import type { MemberProfileDetail } from "@/features/people/api";
import { PROFILE_FIELD_WIDTH } from "@/features/people/profileLayout";

export type ProfileDetailsProps = {
	profile: MemberProfileDetail;
	/** The system roles they hold, in words; the row is left out when not given. */
	systemRoles?: string;
	/** Their employment terms (`EmploymentTermsRow`); the row is left out when not given. */
	employmentTerms?: ReactNode;
	/**
	 * Where their system roles give them permissions, one row per place the
	 * reader can see, or why that isn't shown (loading, failed). The Access
	 * card is left out when not given.
	 */
	access?: ReadonlyArray<PlaceAccessText> | string;
	className?: string;
};

const key = "people.form";

// Plain text until hovered, like the People list's Contact links; on touch screens as tall as the copy button beside it.
const contactLinkClasses =
	"min-w-0 break-all text-neutral-900 underline-offset-4 hover:text-ink-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center";

/**
 * A person's profile, read-only, in the same four cards and rows as the
 * form that edits it, then what their system roles give them where.
 * Anything not set reads as a dash.
 */
export const ProfileDetails = ({
	profile,
	systemRoles,
	employmentTerms,
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
					value: profile.employmentType
						? t(`${key}.employmentTypes.${profile.employmentType}`)
						: notSet,
				},
				...(employmentTerms === undefined
					? []
					: [
							{ label: t("employmentTerms.row.label"), value: employmentTerms },
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
					icon={RoleIcon}
					title={t("organisation.accessRoles.access.title")}
				>
					<div className="flex flex-col gap-4">
						<p className="text-sm text-neutral-700">
							{t("organisation.accessRoles.access.note")}
						</p>
						{typeof access === "string" || access.length === 0 ? (
							<p className="text-base text-neutral-900">
								{typeof access === "string"
									? access
									: t("organisation.accessRoles.access.none")}
							</p>
						) : (
							<DescriptionList
								valueWidth={PROFILE_FIELD_WIDTH}
								items={access.map(({ place, lines }) => ({
									label: place,
									value: lines.map((line) => (
										<span key={line} className="block">
											{line}
										</span>
									)),
								}))}
							/>
						)}
					</div>
				</Card>
			)}
		</div>
	);
};
