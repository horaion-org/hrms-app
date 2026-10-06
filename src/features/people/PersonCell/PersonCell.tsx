import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";

export type PersonCellProps = {
	name: string;
	employeeCode: string;
};

/** A person in a table row: their initials, name and employee ID. */
export const PersonCell = ({
	name,
	employeeCode,
}: PersonCellProps): FunctionComponent => (
	<div className="flex min-w-0 items-center gap-3">
		{/* The name beside it already says who this is. */}
		<Avatar aria-hidden className="size-10 text-base" name={name} />
		<div className="min-w-0">
			<p className="truncate text-sm text-neutral-900">{name}</p>
			<p className="truncate text-xs text-neutral-800">{employeeCode}</p>
		</div>
	</div>
);
