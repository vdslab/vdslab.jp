import { z } from "zod";

export const memberTypeSchema = z.enum([
  "Staff",
  "Student",
  "GraduateStudent",
  "GraduateStudentDoctor",
]);

export const pictureSchema = z.object({
  url: z.string().min(1).describe("Image URL"),
  width: z.number().int().positive().describe("Image width in pixels"),
  height: z.number().int().positive().describe("Image height in pixels"),
});

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((val) => {
    const d = new Date(val + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
  }, "Invalid calendar date");

// Image tools schemas
export const uploadImageShape = {
  dataBase64: z
    .string()
    .min(1)
    .describe("Base64 or Data URL encoded image (PNG, JPEG, WebP, GIF, max 4MB)"),
  filename: z
    .string()
    .nullable()
    .optional()
    .describe("Optional original file name"),
};

export const listImagesShape = {
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .optional()
    .describe("Page number (1-based, default: 1)"),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional()
    .describe("Items per page (default: 20, max: 100)"),
};

export const deleteImageShape = {
  id: z.string().min(1).describe("Image ID to delete"),
  force: z
    .boolean()
    .default(false)
    .optional()
    .describe("Force deletion even if referenced by member/project/product"),
};

// News tools schemas
export const listNewsShape = {
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .optional()
    .describe("Page number (1-based, default: 1)"),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe("Items per page (default: 10, max: 100)"),
};

export const getNewsShape = {
  id: z.string().min(1).describe("News post ID"),
};

export const createNewsShape = {
  title: z.string().min(1).describe("News title"),
  content: z.string().min(1).describe("News body (Markdown supported)"),
  date: dateSchema.describe("Publication date in YYYY-MM-DD format"),
  id: z
    .string()
    .nullable()
    .optional()
    .describe("Optional custom ID (defaults to UUID)"),
};

export const updateNewsShape = {
  id: z.string().min(1).describe("News post ID to update"),
  title: z.string().min(1).optional().describe("Updated title"),
  content: z.string().nullable().optional().describe("Updated body"),
  date: dateSchema.optional().describe("Updated date in YYYY-MM-DD format"),
};

export const deleteNewsShape = {
  id: z.string().min(1).describe("News post ID to delete"),
};

// Member tools schemas
export const listMembersShape = {
  type: memberTypeSchema
    .optional()
    .describe("Filter by member type (Staff, Student, GraduateStudent, GraduateStudentDoctor)"),
  assignedYear: z
    .number()
    .int()
    .optional()
    .describe("Filter by assigned year (e.g. 2024)"),
};

export const getMemberShape = {
  id: z.string().min(1).describe("Member ID"),
};

export const createMemberShape = {
  name: z.string().min(1).describe("Member full name"),
  type: memberTypeSchema.describe("Member type"),
  assignedYear: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe("Assigned year (required if type !== 'Staff')"),
  title: z.string().nullable().optional().describe("Title / role (e.g. 教授, B4)"),
  description: z.string().nullable().optional().describe("Bio / research topic"),
  order: z.number().int().default(0).optional().describe("Display order"),
  imageId: z
    .string()
    .nullable()
    .optional()
    .describe("ID from images table to automatically set picture_url, width, height"),
  picture: pictureSchema
    .nullable()
    .optional()
    .describe("Direct picture object { url, width, height }"),
  id: z
    .string()
    .nullable()
    .optional()
    .describe("Optional custom ID (defaults to UUID)"),
};

export const updateMemberShape = {
  id: z.string().min(1).describe("Member ID to update"),
  name: z.string().min(1).optional().describe("Updated name"),
  type: memberTypeSchema.optional().describe("Updated type"),
  assignedYear: z.number().int().nullable().optional().describe("Updated assigned year"),
  title: z.string().nullable().optional().describe("Updated title"),
  description: z.string().nullable().optional().describe("Updated description"),
  order: z.number().int().optional().describe("Updated display order"),
  imageId: z
    .string()
    .nullable()
    .optional()
    .describe("Set image from images table, or null to clear image"),
  picture: pictureSchema
    .nullable()
    .optional()
    .describe("Direct picture object, or null to clear image"),
};

export const deleteMemberShape = {
  id: z.string().min(1).describe("Member ID to delete"),
};

// Project tools schemas
export const listProjectsShape = {
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .optional()
    .describe("Page number (1-based, default: 1)"),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe("Items per page (default: 10, max: 100)"),
  categoryId: z.string().optional().describe("Filter by category ID"),
};

export const getProjectShape = {
  id: z.string().min(1).describe("Project ID"),
};

export const createProjectShape = {
  name: z.string().min(1).describe("Project name"),
  startYear: z.number().int().describe("Start year (e.g. 2023)"),
  endYear: z.number().int().nullable().optional().describe("End year (null if ongoing)"),
  description: z.string().nullable().optional().describe("Project description"),
  categoryIds: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Category IDs linked to this project"),
  imageId: z
    .string()
    .nullable()
    .optional()
    .describe("ID from images table to automatically set picture_url, width, height"),
  picture: pictureSchema
    .nullable()
    .optional()
    .describe("Direct picture object { url, width, height }"),
  id: z
    .string()
    .nullable()
    .optional()
    .describe("Optional custom ID (defaults to UUID)"),
};

export const updateProjectShape = {
  id: z.string().min(1).describe("Project ID to update"),
  name: z.string().min(1).optional().describe("Updated name"),
  startYear: z.number().int().optional().describe("Updated start year"),
  endYear: z.number().int().nullable().optional().describe("Updated end year"),
  description: z.string().nullable().optional().describe("Updated description"),
  categoryIds: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Replace associated category IDs (if provided)"),
  imageId: z
    .string()
    .nullable()
    .optional()
    .describe("Set image from images table, or null to clear image"),
  picture: pictureSchema
    .nullable()
    .optional()
    .describe("Direct picture object, or null to clear image"),
};

export const deleteProjectShape = {
  id: z.string().min(1).describe("Project ID to delete"),
};

// Product tools schemas
export const listProductsShape = {
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .optional()
    .describe("Page number (1-based, default: 1)"),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe("Items per page (default: 10, max: 100)"),
  categoryId: z.string().optional().describe("Filter by category ID"),
};

export const getProductShape = {
  id: z.string().min(1).describe("Product ID"),
};

export const createProductShape = {
  name: z.string().min(1).describe("Product name"),
  publishYear: z.number().int().describe("Publish year (e.g. 2024)"),
  description: z.string().nullable().optional().describe("Product description"),
  categoryIds: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Category IDs linked to this product"),
  imageId: z
    .string()
    .nullable()
    .optional()
    .describe("ID from images table to automatically set picture_url, width, height"),
  picture: pictureSchema
    .nullable()
    .optional()
    .describe("Direct picture object { url, width, height }"),
  id: z
    .string()
    .nullable()
    .optional()
    .describe("Optional custom ID (defaults to UUID)"),
};

export const updateProductShape = {
  id: z.string().min(1).describe("Product ID to update"),
  name: z.string().min(1).optional().describe("Updated name"),
  publishYear: z.number().int().optional().describe("Updated publish year"),
  description: z.string().nullable().optional().describe("Updated description"),
  categoryIds: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Replace associated category IDs (if provided)"),
  imageId: z
    .string()
    .nullable()
    .optional()
    .describe("Set image from images table, or null to clear image"),
  picture: pictureSchema
    .nullable()
    .optional()
    .describe("Direct picture object, or null to clear image"),
};

export const deleteProductShape = {
  id: z.string().min(1).describe("Product ID to delete"),
};

// Category tools schemas
export const listCategoriesShape = {};

export const createCategoryShape = {
  name: z.string().min(1).describe("Category name"),
  id: z
    .string()
    .nullable()
    .optional()
    .describe("Optional custom ID (defaults to UUID)"),
};

export const updateCategoryShape = {
  id: z.string().min(1).describe("Category ID to update"),
  name: z.string().min(1).describe("New category name"),
};

export const deleteCategoryShape = {
  id: z.string().min(1).describe("Category ID to delete"),
  force: z
    .boolean()
    .default(false)
    .optional()
    .describe("Force deletion even if linked to projects or products"),
};
