import { useQuery } from "@tanstack/react-query";
import type { AriaAttributes, Ref } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { InputStatus } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { workspaceQuery } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { departmentChoices } from "@/features/workspace/unitChoices";

export type DepartmentSelectorProps = {
	companyId: string;
	/** A Department is offered when any of these is effective at it (its node already carries grants made above it). */
	keys: ReadonlyArray<PermissionKey>;
	/** The chosen Department's id; empty or undefined for none. */
	value?: string;
	onChange: (departmentId: string) => void;
	placeholder: string;
	/** Offers only ACTIVE Departments under ACTIVE Branches. */
	activeOnly?: boolean;
	/** Offers an explicit empty choice for forms where Department is optional. */
	emptyLabel?: string;
	disabled?: boolean;
	status?: InputStatus;
	name?: string;
	ref?: Ref<HTMLButtonElement>;
	className?: string;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: AriaAttributes["aria-invalid"];
};

/**
 * One Select of the Departments a form may place something in, offered from
 * the caller's workspace rather than the Department list, so a page never
 * depends on `department:read`. Each is named with its Branch, because
 * Department names repeat across Branches, and they are sorted by country,
 * Branch, then name.
 *
 * Nothing is chosen for the caller. While the workspace loads the Select is
 * disabled and shows the placeholder; when nothing is offered it stays
 * enabled with no options, and the page says why.
 *
 * Forms that create or assign pass `activeOnly`; pages that read do not,
 * since an inactive Department may still hold history.
 */
export const DepartmentSelector = ({
	companyId,
	keys,
	value,
	onChange,
	disabled = false,
	activeOnly = false,
	emptyLabel,
	...selectProps
}: DepartmentSelectorProps): FunctionComponent => {
	const { t } = useTranslation();
	const { data } = useQuery({ ...workspaceQuery, retry });
	const options = data
		? departmentChoices(data, companyId, keys, { activeOnly }).map(
				(choice) => ({
					value: choice.departmentId,
					label: placeOf(
						{ branchName: choice.branchName, departmentName: choice.name },
						t
					),
				})
			)
		: [];
	return (
		<Select
			{...selectProps}
			disabled={disabled || !data}
			value={value}
			options={
				data && emptyLabel
					? [{ value: "", label: emptyLabel }, ...options]
					: options
			}
			onChange={onChange}
		/>
	);
};
