const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

/** Branch, tag or SHA. Rejects anything git could read as an option or a revision range. */
export default function assertValidRef(ref: string): string {
  if (!REF_PATTERN.test(ref) || ref.includes('..')) {
    throw new Error(`Invalid git ref: ${JSON.stringify(ref)}`);
  }
  return ref;
}
