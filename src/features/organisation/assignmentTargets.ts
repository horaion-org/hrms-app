// pages/CreateSchedule.tsx still imports placeOf from this old path: open PR #99 edits that page, so the
// access-roles move leaves it alone. Import from features/workspace/places everywhere else; delete this file
// once #99 lands and CreateSchedule imports from there.
export { placeOf } from "@/features/workspace/places";
