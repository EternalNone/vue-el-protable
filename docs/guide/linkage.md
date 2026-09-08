# 选项联动与远程搜索

本篇说明下拉选项的四种来源与联动机制：静态选项、客户端联动、异步接口（`api`）、远程搜索（`remote`）。

## deps 级联联动

用 `deps` 声明依赖字段。依赖值变化时，组件自动：

1. **清空**本字段当前值；
2. **重新拉取**本字段选项（携带最新依赖值）；
3. 依赖值为空（`''` / `null` / `undefined` / `[]`）时**禁用**本控件并清空选项。

省市区三级联动示例：

```ts
const columns: ProTableColumn[] = [
  {
    prop: 'provinceId',
    label: '省份',
    search: { type: 'select', api: getProvinceList, searchOnChange: true }
  },
  {
    prop: 'cityId',
    label: '城市',
    search: { type: 'select', deps: ['provinceId'], api: getCityList }
  },
  {
    prop: 'districtId',
    label: '区县',
    search: { type: 'select', deps: ['cityId'], api: getDistrictList }
  }
]
```

选项 `api` 的请求参数自动组装为：

```
{ ...deps 各字段的当前值, ...apiParams }
```

例如选择浙江省后请求城市列表，实际调用为 `getCityList({ provinceId: 'zhejiang' })`。接口实现只需按参数返回对应选项：

```ts
export async function getCityList(params: Record<string, any>) {
  return cityData[params.provinceId] ?? []
}
```

## 客户端联动（函数式 options）

不需要请求时，`options` 可以传函数，参数为当前查询条件，返回过滤后的选项：

```ts
{
  prop: 'city',
  label: '城市',
  search: {
    type: 'select',
    deps: ['province'],
    options: (query) => cityOptions.filter((c) => c.province === query.province)
  }
}
```

## 远程搜索（remote）

`remote: true` 时，输入关键字会调用 `api` 拉取候选项：

- 关键字参数名固定为 **`keyword`**；
- 组件内置 **300ms 防抖**，停止输入后才发起请求；
- 建议同时开启底层控件的 `filterable`。

```ts
{
  prop: 'creator',
  label: '创建人',
  search: {
    type: 'select',
    remote: true,
    api: searchCreatorOptions,
    props: { filterable: true, remote: true, placeholder: '输入姓名搜索' }
  }
}
```

```ts
// 接口按 keyword 过滤候选项
export async function searchCreatorOptions(params: Record<string, any>) {
  return creators
    .filter((name) => !params.keyword || name.includes(params.keyword))
    .map((name) => ({ label: name, value: name }))
}
```

## 选项缓存与懒加载

- **懒加载**：异步选项在控件**首次展开时才发起请求**，未交互的筛选项不产生请求；
- **缓存复用**：选项结果在实例级按**参数指纹**缓存，相同参数不会重复请求；依赖值变化或远程搜索关键字变化会生成新的指纹；
- 缓存范围是单个表格实例，不同实例互不影响。

## 选项字段映射

接口返回的选项字段不是 `label` / `value` 时，用 `fieldNames` 映射；树形选项可映射 `children`：

```ts
search: {
  type: 'select',
  api: getDeptTree,
  fieldNames: { label: 'deptName', value: 'deptCode', children: 'subDepts' }
}
```

`labelKeys` 用于拼接选项文本中的额外字段（如展示「张三（研发部）」时拼接多个字段），迁移自旧组件的 `connectKey`，见 [迁移指南](./migration.md)。
