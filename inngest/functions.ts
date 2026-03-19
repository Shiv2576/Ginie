import {
  createAgent,
  createNetwork,
  createState,
  createTool,
  TextMessage,
  Tool,
  gemini,
} from "@inngest/agent-kit"
import { inngest } from "./client"
import Sandbox from "e2b"
import { getSandbox, toProjectPath } from "@/lib/sandbox"
import { z } from "zod"
import { PROMPT } from "./prompt"

type AgentState = {
  summary: string
  files: Record<string, string>
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent", triggers: [{ event: "code-agent/codeAgent.run" }] },
  async ({ event, step }) => {
    // Step 1: Create sandbox with a generous timeout
    const sandboxId = await step.run("get-or-create", async () => {
      const sandbox = await Sandbox.create("dixitshiva12358/genieai-v1", {
        timeoutMs: 600000, // 10 minutes
      })
      return sandbox.sandboxId
    })

    const codeAgent = createAgent<AgentState>({
      name: "coding agent",
      system: PROMPT,
      description: "An expert coding Agent",
      model: gemini({
        model: "gemini-2.5-flash",
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands in the sandbox",
          parameters: z.object({
            command: z.string(),
          }),
          // ✅ No step.run here — tool handlers run inside the agent network,
          // nesting step.run inside them breaks Inngest's execution model
          handler: async ({ command }) => {
            const buffers = { stdout: "", stderr: "" }
            try {
              const sandbox = await getSandbox(sandboxId)

              const result = await sandbox.commands.run(command, {
                timeoutMs: 120000, // 2 min per command
                onStdout: (data: string) => {
                  buffers.stdout += data
                },
                onStderr: (data: string) => {
                  buffers.stderr += data
                },
              })

              return result.stdout || "(no output)"
            } catch (e) {
              const errorMsg = `Command failed: ${e}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`
              console.error(errorMsg)
              return errorMsg
            }
          },
        }),

        createTool({
          name: "createorUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(z.object({ path: z.string(), content: z.string() })),
          }),
          handler: async ({ files }, { network }: Tool.Options<AgentState>) => {
            try {
              const updatedFiles = { ...(network.state.data.files || {}) }
              const sandbox = await getSandbox(sandboxId)

              for (const file of files) {
                const fullPath = toProjectPath(file.path)
                await sandbox.files.write(fullPath, file.content)
                updatedFiles[file.path] = file.content
              }

              network.state.data.files = updatedFiles
              return `Successfully updated ${files.length} file(s).`
            } catch (e) {
              console.error("createOrUpdateFiles error:", e)
              return `Error: ${e}`
            }
          },
        }),

        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({ files: z.array(z.string()) }),
          handler: async ({ files }) => {
            try {
              const contents: { path: string; content: string }[] = []
              const sandbox = await getSandbox(sandboxId)

              for (const file of files) {
                const fullPath = toProjectPath(file)
                const content = await sandbox.files.read(fullPath)
                contents.push({ path: file, content })
              }

              return JSON.stringify(contents)
            } catch (e) {
              console.error("readFiles error:", e)
              return `Error: ${e}`
            }
          },
        }),
      ],

      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastMessageIndex = result.output.findLastIndex(
            (message) => message.role === "assistant"
          )

          if (lastMessageIndex === -1) {
            console.warn("No assistant message found in output:", result.output)
            return result
          }

          const message = result.output[lastMessageIndex] as
            | TextMessage
            | undefined

          if (!message || !message.content) {
            console.warn("Invalid message format:", message)
            return result
          }

          const lastTextMessage =
            typeof message.content === "string"
              ? message.content
              : message.content?.map((c) => c?.text || "").join("")

          if (lastTextMessage && network) {
            if (lastTextMessage.includes("<task_summary>")) {
              network.state.data.summary = lastTextMessage
            }
          }

          return result
        },
      },
    })

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 20,
      defaultState: createState<AgentState>({
        summary: "",
        files: {},
      }),
      router: async ({ network }) => {
        if (network.state.data.summary) {
          return
        }
        return codeAgent
      },
    })

    // Step 2: Run the agent FIRST so it can make all file changes
    const result = await network.run(event.data.message)

    // Step 3: Restart dev server AFTER agent has made changes
    await step.run("restart-server", async () => {
      const sandbox = await getSandbox(sandboxId)

      await sandbox.commands.run("pkill -f next || true", {
        timeoutMs: 10000,
      })

      sandbox.commands
        .run("npm run dev", {
          background: true,
          onStdout: (data) => console.log("[dev server]", data),
          onStderr: (data) => console.error("[dev server error]", data),
        })
        .catch((err) => console.error("Dev server failed to start:", err))

      await new Promise((r) => setTimeout(r, 8000))
    })

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId)
      const host = sandbox.getHost(3000)
      return `https://${host}`
    })

    return {
      sandboxUrl,
      title: "Code Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    }
  }
)
