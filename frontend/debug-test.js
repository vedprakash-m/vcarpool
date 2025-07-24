// Debug script to test store mocking
const path = require("path");

// Mock the store before importing anything
jest.mock("./src/store/trip.store", () => ({
  useTripStore: jest.fn(),
}));

// Import and test
const { useTripStore } = require("./src/store/trip.store");

const mockTripStore = {
  stats: { weeklySchoolTrips: 8 },
  loading: false,
  fetchTripStats: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ weeklySchoolTrips: 8 })),
};

useTripStore.mockReturnValue(mockTripStore);

const result = useTripStore();
console.log("Mock result:", result);
console.log("fetchTripStats type:", typeof result.fetchTripStats);
console.log("fetchTripStats value:", result.fetchTripStats);
