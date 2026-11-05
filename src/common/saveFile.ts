/**
 * How long the object URL outlives the click. Safari and Firefox start the
 * download after `click()` returns, so revoking at once can cancel it;
 * a few seconds is ample for the browser to take hold of the file.
 */
export const REVOKE_DELAY_MS = 10_000;

/**
 * Hands a file to the browser's own download, under `fileName`. The object
 * URL is released shortly after the click, so nothing of the file stays in
 * memory once the browser has taken it.
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
	setTimeout(() => {
		URL.revokeObjectURL(url);
	}, REVOKE_DELAY_MS);
};
