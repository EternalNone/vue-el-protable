/** 列表响应字段映射（默认自动识别，仅在不满足时手工指定） */
export interface ProTableFieldNames {
  /** 列表字段名，支持点路径（如 data.list） */
  list?: string
  /** 总数字段名，支持点路径 */
  total?: string
}

/** 分页参数名覆盖 */
export interface ProTablePaginationProps {
  /** 页码参数名，默认 page */
  page?: string
  /** 每页条数参数名，默认 pageSize */
  pageSize?: string
}

/** 工具栏内置功能开关（右侧固定：刷新 / 列设置 / 全屏） */
export interface ProTableToolbarConfig {
  /** 刷新按钮，默认开启 */
  refresh?: boolean
  /** 列设置，默认开启 */
  columnSetting?: boolean
  /** 全屏，默认开启 */
  fullscreen?: boolean
}

/** 选择列模式 */
export type ProTableSelection = 'single' | 'multiple' | false

/** ProTable 全局配置 */
export interface ProTableOptions<TRow = Record<string, any>> {
  /** 行数据的 Key，默认 'id' */
  rowKey?: string
  /** 列表查询函数，自动携带 查询参数 + 分页参数（+ 排序参数） */
  api?: (params: any) => Promise<any>
  /** 响应字段映射，默认自动识别（见文档 §5.5.1） */
  fieldNames?: ProTableFieldNames
  /** 分页参数名覆盖 */
  paginationProps?: ProTablePaginationProps
  /** 请求前改写参数；返回 false 中断本次请求 */
  beforeFetch?: (params: any) => any | false
  /** 对列表数据做加工（优先级高于 fieldNames） */
  afterFetch?: (rows: TRow[]) => TRow[]
  /** 挂载时自动请求，默认 true */
  autoFetch?: boolean
  /** 选择列模式，默认 false（关闭） */
  selection?: ProTableSelection
  /** 行是否可选 */
  selectable?: (row: TRow, index: number) => boolean
  /** 显示序号列 */
  showIndex?: boolean
  /** 显示展开行 */
  showExpand?: boolean
  /** 显示分页，默认 true */
  showPagination?: boolean
  /** 显示筛选区，默认 true */
  searchVisible?: boolean
  /** 筛选区初始收起为一行，默认 true（筛选项超过 collapsedSize 时生效） */
  searchCollapsed?: boolean
  /** 收起阈值：筛选项数量超过该值出现展开/收起，默认 4 */
  collapsedSize?: number
  labelWidth?: string | number
  labelPosition?: 'left' | 'right' | 'top'
  /** 回车触发查询，默认 true */
  searchOnEnter?: boolean
  /** 显示查询/重置按钮，默认 true */
  showSearchButtons?: boolean
  /** 工具栏内置功能开关 */
  toolbarConfig?: ProTableToolbarConfig
  /** 列显隐持久化键：写入 localStorage，键名 vue-el-protable:columns:{persistKey} */
  persistKey?: string
  /** 默认每页条数，默认 10 */
  defaultPageSize?: number
  /** 其余 el-table 原生属性透传 */
  [key: string]: any
}
