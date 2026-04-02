import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const passkey = pgTable("passkey", {
	id: text("id").primaryKey(),
	name: text("name"),
	publicKey: text("public_key").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	credentialID: text("credential_id").notNull().unique(),
	counter: integer("counter").notNull().default(0),
	deviceType: text("device_type"),
	backedUp: boolean("backed_up").default(false),
	transports: text("transports"),
	aaguid: text("aaguid"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
