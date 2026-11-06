# oci-catcher

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-orange)](https://workers.cloudflare.com)
[![Oracle Cloud](https://img.shields.io/badge/Oracle_Cloud-red)](https://www.oracle.com/cloud/free/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)

a cloudflare worker cron that launches an oracle cloud instance the moment host capacity frees up, then sends an [ntfy](https://ntfy.sh) notification.

## overview

always free `VM.Standard.A1.Flex` capacity is often exhausted, and a launch fails with `Out of host capacity` until a host frees up. checking by hand, or from a laptop that sleeps, misses the window.

every minute, the worker:

1. lists instances by name, and stops if one already exists
2. asks oci for a compute capacity report for the shape
3. launches the instance with an `opc-retry-token`, so a repeated request cannot create a second one
4. notifies through ntfy

the instance list is the only state. once the instance exists, every run is a no-op; delete the worker.

requests are signed with web crypto (oci signature version 1, rsa-sha256). the oci typescript sdk is node-only, so it is not used.

## notifications

| outcome | notification |
| --- | --- |
| launched | always, `urgent` |
| out of capacity, 429, 5xx | none, retried on the next run |
| any other failure | at most once an hour, on the `:00` run, `high` |

## setup

### oci credentials

use a dedicated api-only user that can only create instances, never an admin key. it needs:

```text
allow group <group> to manage compute-capacity-reports in tenancy
allow group <group> to read app-catalog-listing in tenancy
allow group <group> to inspect instances in compartment <compartment>
allow group <group> to manage instances in compartment <compartment> where request.permission = 'INSTANCE_CREATE'
allow group <group> to read instance-images in compartment <compartment>
allow group <group> to use vnics in compartment <compartment>
allow group <group> to use subnets in compartment <compartment>
allow group <group> to use network-security-groups in compartment <compartment>
```

the api key must be pkcs#8 (`BEGIN PRIVATE KEY`), which web crypto can import. keep it outside the repository, readable only by you:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out ~/.oci/<name>.pem
chmod 600 ~/.oci/<name>.pem
openssl pkey -in ~/.oci/<name>.pem -pubout -out ~/.oci/<name>_public.pem
```

### settings

launch settings (shape, size, image, name, tags) live in `wrangler.toml` under `[vars]`.

tenancy-specific values are worker secrets. copy `.dev.vars.example` to `.dev.vars`, fill it in, then:

```bash
npx wrangler secret bulk .dev.vars
npx wrangler secret put OCI_PRIVATE_KEY < ~/.oci/<name>.pem
```

## development

```bash
npm install
npm run lint
npx tsc --noEmit
CI=true npx vitest run
```

a local run reads `.dev.vars`, takes the private key as a variable, and calls oci for real:

```bash
npm run dev -- --var "OCI_PRIVATE_KEY:$(awk 'NF { printf "%s\\n", $0 }' ~/.oci/<name>.pem)"
curl "http://localhost:8787/cdn-cgi/handler/scheduled"
```

## deploy

```bash
npx wrangler login
npm run deploy
```

## license

[MIT](./LICENSE)
