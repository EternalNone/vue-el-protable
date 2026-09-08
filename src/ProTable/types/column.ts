import type { VNode } from 'vue'
import type { SearchConfig } from './search'

/** render 函数的作用域参数 */
export interface ColumnRenderScope<TRow = Record<string, any>> {
  row: TRow
  column: any
  $index: number
}

/** 列配置：描述「这一列在表格中如何展示」+「是否/如何参与筛选」 */
export interface ColumnConfig<TRow = Record<string, any>> {
  /** 数据字段名，支持点路径（如 user.name）；同时作为默认插槽名与查询参数键 */
  prop?: string
  /** 列标题，也作为筛选项默认 label */
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  /** 排序；'custom' 时触发服务端排序 */
  sortable?: boolean | 'custom'
  /** 轻量格式化（纯文本场景） */
  formatter?: (row: TRow, column: any, cellValue: any, index: number) => any
  /** 自定义渲染函数；与插槽二选一，插槽优先 */
  render?: (scope: ColumnRenderScope<TRow>) => VNode | string | number | null | undefined
  /** 开启自定义单元格插槽；true 时插槽名为 prop */
  slot?: boolean | string
  /** 开启自定义表头插槽；true 时插槽名为 `${prop}-header` */
  headerSlot?: boolean | string
  /** 表格中不展示（可被列设置面板重新勾选），默认 false */
  hidden?: boolean
  /** 溢出省略 + tooltip，默认 true */
  ellipsis?: boolean
  /** 多级表头 */
  children?: ColumnConfig<TRow>[]
  /** 筛选项配置；true 表示以默认 input 参与筛选 */
  search?: boolean | SearchConfig
  /** 其余 el-table-column 原生属性透传 */
  [key: string]: any
}

/** 规范化后的列（内部使用） */
export interface NormalizedColumn<TRow = Record<string, any>>
  extends Omit<ColumnConfig<TRow>, 'children' | 'search'> {
  /** 唯一标识：prop || label */
  uid: string
  /** 数据字段路径 */
  propPath: string
  /** 单元格插槽名（仅 slot 开启时有意义） */
  slotName: string
  /** 表头插槽名（仅 headerSlot 开启时有意义） */
  headerSlotName: string
  /** 是否参与筛选 */
  searchEnabled: boolean
  /** 规范化后的筛选配置 */
  searchConfig?: Required<Pick<SearchConfig, 'key' | 'label' | 'type'>> & SearchConfig
  /** 多级表头子列 */
  children?: NormalizedColumn<TRow>[]
}

/** 列配置的对外类型别名（与 ColumnConfig 完全等价） */
export type ProTableColumn<TRow = Record<string, any>> = ColumnConfig<TRow>
