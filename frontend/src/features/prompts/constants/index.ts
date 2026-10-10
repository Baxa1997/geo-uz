/** Cookie that remembers the topics column folded, so the server renders the page that way too. */
export const TOPICS_COOKIE = "geo_topics";

/** The orders the topics column can take: as added, by name, by number of questions. Labels in messages/PromptManager.topicsColumn.sort. */
export const TOPIC_SORTS = ["added", "name", "count"] as const;

export type TopicSort = (typeof TOPIC_SORTS)[number];
