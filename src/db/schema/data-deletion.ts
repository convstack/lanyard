import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const dataDeletionRequest = pgTable("data_deletion_request", {
	id: text("id").primaryKey(),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	userEmail: text("user_email").notNull(),
	userName: text("user_name").notNull(),
	reason: text("reason").notNull(),
	additionalInfo: text("additional_info"),
	status: text("status").notNull().default("pending"),
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at"),
	reviewNote: text("review_note"),
	scheduledDeletionAt: timestamp("scheduled_deletion_at"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
