/**
 * API error hierarchy.
 *
 * Three classes:
 *   - ApiError: server returned 4xx/5xx with an RFC 7807 Problem payload
 *   - UnauthorizedError / NotFoundError: subclasses of ApiError for the
 *     two statuses callers most often want to branch on
 *   - NetworkError: the request never reached the server (DNS, timeout,
 *     abort, offline, etc.)
 */

import type { Problem } from "./types.js";

export class ApiError extends Error {
  status: number;
  problem: Problem;

  constructor(status: number, problem: Problem) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(problem: Problem) {
    super(401, problem);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends ApiError {
  constructor(problem: Problem) {
    super(404, problem);
    this.name = "NotFoundError";
  }
}

export class NetworkError extends Error {
  override cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "NetworkError";
    if (cause !== undefined) this.cause = cause;
  }
}

/** Convert an HTTP status + parsed problem into the right error subclass. */
export function errorFromResponse(status: number, problem: Problem): ApiError {
  if (status === 401) return new UnauthorizedError(problem);
  if (status === 404) return new NotFoundError(problem);
  return new ApiError(status, problem);
}
