import { defineApp } from "convex/server";
import convexFlutterwave from "../../src/component/convex.config.js";

const app = defineApp();
app.use(convexFlutterwave);

export default app;
