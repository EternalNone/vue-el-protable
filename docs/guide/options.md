# 全局配置（ProTableOptions）

`options` 控制请求、分页、筛选区、工具栏等全局行为。类型定义见 `src/ProTable/types/options.ts`。

## 字段一览

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `api` | `(params) => Promise<any>` | - | 列表查询函数，自动携带查询参数 + 分页参数（+ 排序参数） |
| `rowKey` | `string` | `'id'` | 行数据的 Key |
| `fieldNames` | `{ list, total }` | 自动识别 | 响应字段映射，支持点路径（如 `data.list`）；仅在自动识别不满足时手工指定 |
| `paginationProps` | `{ page, pageSize }` | `{ page: 'page', pageSize: 'pageSize' }` | 分页参数名覆盖 |
| `beforeFetch` | `(params) => any \| false` | - | 请求前改写参数；返回 `false` 中断本次请求 |
| `afterFetch` | `(rows) => rows` | - | 对列表数据做加工（优先级高于 `fieldNames`） |
| `autoFetch` | `boolean` | `true` | 挂载时自动请求 |
| `selection` | `'single' \| 'multiple' \| false` | `false` | 选择列模式 |
| `selectable` | `(row, index) => boolean` | - | 行是否可选 |
| `showIndex` | `boolean` | `false` | 显示序号列 |
| `showExpand` | `boolean` | `false` | 显示展开行 |
| `showPagination` | `boolean` | `true` | 显示分页 |
| `searchVisible` | `boolean` | `true` | 显示筛选区 |
| `searchCollapsed` | `boolean` | `true` | 筛选区初始收起为一行（筛选项超过 `collapsedSize` 时生效） |
| `collapsedSize` | `number` | `4` | 收起阈值：筛选项数量超过该值出现展开/收起 |
| `labelWidth` | `string \| number` | `'auto'` | 筛选表单 label 宽度 |
| `labelPosition` | `'left' \| 'right' \| 'top'` | `'right'` | 筛选表单 label 位置 |
| `searchOnEnter` | `boolean` | `true` | 回车触发查询 |
| `showSearchButtons` | `boolean` | `true` | 显示查询/重置按钮 |
| `toolbarConfig` | `ProTableToolbarConfig` | 全部开启 | 工具栏内置功能开关，见下 |
| `persistKey` | `string` | - | 列显隐持久化键：写入 `localStorage`，键名 `vue-el-protable:columns:{persistKey}` |
| `defaultPageSize` | `number` | `10` | 默认每页条数 |
| 其余 | - | - | 透传给底层 `el-table` 的原生属性 |

## toolbarConfig

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `refresh` | `true` | 刷新按钮（调用 `refresh`：保持当前页重新请求） |
| `columnSetting` | `true` | 列设置（勾选显隐；配置 `persistKey` 后持久化） |
| `fullscreen` | `true` | 全屏 |

以上内置功能固定在工具栏**右侧**；左侧通过 `#toolbar` 插槽承载自定义业务按钮，见 [实例方法 / 事件 / 插槽](./instance.md)。

组件内置 Element Plus 中文语言包，分页、空状态等内置文案默认显示为中文。

## 响应结构自动识别

未配置 `fieldNames` 时，组件按以下顺序探测响应：

1. **纯数组**：响应为数组时直接作为列表，`total` 取数组长度（无服务端分页）；
2. **列表字段**：依次探测 `records` → `list` → `rows` → `items` → `data`；
3. **包装剥离**：顶层探测不到列表字段时，若 `data` 或 `result` 为包含列表字段的对象，剥离一层后再探测；
4. **总数字段**：依次探测 `total` → `count` → `totalCount` → `totalSize`（顶层找不到时同样会进入 `data` / `result` 包装层内查找）；均未命中时以列表长度作为 `total`。

探测不满足时用 `fieldNames` 手工指定（支持点路径）：

```ts
const options: ProTableOptions = {
  api: getOrders,
  fieldNames: { list: 'result.items', total: 'result.totalSize' }
}
```

## beforeFetch / afterFetch

```ts
const options: ProTableOptions = {
  api: getUserPageApi,
  // 请求前改写参数：追加固定参数、字段改名等
  beforeFetch: (params) => ({ ...params, tenantId: 't-001' }),
  // 响应后加工行数据：补字段、类型转换等
  afterFetch: (rows) => rows.map((row) => ({ ...row, fullName: `${row.name}(${row.account})` }))
}
```

`beforeFetch` 返回 `false` 时中断本次请求（如必填条件未满足）。

## 列显隐持久化

```ts
const options: ProTableOptions = {
  api: getUserPageApi,
  persistKey: 'user-list'
}
```

列设置面板的勾选结果写入 `localStorage['vue-el-protable:columns:user-list']`，下次进入页面自动恢复。
