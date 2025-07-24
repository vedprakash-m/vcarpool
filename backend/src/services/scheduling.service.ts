import { FamilyService } from './family.service';
import { UserService } from './user.service';
import { TripService } from './trip.service';
import { PreferenceService } from './preference.service';
import { Family, Assignment } from '@carpool/shared';

// Represents the fairness debt for each family
interface FairnessMetrics {
  [familyId: string]: number;
}

export class SchedulingService {
  /**
   * Generates a weekly carpool schedule for a given group.
   *
   * @param groupId The ID of the carpool group.
   * @param weekStartDate The starting date of the week for which to generate the schedule.
   * @returns The generated schedule as an array of assignments.
   */
  public static async generateWeeklySchedule(
    groupId: string,
    weekStartDate: Date,
  ): Promise<Assignment[]> {
    // 1. Fetch all necessary data
    const families: Family[] = await FamilyService.getFamiliesByGroup(groupId);
    const preferences: any[] = await PreferenceService.getPreferencesForWeek(
      groupId,
      weekStartDate,
    );
    const fairnessMetrics = await this.getFairnessMetrics(groupId);

    const assignments: Assignment[] = [];
    const daysOfWeek = [0, 1, 2, 3, 4]; // Monday to Friday

    // 2. Iterate through each day of the week to create assignments
    for (const day of daysOfWeek) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(currentDate.getDate() + day);

      const familiesNeedingRide = families.filter((f: Family) => {
        const dayIso = currentDate.toISOString().split('T')[0];
        const pref = preferences.find(
          (p: any) =>
            p.parentId === f.id && // mapping parentId
            p.date === dayIso,
        );
        return !pref || pref.canDrive === false;
      });

      const potentialDrivers = families.filter((f: Family) => {
        const pref = preferences.find(
          (p: any) => p.familyId === f.id && new Date(p.date).getTime() === currentDate.getTime(),
        );
        return pref && pref.canDrive === true;
      });

      // 3. Simple initial driver selection logic (to be enhanced with fairness)
      if (potentialDrivers.length > 0) {
        const driverFamily = this.selectBestDriver(potentialDrivers, fairnessMetrics);

        if (driverFamily) {
          assignments.push({
            familyId: driverFamily.id,
            driverId: driverFamily.parentIds[0], // Assuming first parent drives for now
            date: currentDate,
            passengerFamilyIds: familiesNeedingRide.map((f: Family) => f.id),
          });

          // Update fairness metrics conceptually
          this.updateFairnessOnAssignment(fairnessMetrics, driverFamily.id, families.length);
        } else {
          // Handle conflict: No driver found
          console.warn(`No driver found for group ${groupId} on ${currentDate}`);
        }
      } else {
        // Handle conflict: No potential drivers
        console.warn(`No potential drivers for group ${groupId} on ${currentDate}`);
      }
    }

    // 4. TODO: Persist the generated assignments (e.g., as Trips)
    // await TripService.createTripsFromAssignments(assignments);

    return assignments;
  }

  /**
   * Selects the best driver from a list of potentials based on fairness metrics.
   * Families with a higher "fairness debt" (driven less than their fair share) are prioritized.
   */
  private static selectBestDriver(
    potentialDrivers: Family[],
    fairnessMetrics: FairnessMetrics,
  ): Family | null {
    if (potentialDrivers.length === 0) return null;

    // Sort drivers by their fairness debt, descending (highest debt first)
    potentialDrivers.sort((a, b) => {
      const debtA = fairnessMetrics[a.id] || 0;
      const debtB = fairnessMetrics[b.id] || 0;
      return debtB - debtA;
    });

    return potentialDrivers[0];
  }

  /**
   * Conceptually updates the fairness metrics after a driving assignment.
   */
  private static updateFairnessOnAssignment(
    metrics: FairnessMetrics,
    driverFamilyId: string,
    totalFamilies: number,
  ): void {
    const fairShare = 1 / totalFamilies;

    for (const familyId in metrics) {
      if (familyId === driverFamilyId) {
        metrics[familyId] -= 1 - fairShare; // Driving credits their debt
      } else {
        metrics[familyId] += fairShare; // Not driving increases their debt
      }
    }
  }

  /**
   * TODO: Implement logic to fetch or calculate fairness metrics from a persistent store.
   */
  private static async getFairnessMetrics(groupId: string): Promise<FairnessMetrics> {
    // For now, returning a dummy object.
    // This should fetch historical driving data and calculate the debt.
    const families = await FamilyService.getFamiliesByGroup(groupId);
    const metrics: FairnessMetrics = {};
    families.forEach((f: Family) => {
      metrics[f.id] = 0; // Initialize all debts to 0
    });
    return metrics;
  }
}
