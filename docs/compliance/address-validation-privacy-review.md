# Address Validation Privacy Review

Date: 2025-06-15

## Overview
The address validation service collects **user-provided addresses** to confirm proximity within a 25-mile radius of Tesla STEM High School. No GPS/device location is gathered.

## Data Collected
| Field | Purpose | Retention |
|-------|---------|-----------|
| `street`, `city`, `state`, `zipCode` | Geocoding for distance calculation | Persisted in `users` collection. |
| Geocoded lat/lng | Distance calc & route planning | Persisted. |
| API provider response payload | None (discarded after computation) | Not stored. |

## Compliance Assessment
| Requirement | Status |
|-------------|--------|
| User consent before address processing | ✅ Address entered voluntarily in registration step. |
| Minimized data transfer to 3rd-party | ✅ Only address string sent to geocoding API. |
| No storage of provider metadata | ✅ API response discarded after extracting lat/lng. |
| Data encrypted in transit | ✅ HTTPS used for all calls. |
| Data encrypted at rest | ✅ Cosmos DB account has encryption at rest. |
| Right to erasure | ✅ `DELETE /users/{id}` cascades address deletion. |

## Improvements
1. Implement periodic purge of unused lat/lng (families that leave).  
2. Add Data Processing Agreement with Google & Azure Maps vendors.  
3. Redact address in application logs; ensure logger filters added. 