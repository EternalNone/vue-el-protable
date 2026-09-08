import { describe, expect, it, vi } from 'vitest'
import { useColumns } from '../src/ProTable/hooks/useColumns'
import { useSearchForm } from '../src/ProTable/hooks/useSearchForm'
import type { ColumnConfig } from '../src/ProTable/types/column'

/** 用列配置构造筛选表单上下文（已执行 initQuery） */
function createForm(columns: ColumnConfig[]) {
  const { columnTree } = useColumns(() => columns)
  const emit = vi.fn()
  const onSearch = vi.fn()
  const onReset = vi.fn()
  const form = useSearchForm({ columnTree, options: {}, emit, onSearch, onReset })
  form.initQuery()
  return { form, emit, onSearch, onReset }
}

describe('buildQueryParams', () => {
  it('过滤空值，保留 0 / false 等有效值', () => {
    const { form } = createForm([
      { prop: 'name', label: '姓名', search: true },
      { prop: 'status', label: '状态', search: true },
      { prop: 'level', label: '等级', search: true },
      { prop: 'enabled', label: '启用', search: true },
      { prop: 'remark', label: '备注', search: true }
    ])
    form.setQuery({ name: 'on', status: '', level: 0, enabled: false, remark: null })
    expect(form.buildQueryParams()).toEqual({ name: 'on', level: 0, enabled: false })
  })

  it('范围字段按 splitKeys 拆分为两个参数', () => {
    const { form } = createForm([
      {
        prop: 'dateRange',
        label: '日期范围',
        search: { type: 'daterange', splitKeys: { start: 'startTime', end: 'endTime' } }
      }
    ])
    form.setQuery({ dateRange: ['2024-01-01', '2024-02-01'] })
    expect(form.buildQueryParams()).toEqual({ startTime: '2024-01-01', endTime: '2024-02-01' })
  })

  it('范围值长度不为 2 时回落原键提交', () => {
    const { form } = createForm([
      {
        prop: 'dateRange',
        label: '日期范围',
        search: { splitKeys: { start: 'startTime', end: 'endTime' } }
      }
    ])
    form.setQuery({ dateRange: ['2024-01-01'] })
    expect(form.buildQueryParams()).toEqual({ dateRange: ['2024-01-01'] })
  })

  it('空数组范围值整体过滤', () => {
    const { form } = createForm([
      {
        prop: 'dateRange',
        label: '日期范围',
        search: { splitKeys: { start: 'startTime', end: 'endTime' } }
      }
    ])
    expect(form.buildQueryParams()).toEqual({})
  })
})

describe('依赖联动清空', () => {
  const cascadeColumns: ColumnConfig[] = [
    { prop: 'provinceId', label: '省份', search: true },
    { prop: 'cityId', label: '城市', search: { deps: ['provinceId'], defaultValue: 'c-default' } },
    { prop: 'areaId', label: '区县', search: { deps: ['cityId'] } }
  ]

  it('上游变化 BFS 链式清空下游：恢复默认值并自增重载信号', () => {
    const { form } = createForm(cascadeColumns)
    form.setQuery({ provinceId: 1, cityId: 2, areaId: 3 })
    form.handleFieldChange('provinceId', 9)
    expect(form.getQuery()).toMatchObject({ provinceId: 9, cityId: 'c-default', areaId: undefined })
    expect(form.optionTriggers.cityId).toBe(1)
    expect(form.optionTriggers.areaId).toBe(1)
  })

  it('循环依赖时警告并跳过，不陷入死循环', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { form } = createForm([
      { prop: 'a', label: 'A', search: { deps: ['b'] } },
      { prop: 'b', label: 'B', search: { deps: ['a'] } }
    ])
    form.handleFieldChange('a', 1)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('循环联动依赖'))
    expect(form.query.a).toBe(1)
    expect(form.query.b).toBeUndefined()
    expect(form.optionTriggers.b).toBe(1)
  })

  it('isDepsEmpty 依赖值为空时返回 true', () => {
    const { form } = createForm(cascadeColumns)
    const cityItem = form.allSearchItems.value.find((i) => i.key === 'cityId')!
    expect(form.isDepsEmpty(cityItem)).toBe(true)
    form.setQuery({ provinceId: 1 })
    expect(form.isDepsEmpty(cityItem)).toBe(false)
    form.setQuery({ provinceId: '' })
    expect(form.isDepsEmpty(cityItem)).toBe(true)
  })
})

describe('searchOnChange', () => {
  it('本字段配置 searchOnChange 时变化即查询', () => {
    const { form, onSearch } = createForm([{ prop: 'name', label: '姓名', search: { searchOnChange: true } }])
    form.handleFieldChange('name', 'a')
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('未配置 searchOnChange 时变化不查询', () => {
    const { form, onSearch } = createForm([{ prop: 'name', label: '姓名', search: true }])
    form.handleFieldChange('name', 'a')
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('下游被清空字段配置 searchOnChange 时也触发查询', () => {
    const { form, onSearch } = createForm([
      { prop: 'provinceId', label: '省份', search: true },
      { prop: 'cityId', label: '城市', search: { deps: ['provinceId'], searchOnChange: true } }
    ])
    form.handleFieldChange('provinceId', 1)
    expect(onSearch).toHaveBeenCalledTimes(1)
  })
})

describe('initQuery / getQuery / setQuery', () => {
  it('initQuery 仅写入默认值，不覆盖已有键', () => {
    const { columnTree } = useColumns(() => [
      { prop: 'name', label: '姓名', search: { defaultValue: 'n-default' } },
      { prop: 'age', label: '年龄', search: { defaultValue: 18 } }
    ])
    const form = useSearchForm({ columnTree, options: {}, emit: vi.fn(), onSearch: vi.fn(), onReset: vi.fn() })
    form.setQuery({ name: 'custom' })
    form.initQuery()
    expect(form.query.name).toBe('custom')
    expect(form.query.age).toBe(18)
    expect('age' in form.query).toBe(true)
  })

  it('getQuery 返回浅拷贝，外部篡改不影响内部状态', () => {
    const { form } = createForm([{ prop: 'name', label: '姓名', search: true }])
    const snapshot = form.getQuery()
    snapshot.name = 'hacked'
    expect(form.query.name).toBeUndefined()
  })

  it('setQuery 部分合并且不触发查询与事件', () => {
    const { form, onSearch, emit } = createForm([
      { prop: 'a', label: 'A', search: true },
      { prop: 'b', label: 'B', search: true }
    ])
    form.setQuery({ a: 1 })
    form.setQuery({ b: 2 })
    expect(form.getQuery()).toEqual({ a: 1, b: 2 })
    expect(onSearch).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })
})

describe('handleReset / handleSearch / handleFieldChange', () => {
  it('handleReset 恢复默认值，仅对依赖字段自增重载信号，并派发 reset', () => {
    const { form, emit, onReset } = createForm([
      { prop: 'provinceId', label: '省份', search: { defaultValue: 'p0' } },
      { prop: 'cityId', label: '城市', search: { deps: ['provinceId'], defaultValue: 'c0' } },
      { prop: 'name', label: '姓名', search: { defaultValue: 'n0' } }
    ])
    form.setQuery({ provinceId: 'p1', cityId: 'c1', name: 'n1' })
    form.handleReset()
    expect(form.getQuery()).toEqual({ provinceId: 'p0', cityId: 'c0', name: 'n0' })
    expect(form.optionTriggers.cityId).toBe(1)
    expect(form.optionTriggers.provinceId).toBeUndefined()
    expect(form.optionTriggers.name).toBeUndefined()
    expect(emit).toHaveBeenCalledWith('reset', { provinceId: 'p0', cityId: 'c0', name: 'n0' })
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('handleSearch 派发 search 事件并触发查询', () => {
    const { form, emit, onSearch } = createForm([{ prop: 'name', label: '姓名', search: true }])
    form.setQuery({ name: 'tom' })
    form.handleSearch()
    expect(emit).toHaveBeenCalledWith('search', expect.objectContaining({ name: 'tom' }))
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('handleFieldChange 派发 query-change 事件', () => {
    const { form, emit } = createForm([{ prop: 'name', label: '姓名', search: true }])
    form.handleFieldChange('name', 'jerry')
    expect(emit).toHaveBeenCalledWith('query-change', expect.objectContaining({ name: 'jerry' }))
  })
})
