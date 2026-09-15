import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// A real table of the example app's own — deliberately not empty. An empty
// schema here would let a GenericDataModel-typed action method through
// undetected. Any app with its own tables must be able to import and call
// this component's actions without a compile error.
export default defineSchema({
  notes: defineTable({
    body: v.string(),
  }),
});
