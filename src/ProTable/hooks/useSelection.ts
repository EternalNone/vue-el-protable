import { ref, type Ref } from 'vue'
import type { ProTableOptions } from '../types'

export interface UseSelectionParams {
  options: ProTableOptions
  /** 内部 el-table 的 ref（用于 clearSelection / toggleRowSelection） */
  tableRef: Ref<any>
  emit: (event: string, ...args: any[]) => void
}

/** 选择模式：'multiple' 走 el-table 原生多选列；'single' 由单选列实现 */
export function useSelection({ options, tableRef, emit }: UseSelectionParams) {
  const multipleSelection = ref<Record<string, any>[]>([])
  const singleRow = ref<Record<string, any> | null>(null)

  /** el-table selection-change 事件入口 */
  function handleSelectionChange(rows: Record<string, any>[]): void {
    multipleSelection.value = rows
    emit('selection-change', rows)
  }

  /** 单选列变化入口（row 为 null 表示取消选中） */
  function handleSingleChange(row: Record<string, any> | null): void {
    singleRow.value = row
    emit('single-change', row)
  }

  /** 获取选中行：多选返回多行；单选长度 ≤ 1 */
  function getSelection(): Record<string, any>[] {
    if (options.selection === 'single') return singleRow.value ? [singleRow.value] : []
    return [...multipleSelection.value]
  }

  /** 编程式设置选中行（跨页保留勾选、默认勾选场景）；与 selectable 约束一致，不可选行自动跳过 */
  function setSelection(rows: Record<string, any>[]): void {
    const selectableRows = options.selectable ? rows.filter((row) => options.selectable!(row, 0)) : rows
    if (options.selection === 'single') {
      handleSingleChange(selectableRows[0] ?? null)
      return
    }
    const table = tableRef.value
    if (!table) return
    table.clearSelection()
    // toggleRowSelection 会触发 selection-change，状态与事件自动同步
    selectableRows.forEach((row) => table.toggleRowSelection(row, true))
  }

  function clearSelection(): void {
    if (options.selection === 'single') {
      handleSingleChange(null)
      return
    }
    tableRef.value?.clearSelection()
  }

  return {
    multipleSelection,
    singleRow,
    handleSelectionChange,
    handleSingleChange,
    getSelection,
    setSelection,
    clearSelection
  }
}

export type UseSelectionReturn = ReturnType<typeof useSelection>
