const { v4: uuidv4 } = require("uuid");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Tesla STEM High School location (Redmond, WA)
const TESLA_STEM_HIGH_SCHOOL = {
  name: "Tesla STEM High School",
  address: "2301 West Lake Sammamish Pkwy NE, Redmond, WA 98052",
  coordinates: { latitude: 47.674, longitude: -122.1215 },
};

const SERVICE_AREA_RADIUS_MILES = 25;

// Mock geocoding data for testing (in production, use Google Maps API, Azure Maps, etc.)
const mockAddressDatabase = [
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
  {
    address: "789 Pine Dr, Kirkland, WA 98033",
    coordinates: { latitude: 47.6769, longitude: -122.2059 },
    city: "Kirkland",
    state: "WA",
    zipCode: "98033",
    isValid: true,
  },
  {
    address: "321 Oak St, Seattle, WA 98101", // Outside 25-mile radius
    coordinates: { latitude: 47.6062, longitude: -122.3321 },
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    isValid: false,
  },
];

// Mock users for testing
let mockUsers = [
  {
    id: "parent-123",
    email: "john.parent@example.com",
    homeAddress: "",
    homeAddressVerified: false,
    homeLocation: null,
  },
];

module.exports = async function (context, req) {
  context.log("Address Validation API called");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return UnifiedResponseHandler.preflight(context);
  }

  try {
    const method = req.method;
    const { action } = req.query;

    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return UnifiedResponseHandler.error(
        context,
        "UNAUTHORIZED",
        "Missing or invalid authorization token",
        401
      );
    }

    // Extract user ID from token (mock - in production, decode JWT)
    const token = authHeader.split(" ")[1];
    const userId = "parent-123"; // In production, extract from JWT

    // Route based on method and action
    if (method === "POST" && action === "validate") {
      return await validateAddress(userId, req.body, context);
    }

    if (method === "POST" && action === "geocode") {
      return await geocodeAddress(req.body, context);
    }

    if (method === "GET" && action === "status") {
      return await getAddressStatus(userId, context);
    }

    return UnifiedResponseHandler.error(
      context,
      "METHOD_NOT_ALLOWED",
      "Method not allowed",
      405
    );
  } catch (error) {
    context.log.error("Address Validation API error:", error);
    return UnifiedResponseHandler.handleException(context, error);
  }
};

// Validate and store home address
async function validateAddress(userId, requestData, context) {
  try {
    const { address } = requestData;

    if (!address || address.trim().length < 10) {
      return UnifiedResponseHandler.validationError(
        context,
        "Please provide a complete home address"
      );
    }

    // Geocode the address (mock implementation)
    const geocodingResult = await mockGeocode(address);

    if (!geocodingResult.isValid) {
      return UnifiedResponseHandler.validationError(
        context,
        "Unable to verify this address. Please check the spelling and format.",
        {
          suggestions: geocodingResult.suggestions || [],
        }
      );
    }

    // Check if address is within service area (25 miles of Tesla STEM High School)
    const distanceToSchool = calculateDistance(
      geocodingResult.coordinates.latitude,
      geocodingResult.coordinates.longitude,
      TESLA_STEM_HIGH_SCHOOL.coordinates.latitude,
      TESLA_STEM_HIGH_SCHOOL.coordinates.longitude
    );

    if (distanceToSchool > SERVICE_AREA_RADIUS_MILES) {
      return UnifiedResponseHandler.validationError(
        context,
        `This address is ${distanceToSchool.toFixed(
          1
        )} miles from Tesla STEM High School. Our current service area is within ${SERVICE_AREA_RADIUS_MILES} miles.`,
        {
          distanceToSchool: distanceToSchool,
          maxDistance: SERVICE_AREA_RADIUS_MILES,
          schoolLocation: TESLA_STEM_HIGH_SCHOOL,
        }
      );
    }

    // Address is valid and within service area - save it
    const userIndex = mockUsers.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        homeAddress: geocodingResult.formattedAddress,
        homeAddressVerified: true,
        homeLocation: geocodingResult.coordinates,
      };
    }

    return UnifiedResponseHandler.success(
      context,
      "Home address verified successfully",
      {
        address: geocodingResult.formattedAddress,
        coordinates: geocodingResult.coordinates,
        distanceToSchool: distanceToSchool,
        serviceArea: {
          school: TESLA_STEM_HIGH_SCHOOL.name,
          maxDistance: SERVICE_AREA_RADIUS_MILES,
        },
        verified: true,
        verifiedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    context.log.error("Validate address error:", error);
    throw error;
  }
}

// Geocode address only (for address suggestions)
async function geocodeAddress(requestData, context) {
  try {
    const { address } = requestData;

    if (!address) {
      return UnifiedResponseHandler.validationError(
        context,
        "Address is required"
      );
    }

    const geocodingResult = await mockGeocode(address);

    return UnifiedResponseHandler.success(
      context,
      "Address geocoded successfully",
      {
        isValid: geocodingResult.isValid,
        coordinates: geocodingResult.coordinates,
        formattedAddress: geocodingResult.formattedAddress,
        suggestions: geocodingResult.suggestions || [],
      }
    );
  } catch (error) {
    context.log.error("Geocode address error:", error);
    throw error;
  }
}

// Get address verification status
async function getAddressStatus(userId, context) {
  try {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      return UnifiedResponseHandler.error(
        context,
        "USER_NOT_FOUND",
        "User not found",
        404
      );
    }

    return UnifiedResponseHandler.success(
      context,
      "Address status retrieved successfully",
      {
        homeAddress: user.homeAddress,
        verified: user.homeAddressVerified || false,
        homeLocation: user.homeLocation,
        serviceArea: {
          school: TESLA_STEM_HIGH_SCHOOL.name,
          maxDistance: SERVICE_AREA_RADIUS_MILES,
        },
      }
    );
  } catch (error) {
    context.log.error("Get address status error:", error);
    throw error;
  }
}

// Mock geocoding function (in production, use Google Maps API, Azure Maps, etc.)
async function mockGeocode(address) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Find matching address in mock database
  const normalizedInput = address.toLowerCase().trim();

  const exactMatch = mockAddressDatabase.find(
    (item) =>
      item.address.toLowerCase().includes(normalizedInput) ||
      normalizedInput.includes(item.address.toLowerCase().slice(0, 10))
  );

  if (exactMatch) {
    return {
      isValid: true,
      coordinates: exactMatch.coordinates,
      formattedAddress: exactMatch.address,
      city: exactMatch.city,
      state: exactMatch.state,
      zipCode: exactMatch.zipCode,
    };
  }

  // Partial matches for suggestions
  const suggestions = mockAddressDatabase
    .filter((item) => {
      const itemWords = item.address.toLowerCase().split(" ");
      const inputWords = normalizedInput.split(" ");
      return inputWords.some(
        (word) =>
          word.length > 3 &&
          itemWords.some((itemWord) => itemWord.includes(word))
      );
    })
    .map((item) => item.address)
    .slice(0, 3);

  return {
    isValid: false,
    coordinates: null,
    formattedAddress: null,
    suggestions: suggestions,
  };
}

// Calculate distance between two points in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
