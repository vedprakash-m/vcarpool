const { v4: uuidv4 } = require("uuid");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Universal school database for service area calculation
const schoolDatabase = [
  {
    id: "lincoln-elementary",
    name: "Tesla STEM High School",
    address: "123 Oak Street, Springfield, IL 62701",
    coordinates: { latitude: 47.674, longitude: -122.1215 },
    serviceRadius: 20, // miles
    district: "Springfield School District 186",
    type: "elementary",
    grades: ["K", "1", "2", "3", "4", "5"],
  },
  {
    id: "washington-middle",
    name: "Washington Middle School",
    address: "456 Maple Avenue, Springfield, IL 62702",
    coordinates: { latitude: 39.7965, longitude: -89.644 },
    serviceRadius: 25, // miles
    district: "Springfield School District 186",
    type: "middle",
    grades: ["6", "7", "8"],
  },
  {
    id: "tesla-stem-redmond",
    name: "Tesla STEM High School",
    address: "2301 West Lake Sammamish Pkwy NE, Redmond, WA 98052",
    coordinates: { latitude: 47.674, longitude: -122.1215 },
    serviceRadius: 25, // miles
    district: "Lake Washington School District",
    type: "high",
    grades: ["9", "10", "11", "12"],
  },
];

// Enhanced mock geocoding database
const mockAddressDatabase = [
  // Springfield, IL area
  {
    address: "123 Main St, Springfield, IL 62701",
    coordinates: { latitude: 47.674, longitude: -122.1215 },
    city: "Springfield",
    state: "IL",
    zipCode: "62701",
    isValid: true,
  },
  {
    address: "456 Elm Ave, Springfield, IL 62702",
    coordinates: { latitude: 39.7965, longitude: -89.644 },
    city: "Springfield",
    state: "IL",
    zipCode: "62702",
    isValid: true,
  },
  // Redmond, WA area (for backwards compatibility)
  {
    address: "123 Main St, Redmond, WA 98052",
    coordinates: { latitude: 47.674, longitude: -122.1195 },
    city: "Redmond",
    state: "WA",
    zipCode: "98052",
    isValid: true,
  },
  {
    address: "456 Elm Ave, Bellevue, WA 98004",
    coordinates: { latitude: 47.6062, longitude: -122.2024 },
    city: "Bellevue",
    state: "WA",
    zipCode: "98004",
    isValid: true,
  },
];

// Haversine formula to calculate distance between coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Mock geocoding function
async function mockGeocode(address) {
  const cleanAddress = address.toLowerCase().trim();
  const match = mockAddressDatabase.find(
    (entry) =>
      cleanAddress.includes(entry.city.toLowerCase()) &&
      cleanAddress.includes(entry.state.toLowerCase())
  );

  if (match) {
    return {
      isValid: true,
      coordinates: match.coordinates,
      formattedAddress: match.address,
      city: match.city,
      state: match.state,
      zipCode: match.zipCode,
    };
  }

  return {
    isValid: false,
    error: "Address not found in our service area",
    suggestions: mockAddressDatabase.slice(0, 3).map((entry) => entry.address),
  };
}

// Smart school detection based on address
function detectNearbySchools(coordinates, maxResults = 3) {
  const schoolsWithDistance = schoolDatabase.map((school) => ({
    ...school,
    distance: calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      school.coordinates.latitude,
      school.coordinates.longitude
    ),
  }));

  // Sort by distance and filter by service radius
  const nearbySchools = schoolsWithDistance
    .filter((school) => school.distance <= school.serviceRadius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);

  return nearbySchools;
}

// Enhanced address validation with school detection
async function validateAddressWithSchoolDetection(
  userId,
  requestData,
  context
) {
  try {
    const { address, schoolId } = requestData; // schoolId is optional for manual override

    if (!address || address.trim().length < 10) {
      return UnifiedResponseHandler.validationError(
        "Please provide a complete home address"
      );
    }

    // Geocode the address
    const geocodingResult = await mockGeocode(address);

    if (!geocodingResult.isValid) {
      return UnifiedResponseHandler.validationError(
        "Unable to verify this address. Please check the spelling and format.",
        geocodingResult.suggestions || []
      );
    }

    // Detect nearby schools
    const nearbySchools = detectNearbySchools(geocodingResult.coordinates);

    if (nearbySchools.length === 0) {
      return UnifiedResponseHandler.validationError(
        "No schools found within service area of this address.",
        {
          coordinates: geocodingResult.coordinates,
          searchRadius: "25 miles",
        }
      );
    }

    // Use specific school if provided, otherwise use closest school
    let targetSchool;
    if (schoolId) {
      targetSchool = schoolDatabase.find((s) => s.id === schoolId);
      if (!targetSchool) {
        return UnifiedResponseHandler.notFoundError(
          "Specified school not found"
        );
      }
    } else {
      targetSchool = nearbySchools[0]; // Use closest school
    }

    // Calculate distance to target school
    const distanceToSchool = calculateDistance(
      geocodingResult.coordinates.latitude,
      geocodingResult.coordinates.longitude,
      targetSchool.coordinates.latitude,
      targetSchool.coordinates.longitude
    );

    // Check if within service area of target school
    if (distanceToSchool > targetSchool.serviceRadius) {
      return UnifiedResponseHandler.validationError(
        `This address is ${distanceToSchool.toFixed(1)} miles from ${
          targetSchool.name
        }. The service area is within ${targetSchool.serviceRadius} miles.`,
        {
          distanceToSchool: distanceToSchool,
          maxDistance: targetSchool.serviceRadius,
          schoolLocation: targetSchool,
          nearbySchools: nearbySchools,
        }
      );
    }

    // Address is valid and within service area
    const validationResult = {
      addressId: uuidv4(),
      userId: userId,
      address: geocodingResult.formattedAddress,
      coordinates: geocodingResult.coordinates,
      isValid: true,
      distanceToSchool: distanceToSchool,
      detectedSchool: targetSchool,
      nearbySchools: nearbySchools,
      validatedAt: new Date().toISOString(),
    };

    // Mock save to database
    console.log("Address validation saved:", validationResult);

    return UnifiedResponseHandler.success(
      validationResult,
      "Address validated successfully with automatic school detection"
    );
  } catch (error) {
    context.log.error("Address validation error:", error);
    throw error;
  }
}

// School search endpoint
async function searchSchools(requestData, context) {
  try {
    const { query, coordinates, maxDistance = 50 } = requestData;

    let results = [...schoolDatabase];

    // Filter by search query if provided
    if (query) {
      const searchLower = query.toLowerCase();
      results = results.filter(
        (school) =>
          school.name.toLowerCase().includes(searchLower) ||
          school.district.toLowerCase().includes(searchLower) ||
          school.address.toLowerCase().includes(searchLower)
      );
    }

    // Calculate distances if coordinates provided
    if (coordinates) {
      results = results.map((school) => ({
        ...school,
        distance: calculateDistance(
          coordinates.latitude,
          coordinates.longitude,
          school.coordinates.latitude,
          school.coordinates.longitude
        ),
      }));

      // Filter by distance
      results = results.filter((school) => school.distance <= maxDistance);

      // Sort by distance
      results.sort((a, b) => a.distance - b.distance);
    }

    return UnifiedResponseHandler.success({
      schools: results,
      total: results.length,
      query: query || null,
      searchArea: coordinates ? `${maxDistance} miles` : "nationwide",
    });
  } catch (error) {
    context.log.error("School search error:", error);
    throw error;
  }
}

// Main Azure Function handler
module.exports = async function (context, req) {
  const method = req.method;

  // Handle preflight requests
  const preflightResponse = UnifiedResponseHandler.handlePreflight(req);
  if (preflightResponse) {
    context.res = preflightResponse;
    return;
  }

  try {
    // Validate authorization
    const authError = UnifiedResponseHandler.validateAuth(req);
    if (authError) {
      context.res = authError;
      return;
    }

    const userId = "mock-user-id"; // Extract from JWT in production

    const action = req.query.action || "validate";

    if (method === "POST" && action === "validate") {
      // Address validation with school detection
      const result = await validateAddressWithSchoolDetection(
        userId,
        req.body,
        context
      );
      context.res = result;
      return;
    }

    if (method === "GET" && action === "search-schools") {
      // School search
      const result = await searchSchools(req.query, context);
      context.res = result;
      return;
    }

    // Invalid action
    context.res = UnifiedResponseHandler.validationError(
      `Action '${action}' not supported`
    );
  } catch (error) {
    context.log.error("Unexpected error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "An unexpected error occurred",
      error.message
    );
  }
};
