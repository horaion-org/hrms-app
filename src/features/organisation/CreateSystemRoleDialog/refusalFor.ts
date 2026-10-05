import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	name: string,
	t: TFunction
): Refusal<"name" | "permissions"> => {
	const key = "organisation.accessRoles.createDialog";
	return mapRefusal<"name" | "permissions">(error, {
		codes: {
			"409 ACCESS_ROLE_NAME_CONFLICT": {
				field: "name",
				message: t(`${key}.nameConflict`, { name: name.trim() }),
			},
		},
		// The app's catalogue copy has drifted from the API's.
		alerts: {
			"400 INVALID_ACCESS_ROLE_PERMISSIONS": t(`${key}.permissionsRejected`),
		},
		fieldErrors: {
			name: { field: "name", message: t(`${key}.nameRejected`) },
		},
		// A 403 here may be the subset rule: a chosen permission the person no longer holds.
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};
