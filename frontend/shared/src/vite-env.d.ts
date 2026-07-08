/// <reference types="vite/client" />

// Vite ?url imports return a string. This ambient declaration lets
// TypeScript know the shape without pulling `vite/client` into every
// tsconfig that consumes the shared package.
declare module "*?url" {
  const src: string;
  export default src;
}
