import { useTranslation } from "react-i18next";
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
import type { MemberProfileDetail } from "@/features/people/api";
import { PROFILE_FIELD_WIDTH } from "@/features/people/profileLayout";

export type ProfileDetailsProps = {
	profile: MemberProfileDetail;
	/** The system roles they hold, in words; the row is left out when not given. */
	systemRoles?: string;
	className?: string;
};

const key = "people.form";

/**
 * A person's profile, read-only, in the same four cards and rows as the
 * form that edits it. Anything not set reads as a dash.
 */
export const ProfileDetails = ({
	profile,
	systemRoles,
	className,
}: ProfileDetailsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
	const notSet = t("people.notSet");
	const date = (value: string | null): string =>
		value ? formatDate(value, language) : notSet;
	/** A value with a button that copies it, or a dash. */
	const copyable = (value: string | null, label: string): FunctionComponent =>
		value ? (
			<span className="flex min-w-0 items-center gap-1">
				<span className="min-w-0 break-all">{value}</span>
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
					value: copyable(profile.phone, t("people.profile.copyPhone")),
				},
				{
					label: t(`${key}.email`),
					value: copyable(profile.email, t("people.profile.copyEmail")),
				},
			])}
			{card(t(`${key}.employment`), RoleIcon, [
				{
					label: t(`${key}.employmentType`),
					value: profile.employmentType
						? t(`${key}.employmentTypes.${profile.employmentType}`)
						: notSet,
				},
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
		</div>
	);
};
