import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { ListView } from "@/features/organisation/listColumns";

export type ListProblemProps = {
	problem: NonNullable<ListView<never>["problem"]>;
};

/**
 * What an Organisation list page shows in place of its table when the list
 * can't be shown: the reason, and Try again when reading it again may help.
 */
export const ListProblem = ({ problem }: ListProblemProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="mt-8 flex flex-wrap items-center gap-4">
			<p
				className="text-sm text-neutral-700 data-alert:text-error-700"
				data-alert={problem.alert || undefined}
				role={problem.alert ? "alert" : undefined}
			>
				{problem.message}
			</p>
			{problem.retry && (
				<Button size="sm" variant="secondary" onClick={problem.retry}>
					{t("organisation.list.tryAgain")}
				</Button>
			)}
		</div>
	);
};
