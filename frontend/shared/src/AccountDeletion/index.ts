export {
  AccountDeletionSurface,
  type AccountDeletionSurfaceProps,
} from "./AccountDeletionSurface.js";
// Copy constants (BUTTONS, HEADERS, etc.) collide with sibling H10
// surfaces in the shared barrel — consumers import them via the deep
// path `@theourgia/shared/AccountDeletion/copy` when needed.
