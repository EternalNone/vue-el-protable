# 从旧组件迁移

本文给出旧 `ComTable` / `ComSelect` 体系到 `vue-el-protable` 的字段映射与迁移要点。整体思路：列定义与筛选配置合一（收敛到列的 `search` 子对象），下拉相关配置统一进 `search`。

## 列配置映射

| 现有字段 | 新字段 | 说明 |
| --- | --- | --- |
| `showInSearch: true` | `search: true` | 直接生成筛选项（默认 `input`） |
| `searchType` | `search.type` | 控件类型，取值见 [筛选配置](./search.md) |
| `searchKey` | `search.key` | 提交的查询参数键 |
| `searchConfig` | `search.props`（el 原生属性）+ 语义化字段 | 拆分为透传属性与语义化配置（`options` / `api` / `deps` 等） |
| `depKey` | `search.deps: [depKey]` | 依赖联动升级为数组，支持多依赖 |
| `hideInTable` | `hidden` | 表格中不展示，仍可被列设置面板重新勾选 |
| `childColumn` | `children` | 多级表头 |
| `slot: 'xxx'`（字符串） | `slot: 'xxx'` | 保持一致 |
| `ellipsis` | `ellipsis` | 保持一致 |

## 下拉配置映射（ComSelect → search）

| 现有字段 | 新字段 | 说明 |
| --- | --- | --- |
| `qFunc` | `search.api` | 异步选项接口；请求参数自动合并依赖值与 `apiParams` |
| `opsKV` | `search.fieldNames` | label/value/children 字段映射 |
| `connectKey` | `search.labelKeys` | 选项文本需要拼接的额外字段 |
| `remoteKey` | `search.remote` | 远程搜索；关键字参数名为 `keyword`，300ms 防抖 |
| `selectableFunc` | `options.selectable` | 行是否可选（表格级配置） |

## 迁移示例

旧写法：

```ts
{
  prop: 'cityId',
  label: '城市',
  showInSearch: true,
  searchType: 'select',
  depKey: 'provinceId',
  qFunc: (params) => getCityList(params),
  opsKV: { label: 'cityName', value: 'cityCode' },
  hideInTable: true
}
```

新写法：

```ts
{
  prop: 'cityId',
  label: '城市',
  hidden: true,
  search: {
    type: 'select',
    deps: ['provinceId'],
    api: getCityList,
    fieldNames: { label: 'cityName', value: 'cityCode' }
  }
}
```

## 其他迁移要点

- 列表请求从手写 `fetch` 逻辑改为 `options.api`，分页参数（`page` / `pageSize`）与排序参数（`sortProp` / `sortOrder`）由组件自动携带；
- 响应结构默认自动识别（`records` / `list` / `rows` 等），旧接口字段特殊时用 `options.fieldNames` 指定；
- 旧组件的「刷新当前页」对应实例方法 `refresh()`，「重置并重查」对应 `resetQuery()`；
- 单选 / 多选由 `options.selection: 'single' | 'multiple'` 统一控制。
