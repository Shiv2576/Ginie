"use client"
import { FieldGroup } from "./ui/field"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import {
  IconArrowUp,
  IconLoader2,
  IconPaperclip,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { Textarea } from "./ui/textarea"
import Image from "next/image"
import { useUploadThing } from "@/lib/uploadthing"
import { toast } from "sonner"
import { apiClient } from "@/lib/eden"

interface Props {
  projectId: string
}

const messageSchema = z.object({
  message: z
    .string()
    .min(3, "Message is required")
    .max(1000, "Message is too Long"),
})

export default function AIChatBox({ projectId }: Props) {
  const router = useRouter()

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "" },
  })

  const fileref = useRef<HTMLInputElement | null>(null)

  const [attachedFile, setAttachedFile] = useState<File | null>()
  const [imagePreview, setImagePreview] = useState("")
  const { startUpload, isUploading } = useUploadThing("designImageUploader")

  const onSubmit = async ({ message }: z.infer<typeof messageSchema>) => {
    const cleanMessage = message.trim() ?? ""

    try {
      if (!cleanMessage && attachedFile) {
        toast.error("Type a Message or upload an image")
      }

      const files = [attachedFile as File]
      const res = await startUpload(files)

      const url = res?.[0]?.ufsUrl

      if (!projectId) {
        const res = await apiClient.projects.post()

        if (res) {
          router.push(`/projects/${res.data.id}`)
        }
      }

      await apiClient.messages.post({})
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload Message")
    } finally {
      form.reset()
      setAttachedFile(null)
      setImagePreview("")
      router.refresh()
    }
  }

  const handleKeydown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      await form.handleSubmit(onSubmit)(e)

      form.reset()
    }
  }

  const removeFile = () => {
    setAttachedFile(null)
    setImagePreview("")
  }

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File
    if (!file.type.startsWith("image/")) {
      toast.error("Only Images are supported")
    }

    const reader = new FileReader()

    reader.onload = () => {
      setImagePreview(reader.result as string)
    }

    reader.readAsDataURL(file)
    setImagePreview(reader.result as string)
    setAttachedFile(file)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      <form
        id="message-form"
        onSubmit={form.handleSubmit(onSubmit)}
        style={{ backgroundColor: "#2f2f2f" }}
        className="rounded-2xl border border-white/10 px-5 pt-5 pb-3 shadow-lg"
      >
        {imagePreview && attachedFile && (
          <div className="relative mb-2 flex w-fit items-center gap-2 overflow-hidden">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <Image
                alt={attachedFile.name}
                src={imagePreview}
                fill
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="absolute top-0 right-0 z-10 cursor-pointer rounded-full bg-[#f7f4ee] p-1 shadow-2xl"
            >
              <IconX size={16} />
            </button>
          </div>
        )}
        <FieldGroup>
          <Controller
            name="message"
            control={form.control}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Ask Genie AI..."
                onKeyDown={handleKeydown}
                style={{
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  outline: "none",
                  resize: "none",
                  padding: "0",
                  minHeight: "80px",
                  maxHeight: "200px",
                  width: "100%",
                  fontSize: "0.875rem",
                  lineHeight: "1.6",
                  color: "white",
                  display: "block",
                }}
                // inline style for placeholder since Tailwind may not apply
                onFocus={(e) => (e.target.style.outline = "none")}
              />
            )}
          />
        </FieldGroup>

        {/* Toolbar */}
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <input
            type="file"
            className="sr-only"
            multiple
            onChange={handleSelectFile}
            ref={fileref}
          />
          <button
            type="button"
            onClick={() => fileref.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/80"
          >
            <IconPaperclip className="h-4 w-4" />
            <span>Attach</span>
          </button>

          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-40"
            disabled={!form.watch("message")}
          >
            {form.formState.isSubmitting || isUploading ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconArrowUp size={16} />
            )}
          </button>
        </div>
      </form>

      {/* Global placeholder color fix */}
      <style>{`
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  )
}
