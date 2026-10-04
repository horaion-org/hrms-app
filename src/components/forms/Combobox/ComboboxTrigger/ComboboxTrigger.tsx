import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";

export type ComboboxTriggerProps = ComponentPropsWithRef<"button"> & {
	listId: string;
	labelledBy?: string;
};

/** Headless UI normally tabs into its input; this panel-search variant tabs into its trigger. */
export const ComboboxTrigger = ({
	listId,
	labelledBy,
	...props
}: ComboboxTriggerProps): FunctionComponent => (
	<button
		{...props}
		aria-controls={props["aria-expanded"] ? listId : undefined}
		aria-labelledby={labelledBy}
		tabIndex={0}
		type="button"
	/>
);
