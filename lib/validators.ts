import { z } from "zod";

function moneyField(label: string) {
  return z.number({
    invalid_type_error: `${label} must be a number.`,
  });
}

export const compensationPatchSchema = z
  .object({
    baseSalary: moneyField("Base salary")
      .positive("Base salary must be greater than zero.")
      .max(100_000_000, "Base salary is too large.")
      .optional(),
    bonus: moneyField("Bonus").nonnegative("Bonus cannot be negative.").max(100_000_000, "Bonus is too large.").optional(),
    allowance: moneyField("Allowance")
      .nonnegative("Allowance cannot be negative.")
      .max(100_000_000, "Allowance is too large.")
      .optional(),
    currency: z.enum(["USD", "GBP", "EUR", "INR", "CAD", "JPY", "AUD"]).optional(),
    changedBy: z.string().trim().min(1).max(80).optional(),
  })
  .refine(
    (value) =>
      value.baseSalary !== undefined ||
      value.bonus !== undefined ||
      value.allowance !== undefined ||
      value.currency !== undefined,
    { message: "Provide at least one compensation field to update." },
  );

export const orgQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a slightly more specific question.")
    .max(300, "Keep the question under 300 characters."),
});

export type CompensationPatch = z.infer<typeof compensationPatchSchema>;
