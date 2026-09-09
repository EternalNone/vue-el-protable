# 列配置

`columns` 是 `ProTableColumn[]`。每一项同时描述「这一列在表格中如何展示」与「是否/如何参与筛选」。类型定义见 `src/ProTable/types/column.ts`。

## 字段一览

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `prop` | `string` | - | 数据字段名，支持点路径（如 `user.name`）；同时作为默认插槽名与查询参数键 |
| `label` | `string` | 必填 | 列标题，也作为筛选项默认 label |
| `width` | `string \| number` | - | 列宽 |
| `minWidth` | `string \| number` | - | 最小列宽 |
| `fixed` | `boolean \| 'left' \| 'right'` | - | 固定列 |
| `align` | `'left' \| 'center' \| 'right'` | `'center'` | 内容对齐 |
| `headerAlign` | `'left' \| 'center' \| 'right'` | - | 表头对齐 |
| `sortable` | `boolean \| 'custom'` | - | 排序；`'custom'` 时触发服务端排序，请求自动携带 `sortProp` / `sortOrder` |
| `formatter` | `(row, column, cellValue, index) => any` | - | 轻量格式化（纯文本场景） |
| `render` | `(scope) => VNode \| string \| number \| null` | - | 自定义渲染函数；与插槽二选一，**插槽优先** |
| `slot` | `boolean \| string` | `false` | 开启自定义单元格插槽；`true` 时插槽名为 `prop`，字符串则用该字符串 |
| `headerSlot` | `boolean \| string` | `false` | 开启自定义表头插槽；`true` 时插槽名为 `${prop}-header` |
| `hidden` | `boolean` | `false` | 表格中默认不展示（仍可被列设置面板重新勾选）；不影响筛选项渲染 |
| `ellipsis` | `boolean` | `true` | 溢出省略 + tooltip |
| `children` | `ProTableColumn[]` | - | 多级表头 |
| `search` | `boolean \| SearchConfig` | - | 筛选项配置；`true` 表示以默认 `input` 参与筛选，详见 [筛选配置](./search.md) |
| 其余 | - | - | 透传给底层 `el-table-column` 的原生属性 |

## 基本示例

```ts
const columns: ProTableColumn[] = [
  { prop: 'name', label: '姓名', minWidth: 120, search: true },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    search: { type: 'select', options: statusOptions },
    formatter: (row) => (row.status === 'enabled' ? '启用' : '禁用')
  },
  { prop: 'amount', label: '金额', align: 'right', sortable: 'custom' },
  // 点路径取值
  { prop: 'user.phone', label: '手机号' },
  // 默认隐藏，可在列设置面板重新勾选
  { prop: 'remark', label: '备注', hidden: true }
]
```

## 自定义单元格

三种方式任选其一，优先级为 **插槽 > render > formatter**：

```ts
// 1. formatter：纯文本
{ prop: 'status', label: '状态', formatter: (row) => statusText[row.status] }

// 2. render：返回 VNode
{
  prop: 'status',
  label: '状态',
  render: ({ row }) => h(ElTag, { size: 'small' }, () => statusText[row.status])
}

// 3. slot：模板插槽
{ prop: 'status', label: '状态', slot: true }
```

```vue
<!-- slot: true → 插槽名为 prop -->
<template #status="{ row, column, $index }">
  <el-tag size="small">{{ statusText[row.status] }}</el-tag>
</template>
```

## 自定义表头

```ts
{ prop: 'name', label: '姓名', headerSlot: true }
```

```vue
<!-- headerSlot: true → 插槽名为 ${prop}-header -->
<template #name-header>
  <span class="name-header">姓名（自定义表头）</span>
</template>
```

## 多级表头

通过 `children` 嵌套：

```ts
{
  label: '联系方式',
  children: [
    { prop: 'phone', label: '手机号' },
    { prop: 'email', label: '邮箱', search: true }
  ]
}
```

子列同样支持 `search` 配置，筛选项按展开顺序进入筛选区。

## 服务端排序

列配置 `sortable: 'custom'` 后，点击表头排序会重新请求，自动追加排序参数：

```json
{ "sortProp": "amount", "sortOrder": "ascending" }
```

`sortOrder` 取值与 Element Plus 一致：`'ascending' | 'descending'`。
