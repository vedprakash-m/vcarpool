# Test Credentials for Carpool

## Mock Authentication (Development/Testing Only)

**These are NOT real secrets - they are placeholder values for testing the application.**

### Frontend Login Test ✅ **WORKING**

- **URL**: https://lively-stone-016bfa20f.6.azurestaticapps.net/
- **Email**: `admin@carpool.com`
- **Password**: `[Set via ADMIN_PASSWORD environment variable]` ⚠️ _(Use environment variables for security)_

### Alternative Test Account

- **Email**: `admin@example.com`
- **Password**: Any password (accepts any password for testing)

### API Testing ✅ **ALL ENDPOINTS WORKING**

```bash
# Test authentication endpoint
curl -X POST https://carpool-api-prod.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@carpool.com","password":"${ADMIN_PASSWORD}"}'

# Test other endpoints
curl https://carpool-api-prod.azurewebsites.net/api/health
curl https://carpool-api-prod.azurewebsites.net/api/trips/stats
curl https://carpool-api-prod.azurewebsites.net/api/users/me
```

## Current Status: 🎉 **FULLY FUNCTIONAL**

- ✅ **Health**: 200 OK
- ✅ **Authentication**: 200 OK with full user data
- ✅ **Trip Stats**: 200 OK with dashboard data
- ✅ **User Profile**: 200 OK with user data

## Important Notes

⚠️ **For Production**: Replace these with real authentication using:

- Environment variables for secrets
- Database-based user authentication
- Proper JWT token generation
- Real user registration flow

🔧 **Development**: These mock credentials allow testing without setting up database authentication first.

🔒 **Security**: The security scanner checks for hardcoded credentials to prevent real secrets from being committed to the repository.
