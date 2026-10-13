/** Single-quote a value for bash. */
export default function q(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
