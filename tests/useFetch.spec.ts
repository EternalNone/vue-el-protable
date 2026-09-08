import { describe, expect, it, vi } from 'vitest'
import { extractList, parseListResponse, useFetch } from '../src/ProTable/hooks/useFetch'
import type { ProTableOptions } from '../src/ProTable/types/options'

/** 手工构造可控 Promise，用于精确安排请求返回顺序（竞态测试） */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 冲刷微任务链，等待已触发的异步请求全部落定 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/** 创建 useFetch 实例，并附带 emit 断言桩 */
function createFetch(options: ProTableOptions, buildQueryParams: () => Record<string, any> = () => ({})) {
  const emit = vi.fn()
  const fetcher = useFetch({ options, buildQueryParams, emit })
  return { fetcher, emit }
}

/** 取 api 最后一次调用收到的请求参数 */
function lastParams(api: any): Record<string, any> {
  return api.mock.lastCall?.[0]
}

describe('parseListResponse 自动识别矩阵', () => {
  it('纯数组响应：total 取数组长度', () => {
    const rows = [{ id: 1 }, { id: 2 }]
    expect(parseListResponse(rows)).toEqual({ data: rows, total: 2 })
  })

  it('顶层 records + total', () => {
    expect(parseListResponse({ records: [{ id: 1 }], total: 42 })).toEqual({
      data: [{ id: 1 }],
      total: 42
    })
  })

  it('data 包装层自动剥离（list + count）', () => {
    expect(parseListResponse({ data: { list: [{ id: 1 }], count: 7 } })).toEqual({
      data: [{ id: 1 }],
      total: 7
    })
  })

  it('result 包装层自动剥离（rows + totalCount）', () => {
    expect(parseListResponse({ result: { rows: [{ id: 1 }], totalCount: 5 } })).toEqual({
      data: [{ id: 1 }],
      total: 5
    })
  })

  it('fieldNames 点路径优先于自动识别', () => {
    const res = { payload: { rows: [{ id: 1 }], amount: 3 }, records: [{ id: 9 }] }
    expect(parseListResponse(res, { list: 'payload.rows', total: 'payload.amount' })).toEqual({
      data: [{ id: 1 }],
      total: 3
    })
  })

  it('fieldNames 未指定 total 时取列表长度', () => {
    const res = { payload: { rows: [{ id: 1 }, { id: 2 }] } }
    expect(parseListResponse(res, { list: 'payload.rows' })).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      total: 2
    })
  })

  it('fieldNames 路径取不到值时返回空表', () => {
    expect(parseListResponse({ other: 1 }, { list: 'payload.rows' })).toEqual({ data: [], total: 0 })
  })

  it('total 为数字字符串时转换为数字', () => {
    expect(parseListResponse({ records: [{ id: 1 }], total: '15' })).toEqual({
      data: [{ id: 1 }],
      total: 15
    })
  })

  it('自动识别时无 total 字段则取列表长度', () => {
    expect(parseListResponse({ records: [{ id: 1 }, { id: 2 }] })).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      total: 2
    })
  })
})

describe('extractList 列表字段探测顺序', () => {
  it.each(['records', 'list', 'rows', 'items', 'data'])('单独出现 %s 时可识别', (key) => {
    expect(extractList({ [key]: [{ id: 1 }] })).toEqual([{ id: 1 }])
  })

  it('多候选键共存时按优先级取前者', () => {
    const pool: Record<string, any[]> = {
      records: ['a'],
      list: ['b'],
      rows: ['c'],
      items: ['d'],
      data: ['e']
    }
    const keys = ['records', 'list', 'rows', 'items', 'data']
    keys.forEach((key, index) => {
      // 逐步移除更高优先级的键，验证顺位生效
      const source: Record<string, any> = {}
      for (const k of keys.slice(index)) source[k] = pool[k]
      expect(extractList(source)).toEqual(pool[key])
    })
  })

  it('total 字段按 total > count > totalCount > totalSize 识别', () => {
    const keys = ['total', 'count', 'totalCount', 'totalSize']
    keys.forEach((_key, index) => {
      const source: Record<string, any> = { records: [{ id: 1 }] }
      for (const k of keys.slice(index)) source[k] = index + 1
      expect(parseListResponse(source).total).toBe(index + 1)
    })
  })

  it('非对象响应返回空数组', () => {
    expect(extractList(null)).toEqual([])
    expect(extractList('abc')).toEqual([])
    expect(extractList(123)).toEqual([])
  })
})

describe('useFetch 参数组装', () => {
  it('查询条件 + 分页参数', async () => {
    const api = vi.fn(async () => ({ records: [], total: 0 }))
    const { fetcher } = createFetch({ api }, () => ({ keyword: 'k' }))
    await fetcher.fetchData()
    expect(lastParams(api)).toEqual({ keyword: 'k', page: 1, pageSize: 10 })
  })

  it('请求期间 loading 为 true，结束后回落', async () => {
    const pending = deferred<any>()
    const api = vi.fn(() => pending.promise)
    const { fetcher } = createFetch({ api })
    const task = fetcher.fetchData()
    await flush()
    expect(fetcher.loading.value).toBe(true)
    pending.resolve({ records: [{ id: 1 }], total: 1 })
    await task
    expect(fetcher.loading.value).toBe(false)
  })

  it('paginationProps 覆盖分页参数名与默认页大小', async () => {
    const api = vi.fn(async () => ({ records: [], total: 0 }))
    const options: ProTableOptions = {
      api,
      paginationProps: { page: 'pageNum', pageSize: 'size' },
      defaultPageSize: 30
    }
    const { fetcher } = createFetch(options)
    await fetcher.fetchData()
    expect(lastParams(api)).toMatchObject({ pageNum: 1, size: 30 })
    expect(lastParams(api)).not.toHaveProperty('page')
    expect(lastParams(api)).not.toHaveProperty('pageSize')
  })
})

describe('useFetch 服务端排序', () => {
  it('非 custom 排序不产生排序参数、不发起请求', async () => {
    const api = vi.fn(async () => ({ records: [], total: 0 }))
    const { fetcher } = createFetch({ api })
    fetcher.handleSortChange({ prop: 'age', order: 'ascending', sortable: true })
    await flush()
    expect(api).not.toHaveBeenCalled()
    expect(fetcher.sortParams.value).toEqual({})
  })

  it("sortable: 'custom' 时注入 sortProp / sortOrder 并重查", async () => {
    const api = vi.fn(async () => ({ records: [], total: 0 }))
    const { fetcher } = createFetch({ api })
    fetcher.handleSortChange({ prop: 'age', order: 'ascending', sortable: 'custom' })
    await flush()
    expect(fetcher.sortParams.value).toEqual({ sortProp: 'age', sortOrder: 'ascending' })
    expect(lastParams(api)).toMatchObject({ sortProp: 'age', sortOrder: 'ascending', page: 1 })
  })

  it('取消排序（order 为 null）时清空排序参数', async () => {
    const api = vi.fn(async () => ({ records: [], total: 0 }))
    const { fetcher } = createFetch({ api })
    fetcher.handleSortChange({ prop: 'age', order: 'ascending', sortable: 'custom' })
    await flush()
    fetcher.handleSortChange({ prop: 'age', order: null, sortable: 'custom' })
    await flush()
    expect(fetcher.sortParams.value).toEqual({})
    expect(lastParams(api)).not.toHaveProperty('sortProp')
  })
})

describe('useFetch beforeFetch', () => {
  it('返回 false 时中断本次请求', async () => {
    const api = vi.fn(async () => ({ records: [], total: 0 }))
    const { fetcher, emit } = createFetch({ api, beforeFetch: () => false })
    await fetcher.fetchData()
    expect(api).not.toHaveBeenCalled()
    expect(fetcher.tableData.value).toEqual([])
    expect(fetcher.loading.value).toBe(false)
    expect(emit).not.toHaveBeenCalled()
  })

  it('返回对象时整体替换请求参数', async () => {
    const api = vi.fn(async () => ({ records: [], total: 0 }))
    const beforeFetch = vi.fn(() => ({ tenant: 't1' }))
    const { fetcher } = createFetch({ api, beforeFetch })
    await fetcher.fetchData()
    // 钩子收到的是组装完成的原始参数
    expect(beforeFetch).toHaveBeenCalledWith({ page: 1, pageSize: 10 })
    expect(lastParams(api)).toEqual({ tenant: 't1' })
  })
})

describe('useFetch 竞态保护', () => {
  it('并发请求只采纳最新结果，过期结果不得覆盖', async () => {
    const first = deferred<any>()
    const second = deferred<any>()
    const api = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { fetcher } = createFetch({ api })
    void fetcher.fetchData()
    void fetcher.fetchData()
    // 后发请求先返回
    second.resolve({ records: [{ id: 2 }], total: 1 })
    await flush()
    expect(fetcher.tableData.value).toEqual([{ id: 2 }])
    // 先发的过期请求后返回，不得覆盖
    first.resolve({ records: [{ id: 1 }], total: 1 })
    await flush()
    expect(fetcher.tableData.value).toEqual([{ id: 2 }])
    expect(fetcher.loading.value).toBe(false)
  })

  it('过期请求的失败不派发 fetch-error', async () => {
    const first = deferred<any>()
    const second = deferred<any>()
    const api = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { fetcher, emit } = createFetch({ api })
    void fetcher.fetchData()
    void fetcher.fetchData()
    second.resolve({ records: [], total: 0 })
    await flush()
    first.reject(new Error('boom'))
    await flush()
    expect(emit).not.toHaveBeenCalledWith('fetch-error', expect.anything())
    expect(fetcher.loading.value).toBe(false)
  })
})

describe('useFetch 分页与刷新', () => {
  it('reload 回到第一页', async () => {
    const api = vi.fn(async () => ({ records: [], total: 30 }))
    const { fetcher } = createFetch({ api })
    fetcher.handlePageChange(3)
    await flush()
    expect(fetcher.page.value).toBe(3)
    await fetcher.reload()
    expect(fetcher.page.value).toBe(1)
    expect(lastParams(api)).toMatchObject({ page: 1 })
  })

  it('refresh 保持当前页', async () => {
    const api = vi.fn(async () => ({ records: [], total: 30 }))
    const { fetcher } = createFetch({ api })
    fetcher.handlePageChange(2)
    await flush()
    await fetcher.refresh()
    expect(fetcher.page.value).toBe(2)
    expect(lastParams(api)).toMatchObject({ page: 2 })
  })

  it('handlePageChange 触发查询并派发 page-change；同页/非法页不重复触发', async () => {
    const api = vi.fn(async () => ({ records: [], total: 30 }))
    const { fetcher, emit } = createFetch({ api })
    fetcher.handlePageChange(2)
    await flush()
    expect(emit).toHaveBeenCalledWith('page-change', { page: 2, pageSize: 10 })
    expect(api).toHaveBeenCalledTimes(1)
    fetcher.handlePageChange(2)
    fetcher.handlePageChange(0)
    await flush()
    // emit 还会收到 fetch-success，这里只统计 page-change 的派发次数
    const pageChangeCount = emit.mock.calls.filter((call) => call[0] === 'page-change').length
    expect(pageChangeCount).toBe(1)
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('handleSizeChange 回到第一页并派发 page-change；相同条数不重复触发', async () => {
    const api = vi.fn(async () => ({ records: [], total: 30 }))
    const { fetcher, emit } = createFetch({ api })
    fetcher.handlePageChange(2)
    await flush()
    fetcher.handleSizeChange(20)
    await flush()
    expect(fetcher.page.value).toBe(1)
    expect(fetcher.pageSize.value).toBe(20)
    expect(emit).toHaveBeenCalledWith('page-change', { page: 1, pageSize: 20 })
    expect(lastParams(api)).toMatchObject({ page: 1, pageSize: 20 })
    fetcher.handleSizeChange(20)
    await flush()
    expect(api).toHaveBeenCalledTimes(2)
  })
})

describe('useFetch afterFetch 与事件', () => {
  it('afterFetch 返回数组时替换列表', async () => {
    const api = vi.fn(async () => ({ records: [{ id: 1 }], total: 1 }))
    const { fetcher } = createFetch({
      api,
      afterFetch: (rows) => rows.map((row) => ({ ...row, extra: true }))
    })
    await fetcher.fetchData()
    expect(fetcher.tableData.value).toEqual([{ id: 1, extra: true }])
  })

  it('afterFetch 返回非数组时保留原列表（以实现为准，见报告）', async () => {
    const api = vi.fn(async () => ({ records: [{ id: 1 }], total: 1 }))
    const { fetcher } = createFetch({ api, afterFetch: (() => undefined) as any })
    await fetcher.fetchData()
    expect(fetcher.tableData.value).toEqual([{ id: 1 }])
  })

  it('fetch-success 携带解析后的数据、总数与请求参数', async () => {
    const api = vi.fn(async () => ({ records: [{ id: 1 }], total: 9 }))
    const { fetcher, emit } = createFetch({ api }, () => ({ kw: 'a' }))
    await fetcher.fetchData()
    expect(emit).toHaveBeenCalledWith('fetch-success', {
      data: [{ id: 1 }],
      total: 9,
      params: { kw: 'a', page: 1, pageSize: 10 }
    })
  })

  it('请求失败派发 fetch-error，保留已有数据并结束 loading', async () => {
    const error = new Error('boom')
    const api = vi
      .fn()
      .mockResolvedValueOnce({ records: [{ id: 1 }], total: 1 })
      .mockRejectedValueOnce(error)
    const { fetcher, emit } = createFetch({ api })
    await fetcher.fetchData()
    await fetcher.refresh()
    expect(emit).toHaveBeenCalledWith('fetch-error', error)
    expect(fetcher.tableData.value).toEqual([{ id: 1 }])
    expect(fetcher.loading.value).toBe(false)
  })

  it('未配置 api 时置空表且不派发事件', async () => {
    const { fetcher, emit } = createFetch({})
    await fetcher.fetchData()
    expect(fetcher.tableData.value).toEqual([])
    expect(fetcher.total.value).toBe(0)
    expect(emit).not.toHaveBeenCalled()
  })
})
