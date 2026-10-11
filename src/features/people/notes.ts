import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { z } from "zod";
import { ApiProblemError } from "@/common/problem";
import { formatDate } from "@/components/forms/Calendar";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";
import { NOTE_MAX_LENGTH, type MemberProfile } from "@/features/people/api";
import { personScope } from "@/features/people/profileEditAccess";
import { PROFILE_REFUSAL_CODES } from "@/features/people/profileRefusal";
import type { CanAt } from "@/features/workspace/scopes";

/**
 * What the person may do with a profile's notes, as the workspace says. Each
 * action is its own key, asked where the profile is (see `personScope`): at
 * its Department, or at the company for a profile without one. Reading notes
 * never implies deleting them, and profile access never implies notes.
 */
export type NoteAccess = {
	read: boolean;
	create: boolean;
	update: boolean;
	delete: boolean;
};

export const noteAccess = (
	profile: Pick<MemberProfile, "departmentId">,
	can: CanAt
): NoteAccess => {
	const scope = personScope(profile);
	return {
		read: can("member_note:read", scope),
		create: can("member_note:create", scope),
		update: can("member_note:update", scope),
		delete: can("member_note:delete", scope),
	};
};

/** A note as the dialog writes it: 1 to 1000 characters once trimmed, line breaks kept. */
export const noteFormSchema = (
	t: TFunction
): z.ZodObject<{ body: z.ZodString }> => {
	const key = "people.notes.dialog";
	return z.object({
		body: z
			.string()
			.trim()
			.min(1, t(`${key}.bodyRequired`))
			.max(NOTE_MAX_LENGTH, t(`${key}.bodyLength`)),
	});
};

export type NoteFormValues = z.infer<ReturnType<typeof noteFormSchema>>;

/** The refusals any change to a note shares, by `"<status> <errorCode>"`. */
const personAlerts = (t: TFunction): Record<string, string> => ({
	[PROFILE_REFUSAL_CODES.profileNotFound]: t("people.form.profileMissing"),
});

/** Whether a refusal means the note is gone, so the list should reload. */
export const isNoteGone = (error: unknown): boolean =>
	error instanceof ApiProblemError &&
	error.status === 404 &&
	error.errorCode === "MEMBER_NOTE_NOT_FOUND";

/**
 * Why adding or editing a note was refused: on the note's field, or as the
 * dialog's alert. Server codes select frontend-owned copy only.
 */
export const noteRefusal = (
	error: unknown,
	t: TFunction,
	editing: boolean
): Refusal<"body"> => {
	const key = "people.notes.dialog";
	const rejected = {
		field: "body",
		message: t(`${key}.bodyRejected`),
	} as const;
	return mapRefusal<"body">(error, {
		codes: { "400 INVALID_MEMBER_NOTE_BODY": rejected },
		alerts: {
			"404 MEMBER_NOTE_NOT_FOUND": t(`${key}.gone`),
			...personAlerts(t),
		},
		fieldErrors: { body: rejected },
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.addForbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.addFailed`),
	});
};

/** Why deleting a note was refused, for the dialog that asked. */
export const noteDeleteRefusal = (error: unknown, t: TFunction): string => {
	const key = "people.notes.delete";
	return (
		mapRefusal<never>(error, {
			alerts: {
				"404 MEMBER_NOTE_NOT_FOUND": t(`${key}.gone`),
				...personAlerts(t),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};

/** When a note was written, day first with the time, e.g. "16 May 2026, 22:36", in local time. */
export const noteWhen = (
	instant: string,
	language: string,
	t: TFunction
): string =>
	t("people.notes.when", {
		date: formatDate(instant, language),
		time: dayjs(instant).format("HH:mm"),
	});
