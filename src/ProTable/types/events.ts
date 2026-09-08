/** 实例方法：通过 ref 暴露给外部调用 */
export interface ProTableInstance<TRow = Record<string, any>> {
  /** 回到第一页重新查询（新增/删除/导入等数据变更后推荐调用） */
  reload: () => void
  /** 保持当前页与当前条件重新请求（工具栏「刷新」按钮即调用它） */
  refresh: () => void
  /** 获取当前查询条件 */
  getQuery: () => Record<string, any>
  /** 部分合并写入查询条件（不自动发起查询） */
  setQuery: (patch: Record<string, any>) => void
  /** 恢复默认值并查询 */
  resetQuery: () => void
  /** 获取选中行数组（多选为多行；单选长度 ≤ 1） */
  getSelection: () => TRow[]
  /** 编程式设置选中行（跨页保留勾选、默认勾选场景） */
  setSelection: (rows: TRow[]) => void
  /** 清空选中 */
  clearSelection: () => void
  /** 获取内部 el-table 实例（逃生舱） */
  getTableRef: () => any
}

/** fetch-success 事件载荷 */
export interface ProTableFetchSuccessPayload<TRow = Record<string, any>> {
  data: TRow[]
  total: number
  params: any
}

/** 组件事件类型（el-table 原生事件通过 $attrs 全量透传） */
export interface ProTableEvents<TRow = Record<string, any>> {
  /** 请求成功 */
  'fetch-success': [payload: ProTableFetchSuccessPayload<TRow>]
  /** 请求失败 */
  'fetch-error': [error: unknown]
  /** 点击查询按钮 */
  search: [query: Record<string, any>]
  /** 点击重置按钮 */
  reset: [query: Record<string, any>]
  /** 查询条件变化 */
  'query-change': [query: Record<string, any>]
  /** 多选选中行变化 */
  'selection-change': [rows: TRow[]]
  /** 单选选中行变化 */
  'single-change': [row: TRow | null]
  /** 页码/每页条数变化 */
  'page-change': [payload: { page: number; pageSize: number }]
}
