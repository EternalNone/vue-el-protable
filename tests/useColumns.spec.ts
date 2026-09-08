import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useColumns } from '../src/ProTable/hooks/useColumns'
import type { ColumnConfig } from '../src/ProTable/types/column'

const PERSIST_KEY = 'spec-columns'
const STORAGE_KEY = `vue-el-protable:columns:${PERSIST_KEY}`

/** 用列配置构造 useColumns 实例 */
function createColumns(columns: ColumnConfig[], persistKey?: string) {
  return useColumns(() => columns, persistKey)
}

/** 读取持久化到 localStorage 的显隐覆盖配置 */
function readPersisted(): Record<string, boolean> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) as string)
}

describe('列规范化', () => {
  it('uid / 插槽名 / 展示默认值', () => {
    const { columnTree } = createColumns([{ prop: 'name', label: '姓名' }])
    const col = columnTree.value[0]
    expect(col.uid).toBe('name')
    expect(col.propPath).toBe('name')
    expect(col.slotName).toBe('name')
    expect(col.headerSlotName).toBe('name-header')
    expect(col.ellipsis).toBe(true)
    expect(col.align).toBe('center')
    expect(col.searchEnabled).toBe(false)
    expect(col.searchConfig).toBeUndefined()
  })

  it('无 prop 列生成自增 uid 且互不相同', () => {
    const { columnTree } = createColumns([
      { label: '操作一' },
      { label: '操作二' }
    ])
    const [a, b] = columnTree.value
    expect(a.uid).toMatch(/^col_\d+$/)
    expect(b.uid).toMatch(/^col_\d+$/)
    expect(a.uid).not.toBe(b.uid)
    expect(a.headerSlotName).toBe(`${a.uid}-header`)
  })

  it('显式插槽名优先于默认规则', () => {
    const { columnTree } = createColumns([
      { prop: 'name', label: '姓名', slot: 'custom-cell', headerSlot: 'custom-head' }
    ])
    const col = columnTree.value[0]
    expect(col.slotName).toBe('custom-cell')
    expect(col.headerSlotName).toBe('custom-head')
  })

  it('search: true 生成默认筛选配置', () => {
    const { columnTree } = createColumns([{ prop: 'name', label: '姓名', search: true }])
    const col = columnTree.value[0]
    expect(col.searchEnabled).toBe(true)
    expect(col.searchConfig).toMatchObject({ key: 'name', label: '姓名', type: 'input' })
  })

  it('search 对象配置保留自定义项并补齐默认', () => {
    const { columnTree } = createColumns([
      { prop: 'status', label: '状态', search: { type: 'select', key: 'statusKey' } }
    ])
    expect(columnTree.value[0].searchConfig).toMatchObject({
      key: 'statusKey',
      label: '状态',
      type: 'select'
    })
  })

  it('多级表头展平为叶子列', () => {
    const { flatLeafColumns, columnTree } = createColumns([
      { prop: 'name', label: '姓名' },
      {
        label: '分组',
        children: [
          { prop: 'age', label: '年龄' },
          { prop: 'email', label: '邮箱' }
        ]
      }
    ])
    expect(flatLeafColumns.value.map((c) => c.uid)).toEqual(['name', 'age', 'email'])
    expect(columnTree.value[1].children?.length).toBe(2)
  })

  it('子列筛选键默认拼接父级路径', () => {
    const { columnTree } = createColumns([
      {
        prop: 'user',
        label: '用户信息',
        children: [{ prop: 'name', label: '姓名', search: true }]
      }
    ])
    const child = columnTree.value[0].children?.[0]
    expect(child?.searchConfig).toMatchObject({ key: 'user.name', label: '姓名', type: 'input' })
  })
})

describe('显隐与持久化', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  const baseColumns: ColumnConfig[] = [
    { prop: 'a', label: 'A' },
    { prop: 'b', label: 'B' },
    { prop: 'c', label: 'C', hidden: true }
  ]

  it('初始 hidden 列进入隐藏状态', () => {
    const { hiddenMap, visibleColumnTree, settingItems } = createColumns(baseColumns)
    expect(hiddenMap.value).toEqual({ a: false, b: false, c: true })
    expect(visibleColumnTree.value.map((c) => c.uid)).toEqual(['a', 'b'])
    expect(settingItems.value).toEqual([
      { uid: 'a', label: 'A', hidden: false },
      { uid: 'b', label: 'B', hidden: false },
      { uid: 'c', label: 'C', hidden: true }
    ])
  })

  it('toggleColumn 切换单列显隐并写入持久化', () => {
    const { hiddenMap, toggleColumn } = createColumns(baseColumns, PERSIST_KEY)
    toggleColumn('b', true)
    expect(hiddenMap.value.b).toBe(true)
    expect(readPersisted()).toEqual({ b: true })
    toggleColumn('b', false)
    expect(hiddenMap.value.b).toBe(false)
    expect(readPersisted()).toEqual({ b: false })
  })

  it('setAllHidden(true) 全部隐藏，分组父列一并移除', () => {
    const columns: ColumnConfig[] = [
      { prop: 'a', label: 'A' },
      { label: '分组', children: [{ prop: 'b1', label: 'B1' }, { prop: 'b2', label: 'B2' }] }
    ]
    const { hiddenMap, visibleColumnTree, setAllHidden } = createColumns(columns, PERSIST_KEY)
    setAllHidden(true)
    expect(hiddenMap.value).toEqual({ a: true, b1: true, b2: true })
    expect(visibleColumnTree.value).toEqual([])
    setAllHidden(false)
    expect(hiddenMap.value).toEqual({ a: false, b1: false, b2: false })
    expect(visibleColumnTree.value.length).toBe(2)
  })

  it('分组父列只保留可见子列，子列全隐时整组移除', () => {
    const columns: ColumnConfig[] = [
      {
        label: '分组',
        children: [
          { prop: 'b1', label: 'B1' },
          { prop: 'b2', label: 'B2' }
        ]
      }
    ]
    const { visibleColumnTree, toggleColumn } = createColumns(columns, PERSIST_KEY)
    toggleColumn('b1', true)
    expect(visibleColumnTree.value[0].children?.map((c) => c.uid)).toEqual(['b2'])
    toggleColumn('b2', true)
    expect(visibleColumnTree.value).toEqual([])
  })

  it('resetColumns 恢复初始隐藏配置并清空持久化覆盖', () => {
    const { hiddenMap, toggleColumn, setAllHidden, resetColumns } = createColumns(baseColumns, PERSIST_KEY)
    setAllHidden(false)
    toggleColumn('b', true)
    resetColumns()
    expect(hiddenMap.value).toEqual({ a: false, b: false, c: true })
    expect(readPersisted()).toEqual({})
  })

  it('同 persistKey 的新实例复用持久化配置', () => {
    const first = createColumns(baseColumns, PERSIST_KEY)
    first.toggleColumn('a', true)
    first.toggleColumn('c', false)
    const second = createColumns(baseColumns, PERSIST_KEY)
    expect(second.hiddenMap.value).toEqual({ a: true, b: false, c: false })
  })

  it('未配置 persistKey 时不写入存储', () => {
    const { toggleColumn } = createColumns(baseColumns)
    toggleColumn('a', true)
    expect(localStorage.length).toBe(0)
  })
})
