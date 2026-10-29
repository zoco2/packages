/** Wire protocol for /tenantapi/decorate.agent; IDs are assigned by the server. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export type AgentScope = 'page' | 'selected' | 'new_page'
export type ImageSource = 'tenant' | 'content' | 'upload' | 'generate'
export type ReferenceUse = 'asset' | 'layout' | 'style' | 'generation'
export interface ReferenceAttachment {
    file_id: number
    uses: ReferenceUse[]
    url?: string
    width?: number
    height?: number
    name?: string
}
export type AgentOperation = {
    type: 'get_context' | 'catalog' | 'data_sources' | 'links' | 'search_materials' | 'icons' | 'validate' |
        'add_component' | 'update_component' | 'move_component' | 'copy_component' | 'delete_component' |
        'edit_list' | 'configure_page' | 'bind_source' | 'replace_page' | 'request_image'
    [parameter: string]: JsonValue | undefined
}
export interface AgentDecision {
    kind: 'final' | 'tools' | 'clarify'
    operations: AgentOperation[]
    question: string
    facts: JsonValue[]
    warnings: JsonValue[]
}
export interface ImageSlot {
    id: number
    candidate_id: number
    slot_key: string
    attempt: number
    status: string
    consumption_id: number
    image_model_name?: string
    remaining_budget_points?: number | null
    request: Record<string, JsonValue>
    result: Record<string, JsonValue>
}
export interface CandidateRevision {
    id: number
    revision: number
    status: 'building' | 'ready' | 'waiting_images' | 'applied' | 'discarded' | 'rolled_back'
    base_hash: string
    data: JsonValue[]
    meta: JsonValue[]
    name: string
    new_page: boolean
    resolved_sources: Record<string, JsonValue>
    base_data?: JsonValue[]
    base_meta?: JsonValue[]
    changes: JsonValue[]
    image_slots: ImageSlot[]
}
export interface DraftCheckpoint {
    candidate_id: number
    id: number
    page_id: number
    kind: 'apply' | 'create' | 'image' | 'rollback' | 'undo_create'
    create_time: number
    after_hash: string
}
export interface RunEvent {
    id: number
    type: string
    data: Record<string, JsonValue>
    time: number
}
export interface AgentStartInput {
    session_id: number
    message: string
    scope: AgentScope
    selected_id: string
    model_selection: { id: number; sku_id?: number }
    image_model_selection?: Record<string, JsonValue>
    sources: ImageSource[]
    image_strategy: 'existing_first' | 'generate_first'
    attachments: ReferenceAttachment[]
    catalog_hash: string
    budget_points: number
    idempotency_key: string
}
