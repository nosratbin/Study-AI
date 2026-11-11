/** Course categories teachers can choose. Matches the categories used by seeded courses and career skill tags. */
export const COURSE_CATEGORIES = [
  { value: "ai_fundamentals", label: "AI fundamentals" },
  { value: "programming", label: "Programming" },
  { value: "machine_learning", label: "Machine learning" },
  { value: "deep_learning", label: "Deep learning" },
  { value: "data_science", label: "Data science" },
  { value: "ai_ethics", label: "AI ethics" },
  { value: "robotics", label: "Robotics" },
] as const;

export function categoryLabel(value: string) {
  return COURSE_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}
