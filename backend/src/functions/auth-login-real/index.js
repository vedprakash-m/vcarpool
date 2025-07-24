const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require("bcryptjs");

module.exports = async function (context, req) {
  context.log("Real login function started");

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Email and password required",
        },
      };
      return;
    }

    // Database connection
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || "carpool";

    if (!endpoint || !key) {
      context.log("Missing database configuration");
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Database configuration error",
        },
      };
      return;
    }

    const cosmosClient = new CosmosClient({ endpoint, key });
    const database = cosmosClient.database(databaseId);
    const container = database.container("users");

    // Find user by email
    const querySpec = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email }],
    };

    const { resources: users } = await container.items
      .query(querySpec)
      .fetchAll();

    if (users.length === 0) {
      context.log("User not found:", email);
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Invalid email or password",
        },
      };
      return;
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      context.log("Invalid password for user:", email);
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Invalid email or password",
        },
      };
      return;
    }

    // Remove password hash from response
    const { passwordHash, ...safeUser } = user;

    // Generate a simple token (in production, use proper JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");

    context.log("Login successful for user:", email);
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        data: {
          user: safeUser,
          token: token,
          refreshToken: `refresh_${token}`,
        },
      },
    };
  } catch (error) {
    context.log("Login error:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
    };
  }
};
