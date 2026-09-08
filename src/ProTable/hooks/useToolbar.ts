import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** 工具栏能力：全屏（原生 Fullscreen API + CSS 类兜底） */
export function useToolbar(rootEl: Ref<HTMLElement | undefined>) {
  const isFullscreen = ref(false)

  async function toggleFullscreen(): Promise<void> {
    const el = rootEl.value
    if (!el) return
    if (!isFullscreen.value) {
      isFullscreen.value = true
      try {
        await el.requestFullscreen()
      } catch {
        /* 浏览器不支持或拒绝授权时，保持 CSS 全屏（类驱动）兜底 */
      }
    } else {
      isFullscreen.value = false
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen()
        } catch {
          /* 忽略 */
        }
      }
    }
  }

  // 用户按 Esc 退出原生全屏时同步状态
  const onFullscreenChange = (): void => {
    if (!document.fullscreenElement) isFullscreen.value = false
  }
  onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange))
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullscreenChange))

  return { isFullscreen, toggleFullscreen }
}

export type UseToolbarReturn = ReturnType<typeof useToolbar>
