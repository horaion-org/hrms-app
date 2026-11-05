import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FileDrop } from "@/components/forms/FileDrop";
import { Button } from "@/components/ui/Button";
import type { ImportTextPrefix } from "@/features/imports/importWizard";

export type ImportUploadStepProps = {
	/** Whose copy to show: the people or the organisation import's. */
	textPrefix: ImportTextPrefix;
	/** The file extensions offered, e.g. `[".xlsx", ".csv"]`. */
	accept: ReadonlyArray<string>;
	/** While the chosen file is being checked. */
	checking: boolean;
	/** Why the file was refused, already worded. */
	refusalText?: string;
	/** What each column or sheet should hold, already worded; a general line follows them. */
	helpItems: ReadonlyArray<string>;
	onFileChange: (file: File) => void;
	onBack: () => void;
};

/** An import's second step: drop or choose a file, with what it should hold. */
export const ImportUploadStep = ({
	textPrefix,
	accept,
	checking,
	refusalText,
	helpItems,
	onFileChange,
	onBack,
}: ImportUploadStepProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<section>
			<FileDrop
				accept={accept}
				chooseLabel={t(`${textPrefix}.upload.choose`)}
				disabled={checking}
				hint={t(`${textPrefix}.upload.hint`)}
				prompt={t(`${textPrefix}.upload.prompt`)}
				onFileChange={onFileChange}
			/>
			{checking && (
				<p aria-live="polite" className="mt-4 text-sm text-neutral-800">
					{t(`${textPrefix}.upload.checking`)}
				</p>
			)}
			{refusalText && (
				<p className="mt-4 text-sm text-error-700" role="alert">
					{refusalText}
				</p>
			)}
			<h2 className="mt-8 text-base font-semibold text-neutral-900">
				{t(`${textPrefix}.upload.helpHeading`)}
			</h2>
			<ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-neutral-800">
				{helpItems.map((item) => (
					<li key={item}>{item}</li>
				))}
				<li>{t(`${textPrefix}.help.general`)}</li>
			</ul>
			<Button className="mt-6" variant="secondary" onClick={onBack}>
				{t(`${textPrefix}.upload.back`)}
			</Button>
		</section>
	);
};
