"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildRepository = void 0;
class ChildRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    async create(child) {
        const { resource } = await this.container.items.create(child);
        return resource;
    }
    async findById(id, familyId) {
        try {
            // Both id and partition key (familyId) are needed for lookup
            const { resource } = await this.container
                .item(id, familyId)
                .read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    async update(id, familyId, child) {
        const { resource } = await this.container.item(id, familyId).replace(child);
        return resource;
    }
    async delete(id, familyId) {
        await this.container.item(id, familyId).delete();
    }
    async findByFamilyId(familyId) {
        const query = {
            query: "SELECT * FROM c WHERE c.familyId = @familyId",
            parameters: [{ name: "@familyId", value: familyId }],
        };
        const { resources } = await this.container.items
            .query(query)
            .fetchAll();
        return resources;
    }
}
exports.ChildRepository = ChildRepository;
