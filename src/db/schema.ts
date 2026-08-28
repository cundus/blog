import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const posts = pgTable(
	'posts',
	{
		id: text('id').primaryKey().$defaultFn(() => createId()),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description').notNull(),
		body: text('body').notNull(),
		pubDate: timestamp('pub_date', { withTimezone: true }).notNull().defaultNow(),
		updatedDate: timestamp('updated_date', { withTimezone: true }).$onUpdate(() => new Date()),
		published: boolean('published').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		publishedPubDateIdx: index('posts_published_pubdate_idx').on(t.published, t.pubDate),
	}),
);

export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey().$defaultFn(() => createId()),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		expiresAtIdx: index('sessions_expires_at_idx').on(t.expiresAt),
	}),
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
