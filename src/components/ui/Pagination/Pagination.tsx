import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

export type PaginationProps = {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
};

export const Pagination = ({
	page,
	pageSize,
	total,
	onPageChange,
}: PaginationProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const lastPage = Math.max(1, Math.ceil(total / pageSize));
	const current = Math.min(Math.max(1, page), lastPage);
	const numbers = new Intl.NumberFormat(i18n.language);
	return (
		<nav
			aria-label={t("pagination.label")}
			className="mt-8 flex items-center justify-between gap-4 text-xs text-neutral-800"
		>
			<p aria-live="polite">
				{t("pagination.entries", {
					start: numbers.format(total === 0 ? 0 : (current - 1) * pageSize + 1),
					end: numbers.format(Math.min(current * pageSize, total)),
					total: numbers.format(total),
				})}
			</p>
			<div className="flex items-center gap-2">
				<Button
					aria-label={t("pagination.previousPage")}
					disabled={current <= 1}
					variant="icon"
					onClick={() => {
						onPageChange(current - 1);
					}}
				>
					<ChevronLeftIcon />
				</Button>
				<span
					aria-current="page"
					aria-label={t("pagination.page", { page: current, total: lastPage })}
					className="flex size-11 items-center justify-center rounded-lg border border-neutral-400 text-sm font-semibold"
				>
					{numbers.format(current)}
				</span>
				<Button
					aria-label={t("pagination.nextPage")}
					disabled={current >= lastPage}
					variant="icon"
					onClick={() => {
						onPageChange(current + 1);
					}}
				>
					<ChevronRightIcon />
				</Button>
			</div>
		</nav>
	);
};
