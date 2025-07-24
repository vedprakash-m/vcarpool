// backend/src/services/preference.service.ts

// This is a placeholder service to unblock development.
// In a real implementation, this would interact with a database.

import { PreferenceRepository, WeeklyPreference } from '../repositories/preference.repository';

export class PreferenceService {
  private readonly repo: PreferenceRepository;

  constructor(repo?: PreferenceRepository) {
    // Allows DI but also fallback to own instantiation
    this.repo = repo ?? new PreferenceRepository();
  }

  async getPreferencesForWeek(
    groupId: string,
    weekStart: string | Date,
  ): Promise<WeeklyPreference[]> {
    const weekStartStr =
      typeof weekStart === 'string' ? weekStart : weekStart.toISOString().split('T')[0];
    return this.repo.getByGroupAndWeek(groupId, weekStartStr);
  }

  async submitWeeklyPreferences(
    parentId: string,
    groupId: string,
    weekStart: string,
    prefs: any[],
  ): Promise<void> {
    await this.repo.upsert(parentId, groupId, weekStart, prefs as any);
  }

  // Static helper for legacy static usages
  static async getPreferencesForWeek(groupId: string, weekStart: string | Date) {
    const svc = new PreferenceService();
    return svc.getPreferencesForWeek(groupId, weekStart);
  }
}
