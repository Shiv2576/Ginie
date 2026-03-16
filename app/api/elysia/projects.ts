import Elysia from "elysia"

export const projects = new Elysia({ prefix: "/projects" }).post(
  "/",
  async () => {
    return { messages: "Hello from Elysia js" }
  }
)
