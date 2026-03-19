import Elysia from "elysia"
import { inngest } from "@/inngest/client"
import z from "zod"

export const messages = new Elysia({ prefix: "/messages" })
  .get("/", async () => {})
  .post(
    "/",
    async ({ body }) => {
      await inngest.send({
        name: "code-agent/codeAgent.run",
        data: {
          message: body.message,
        },
      })
    },
    {
      body: z.object({
        message: z
          .string()
          .min(3, "Message is Required")
          .max(1000, "Message is too Long"),
      }),
    }
  )
