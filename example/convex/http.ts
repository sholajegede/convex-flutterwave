import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { Flutterwave } from "../../src/client/index.js";

const flutterwave = new Flutterwave(components.convexFlutterwave, {
  secretKey: process.env.FLW_SECRET_KEY!,
  webhookSecretHash: process.env.FLW_WEBHOOK_SECRET_HASH!,
});

const http = httpRouter();

http.route({
  path: "/webhooks/flutterwave",
  method: "POST",
  handler: flutterwave.webhookHandler,
});

export default http;
