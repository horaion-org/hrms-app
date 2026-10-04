import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CloseIcon } from "@/components/ui/Icon";

export type TokenProps = {
	label: string;
	disabled?: boolean;
	onRemove: () => void;
};

export const Token = ({
	label,
	disabled,
	onRemove,
}: TokenProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<span className="relative inline-flex max-w-full items-center gap-1 rounded-md bg-ink-blue-50 py-1 pr-1 pl-2 text-xs text-ink-blue-900">
			<span className="truncate">{label}</span>
			<button
				aria-label={t("combobox.remove", { label })}
				className="rounded p-0.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink-blue-500 disabled:cursor-not-allowed disabled:text-neutral-500"
				disabled={disabled}
				type="button"
				onClick={onRemove}
			>
				<CloseIcon className="size-3" />
			</button>
		</span>
	);
};
