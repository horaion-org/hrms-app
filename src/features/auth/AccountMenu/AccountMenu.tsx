import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";

export type AccountMenuProps = {
	/** The signed-in person's display name, shown as the avatar's initials. */
	displayName: string;
};

const itemClasses =
	"block px-4 py-3 text-sm text-neutral-900 outline-none data-focus:bg-neutral-100";

/** The header avatar: the signed-in person's own pages. */
export const AccountMenu = ({
	displayName,
}: AccountMenuProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Menu as="div" className="ml-3 inline-flex">
			<MenuButton
				aria-label={t("shell.accountMenu")}
				className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
			>
				<Avatar name={displayName} />
			</MenuButton>
			<MenuItems
				anchor="bottom end"
				className="z-10 w-max min-w-48 divide-y divide-neutral-400 overflow-hidden rounded-lg border border-neutral-400 bg-white shadow-md outline-none [--anchor-gap:4px]"
			>
				<MenuItem>
					<Link className={itemClasses} to="/me/profile">
						{t("shell.myProfile")}
					</Link>
				</MenuItem>
				<MenuItem>
					<Link className={itemClasses} to="/me/password">
						{t("shell.changePassword")}
					</Link>
				</MenuItem>
			</MenuItems>
		</Menu>
	);
};
