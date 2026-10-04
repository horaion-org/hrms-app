/**
 * The ids FormRow gives its label and error message for a control with id
 * `htmlFor`. A native control is labelled by the label's `htmlFor`; a control
 * that is not (such as Select) takes `aria-labelledby={labelId}`. Pass
 * `errorId` as the control's `aria-describedby` while the row shows an error.
 */
export const formRowIds = (
	htmlFor: string
): { labelId: string; errorId: string } => ({
	labelId: `${htmlFor}-label`,
	errorId: `${htmlFor}-error`,
});
