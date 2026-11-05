import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export type RunningPeopleImportProps = {
	/** The running import; without it, the link opens the People import page, which lists it. */
	importId: string | undefined;
	className?: string;
};

/** Why the organisation import waits: a people import is running, and where to follow it. */
export const RunningPeopleImport = ({
	importId,
	className,
}: RunningPeopleImportProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Callout className={className} role="alert" tone="warning">
			<span className="block">{t("organisation.import.check.running")}</span>
			<Button
				search={importId ? { import: importId } : {}}
				to="/settings/data/import-people"
				variant="textlink"
			>
				{t("organisation.import.check.viewRunning")}
			</Button>
		</Callout>
	);
};
