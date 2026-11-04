/**
 * Hands a file to the browser's own download, under `fileName`. The object
 * URL lives only for the click, so nothing of the file stays in memory.
 */
export const saveFile = (blob: Blob, fileName: string): void => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.rel = "noopener";
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};
