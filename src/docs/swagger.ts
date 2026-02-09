/// <reference path="./swagger-jsdoc.d.ts" />

import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Safepulse API",
      version: "1.0.0",
      description: "API documentation for SafePulse backend",
    },
    servers: [
      { url: "http://localhost:4000", description: "Development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/app.ts"],
});
