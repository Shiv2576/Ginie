// build.ts
import { defaultBuildLogger, Template } from "e2b"
import { template as nextJSTemplate } from "./template"

Template.build(nextJSTemplate, "genieai-v1", {
  cpuCount: 2,
  memoryMB: 4096,
  onBuildLogs: defaultBuildLogger(),
})
