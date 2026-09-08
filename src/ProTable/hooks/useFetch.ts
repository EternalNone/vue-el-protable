import { ref } from 'vue'
import type { ProTableFieldNames, ProTableOptions } from '../types'
import { createSeq, getByPath, isArray, isFunction, isNil, isPlainObject } from '../../utils'

/** 列表字段候选名（按优先级，见文档 §5.5.1） */
export const LIST_KEYS = ['records', 'list', 'rows', 'items', 'data']
/** 总数字段候选名（按优先级，见文档 §5.5.1） */
export const TOTAL_KEYS = ['total', 'count', 'totalCount', 'totalSize']
/** 顶层找不到列表时尝试剥离的包装层 */
const WRAPPER_KEYS = ['data', 'result']

/** 从任意响应中提取列表数组（自动识别；选项接口也复用） */
export function extractList(res: any): any[] {
  if (isArray(res)) return res
  if (!isPlainObject(res)) return []
  let source: Record<string, any> = res
  // 顶层没有列表字段，且 data / result 是含列表的对象 → 剥一层
  if (!LIST_KEYS.some((k) => isArray(source[k]))) {
    for (const wrap of WRAPPER_KEYS) {
      const inner = source[wrap]
      if (isPlainObject(inner) && LIST_KEYS.some((k) => isArray(inner[k]))) {
        source = inner
        break
      }
    }
  }
  for (const k of LIST_KEYS) {
    if (isArray(source[k])) return source[k]
  }
  return []
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) return Number(value)
  return undefined
}

function findTotal(source: Record<string, any>): number | undefined {
  for (const k of TOTAL_KEYS) {
    const n = toNumber(source[k])
    if (n !== undefined) return n
  }
  // 兼容 total 位于 data / result 包装层内
  for (const wrap of WRAPPER_KEYS) {
    const inner = source[wrap]
    if (isPlainObject(inner)) {
      for (const k of TOTAL_KEYS) {
        const n = toNumber(inner[k])
        if (n !== undefined) return n
      }
    }
  }
  return undefined
}

/** 解析列表响应：数组直接用；否则 fieldNames 映射优先，再自动识别（文档 §5.5.1） */
export function parseListResponse(
  res: any,
  fieldNames?: ProTableFieldNames
): { data: any[]; total: number } {
  if (isArray(res)) return { data: res, total: res.length }
  if (fieldNames?.list) {
    const list = getByPath(res, fieldNames.list)
    const data = isArray(list) ? list : []
    const total = fieldNames.total ? toNumber(getByPath(res, fieldNames.total)) ?? data.length : data.length
    return { data, total }
  }
  const data = extractList(res)
  const total = isPlainObject(res) ? findTotal(res) : undefined
  return { data, total: total ?? data.length }
}

export interface UseFetchParams {
  options: ProTableOptions
  /** 组装查询参数（由 useSearchForm 提供，已处理 splitKeys 拆分与空值过滤） */
  buildQueryParams: () => Record<string, any>
  emit: (event: string, ...args: any[]) => void
}

/** 数据请求：分页参数注入、竞态序号、响应自动识别、前后置钩子 */
export function useFetch({ options, buildQueryParams, emit }: UseFetchParams) {
  const loading = ref(false)
  const tableData = ref<any[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(options.defaultPageSize ?? 10)
  /** 服务端排序参数（仅 sortable: 'custom' 产生） */
  const sortParams = ref<Record<string, any>>({})
  const seq = createSeq()

  const pageKey = options.paginationProps?.page ?? 'page'
  const sizeKey = options.paginationProps?.pageSize ?? 'pageSize'

  async function fetchData(): Promise<void> {
    const api = options.api
    if (!isFunction(api)) {
      tableData.value = []
      total.value = 0
      return
    }
    let params: Record<string, any> = {
      ...buildQueryParams(),
      ...sortParams.value,
      [pageKey]: page.value,
      [sizeKey]: pageSize.value
    }
    // 请求前改写参数；返回 false 中断本次请求
    if (isFunction(options.beforeFetch)) {
      const rewritten = await options.beforeFetch(params)
      if (rewritten === false) return
      if (!isNil(rewritten)) params = rewritten
    }
    const current = seq.next()
    loading.value = true
    try {
      const res = await api(params)
      if (!seq.isLatest(current)) return // 过期响应直接丢弃
      let { data, total: parsedTotal } = parseListResponse(res, options.fieldNames)
      if (isFunction(options.afterFetch)) {
        const processed = options.afterFetch(data)
        if (isArray(processed)) data = processed
      }
      tableData.value = data
      total.value = parsedTotal
      emit('fetch-success', { data, total: parsedTotal, params })
    } catch (error) {
      if (!seq.isLatest(current)) return
      emit('fetch-error', error)
    } finally {
      if (seq.isLatest(current)) loading.value = false
    }
  }

  /** 回到第一页重新查询 */
  function reload(): Promise<void> {
    page.value = 1
    return fetchData()
  }

  /** 保持当前页与当前条件重新请求 */
  function refresh(): Promise<void> {
    return fetchData()
  }

  function handlePageChange(next: number): void {
    if (!next || next === page.value) return
    page.value = next
    emit('page-change', { page: page.value, pageSize: pageSize.value })
    void fetchData()
  }

  function handleSizeChange(size: number): void {
    if (!size || size === pageSize.value) return
    pageSize.value = size
    page.value = 1
    emit('page-change', { page: page.value, pageSize: pageSize.value })
    void fetchData()
  }

  /** 服务端排序：仅处理 sortable: 'custom' 的列，转为请求参数重查 */
  function handleSortChange(payload: { prop?: string; order?: string | null; sortable?: boolean | 'custom' }): void {
    if (payload.sortable !== 'custom') return
    sortParams.value = payload.order
      ? { sortProp: payload.prop, sortOrder: payload.order }
      : {}
    void reload()
  }

  /** 清空排序参数（重置流程使用，不发起请求） */
  function clearSort(): void {
    sortParams.value = {}
  }

  return {
    loading,
    tableData,
    total,
    page,
    pageSize,
    sortParams,
    fetchData,
    reload,
    refresh,
    handlePageChange,
    handleSizeChange,
    handleSortChange,
    clearSort
  }
}

export type UseFetchReturn = ReturnType<typeof useFetch>
