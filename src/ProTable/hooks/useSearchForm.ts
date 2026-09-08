import { computed, reactive, type ComputedRef } from 'vue'
import type { NormalizedColumn, OptionItem, ProTableOptions, ResolvedSearchItem } from '../types'
import { extractList } from './useFetch'
import { getByPath, isArray, isEmptyValue, isFunction, isNil, isPlainObject, resolveValue } from '../../utils'

export interface UseSearchFormParams {
  columnTree: ComputedRef<NormalizedColumn[]>
  options: ProTableOptions
  emit: (event: string, ...args: any[]) => void
  /** 点击查询 / searchOnChange 触发的查询（通常为 reload：回第一页重查） */
  onSearch: () => void
  /** 重置按钮触发的查询（排序参数由外层清空） */
  onReset: () => void
}

/** 深度遍历列树，收集所有参与筛选的项 */
function collectSearchItems(tree: NormalizedColumn[]): ResolvedSearchItem[] {
  const items: ResolvedSearchItem[] = []
  const walk = (columns: NormalizedColumn[]): void => {
    for (const col of columns) {
      if (col.searchEnabled && col.searchConfig) {
        items.push({
          key: col.searchConfig.key,
          label: col.searchConfig.label,
          type: col.searchConfig.type,
          config: col.searchConfig,
          colSpan: col.searchConfig.colSpan ?? 6,
          columnUid: col.uid
        })
      }
      if (col.children?.length) walk(col.children)
    }
  }
  walk(tree)
  return items
}

/** 选项字段映射：labelKeys 文本拼接、children 递归（选项接口与静态选项共用） */
export function normalizeOptionItems(rawList: any[], item: ResolvedSearchItem): OptionItem[] {
  const { fieldNames, labelKeys } = item.config
  const labelKey = fieldNames?.label ?? 'label'
  const valueKey = fieldNames?.value ?? 'value'
  const childrenKey = fieldNames?.children ?? 'children'
  const mapItem = (source: any): OptionItem => {
    if (!isPlainObject(source)) return { label: String(source), value: source }
    const baseLabel = getByPath(source, labelKey)
    const label = labelKeys?.length
      ? [baseLabel, ...labelKeys.map((k) => getByPath(source, k))]
          .filter((v) => !isNil(v) && v !== '')
          .join('')
      : baseLabel
    const rawValue = getByPath(source, valueKey)
    const rawChildren = source[childrenKey]
    return {
      ...source,
      label: isNil(label) ? source.label : label,
      value: isNil(rawValue) ? source.value : rawValue,
      children: isArray(rawChildren) ? rawChildren.map(mapItem) : undefined
    }
  }
  return rawList.map(mapItem)
}

function cloneValue(value: any): any {
  if (isArray(value)) return value.slice()
  if (isPlainObject(value)) return { ...value }
  return value
}

/** 筛选表单：查询参数管理、重置、依赖图联动、选项接口缓存 */
export function useSearchForm({ columnTree, options, emit, onSearch, onReset }: UseSearchFormParams) {
  void options
  const query = reactive<Record<string, any>>({})

  /** 全部筛选项（含动态隐藏项：收起/隐藏项仍参与提交，见文档 §5.3.2 规则 4） */
  const allSearchItems = computed(() => collectSearchItems(columnTree.value))
  const itemMap = computed(() => new Map(allSearchItems.value.map((i) => [i.key, i])))

  /** 渲染列表：按 config.visible 动态显隐过滤 */
  const searchItems = computed(() =>
    allSearchItems.value.filter((item) => resolveValue(item.config.visible, { ...query }) !== false)
  )

  /** 依赖图：被依赖字段 -> 依赖它的下游字段（只依赖配置，computed 缓存） */
  const dependentsMap = computed(() => {
    const map = new Map<string, string[]>()
    for (const item of allSearchItems.value) {
      for (const dep of item.config.deps ?? []) {
        if (!map.has(dep)) map.set(dep, [])
        map.get(dep)!.push(item.key)
      }
    }
    return map
  })

  /** 字段选项实例级缓存：key -> { 请求参数指纹, 选项 }，同一 (api, params) 组合复用 */
  const optionsCache = new Map<string, { fingerprint: string; options: OptionItem[] }>()
  /** 字段选项重载信号（依赖值变化 / 重置时自增，FieldRenderer 监听） */
  const optionTriggers = reactive<Record<string, number>>({})

  /** 以 defaultValue 初始化查询参数（挂载时调用一次） */
  function initQuery(): void {
    for (const item of allSearchItems.value) {
      if (!(item.key in query)) query[item.key] = cloneValue(item.config.defaultValue)
    }
  }

  function getQuery(): Record<string, any> {
    return { ...query }
  }

  /** 部分合并写入（不自动发起查询） */
  function setQuery(patch: Record<string, any>): void {
    Object.assign(query, patch)
  }

  /** 组装请求参数：过滤空值；范围类字段按 splitKeys 拆成两个参数 */
  function buildQueryParams(): Record<string, any> {
    const params: Record<string, any> = {}
    for (const item of allSearchItems.value) {
      const value = query[item.key]
      if (isEmptyValue(value)) continue
      const splitKeys = item.config.splitKeys
      if (splitKeys && isArray(value) && value.length === 2) {
        params[splitKeys.start] = value[0]
        params[splitKeys.end] = value[1]
        continue
      }
      params[item.key] = value
    }
    return params
  }

  /** 链式清空下游字段（含循环检测），返回被清空的键列表 */
  function cascadeClear(rootKey: string): string[] {
    const visited = new Set<string>([rootKey])
    const cleared: string[] = []
    const queue: string[] = [rootKey]
    while (queue.length) {
      const key = queue.shift()!
      for (const depKey of dependentsMap.value.get(key) ?? []) {
        if (visited.has(depKey)) {
          console.warn(`[vue-el-protable] 检测到循环联动依赖，已跳过：${key} -> ${depKey}`)
          continue
        }
        visited.add(depKey)
        cleared.push(depKey)
        queue.push(depKey)
      }
    }
    for (const key of cleared) {
      query[key] = cloneValue(itemMap.value.get(key)?.config.defaultValue)
      optionTriggers[key] = (optionTriggers[key] ?? 0) + 1
    }
    return cleared
  }

  /** 字段值变化统一入口（控件变化、远程联动都走这里） */
  function handleFieldChange(key: string, value: any): void {
    query[key] = value
    emit('query-change', { ...query })
    const cleared = cascadeClear(key)
    const item = itemMap.value.get(key)
    const shouldSubmit =
      item?.config.searchOnChange || cleared.some((k) => itemMap.value.get(k)?.config.searchOnChange)
    if (shouldSubmit) onSearch()
  }

  /** 点击查询按钮 */
  function handleSearch(): void {
    emit('search', { ...query })
    onSearch()
  }

  /** 重置：恢复默认值 → 触发依赖字段选项重载 → 查询（排序参数由外层清空） */
  function handleReset(): void {
    for (const item of allSearchItems.value) {
      query[item.key] = cloneValue(item.config.defaultValue)
    }
    for (const item of allSearchItems.value) {
      if (item.config.deps?.length) optionTriggers[item.key] = (optionTriggers[item.key] ?? 0) + 1
    }
    emit('reset', { ...query })
    onReset()
  }

  /** 依赖值是否存在空值（为空时下游控件禁用、选项清空，见文档 §5.4） */
  function isDepsEmpty(item: ResolvedSearchItem): boolean {
    return (item.config.deps ?? []).some((dep) => isEmptyValue(query[dep]))
  }

  /** 组装选项 api 请求参数：自动合并依赖值 + apiParams（文档 §5.4 示例） */
  async function resolveOptionParams(item: ResolvedSearchItem): Promise<Record<string, any>> {
    const params: Record<string, any> = {}
    for (const dep of item.config.deps ?? []) params[dep] = query[dep]
    const extra = await resolveValue(item.config.apiParams, { ...query })
    if (isPlainObject(extra)) Object.assign(params, extra)
    return params
  }

  /** 拉取字段选项（首次展开才请求；同实例内按 参数指纹 缓存复用） */
  async function loadFieldOptions(item: ResolvedSearchItem, force = false): Promise<OptionItem[]> {
    const api = item.config.api
    if (!isFunction(api)) return []
    const params = await resolveOptionParams(item)
    const fingerprint = JSON.stringify(params)
    const cached = optionsCache.get(item.key)
    if (!force && cached && cached.fingerprint === fingerprint) return cached.options
    const res = await api(params)
    const opts = normalizeOptionItems(extractList(res), item)
    optionsCache.set(item.key, { fingerprint, options: opts })
    return opts
  }

  /** 远程搜索（不走缓存，关键字参数名固定为 keyword） */
  async function remoteSearchOptions(item: ResolvedSearchItem, keyword: string): Promise<OptionItem[]> {
    const api = item.config.api
    if (!isFunction(api)) return []
    const params = await resolveOptionParams(item)
    const res = await api({ ...params, keyword })
    return normalizeOptionItems(extractList(res), item)
  }

  return {
    query,
    allSearchItems,
    searchItems,
    optionTriggers,
    initQuery,
    getQuery,
    setQuery,
    buildQueryParams,
    handleFieldChange,
    handleSearch,
    handleReset,
    isDepsEmpty,
    loadFieldOptions,
    remoteSearchOptions
  }
}

export type SearchFormContext = ReturnType<typeof useSearchForm>
