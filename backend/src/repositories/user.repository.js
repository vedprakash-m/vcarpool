"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
class UserRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    async create(user) {
        const { resource } = await this.container.items.create(user);
        return resource;
    }
    async findById(id) {
        try {
            const { resource } = await this.container.item(id).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    async findByEmail(email) {
        const query = {
            query: "SELECT * FROM c WHERE c.email = @email",
            parameters: [{ name: "@email", value: email }]
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources.length > 0 ? resources[0] : null;
    }
    async update(id, user) {
        const { resource } = await this.container.item(id).replace(user);
        return resource;
    }
    async delete(id) {
        await this.container.item(id).delete();
    }
    async findAll() {
        const query = "SELECT * FROM c";
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    async query(querySpec) {
        const { resources } = await this.container.items.query(querySpec).fetchAll();
        return resources;
    }
}
exports.UserRepository = UserRepository;
