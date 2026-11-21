/** How a passage can be rewritten. Shared by the editor and the AI task. */
export const REWRITE_STYLES = {
  warmer: { label: "Warmer", instruction: "a little warmer and more encouraging, without gushing" },
  plainer: { label: "Plainer", instruction: "plainer and easier to read, aiming at a reading age of about 11 to 12" },
  shorter: { label: "Shorter", instruction: "about a third shorter, keeping what matters most" },
  professional: { label: "For employers", instruction: "a little more professional, for employers, HR and managers" },
} as const;

export type RewriteStyle = keyof typeof REWRITE_STYLES;
