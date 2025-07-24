"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyRepository = void 0;
class FamilyRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    async create(family) {
        const { resource } = await this.container.items.create(family);
        return resource;
    }
    async findById(id) {
        try {
            const { resource } = await this.container.item(id, id).read(); // Partition key is the id
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    async update(id, family) {
        const { resource } = await this.container.item(id, id).replace(family);
        return resource;
    }
    async delete(id) {
        await this.container.item(id, id).delete();
    }
    async findByParentId(parentId) {
        const query = {
            query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.parentIds, @parentId)",
            parameters: [{ name: "@parentId", value: parentId }],
        };
        const { resources } = await this.container.items
            .query(query)
            .fetchAll();
        return resources;
    }
}
exports.FamilyRepository = FamilyRepository;
