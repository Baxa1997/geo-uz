import { notFound } from "next/navigation";
import { ApiError } from "./client";

/** Shows the 404 page when the backend says the resource doesn't exist. */
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

/** Null instead of an error, for optional data such as the report of a project that hasn't run yet. */
export function orNull<T>(request: Promise<T>): Promise<T | null> {
  return request.catch((error: unknown) => {
    if (error instanceof ApiError) return null;
    throw error;
  });
}
