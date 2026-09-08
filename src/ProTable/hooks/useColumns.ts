import { computed, ref, watch, type ComputedRef } from 'vue'
import type { ColumnConfig, NormalizedColumn } from '../types'
import { genUid, isArray, isPlainObject, storage } from '../../utils'

const PERSIST_PREFIX = 'vue-el-protable:columns:'

export interface SettingItem {
  uid: string
  label: string
  hidden: boolean
}

export interface UseColumnsReturn<TRow = Record<string, any>> {
  /** 规范化后的列树（保留多级表头结构，用于渲染表格） */
  columnTree: ComputedRef<NormalizedColumn<TRow>[]>
  /** 打平的叶子列（不含仅分组的父列） */
  flatLeafColumns: ComputedRef<NormalizedColumn<TRow>[]>
  /** 可见列树（表格实际渲染） */
  visibleColumnTree: ComputedRef<NormalizedColumn<TRow>[]>
  /** 列设置面板数据（全部叶子列 + 当前显隐） */
  settingItems: ComputedRef<SettingItem[]>
  /** 显隐状态：uid -> hidden */
  hiddenMap: ComputedRef<Record<string, boolean>>
  /** 单列显隐切换 */
  toggleColumn: (uid: string, hidden: boolean) => void
  /** 全选 / 全部取消（列设置面板） */
  setAllHidden: (hidden: boolean) => void
  /** 重置为初始列配置 */
  resetColumns: () => void
}

function normalizeColumn<TRow>(col: ColumnConfig<TRow>, parentProp?: string): NormalizedColumn<TRow> {
  const uid = col.prop || genUid()
  const propPath = col.prop ?? ''
  const searchEnabled = col.search === true || isPlainObject(col.search)
  const searchRaw = isPlainObject(col.search) ? col.search : {}
  const searchConfig = searchEnabled
    ? {
        ...searchRaw,
        key: searchRaw.key ?? (parentProp ? `${parentProp}.${propPath}` : propPath || uid),
        label: searchRaw.label ?? col.label,
        type: searchRaw.type ?? 'input'
      }
    : undefined
  const normalized: NormalizedColumn<TRow> = {
    ...col,
    uid,
    propPath,
    slotName: typeof col.slot === 'string' ? col.slot : propPath || uid,
    headerSlotName: typeof col.headerSlot === 'string' ? col.headerSlot : `${propPath || uid}-header`,
    ellipsis: col.ellipsis ?? true,
    align: col.align ?? 'center',
    searchEnabled,
    searchConfig,
    children: isArray(col.children) ? col.children.map((c) => normalizeColumn(c, propPath)) : undefined
  }
  return normalized
}

function collectLeafs<TRow>(tree: NormalizedColumn<TRow>[], out: NormalizedColumn<TRow>[] = []) {
  for (const col of tree) {
    if (col.children?.length) collectLeafs(col.children, out)
    else out.push(col)
  }
  return out
}

/**
 * 列规范化、显隐状态与持久化
 */
export function useColumns<TRow = Record<string, any>>(
  columns: () => ColumnConfig<TRow>[] | undefined,
  persistKey?: string
): UseColumnsReturn<TRow> {
  const storageKey = persistKey ? `${PERSIST_PREFIX}${persistKey}` : ''

  /** 初始配置中的隐藏列（uid 列表） */
  const initialHidden = ref<string[]>([])
  /** 用户在列设置面板中的覆盖（持久化对象） */
  const override = ref<Record<string, boolean>>(storageKey ? storage.get(storageKey) ?? {} : {})

  const columnTree = computed<NormalizedColumn<TRow>[]>(() => {
    const raw = columns()
    if (!isArray(raw)) return []
    return raw.map((c) => normalizeColumn(c))
  })

  const flatLeafColumns = computed(() => collectLeafs(columnTree.value))

  /** 初始隐藏列随 columns 变化重新计算 */
  watch(
    columnTree,
    (tree) => {
      initialHidden.value = collectLeafs(tree)
        .filter((c) => c.hidden === true)
        .map((c) => c.uid)
    },
    { immediate: true }
  )

  const hiddenMap = computed<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const col of flatLeafColumns.value) {
      const overridden = override.value[col.uid]
      map[col.uid] = overridden ?? initialHidden.value.includes(col.uid)
    }
    return map
  })

  const filterVisible = (tree: NormalizedColumn<TRow>[]): NormalizedColumn<TRow>[] =>
    tree
      .map((col) => {
        if (col.children?.length) {
          const children = filterVisible(col.children)
          return children.length ? { ...col, children } : null
        }
        return hiddenMap.value[col.uid] ? null : col
      })
      .filter((c): c is NormalizedColumn<TRow> => c !== null)

  const visibleColumnTree = computed(() => filterVisible(columnTree.value))

  const settingItems = computed<SettingItem[]>(() =>
    flatLeafColumns.value.map((col) => ({
      uid: col.uid,
      label: col.label,
      hidden: !!hiddenMap.value[col.uid]
    }))
  )

  function toggleColumn(uid: string, hidden: boolean) {
    override.value = { ...override.value, [uid]: hidden }
    persist()
  }

  function setAllHidden(hidden: boolean) {
    const next: Record<string, boolean> = {}
    for (const col of flatLeafColumns.value) next[col.uid] = hidden
    override.value = next
    persist()
  }

  function resetColumns() {
    override.value = {}
    persist()
  }

  function persist() {
    if (storageKey) storage.set(storageKey, override.value)
  }

  return {
    columnTree,
    flatLeafColumns,
    visibleColumnTree,
    settingItems,
    hiddenMap,
    toggleColumn,
    setAllHidden,
    resetColumns
  }
}
