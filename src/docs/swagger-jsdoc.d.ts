declare module "swagger-jsdoc" {
  interface SwaggerJSDocOptions {
    definition?: Record<string, unknown>;
    apis?: string[];
  }
  function swaggerJSDoc(options: SwaggerJSDocOptions): Record<string, unknown>;
  export = swaggerJSDoc;
}
