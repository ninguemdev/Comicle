/** How long the file's `blob:` URL lives: some browsers read it after the click returns. */
const REVOKE_AFTER_MS = 60_000;

/** Hands a file to the browser's downloads, named `fileName`. */
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_AFTER_MS);
}
