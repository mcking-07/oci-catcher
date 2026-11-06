import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.toml' },
      miniflare: {
        bindings: {
          NODE_ENV: 'test',
          NTFY_URL: 'https://ntfy.example.com/',
          NTFY_TOPIC: 'oci-catcher-test',
          OCI_REGION: 'us-phoenix-1',
          OCI_TENANCY_ID: 'ocid1.tenancy.oc1..tenancy',
          OCI_USER_ID: 'ocid1.user.oc1..user',
          OCI_FINGERPRINT: '00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff',
          OCI_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----',
          OCI_COMPARTMENT_ID: 'ocid1.compartment.oc1..compartment',
          OCI_AVAILABILITY_DOMAIN: 'abcd:PHX-AD-1',
          OCI_SUBNET_ID: 'ocid1.subnet.oc1.phx.subnet',
          OCI_IMAGE_ID: 'ocid1.image.oc1.phx.image',
          INSTANCE_NAME: 'instance-1',
          INSTANCE_HOSTNAME: 'instance-1',
          INSTANCE_SHAPE: 'VM.Standard.A1.Flex',
          INSTANCE_OCPUS: '2',
          INSTANCE_MEMORY_GBS: '12',
          INSTANCE_BOOT_VOLUME_GBS: '50',
          INSTANCE_ASSIGN_PUBLIC_IP: 'true',
          INSTANCE_TAGS: '{"environment":"test"}',
          INSTANCE_SSH_PUBLIC_KEY: 'ssh-ed25519 AAAA test',
        },
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup/config.ts'],
    testTimeout: 10 * 1000,
  },
});
