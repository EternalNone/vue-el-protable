# 常见问题

## 如何给请求追加自定义参数？

优先用 `options.beforeFetch` 改写请求参数（所有查询都会经过它）：

```ts
const options: ProTableOptions = {
  api: getUserPageApi,
  beforeFetch: (params) => ({ ...params, tenantId: 't-001', source: 'admin' })
}
```

仅筛选选项接口需要附加参数时，用 `search.apiParams`：

```ts
search: {
  type: 'select',
  api: getCityList,
  apiParams: { status: 'active' } // 也支持 (query) => object 形式
}
```

需要阻断本次请求（如必填条件未满足）时，让 `beforeFetch` 返回 `false`。

## 响应字段识别规则是什么？

未配置 `fieldNames` 时按以下顺序自动探测：

- 响应为数组：直接作为列表，`total` 取数组长度；
- 列表字段：`records` → `list` → `rows` → `items` → `data`；
- 顶层探测不到列表时，剥离 `data` / `result` 包装层再探测；
- 总数字段：`total` → `count` → `totalCount` → `totalSize`（包装层内同样查找）；均未命中时以列表长度作为 `total`。

字段不在候选内时用 `fieldNames` 手工指定（支持点路径）：

```ts
options: { fieldNames: { list: 'result.items', total: 'result.totalSize' } }
```

需要更复杂的加工时用 `options.afterFetch`（优先级高于 `fieldNames`）。

## 如何手动触发查询？

通过组件实例：

```ts
tableRef.value?.reload() // 回到第一页重新查询
tableRef.value?.refresh() // 保持当前页重新请求
```

编程式写入条件后手动查询：

```ts
tableRef.value?.setQuery({ status: 'enabled' }) // 仅写入，不自动查询
tableRef.value?.reload()
```

重置到默认值并查询：`tableRef.value?.resetQuery()`。

此外，筛选项可配置 `searchOnChange: true`（值变化即查询）与 `search.events.change` 中调用 `reload()`。

## 分页参数名不是 page / pageSize 怎么办？

用 `options.paginationProps` 覆盖：

```ts
options: {
  api: getUserPageApi,
  paginationProps: { page: 'pageNum', pageSize: 'size' },
  defaultPageSize: 20
}
```

## 纯筛选字段（表格不展示）怎么配置？

列设置 `hidden: true` 即可：筛选项照常渲染，表格不展示该列，且仍可在列设置面板中重新勾选。

```ts
{ prop: 'provinceId', label: '省份', hidden: true, search: { type: 'select', api: getProvinceList } }
```

## 如何让某列默认隐藏、某些行不可选？

- 默认隐藏：列配置 `hidden: true`；
- 行是否可选：`options.selectable: (row, index) => boolean`（配合 `options.selection` 使用）。

## 列显隐设置如何持久化？

配置 `options.persistKey`，勾选结果写入 `localStorage['vue-el-protable:columns:{persistKey}']`，下次进入自动恢复。

## 排序参数如何接收？

列配置 `sortable: 'custom'` 时，排序变化会重新请求并携带：

```json
{ "sortProp": "amount", "sortOrder": "ascending" }
```

`sortOrder` 为 `'ascending' | 'descending'`，取消排序时不再携带排序参数。

## 远程搜索的关键字参数名是什么？

固定为 `keyword`，组件内置 300ms 防抖。接口示例：

```ts
export async function searchUsers(params: Record<string, any>) {
  return list.filter((u) => u.name.includes(params.keyword ?? ''))
}
```

## 获取内部 el-table 实例？

使用逃生舱方法：

```ts
const elTable = tableRef.value?.getTableRef()
elTable?.scrollTo({ top: 0 })
```
