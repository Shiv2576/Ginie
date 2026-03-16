"use client"

import AIChatBox from "@/components/ai-chat-box"
import { Button } from "@/components/ui/button"
import { api } from "lib/eden"

export default function Page() {
  return (
    <div className="my-20 flex w-full max-w-3xl flex-col gap-10">
      <AIChatBox />
    </div>
  )
}
