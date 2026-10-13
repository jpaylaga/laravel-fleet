import q from '../../shell/q.js';
import type { DeployContext } from '../../types.js';

export default function smokeCheckLines({ config, secret }: DeployContext): string[] | null {
  const smoke = config.smoke;
  if (!smoke) return null;
  const host = smoke.host ? ` -H ${q(`Host: ${smoke.host}`)}` : '';
  const bypass = `${new URL(smoke.url).origin}/${secret}`;
  return [
    'jar=$(mktemp)',
    `trap 'rm -f "$jar"' EXIT`,
    // Visiting /<secret> sets Laravel's maintenance bypass cookie.
    `curl -sS -o /dev/null -c "$jar" -b "$jar" --max-time ${smoke.timeoutSeconds}${host} ${q(bypass)}`,
    `code=$(curl -sS -o /dev/null -w '%{http_code}' -b "$jar" --max-time ${smoke.timeoutSeconds}${host} ${q(smoke.url)} || true)`,
    `if [ "$code" != ${q(String(smoke.expectStatus))} ]; then printf 'smoke check failed: %s returned %s\\n' ${q(smoke.url)} "$code" >&2; exit 1; fi`,
    `echo "smoke check passed ($code)"`,
  ];
}
