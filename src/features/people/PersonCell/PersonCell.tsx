import { Link } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";

export type PersonCellProps = {
	name: string;
	employeeCode: string;
	/** Given, the name links to the person's profile. */
	membershipId?: string;
};

/** A person in a table row: their initials, name and employee ID. */
export const PersonCell = ({
	name,
	employeeCode,
	membershipId,
}: PersonCellProps): FunctionComponent => (
	<div className="flex min-w-0 items-center gap-3">
		{/* The name beside it already says who this is. */}
		<Avatar aria-hidden className="size-10 text-base" name={name} />
		<div className="min-w-0">
			{membershipId ? (
				<Link
					className="block truncate text-sm text-neutral-900 underline-offset-4 hover:text-ink-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
					params={{ membershipId }}
					to="/people/$membershipId"
				>
					{name}
				</Link>
			) : (
				<p className="truncate text-sm text-neutral-900">{name}</p>
			)}
			<p className="truncate text-xs text-neutral-800">{employeeCode}</p>
		</div>
	</div>
);
