import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";

export type ComboboxSearchProps = ComponentPropsWithRef<"input"> & {
	listId: string;
};

/** Keep the search outside the listbox, while linking it to the listbox inside the anchored panel. */
export const ComboboxSearch = ({
	listId,
	...props
}: ComboboxSearchProps): FunctionComponent => (
	<input {...props} aria-controls={listId} />
);
