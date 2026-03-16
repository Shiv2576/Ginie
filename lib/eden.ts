import { App } from "@/app/api/[[...slugs]]/route"
import { treaty } from "@elysiajs/eden"

export const apiClient = treaty<App>("localhost:3000").api
