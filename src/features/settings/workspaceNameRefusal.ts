import type { TFunction } from "i18next";
import { mapRefusal } from "@/common/refusal";

/** Where a refused rename lands: on the name field, or as the form's alert. */
export type WorkspaceNameRefusal = { workspaceName?: string; message?: string };

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const workspaceNameRefusal = (
	error: unknown,
	t: TFunction
): WorkspaceNameRefusal => {
	const rejected = {
		field: "workspaceName",
		message: t("settings.general.validation.rejected"),
	} as const;
	const refusal = mapRefusal(error, {
		codes: { "400 INVALID_COMPANY_NAME": rejected },
		fieldErrors: { name: rejected },
		forbidden: t("settings.general.renameForbidden"),
		failed: t("settings.general.saveFailed"),
	});
	return {
		workspaceName: refusal.fields.workspaceName,
		message: refusal.message,
	};
};
