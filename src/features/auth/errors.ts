import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiProblemError } from "@/common/problem";

/** Turns an API field name (`display_name`) into its form field (`displayName`). */
const toFormField = (field: string): string =>
	field.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/**
 * Puts a failed request's message on the form: the API's per-field errors on
 * their fields, a known error code on the field it concerns, and anything else
 * on `fallbackField`. Messages from the API and Cognito are written for people,
 * so they are shown as they come.
 */
export const showFailure = <TValues extends FieldValues>(
	cause: unknown,
	setError: UseFormSetError<TValues>,
	options: {
		fields: ReadonlyArray<Path<TValues>>;
		fallbackField: Path<TValues>;
		fallbackMessage: string;
		errorCodeFields?: Partial<Record<string, Path<TValues>>>;
	}
): void => {
	const {
		fields,
		fallbackField,
		fallbackMessage,
		errorCodeFields = {},
	} = options;
	const isField = (name: string): name is Path<TValues> =>
		(fields as ReadonlyArray<string>).includes(name);

	if (cause instanceof ApiProblemError) {
		const fieldErrors = cause.fieldErrors.filter((fieldError) =>
			isField(toFormField(fieldError.field))
		);

		if (fieldErrors.length > 0) {
			for (const fieldError of fieldErrors) {
				setError(toFormField(fieldError.field) as Path<TValues>, {
					message: fieldError.message,
				});
			}

			return;
		}

		const codeField =
			cause.errorCode === undefined
				? undefined
				: errorCodeFields[cause.errorCode];
		setError(codeField ?? fallbackField, { message: cause.message });

		return;
	}

	setError(fallbackField, {
		message: cause instanceof Error ? cause.message : fallbackMessage,
	});
};
