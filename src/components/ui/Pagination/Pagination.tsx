import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

export type PaginationProps = {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
};

/** The page typed into the jump box, or undefined when it is not a whole page between 1 and `lastPage`. */
const typedPage = (text: string, lastPage: number): number | undefined => {
	const page = Number(text.trim());
	return Number.isInteger(page) && page >= 1 && page <= lastPage
		? page
		: undefined;
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
				{lastPage > 1 ? (
					<span className="flex items-center gap-2 text-sm">
						<Input
							key={current}
							className="w-14 px-2 font-semibold [&>input]:text-center"
							defaultValue={String(current)}
							inputMode="numeric"
							aria-label={t("pagination.goToPage", {
								page: current,
								total: lastPage,
							})}
							onBlur={(event) => {
								const page = typedPage(event.currentTarget.value, lastPage);
								if (page === undefined || page === current)
									event.currentTarget.value = String(current);
								else onPageChange(page);
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter") event.currentTarget.blur();
							}}
						/>
						<span aria-hidden="true">
							{t("pagination.ofPages", { total: numbers.format(lastPage) })}
						</span>
					</span>
				) : (
					<span
						aria-current="page"
						className="flex size-11 items-center justify-center rounded-lg border border-neutral-400 text-sm font-semibold"
						aria-label={t("pagination.page", {
							page: current,
							total: lastPage,
						})}
					>
						{numbers.format(current)}
					</span>
				)}
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
