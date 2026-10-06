import type { FunctionComponent } from "@/common/types";
import { EmailIcon, PhoneIcon } from "@/components/ui/Icon";

export type ContactCellProps = {
	/** E.164, shown as the API sends it; nothing is shown without one. */
	phone: string | null;
	email: string;
};

const lineClasses =
	"flex min-w-0 items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-neutral-800";

/** How to reach a person: phone above email, each with its icon. */
export const ContactCell = ({
	phone,
	email,
}: ContactCellProps): FunctionComponent => (
	<div className="flex min-w-0 flex-col gap-1">
		{phone && (
			<span className={lineClasses}>
				<PhoneIcon />
				<span className="truncate">{phone}</span>
			</span>
		)}
		<span className={lineClasses}>
			<EmailIcon />
			<span className="truncate" title={email}>
				{email}
			</span>
		</span>
	</div>
);
