export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    department?: string;
    emergencyContact?: string;
    phone?: string;
    grade?: string;
    role?: 'student' | 'parent' | 'admin' | 'faculty' | 'staff';
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserPreferences {
    pickupLocation: string;
    dropoffLocation: string;
    preferredTime: string;
    isDriver: boolean;
    maxPassengers?: number;
    smokingAllowed: boolean;
    musicPreference?: string;
    notifications: NotificationSettings;
}
export interface NotificationSettings {
    email: boolean;
    sms: boolean;
    tripReminders: boolean;
    swapRequests: boolean;
    scheduleChanges: boolean;
}
export interface Trip {
    id: string;
    driverId: string;
    passengers: string[];
    date: Date;
    departureTime: string;
    arrivalTime: string;
    pickupLocations: PickupLocation[];
    destination: string;
    maxPassengers: number;
    availableSeats: number;
    status: TripStatus;
    cost?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PickupLocation {
    userId: string;
    address: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    estimatedTime: string;
}
export type TripStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export interface Schedule {
    id: string;
    userId: string;
    recurring: boolean;
    startDate: Date;
    endDate?: Date;
    daysOfWeek: number[];
    departureTime: string;
    isDriver: boolean;
    maxPassengers?: number;
    status: ScheduleStatus;
    createdAt: Date;
    updatedAt: Date;
}
export type ScheduleStatus = 'active' | 'paused' | 'inactive';
export interface SwapRequest {
    id: string;
    requesterId: string;
    targetUserId: string;
    requestedDate: Date;
    offerDate: Date;
    reason?: string;
    status: SwapRequestStatus;
    createdAt: Date;
    respondedAt?: Date;
}
export type SwapRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    department?: string;
}
export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    department?: string;
    grade?: string;
    emergencyContact?: string;
}
export interface AuthResponse {
    user: User;
    token: string;
    refreshToken: string;
}
export interface CreateTripRequest {
    date: string;
    departureTime: string;
    arrivalTime: string;
    destination: string;
    maxPassengers: number;
    cost?: number;
    notes?: string;
}
export interface UpdateTripRequest {
    date?: string;
    departureTime?: string;
    arrivalTime?: string;
    destination?: string;
    maxPassengers?: number;
    cost?: number;
    notes?: string;
    status?: TripStatus;
}
export interface JoinTripRequest {
    pickupLocation: string;
}
export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: string[];
}
export interface EmailRequest {
    to: string[];
    templateId: string;
    variables: Record<string, any>;
    priority?: 'low' | 'normal' | 'high';
}
export interface TripAnalytics {
    totalTrips: number;
    totalUsers: number;
    averageOccupancy: number;
    costSavings: number;
    co2Reduction: number;
    timeframe: string;
}
//# sourceMappingURL=types.d.ts.map