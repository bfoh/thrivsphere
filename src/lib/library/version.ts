/**
 * The published library: the name of its manifest in private Blob storage.
 *
 * Written by `scripts/library/upload.ts` after the files are uploaded, and
 * committed, so publishing a new build of the library is a normal deploy and
 * rolling one back is a normal revert. Null until the first upload.
 */
export const LIBRARY_MANIFEST: string | null = "59c39293bdf6ae3a4312148d1ab0073bce880f67e0ad5c20a8b79fa3abd16ac6.json";
