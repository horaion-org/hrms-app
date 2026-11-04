import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DownloadIcon } from "@/components/ui/Icon";
import type { ImportTextPrefix } from "@/features/imports/importWizard";

export type ImportTemplateStepProps = {
	/** Whose copy to show: the people or the organisation import's. */
	textPrefix: ImportTextPrefix;
	downloading: boolean;
	/** Whether the last download failed. */
	downloadFailed: boolean;
	onDownload: () => void;
	onNext: () => void;
};

/** An import's first step: what the template holds, its download, and on to the upload. */
export const ImportTemplateStep = ({
	textPrefix,
	downloading,
	downloadFailed,
	onDownload,
	onNext,
}: ImportTemplateStepProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<section>
			<h2 className="text-xl font-semibold text-neutral-900">
				{t(`${textPrefix}.template.heading`)}
			</h2>
			<p className="mt-2 max-w-2xl text-sm text-neutral-800">
				{t(`${textPrefix}.template.body`)}
			</p>
			<p className="mt-2 max-w-2xl text-sm text-neutral-800">
				{t(`${textPrefix}.template.rules`)}
			</p>
			{downloadFailed && (
				<p className="mt-4 text-sm text-error-700" role="alert">
					{t(`${textPrefix}.template.downloadFailed`)}
				</p>
			)}
			<div className="mt-6 flex flex-wrap gap-3">
				<Button
					leadingIcon={<DownloadIcon />}
					loading={downloading}
					variant="secondary"
					onClick={onDownload}
				>
					{downloading
						? t(`${textPrefix}.template.downloading`)
						: t(`${textPrefix}.template.download`)}
				</Button>
				<Button onClick={onNext}>{t(`${textPrefix}.template.next`)}</Button>
			</div>
		</section>
	);
};
