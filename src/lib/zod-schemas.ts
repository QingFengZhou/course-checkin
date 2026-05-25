import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  username: z.string().min(1, "Username is required").optional(),
  password: z.string().min(1, "Password is required"),
}).refine(data => data.email || data.username, {
  message: "Email or username is required",
});

export const setupSchema = z.object({
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required"),
});
