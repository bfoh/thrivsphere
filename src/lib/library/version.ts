/**
 * The published library: the name of its manifest in private Blob storage.
 *
 * Written by `scripts/library/upload.ts` after the files are uploaded, and
 * committed, so publishing a new build of the library is a normal deploy and
 * rolling one back is a normal revert. Null until the first upload.
 */
export const LIBRARY_MANIFEST: string | null = "d111f156fa05a3ac7eb368d80658e9327e7a559a3d0e8ac0fe2299df699cb62f.json";
