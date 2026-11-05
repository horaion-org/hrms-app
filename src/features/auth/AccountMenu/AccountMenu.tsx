import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";

export type AccountMenuProps = {
	/** The signed-in person's display name, shown as the avatar's initials. */
	displayName: string;
};

/** The header avatar: the signed-in person's own pages. */
export const AccountMenu = ({
	displayName,
}: AccountMenuProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<OverflowMenu
			className="ml-3"
			label={t("shell.accountMenu")}
			name={displayName}
			variant="avatar"
		>
			<OverflowMenuItem to="/me/profile">
				{t("shell.myProfile")}
			</OverflowMenuItem>
			<OverflowMenuItem to="/me/password">
				{t("shell.changePassword")}
			</OverflowMenuItem>
		</OverflowMenu>
	);
};
