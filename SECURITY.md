# Worldz repository security

**Never send passwords, wallet seed phrases, private keys, recovery codes, or production tokens in issues, pull requests, chat, logs or public website assets.**

Keep all server credentials in GitHub's protected `cryptoworldz-production` environment. For Hostinger, use SFTP/SSH with a validated, pinned server host key when possible. For explicit FTPS, verify the certificate chain **and hostname**; disabling certificate verification is not an acceptable production repair.

The repository currently contains legacy deployment routes. Their transport security and removal operations must be reviewed before use. A repository-side code change does **not** install SSL certificates or correct public DNS.

Before merging deployment changes, require independent code validation, domain/site structure checks, and proof that the remote deployment targets match the intended Hostinger websites. Back up important remote site files before any cleanup or replacement.

If credentials may have been exposed, rotate them in their provider and update the protected GitHub environment secrets. Removing a value from the latest commit does not remove it from Git history.

## Reporting
Report security concerns privately to the repository owner through established account channels. Do not open public issues containing credentials or exploitable private access details.
