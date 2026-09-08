# vue-el-protable

基于 Element Plus 的配置驱动表格组件：**一份 `columns` 配置，同时生成筛选表单 + 表格 + 分页 + 数据请求**。

- 零运行时依赖，仅 peer 依赖 `vue >= 3.5` 与 `element-plus >= 2.9`
- ESM 单产物 + 完整 TypeScript 类型（`vue-tsc` 全量推导）
- 响应结构自动识别（`{records, total}` / 纯数组 / `{data: {list, count}}` 多层包装均可）
- 筛选表单响应式：默认收起一行、查询/重置按钮始终可见，支持展开/收起
- 内置工具栏：刷新、密度切换、列设置（显隐 + 排序重置）、全屏
- 字段联动（父级变化自动清空/禁用/重载子级）与远程搜索（防抖）
- 8 类插槽 + 9 个实例方法 + `v-model:query` / `v-model:selection`

## 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Vue | >= 3.5 | peerDependency |
| Element Plus | >= 2.9 | peerDependency |
| Vite | 7+ | 推荐构建工具（组件以 ESM 发布） |
| Node | >= 20.19 | 本地开发要求 |

## 安装

```bash
npm i vue-el-protable
```

## 快速开始

```ts
// main.ts
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ProTable from 'vue-el-protable'
import 'vue-el-protable/style.css'
import App from './App.vue'

createApp(App).use(ElementPlus).use(ProTable).mount('#app')
```

最小配置只需 `columns` + `options.api`：

```vue
<script setup lang="ts">
import type { ProTableColumn } from 'vue-el-protable'
import { getUserPageApi } from './api'

interface UserRow {
  id: number
  name: string
  account: string
  status: 'enabled' | 'disabled'
  createdAt: string
}

const columns: ProTableColumn<UserRow>[] = [
  { prop: 'name', label: '姓名', search: { el: 'input' } }, // 带筛选项
  { prop: 'account', label: '账号' },
  { prop: 'status', label: '状态' },
  { prop: 'createdAt', label: '创建时间', sortable: true },
]

const options = {
  api: getUserPageApi, // (params) => Promise<响应>，分页/筛选/排序参数自动拼装
  rowKey: 'id',
}
</script>

<template>
  <ProTable :columns="columns" :options="options" />
</template>
```

> 不引入全量样式时，也可只引入 `vue-el-protable/style.css`（组件自身的 `cpt-` 前缀样式）。

## 核心概念

### columns：一份配置三处生效

每个列配置同时描述**表格列**、**筛选项**与**取值路径**：

```ts
{
  prop: 'deptId',              // 支持点路径，如 'dept.name'
  label: '部门',
  width: 140,
  sortable: true,              // 远程排序：发出 sortProp / sortOrder 参数
  search: {                    // 声明后自动进入筛选表单
    el: 'select',              // input / select / date-picker / daterange ...
    props: { placeholder: '请选择部门' },
    options: deptOptions,      // 静态选项；或用 api 远程加载/搜索
  },
  slot: true,                  // 启用单元格插槽 #[prop]
  headerSlot: true,            // 启用表头插槽 #[prop]-header
  hideInTable: true,           // 只筛选、不展示列
  hideInSearch: true,          // 只展示列、不筛选
}
```

字段联动：在子级列的 `search` 中声明 `linkage`（父级字段 + 变化时清空/禁用/重新拉取子级选项），远程搜索：`search` 配置 `remote: true` + `api`，关键字参数固定为 `keyword`，防抖由组件完成。

### options：表格与请求行为

常用键（完整清单见文档站）：

```ts
{
  api,                  // 必填：列表请求函数
  rowKey: 'id',
  autoFetch: true,      // 挂载后自动请求，默认 true
  immediate: true,      // 同 autoFetch 语义的别名场景见文档
  pagination: true,     // 关闭分页
  pageSize: 10,
  selection: 'multiple',// 'multiple' | 'single' | false
  selectionKey: 'id',   // 跨页保留勾选的行标识
  toolbar: true,        // 工具栏：刷新/密度/列设置/全屏
  searchCollapsed: true,// 筛选表单默认收起一行
  beforeFetch,          // (params) => params | false（false 取消请求）
  afterFetch,           // (rows) => rows 数据加工
  response: { rowsKey, totalKey }, // 显式指定响应字段，跳过自动探测
}
```

`options` 白名单之外的键与组件上的其余属性会**透传给底层 `el-table`**（`class`/`style` 保留在根节点），可直接使用 el-table 的原生能力。

## 插槽

| 插槽 | 说明 |
| --- | --- |
| `#toolbar` | 工具栏左侧：自定义业务按钮（新增/删除/导出等）统一放在这里，右侧为固定内置功能 |
| `#[prop]` | 单元格插槽，需列配置 `slot: true`；参数 `{ row, column, $index }` |
| `#[prop]-header` | 表头插槽，需列配置 `headerSlot: true`；参数 `{ column, $index }` |
| `#expand` | 展开行内容；参数 `{ row, $index }` |
| `#empty` | 空数据占位 |
| `#search-actions` | 筛选按钮区追加内容（查询/重置按钮之后） |
| `#search-{key}` | 自定义筛选项插槽：列配置 `search.type: 'custom'` 时生效，`{key}` 为 `search.key ?? prop`；作用域 `{ value, query, item, setValue }` |

## 实例方法

通过 `ref` 调用（类型 `ProTableInstance`）：

```ts
const tableRef = ref<ProTableInstance>()
tableRef.value?.reload() // 回到第一页重新查询
```

| 方法 | 说明 |
| --- | --- |
| `reload()` | 回到第一页重新查询（增删改后推荐调用） |
| `refresh()` | 保持当前页与条件重新请求 |
| `getQuery()` / `setQuery(patch)` | 读取 / 部分合并写入查询条件（`setQuery` 不自动发起查询） |
| `resetQuery()` | 恢复默认值并查询 |
| `getSelection()` / `setSelection(rows)` / `clearSelection()` | 选中行的读取、编程式设置、清空 |
| `getTableRef()` | 获取内部 `el-table` 实例（逃生舱） |

## 事件与 v-model

```vue
<ProTable
  :columns="columns"
  :options="options"
  v-model:query="query"
  v-model:selection="selection"
  @fetch-success="onSuccess"
  @fetch-error="onError"
  @search="onSearch"
  @reset="onReset"
  @selection-change="onSelectionChange"
  @single-change="onSingleChange"
  @page-change="onPageChange"
/>
```

- `v-model:query`：双向同步查询条件对象
- `v-model:selection`：双向同步选中行（多选为数组，单选长度 ≤ 1）
- `fetch-success` 载荷：`{ data, total, params }`
- el-table 原生事件（`sort-change`、`row-click` 等）经 `$attrs` 全量透传，可直接监听

## 本地开发

```bash
npm install
npm run dev          # playground（localhost:5173）
npm run docs:dev     # VitePress 文档站
npm run typecheck    # vue-tsc --noEmit
npm run test         # vitest 单测 + 类型测试
npm run build        # 产出 dist/（index.es.js + index.d.ts + style.css）
npm run lint
```

目录结构：

```
src/
  ProTable/
    index.vue          # 主组件：接线各 hooks、插槽与透传
    components/        # SearchForm / FieldRenderer / ColumnNode / ColumnSetting / Toolbar
    hooks/             # useFetch / useColumns / useSearchForm / useFieldOptions / useSelection / useToolbar
    types/             # column / search / options / events 全量类型
  styles/              # cpt- 前缀样式，仅使用 --el-* 变量
  index.ts             # 导出 ProTable + install + 全部类型
playground/            # 可运行示例（基础/联动/选择/插槽 四个场景）
docs/                  # VitePress 文档站源码
tests/                 # 单元测试与类型测试
```

## 文档

完整 API、列配置参考、联动与远程搜索指南、迁移与 FAQ：

```bash
npm run docs:dev
```

## License

MIT
