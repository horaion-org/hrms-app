/**
 * Stable ids for a row's label, helper and error. Native controls use `htmlFor`;
 * other controls (such as Select) take `aria-labelledby={labelId}`.
 * Set the control's `aria-describedby` to `errorId` when an error is shown,
 * otherwise `hintId` when a hint is shown, and undefined when neither is shown.
 * The visual counter is deliberately excluded from the description.
 */
export const formRowIds = (
	htmlFor: string
): { labelId: string; hintId: string; errorId: string } => ({
	labelId: `${htmlFor}-label`,
	hintId: `${htmlFor}-hint`,
	errorId: `${htmlFor}-error`,
});
