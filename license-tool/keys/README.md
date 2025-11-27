# POSPlus License Keys

This directory contains the RSA key pair used for license signing.

## Files

- `private.pem` - RSA-2048 private key (KEEP SECRET!)
- `public.pem` - RSA-2048 public key (embed in POSPlus app)
- `keyinfo.json` - Key generation metadata

## Security Guidelines

### Private Key (`private.pem`)

⚠️ **CRITICAL SECURITY**

- NEVER share this file with anyone
- NEVER commit this file to version control
- Keep secure backups in a safe location
- Only use on your secure license generation server

### Public Key (`public.pem`)

This key should be embedded in the POSPlus application:
- Copy the contents to `src/main-process/services/license/licenseValidator.ts`
- Replace the placeholder `PUBLIC_KEY` constant

## Regenerating Keys

If keys are compromised:

```bash
posplus-license init --force
```

⚠️ **WARNING**: This will invalidate ALL existing licenses!

## Backup

Store secure backups of:
- `private.pem`
- `data/licenses.json` (license registry)

Keep backups encrypted and in a secure location.
