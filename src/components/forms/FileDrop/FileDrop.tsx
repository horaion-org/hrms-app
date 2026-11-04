import { useId, useRef, useState, type DragEvent } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { UploadIcon } from "@/components/ui/Icon";

export type FileDropProps = {
	/** What to drop, e.g. "Drop your file here, or". */
	prompt: string;
	/** The button-like text that opens the file picker, e.g. "choose a file". */
	chooseLabel: string;
	/** The accepted types and limits, shown under the prompt. */
	hint: string;
	/** Extensions the picker offers, e.g. `[".xlsx", ".csv"]`. */
	accept: ReadonlyArray<string>;
	/** The chosen file; the caller validates type and size and shows any refusal. */
	onFileChange: (file: File) => void;
	disabled?: boolean;
	className?: string;
};

/**
 * A drop zone for one file that is also a file picker: drag a file onto it, or
 * activate it with a click, Enter or Space. It never uploads anything itself.
 */
export const FileDrop = ({
	prompt,
	chooseLabel,
	hint,
	accept,
	onFileChange,
	disabled = false,
	className,
}: FileDropProps): FunctionComponent => {
	const input = useRef<HTMLInputElement>(null);
	const hintId = useId();
	const [dragging, setDragging] = useState(false);
	const take = (files: FileList | null): void => {
		const file = files?.[0];
		if (file && !disabled) onFileChange(file);
	};
	const onDrop = (event: DragEvent<HTMLElement>): void => {
		event.preventDefault();
		setDragging(false);
		take(event.dataTransfer.files);
	};

	return (
		<label
			className={joinClassNames(
				"flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center text-sm text-neutral-700 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink-blue-500",
				dragging
					? "border-ink-blue-500 bg-ink-blue-50"
					: "border-neutral-400 bg-white",
				disabled && "cursor-not-allowed opacity-60",
				className
			)}
			onDrop={onDrop}
			onDragLeave={() => {
				setDragging(false);
			}}
			onDragOver={(event) => {
				event.preventDefault();
				if (!disabled) setDragging(true);
			}}
		>
			<UploadIcon aria-hidden="true" className="size-6 text-ink-blue-700" />
			<span>
				{prompt}{" "}
				<span className="font-semibold text-ink-blue-700 underline">
					{chooseLabel}
				</span>
			</span>
			<span className="text-xs text-neutral-600" id={hintId}>
				{hint}
			</span>
			<input
				ref={input}
				accept={accept.join(",")}
				aria-describedby={hintId}
				className="sr-only"
				disabled={disabled}
				type="file"
				onChange={(event) => {
					take(event.target.files);
					// The same file chosen again after a fix must still count as a change.
					event.target.value = "";
				}}
			/>
		</label>
	);
};
