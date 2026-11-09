import type { FunctionComponent } from "@/common/types";
import { EmailIcon, PhoneIcon } from "@/components/ui/Icon";

export type ContactCellProps = {
	/** E.164, shown as the API sends it; nothing is shown without one. */
	phone: string | null;
	email: string;
};

// Styled as the name link in `PersonCell`; 24 px tall on touch screens (WCAG 2.5.8), so the two lines stay apart.
const linkClasses =
	"flex min-w-0 items-center gap-2 text-neutral-900 underline-offset-4 hover:text-ink-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500 pointer-coarse:min-h-6 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-neutral-800";

/** How to reach a person: phone above email, each with its icon, a tap away from calling or writing. */
export const ContactCell = ({
	phone,
	email,
}: ContactCellProps): FunctionComponent => (
	<div className="flex min-w-0 flex-col gap-1">
		{phone && (
			<a className={linkClasses} href={`tel:${phone}`}>
				<PhoneIcon />
				<span className="truncate">{phone}</span>
			</a>
		)}
		<a className={linkClasses} href={`mailto:${email}`}>
			<EmailIcon />
			<span className="truncate" title={email}>
				{email}
			</span>
		</a>
	</div>
);
