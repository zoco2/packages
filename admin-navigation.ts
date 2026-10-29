/** Touch-only devices need inline submenu controls instead of hover popovers. */
export function isAdminDrawerViewport(width: number, touchOnly: boolean) {
    return width <= 1024 || touchOnly
}
