import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { OptionItem, ResolvedSearchItem } from '../types'
import { normalizeOptionItems } from './useSearchForm'
import { debounce, isArray, isEmptyValue, isFunction } from '../../utils'

export interface UseFieldOptionsParams {
  item: ResolvedSearchItem
  query: Record<string, any>
  /** 本字段的重载信号：computed(() => context.optionTriggers[item.key] ?? 0) */
  reloadSignal: ComputedRef<number> | Ref<number>
  /** useSearchForm.loadFieldOptions（实例级缓存） */
  loadOptions: (item: ResolvedSearchItem, force?: boolean) => Promise<OptionItem[]>
  /** useSearchForm.remoteSearchOptions */
  remoteSearch: (item: ResolvedSearchItem, keyword: string) => Promise<OptionItem[]>
}

/**
 * 单个筛选控件的选项管理：
 * - 静态数组 / 函数式选项（客户端联动，随 query 重新计算）
 * - 异步选项懒加载（首次展开才请求）+ 依赖变化自动重载
 * - 依赖值为空时禁用控件并清空选项（文档 §5.4）
 * - 远程搜索 300ms 防抖
 */
export function useFieldOptions({ item, query, reloadSignal, loadOptions, remoteSearch }: UseFieldOptionsParams) {
  const config = item.config
  const asyncOptions = ref<OptionItem[]>([])
  const remoteOptions = ref<OptionItem[] | null>(null)
  const loading = ref(false)
  /** 是否已经发起过请求（懒加载标记：未展开过则依赖变化不主动请求） */
  const loaded = ref(false)
  let loadSeq = 0
  let remoteSeq = 0

  /** 依赖值为空 → 控件禁用（文档 §5.4：A 为空则清空选项并禁用） */
  const depsDisabled = computed(() => (config.deps ?? []).some((dep) => isEmptyValue(query[dep])))

  /** 静态 / 函数式选项（客户端联动） */
  const staticOptions = computed<OptionItem[] | undefined>(() => {
    const source = config.options
    if (isArray(source)) return normalizeOptionItems(source, item)
    if (isFunction(source)) return normalizeOptionItems(source({ ...query }) ?? [], item)
    return undefined
  })

  /** 最终选项：静态优先，其次远程搜索结果，最后异步拉取结果 */
  const options = computed<OptionItem[]>(() => staticOptions.value ?? remoteOptions.value ?? asyncOptions.value)

  /** 拉取异步选项（懒加载入口：控件首次展开时调用） */
  async function ensureOptions(force = false): Promise<void> {
    if (!config.api || staticOptions.value !== undefined) return
    remoteOptions.value = null
    if (depsDisabled.value) {
      asyncOptions.value = []
      loaded.value = true
      return
    }
    const seq = ++loadSeq
    loading.value = true
    try {
      const list = await loadOptions(item, force)
      if (seq !== loadSeq) return // 已有更新的请求，丢弃过期结果
      asyncOptions.value = list
      loaded.value = true
    } catch {
      if (seq === loadSeq) asyncOptions.value = []
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  async function runRemoteSearch(keyword: string): Promise<void> {
    if (!config.api) return
    const seq = ++remoteSeq
    loading.value = true
    try {
      const list = await remoteSearch(item, keyword)
      if (seq !== remoteSeq) return
      remoteOptions.value = list
    } catch {
      if (seq === remoteSeq) remoteOptions.value = []
    } finally {
      if (seq === remoteSeq) loading.value = false
    }
  }

  const debouncedRemoteSearch = debounce((keyword: string) => {
    void runRemoteSearch(keyword)
  }, 300)

  /** 远程搜索输入入口（已做 300ms 防抖） */
  function handleRemoteSearch(keyword: string): void {
    if (!config.remote) return
    debouncedRemoteSearch(keyword)
  }

  // 依赖值变化 / 重置：已加载过则强制重载；未展开过则等下次展开用新参数请求
  watch(reloadSignal, () => {
    if (depsDisabled.value) {
      asyncOptions.value = []
      remoteOptions.value = null
      return
    }
    if (loaded.value) void ensureOptions(true)
  })

  return { options, loading, depsDisabled, ensureOptions, handleRemoteSearch }
}

export type UseFieldOptionsReturn = ReturnType<typeof useFieldOptions>
