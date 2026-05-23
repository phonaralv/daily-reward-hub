import { Generator, getConfig } from "@tanstack/router-generator";
const cfg = await getConfig({
  routesDirectory: "src/routes",
  generatedRouteTree: "src/routeTree.gen.ts",
});
const g = new Generator({ config: cfg, root: process.cwd() });
await g.run();
console.log("regen ok");
