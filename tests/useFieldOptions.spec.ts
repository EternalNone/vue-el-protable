import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick } from 'vue'
import { useColumns } from '../src/ProTable/hooks/useColumns'
import { useSearchForm } from '../src/ProTable/hooks/useSearchForm'
import { useFieldOptions } from '../src/ProTable/hooks/useFieldOptions'
import type { ColumnConfig } from '../src/ProTable/types/column'

/** 构造目标字段的选项管理实例（附带其所属筛选表单上下文） */
function createField(columns: ColumnConfig[], targetKey: string) {
  const { columnTree } = useColumns(() => columns)
  const form = useSearchForm({
    columnTree,
    options: {},
    emit: vi.fn(),
    onSearch: vi.fn(),
    onReset: vi.fn()
  })
  form.initQuery()
  const item = form.allSearchItems.value.find((i) => i.key === targetKey)!
  const reloadSignal = computed(() => form.optionTriggers[item.key] ?? 0)
  const field = useFieldOptions({
    item,
    query: form.query,
    reloadSignal,
    loadOptions: form.loadFieldOptions,
    remoteSearch: form.remoteSearchOptions
  })
  return { form, item, field }
}

/** 级联场景公共列配置：城市依赖省份 */
function cascadeColumns(api: (...args: any[]) => any): ColumnConfig[] {
  return [
    { prop: 'provinceId', label: '省份', search: true },
    { prop: 'cityId', label: '城市', search: { deps: ['provinceId'], api } }
  ]
}

describe('异步选项懒加载与缓存', () => {
  it('构造后不请求，ensureOptions 后请求一次并落位', async () => {
    const api = vi.fn(async () => [{ label: '启用', value: 1 }])
    const { field } = createField([{ prop: 'status', label: '状态', search: { api } }], 'status')
    expect(api).not.toHaveBeenCalled()
    await field.ensureOptions()
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith({})
    expect(field.options.value).toEqual([{ label: '启用', value: 1 }])
  })

  it('同参数两次 ensureOptions 命中实例缓存；force 绕缓存', async () => {
    const api = vi.fn(async () => [{ label: '启用', value: 1 }])
    const { field } = createField([{ prop: 'status', label: '状态', search: { api } }], 'status')
    await field.ensureOptions()
    await field.ensureOptions()
    expect(api).toHaveBeenCalledTimes(1)
    await field.ensureOptions(true)
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('请求携带依赖值；依赖变化触发重载', async () => {
    const api = vi.fn(async () => [{ label: '杭州', value: 111 }])
    const { form, field } = createField(cascadeColumns(api), 'cityId')
    form.setQuery({ provinceId: 11 })
    await field.ensureOptions()
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenLastCalledWith({ provinceId: 11 })
    form.handleFieldChange('provinceId', 22)
    await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    expect(api).toHaveBeenLastCalledWith({ provinceId: 22 })
    // 下游城市被级联清空
    expect(form.query.cityId).toBeUndefined()
  })

  it('未展开过（懒加载）时依赖变化不主动请求', async () => {
    const api = vi.fn(async () => [])
    const { form } = createField(cascadeColumns(api), 'cityId')
    form.handleFieldChange('provinceId', 7)
    await nextTick()
    await nextTick()
    expect(api).not.toHaveBeenCalled()
  })
})

describe('依赖值为空（depsDisabled）', () => {
  it('初始 depsDisabled 为 true，ensureOptions 不发请求且选项为空', async () => {
    const api = vi.fn(async () => [])
    const { field } = createField(cascadeColumns(api), 'cityId')
    expect(field.depsDisabled.value).toBe(true)
    await field.ensureOptions()
    expect(api).not.toHaveBeenCalled()
    expect(field.options.value).toEqual([])
  })

  it('补齐依赖值并发出重载信号后自动请求（携带依赖值）', async () => {
    const api = vi.fn(async () => [{ label: '杭州', value: 330100 }])
    const { form, field } = createField(cascadeColumns(api), 'cityId')
    // 禁用态下展开过一次（标记已加载但不请求）
    await field.ensureOptions()
    expect(api).not.toHaveBeenCalled()
    form.setQuery({ provinceId: 5 })
    form.optionTriggers['cityId'] = 1
    await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    expect(api).toHaveBeenLastCalledWith({ provinceId: 5 })
    expect(field.options.value).toEqual([{ label: '杭州', value: 330100 }])
  })

  it('已加载后依赖置空：清空选项且不再请求', async () => {
    const api = vi.fn(async () => [{ label: '杭州', value: 330100 }])
    const { form, field } = createField(cascadeColumns(api), 'cityId')
    form.setQuery({ provinceId: 5 })
    await field.ensureOptions()
    expect(api).toHaveBeenCalledTimes(1)
    form.setQuery({ provinceId: '' })
    form.optionTriggers['cityId'] = 1
    await vi.waitFor(() => expect(field.options.value).toEqual([]))
    expect(api).toHaveBeenCalledTimes(1)
    expect(field.depsDisabled.value).toBe(true)
  })
})

describe('远程搜索 300ms 防抖', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** 假定时器环境下冲刷远程搜索内部的微任务链 */
  const settle = async () => {
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(0)
  }

  it('300ms 防抖，关键字参数名固定 keyword', async () => {
    const api = vi.fn(async () => [{ label: 'AB 市', value: 1 }])
    const { field } = createField([{ prop: 'city', label: '城市', search: { api, remote: true } }], 'city')
    field.handleRemoteSearch('a')
    await vi.advanceTimersByTimeAsync(299)
    expect(api).not.toHaveBeenCalled()
    // 防抖期内再次输入重置计时，仅最后一次关键字生效
    field.handleRemoteSearch('ab')
    await vi.advanceTimersByTimeAsync(300)
    await settle()
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenLastCalledWith({ keyword: 'ab' })
    expect(field.options.value).toEqual([{ label: 'AB 市', value: 1 }])
  })

  it('未开启 remote 时输入不触发请求', async () => {
    const api = vi.fn(async () => [])
    const { field } = createField([{ prop: 'city', label: '城市', search: { api } }], 'city')
    field.handleRemoteSearch('x')
    await vi.advanceTimersByTimeAsync(1000)
    await settle()
    expect(api).not.toHaveBeenCalled()
  })
})

describe('静态 / 函数式选项', () => {
  it('静态数组选项不请求（即使配置了 api）', async () => {
    const api = vi.fn(async () => [])
    const { field } = createField(
      [{ prop: 'status', label: '状态', search: { api, options: [{ label: '启用', value: 1 }] } }],
      'status'
    )
    expect(field.options.value).toEqual([{ label: '启用', value: 1 }])
    await field.ensureOptions()
    expect(api).not.toHaveBeenCalled()
  })

  it('函数式选项随 query 重算（客户端联动）', () => {
    const { form, field } = createField(
      [
        { prop: 'type', label: '类型', search: true },
        {
          prop: 'subType',
          label: '子类型',
          search: {
            options: (query: Record<string, any>) =>
              query.type === 'a' ? [{ label: 'A1', value: 'a1' }] : [{ label: '全部', value: 'all' }]
          }
        }
      ],
      'subType'
    )
    expect(field.options.value).toEqual([{ label: '全部', value: 'all' }])
    form.setQuery({ type: 'a' })
    expect(field.options.value).toEqual([{ label: 'A1', value: 'a1' }])
  })
})

describe('选项字段映射', () => {
  it('fieldNames 映射与 labelKeys 文本拼接', async () => {
    const api = vi.fn(async () => [{ name: '张', id: 9, dept: '研发' }])
    const { field } = createField(
      [
        {
          prop: 'userId',
          label: '用户',
          search: { api, fieldNames: { label: 'name', value: 'id' }, labelKeys: ['dept'] }
        }
      ],
      'userId'
    )
    await field.ensureOptions()
    expect(field.options.value[0]).toMatchObject({ label: '张研发', value: 9 })
  })

  it('children 递归映射', async () => {
    const api = vi.fn(async () => [
      { name: '浙江', id: 33, children: [{ name: '杭州', id: 3301 }] }
    ])
    const { field } = createField(
      [
        {
          prop: 'area',
          label: '地区',
          search: { type: 'cascader', api, fieldNames: { label: 'name', value: 'id' } }
        }
      ],
      'area'
    )
    await field.ensureOptions()
    const root = field.options.value[0]
    expect(root).toMatchObject({ label: '浙江', value: 33 })
    expect(root.children?.[0]).toMatchObject({ label: '杭州', value: 3301 })
  })
})
