import type { TFunction } from "i18next";
import { z } from "zod";
import { todayDate, type IsoDate } from "@/components/forms/Calendar";
import {
	companyMemberSchema,
	type CompanyMember,
} from "@/features/organisation/api";
import { EMPLOYMENT_TYPES, type EmploymentType } from "@/features/people/api";

/** The API's phone rule: "+", then 7 to 15 digits, the first not 0. */
export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

const key = "people.form";

/**
 * A person's profile as the form holds it. Optional fields are `""` (or
 * `null` for the manager) while empty; dates are ISO `YYYY-MM-DD`.
 */
export type ProfileFormValues = {
	displayName: string;
	dateOfBirth: string;
	/** E.164, or bare digits until a country code is chosen. */
	phone: string;
	email: string;
	employmentType: EmploymentType | "";
	hireDate: string;
	probationEndDate: string;
	jobTitleId: string;
	departmentId: string;
	/** The person's manager; the API calls it who they report to. */
	reportsTo: CompanyMember | null;
	/** A system role to assign in the Department once the person is added. */
	accessRoleId: string;
};

/**
 * Mirrors the API's rules for a person's profile so most mistakes are caught
 * before a request. `today` decides which dates are in the past.
 */
export const profileFormSchema = (
	t: TFunction,
	today: IsoDate = todayDate(Date.now())
): z.ZodType<ProfileFormValues, ProfileFormValues> => {
	const dates = z.object({
		hireDate: z.string(),
		probationEndDate: z.string(),
	});
	return z
		.object({
			displayName: z
				.string()
				.trim()
				.min(1, t(`${key}.fullNameRequired`))
				.max(255, t(`${key}.fullNameLength`)),
			dateOfBirth: z
				.string()
				.refine(
					(value) => value === "" || value < today,
					t(`${key}.dateOfBirthPast`)
				),
			phone: z
				.string()
				// Without a country, the field reports bare digits.
				.refine(
					(value) => value === "" || value.startsWith("+"),
					t(`${key}.phoneCountry`)
				)
				.refine(
					(value) =>
						value === "" || !value.startsWith("+") || E164_PATTERN.test(value),
					t(`${key}.phoneInvalid`)
				),
			email: z
				.string()
				.trim()
				.min(1, t(`${key}.emailRequired`))
				.max(320, t(`${key}.emailLength`))
				.pipe(z.email(t(`${key}.emailInvalid`))),
			employmentType: z.union([z.enum(EMPLOYMENT_TYPES), z.literal("")]),
			hireDate: z.string(),
			probationEndDate: z.string(),
			jobTitleId: z.string(),
			departmentId: z.string().min(1, t(`${key}.departmentRequired`)),
			reportsTo: companyMemberSchema.nullable(),
			accessRoleId: z.string(),
		})
		.refine(
			({ hireDate, probationEndDate }) =>
				hireDate === "" ||
				probationEndDate === "" ||
				probationEndDate >= hireDate,
			{
				path: ["probationEndDate"],
				message: t(`${key}.probationBeforeHire`),
				// Checked even while another field is wrong, so every mistake shows at once.
				when: (payload) => dates.safeParse(payload.value).success,
			}
		);
};

/** A profile with nothing filled in yet. */
export const EMPTY_PROFILE: ProfileFormValues = {
	displayName: "",
	dateOfBirth: "",
	phone: "",
	email: "",
	employmentType: "",
	hireDate: "",
	probationEndDate: "",
	jobTitleId: "",
	departmentId: "",
	reportsTo: null,
	accessRoleId: "",
};
