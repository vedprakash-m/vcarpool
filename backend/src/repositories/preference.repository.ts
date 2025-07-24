import { injectable } from 'tsyringe';
import { CosmosClient } from '@azure/cosmos';

// Preference data model – will be duplicated in shared types soon
export interface WeeklyPreference {
  id: string;
  parentId: string;
  groupId: string;
  weekStartDate: string; // ISO Monday date (yyyy-mm-dd)
  drivingAvailability: any; // in real impl use typed structure
  specialRequests?: string;
  emergencyContact?: string;
  submittedAt: string;
}

@injectable()
export class PreferenceRepository {
  private readonly container;

  constructor() {
    // NOTE: In-memory fallback until Cosmos connection wired in DatabaseService
    if (process.env.COSMOSDB_CONNECTION_STRING) {
      const client = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
      const database = client.database(process.env.COSMOSDB_DATABASE || 'carpool');
      this.container = database.container(
        process.env.COSMOSDB_PREFERENCES_CONTAINER || 'preferences',
      );
    } else {
      this.container = null;
    }
  }

  /**
   * Returns preferences for all parents in a group for the given week.
   */
  async getByGroupAndWeek(groupId: string, weekStartDate: string): Promise<WeeklyPreference[]> {
    if (!this.container) return [];
    const query = {
      query: `SELECT * FROM c WHERE c.groupId = @groupId AND c.weekStartDate = @weekStartDate`,
      parameters: [
        { name: '@groupId', value: groupId },
        { name: '@weekStartDate', value: weekStartDate },
      ],
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  /**
   * Upserts (creates or replaces) a list of preferences for a parent.
   */
  async upsert(
    parentId: string,
    groupId: string,
    weekStartDate: string,
    prefs: Omit<WeeklyPreference, 'id' | 'submittedAt'>[],
  ): Promise<void> {
    if (!this.container) {
      console.warn('[PreferenceRepository] Cosmos container not initialised – skipping db write');
      return;
    }

    const nowIso = new Date().toISOString();
    const operations = prefs.map((p, i) => {
      const item: WeeklyPreference = {
        ...p,
        id: `${parentId}-${weekStartDate}-${i}`,
        parentId,
        groupId,
        weekStartDate,
        submittedAt: nowIso,
      } as WeeklyPreference;
      return item;
    });
    const promises = operations.map((item) => this.container!.items.upsert(item));
    await Promise.all(promises);
  }
}
