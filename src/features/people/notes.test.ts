import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	isNoteGone,
	noteAccess,
	noteDeleteRefusal,
	noteFormSchema,
	noteRefusal,
	noteWhen,
} from "@/features/people/notes";

const t = authTestI18n.t;
const filed = { departmentId: "d-1" };
const unfiled = { departmentId: null };
/** A `can` granting `keys` at these departments; "" is the company. */
const grantedAt =
	(keys: Array<string>, ...scopes: Array<string>) =>
	(permission: string, scopeId = ""): boolean =>
		keys.includes(permission) &&
		(scopes.includes("") || scopes.includes(scopeId));
const problem = (
	status: number,
	errorCode?: string,
	fields: Array<string> = []
): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: fields.map((field) => ({ field, message: "API says no" })),
		reason: "http",
	});

describe("note access", () => {
	it("asks each key at the person's department, where a company grant counts", () => {
		expect(
			noteAccess(
				filed,
				grantedAt(["member_note:read", "member_note:update"], "d-1")
			)
		).toEqual({ read: true, create: false, update: true, delete: false });
		expect(noteAccess(filed, grantedAt(["member_note:read"], "")).read).toBe(
			true
		);
		expect(noteAccess(filed, grantedAt(["member_note:read"], "d-2")).read).toBe(
			false
		);
	});

	it("asks each key at the company for a person without a department", () => {
		const all = [
			"member_note:read",
			"member_note:create",
			"member_note:update",
			"member_note:delete",
		];
		expect(noteAccess(unfiled, grantedAt(all, ""))).toEqual({
			read: true,
			create: true,
			update: true,
			delete: true,
		});
		expect(noteAccess(unfiled, grantedAt(all, "d-1"))).toEqual({
			read: false,
			create: false,
			update: false,
			delete: false,
		});
	});
});

describe("note form", () => {
	const schema = noteFormSchema(t);

	it("trims a note and keeps its line breaks", () => {
		expect(schema.parse({ body: "  One\nTwo  " })).toEqual({
			body: "One\nTwo",
		});
	});

	it.each([
		["   ", "Enter a note."],
		["a".repeat(1001), "Use 1,000 characters or fewer."],
	])("refuses %j", (body, message) => {
		expect(schema.safeParse({ body }).error?.issues[0]?.message).toBe(message);
	});
});

describe("note refusals", () => {
	it("places a rejected note on its field", () => {
		expect(
			noteRefusal(problem(400, undefined, ["body"]), t, false).fields
		).toEqual({ body: "Check the note and try again." });
		expect(
			noteRefusal(problem(400, "INVALID_MEMBER_NOTE_BODY"), t, true).fields
		).toEqual({ body: "Check the note and try again." });
	});

	it.each([
		[
			problem(404, "MEMBER_NOTE_NOT_FOUND"),
			true,
			"This note no longer exists.",
		],
		[
			problem(404, "MEMBER_PROFILE_NOT_FOUND"),
			false,
			"This person is no longer available.",
		],
		[
			problem(409, "MEMBER_PROFILE_MOVED"),
			false,
			"They were moved to another department while you were working. Reload the page and try again.",
		],
		[
			problem(403, "AUTHORIZATION_DENIED"),
			false,
			"You no longer have permission to add notes about this person.",
		],
		[
			problem(403, "AUTHORIZATION_DENIED"),
			true,
			"You no longer have permission to edit this note.",
		],
		[problem(500), true, "We couldn’t save the note. Try again."],
	])(
		"explains %s as the dialog's alert (editing: %s)",
		(error, editing, text) => {
			expect(noteRefusal(error, t, editing)).toEqual({
				fields: {},
				message: text,
				refreshMembers: false,
			});
		}
	);

	it("explains a refused delete, and knows when the note is gone", () => {
		const gone = problem(404, "MEMBER_NOTE_NOT_FOUND");
		expect(noteDeleteRefusal(gone, t)).toBe("This note was already deleted.");
		expect(noteDeleteRefusal(problem(403), t)).toBe(
			"You no longer have permission to delete this note."
		);
		expect(noteDeleteRefusal(new Error("offline"), t)).toBe(
			"We couldn’t delete the note. Try again."
		);
		expect(isNoteGone(gone)).toBe(true);
		expect(isNoteGone(problem(404, "MEMBER_PROFILE_NOT_FOUND"))).toBe(false);
	});
});

describe("note time", () => {
	it("is day first with the local time", () => {
		const instant = new Date(2026, 4, 6, 9, 5).toISOString();
		expect(noteWhen(instant, "en", t)).toBe("6 May 2026, 09:05");
	});
});
