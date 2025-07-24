# API Key Rotation Playbook

_Last updated: 2025-06-15_

This playbook provides a zero-downtime procedure for rotating external API keys (e.g., Google Maps, Azure Maps) across environments.

## 1. Prerequisites
- All keys are stored as **App Settings** in Azure Function Apps (`GOOGLE_MAPS_API_KEY`, `AZURE_MAPS_API_KEY`).
- Secrets are versioned in Azure Key Vault (`carpool-kv-prod`).
- CI/CD pipeline supports parameterised deployment via `az functionapp config appsettings set`.

## 2. Rotation Steps
| Step | Description | Command |
|------|-------------|---------|
| 1 | Generate new key in provider console. | – |
| 2 | Add new key as **disabled** secret version in Key Vault (`--disabled true`). | `az keyvault secret set --vault-name carpool-kv-prod -n GOOGLE_MAPS_API_KEY -v <NEWKEY> --disabled true` |
| 3 | Update CI/CD variable group with secret version reference. | GitHub Actions `VARS` or Azure DevOps Library. |
| 4 | Deploy to **staging** slot with new secret version reference. | `az functionapp deployment slot swap --name carpool-api-prod --slot staging` |
| 5 | Run smoke + perf tests. Ensure 0 errors. | `npx wait-on https://staging.carpool.com/health && npm run perf:phase2` |
| 6 | Enable secret version & disable old version after success. | `az keyvault secret set-attributes --vault-name carpool-kv-prod -n GOOGLE_MAPS_API_KEY --id <NEWVER> --enabled true` |
| 7 | Swap slots (`staging` → `production`). | `az functionapp deployment slot swap --name carpool-api-prod --slot staging` |
| 8 | Remove oldest secret versions (>2). | `az keyvault secret delete --id <OLDVER>` |

Rollback: swap slots back, re-enable previous secret version. 