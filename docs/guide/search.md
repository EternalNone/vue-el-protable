# 筛选配置

筛选项由列配置中的 `search` 字段声明：`search: true` 表示以默认 `input` 控件参与筛选；传对象则精细控制。类型定义见 `src/ProTable/types/search.ts`。

## SearchConfig 字段一览

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `key` | `string` | 列 `prop` | 提交的查询参数键 |
| `label` | `string` | 列 `label` | 表单 label |
| `type` | `SearchFieldType` | `'input'` | 控件类型，见下表 |
| `defaultValue` | `any` | - | 默认值（重置时恢复） |
| `options` | `OptionItem[] \| (query) => OptionItem[]` | - | 静态选项；支持函数形式做客户端过滤/联动 |
| `api` | `(params) => Promise<any>` | - | 异步选项接口；返回数组或包装对象（自动识别） |
| `apiParams` | `object \| (query) => object` | - | 异步选项接口附加参数 |
| `deps` | `string[]` | - | 依赖字段：依赖值变化时清空本字段并重新拉取选项，见 [选项联动](./linkage.md) |
| `remote` | `boolean` | `false` | 开启远程搜索（输入关键字调 `api`，300ms 防抖） |
| `fieldNames` | `{ label, value, children }` | `{ label: 'label', value: 'value' }` | 选项字段映射 |
| `labelKeys` | `string[]` | - | 选项文本需要拼接的额外字段 |
| `splitKeys` | `{ start, end }` | - | 范围类控件提交时拆分的两个参数名 |
| `visible` | `boolean \| (query) => boolean` | `true` | 动态显隐 |
| `disabled` | `boolean \| (query) => boolean` | `false` | 动态禁用 |
| `colSpan` | `number` | `6` | 栅格跨度（基于 24 栅格，默认每行 4 项） |
| `props` | `object` | - | 透传给底层 Element Plus 控件的原生属性（如 `placeholder`、`clearable`） |
| `events` | `{ change: handler, ... }` | - | 事件监听；回调签名 `(新值, 当前查询条件, { reload })` |
| `searchOnChange` | `boolean` | `false` | 值变化即触发查询 |

## 控件类型一览

| type | 说明 |
| --- | --- |
| `input` | 文本输入（默认） |
| `textarea` | 多行文本 |
| `input-number` | 数字输入 |
| `select` | 下拉选择 |
| `cascader` | 级联选择 |
| `tree-select` | 树选择 |
| `date` / `dates` / `week` / `month` / `year` | 单日期类 |
| `daterange` / `datetimerange` / `monthrange` | 范围类（配合 `splitKeys` 拆分参数） |
| `time-select` | 时间选择 |
| `switch` | 开关 |
| `radio` | 单选 |
| `checkbox` | 多选 |
| `custom` | 自定义，使用 `search-{key}` 插槽渲染 |

## 常用示例

### 默认值与重置

```ts
{
  prop: 'status',
  label: '状态',
  search: { type: 'select', defaultValue: 'enabled', options: statusOptions }
}
```

点击「重置」时所有筛选项恢复 `defaultValue`（未设置则清空）并重新查询。

### 范围控件拆分参数

日期范围默认提交数组，配置 `splitKeys` 后拆分为两个参数：

```ts
{
  prop: 'createdAt',
  label: '创建时间',
  search: {
    type: 'daterange',
    splitKeys: { start: 'startTime', end: 'endTime' },
    props: { valueFormat: 'YYYY-MM-DD' }
  }
}
```

提交结果为 `{ startTime: '2026-01-01', endTime: '2026-01-31' }`。

### 动态显隐与禁用

```ts
{
  prop: 'channelDetail',
  label: '渠道明细',
  // 仅当 channel === 'online' 时显示；函数参数为当前查询条件
  search: { visible: (query) => query.channel === 'online' }
}
```

### 事件监听

```ts
{
  prop: 'status',
  label: '状态',
  search: {
    type: 'select',
    options: statusOptions,
    events: {
      // (新值, 当前查询条件, 辅助方法)
      change: (value, query, { reload }) => {
        if (value === 'disabled') reload()
      }
    }
  }
}
```

### 自定义筛选项（custom）

`type: 'custom'` 时，该项由 `search-{key}` 插槽渲染（`{key}` 为 `search.key ?? prop`），插槽作用域为 `{ value, query, item, setValue }`：可对 `query` 直接 `v-model` 写入，也可用 `setValue(val)` 写入并触发值变化联动逻辑：

```ts
{
  prop: 'remark',
  label: '备注',
  hidden: true,
  search: { type: 'custom', key: 'keyword', label: '关键字' }
}
```

```vue
<template #search-keyword="{ query }">
  <el-input v-model="query.keyword" placeholder="自定义筛选项" clearable />
</template>
```

## 响应式布局规则

- 筛选区基于 24 栅格，单项默认 `colSpan: 6`，即每行 4 项；
- 筛选项数量超过 `options.collapsedSize`（默认 `4`）时，筛选区初始收起为一行（`options.searchCollapsed` 默认 `true`），出现「展开/收起」按钮；
- 单项可用 `colSpan` 覆盖跨度，例如日期范围占半行：`colSpan: 12`。

## 查询参数构建

- 提交时按各筛选项的 `key` 组装参数，空值（`''` / `null` / `undefined` / `[]`）自动剔除；
- `hidden: true` 的列不影响筛选项渲染，纯筛选列可只用 `hidden` 列承载。
