# Where to run it

**Local machine (no CI/CD yet)**
- Install globally and run from a laptop with AWS credentials (`AWS_PROFILE`, IAM Identity Center via `aws sso login`).
- Nothing to host: SSM does the remote work, so no bastion, VPN or open SSH port.
- Interactive confirmation before every deploy and rollback; `fleet plan` first to review the scripts.

**Deployment automation**
- Any CI/CD runner with Node.js and AWS credentials can run it; pass `--yes` to skip the prompt.
- **GitHub Actions:** OIDC role via `aws-actions/configure-aws-credentials`, no stored keys.
- **Jenkins:** an agent with an instance profile, or the Pipeline: AWS Steps plugin (`withAWS`).
- **Others:** GitLab CI, Bitbucket Pipelines, AWS CodeBuild, or a cron job on a build box.
- A non-zero exit code on any failed or rolled-back host fails the pipeline.

GitHub Actions example (manual trigger):

```yaml
on:
  workflow_dispatch:
    inputs:
      ref: { description: 'Branch, tag or SHA', required: true }

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/laravel-fleet-deployer
          aws-region: us-west-2
      - run: npx laravel-fleet deploy "$REF" --yes   # reads fleet.config.json from the repo
        env:
          REF: ${{ inputs.ref }}   # via env, not inline, to avoid script injection
```
