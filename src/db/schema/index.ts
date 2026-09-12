/**
 * ThrivSphere operating-system schema.
 *
 * Grouped by domain rather than kept in one file, because the safeguarding and
 * records tables carry very different access rules from commerce and should be
 * reviewable on their own.
 *
 * Two conventions hold throughout:
 *  - Care records are never destroyed in place. Notes are amended, not edited;
 *    consents are withdrawn, not deleted; clients are marked for deletion by
 *    the retention job rather than removed on request.
 *  - Every table touching a client record is reached through the access guard,
 *    which writes an `auditLog` row for the read or write, including denials.
 */
export * from "./identity";
export * from "./clients";
export * from "./commerce";
export * from "./scheduling";
export * from "./records";
export * from "./safeguarding";
