/** 下拉/选项数据项（label/value 字段名可通过 fieldNames 映射） */
export interface OptionItem {
  label?: string
  value?: string | number | boolean
  children?: OptionItem[]
  disabled?: boolean
  [key: string]: any
}

/** 静态选项源：数组，或根据当前查询条件动态过滤/生成（客户端联动） */
export type OptionSource<TQuery extends Record<string, any> = Record<string, any>> =
  | OptionItem[]
  | ((query: TQuery) => OptionItem[])

/** 异步选项接口：返回数组或包装对象（如 { records: [...] }，自动识别） */
export type OptionApi = (params: Record<string, any>) => Promise<any>

/** 筛选控件类型 */
export type SearchFieldType =
  | 'input'
  | 'textarea'
  | 'input-number'
  | 'select'
  | 'cascader'
  | 'tree-select'
  | 'date'
  | 'dates'
  | 'week'
  | 'month'
  | 'year'
  | 'daterange'
  | 'datetimerange'
  | 'monthrange'
  | 'time-select'
  | 'switch'
  | 'radio'
  | 'checkbox'
  | 'custom'

/** 选项字段映射 */
export interface SearchFieldNames {
  label?: string
  value?: string
  children?: string
}

/** 筛选项事件回调：(新值, 当前查询条件, 辅助方法) */
export type SearchEventHandler = (
  value: any,
  query: Record<string, any>,
  helpers: { reload: () => void }
) => void

/** 筛选项配置 */
export interface SearchConfig<TQuery extends Record<string, any> = Record<string, any>> {
  /** 提交的查询参数键，默认取列 prop */
  key?: string
  /** 表单 label，默认取列 label */
  label?: string
  /** 控件类型，默认 input */
  type?: SearchFieldType
  /** 默认值（重置时恢复） */
  defaultValue?: any
  /** 静态选项（支持函数形式做客户端过滤/联动） */
  options?: OptionSource<TQuery>
  /** 异步选项接口 */
  api?: OptionApi
  /** 异步选项接口附加参数（支持函数形式） */
  apiParams?: Record<string, any> | ((query: TQuery) => Record<string, any>)
  /** 依赖字段：依赖值变化时清空本字段并重新拉取选项 */
  deps?: string[]
  /** 开启远程搜索（输入关键字调 api，300ms 防抖） */
  remote?: boolean
  /** 选项字段映射，默认 { label: 'label', value: 'value' } */
  fieldNames?: SearchFieldNames
  /** 选项文本需要拼接的额外字段 */
  labelKeys?: string[]
  /** 范围类控件提交时拆分的两个参数名 */
  splitKeys?: { start: string; end: string }
  /** 动态显隐 */
  visible?: boolean | ((query: TQuery) => boolean)
  /** 动态禁用 */
  disabled?: boolean | ((query: TQuery) => boolean)
  /** 栅格跨度覆盖（基于 24 栅格） */
  colSpan?: number
  /** 透传给底层 Element Plus 控件的原生属性 */
  props?: Record<string, any>
  /** 事件监听，如 { change: handler } */
  events?: Record<string, SearchEventHandler>
  /** 值变化即触发查询，默认 false */
  searchOnChange?: boolean
}

/** 规范化后的筛选项（内部使用） */
export interface ResolvedSearchItem {
  /** 查询参数键 */
  key: string
  label: string
  type: SearchFieldType
  config: SearchConfig
  /** 栅格跨度 */
  colSpan: number
  /** 所属列的 uid */
  columnUid: string
}
