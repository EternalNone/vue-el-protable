# vue-el-protable

📖 在线文档：https://eternalnone.github.io/vue-el-protable/

基于 Element Plus 的配置驱动表格组件：**一份 `columns` 配置，同时生成筛选表单 + 表格 + 分页 + 数据请求**。

- 零运行时依赖，仅 peer 依赖 `vue >= 3.5` 与 `element-plus >= 2.9`
- ESM 单产物 + 完整 TypeScript 类型声明
- 响应结构自动识别（`{records, total}` / 纯数组 / `{data: {list, count}}` 多层包装均可）
- 筛选表单响应式：默认收起一行、查询/重置按钮始终可见，支持展开/收起
- 内置工具栏：刷新、列设置（显隐 + 重置，可经 `persistKey` 持久化）、全屏
- 字段联动（`deps` 声明依赖：父级变化自动清空/禁用/重载子级选项）与远程搜索（300ms 防抖）
- 7 类插槽 + 9 个实例方法 + `v-model:query` / `v-model:selection`
- 内置 Element Plus 中文语言包，分页/空状态等文案默认中文

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
import type { ProTableColumn, ProTableOptions } from 'vue-el-protable'
import { getUserPageApi } from './api'

interface UserRow {
  id: number
  name: string
  account: string
  status: 'enabled' | 'disabled'
  createdAt: string
}

const columns: ProTableColumn<UserRow>[] = [
  { prop: 'name', label: '姓名', search: true }, // 声明 search 即进入筛选表单（默认 input）
  { prop: 'account', label: '账号' }, // 不声明 search 则不参与筛选
  { prop: 'status', label: '状态' },
  { prop: 'createdAt', label: '创建时间', sortable: 'custom' }, // 服务端排序
]

const options: ProTableOptions<UserRow> = {
  api: getUserPageApi, // (params) => Promise<响应>，筛选/分页/排序参数自动拼装
  rowKey: 'id',
}
</script>

<template>
  <ProTable :columns="columns" :options="options" />
</template>
```

> 组件自身样式（`cpt-` 前缀，仅依赖 `--el-*` CSS 变量）单独输出为 `style.css`，需手动引入 `vue-el-protable/style.css`；Element Plus 样式照常另行引入。

## 核心概念

### columns：一份配置三处生效

每个列配置同时描述**表格列**、**筛选项**与**取值路径**：

```ts
{
  prop: 'deptId',              // 支持点路径，如 'dept.name'
  label: '部门',
  width: 140,
  sortable: 'custom',          // 服务端排序：发出 sortProp / sortOrder 参数（true 为 el-table 本地排序）
  search: {                    // 声明后自动进入筛选表单
    type: 'select',            // input / select / date / daterange / cascader / tree-select / custom ...
    props: { placeholder: '请选择部门' },
    options: deptOptions,      // 静态选项；或用 api 远程加载/搜索
  },
  slot: true,                  // 启用单元格插槽 #[prop]
  headerSlot: true,            // 启用表头插槽 #[prop]-header
  hidden: true,                // 表格中默认不展示（可在列设置面板重新勾选），不影响筛选项
  children: [],                // 多级表头
}
```

单元格自定义三选一，优先级 **插槽 > render > formatter**；其余键透传给 `el-table-column`。

字段联动：在子级列的 `search` 中声明 `deps: ['父级字段']`——父级值变化时自动清空下游并按新参数重新拉取选项，父级为空时子级禁用（支持多级链式联动，自动检测循环依赖）。远程搜索：`search` 配置 `remote: true` + `api`，关键字参数固定为 `keyword`，300ms 防抖由组件完成，选项懒加载（首次展开才请求）并按参数指纹缓存。

### options：表格与请求行为

常用键（完整清单见文档站）：

```ts
{
  api,                  // 列表请求函数
  rowKey: 'id',         // 行数据 Key，默认 'id'
  autoFetch: true,      // 挂载后自动请求，默认 true
  showPagination: true, // 分页开关
  defaultPageSize: 10,  // 默认每页条数
  paginationProps: { page: 'page', pageSize: 'pageSize' }, // 分页参数名覆盖
  fieldNames: { list, total },   // 响应字段映射（支持点路径），默认自动识别
  beforeFetch,          // (params) => params | false（false 取消请求）
  afterFetch,           // (rows) => rows 数据加工
  selection: 'multiple',// 'multiple' | 'single' | false，默认 false
  selectable,           // (row, index) => boolean 行是否可选
  showIndex: false,     // 序号列
  showExpand: false,    // 展开行（配合 #expand 插槽）
  searchVisible: true,  // 筛选区开关
  searchCollapsed: true,// 筛选表单默认收起一行（项数超过 collapsedSize 时生效）
  collapsedSize: 4,     // 收起阈值
  labelWidth: 'auto',   // 筛选表单 label 宽度 / labelPosition: 'left' | 'right' | 'top'
  searchOnEnter: true,  // 回车触发查询
  showSearchButtons: true, // 查询/重置按钮
  toolbarConfig: { refresh, columnSetting, fullscreen }, // 工具栏内置功能开关
  persistKey: 'user-list', // 列显隐持久化：写入 localStorage['vue-el-protable:columns:{persistKey}']
}
```

`options` 白名单之外的键与组件上的其余属性会**透传给底层 `el-table`**（`class`/`style` 保留在根节点），可直接使用 el-table 的原生能力。

## 插槽

| 插槽 | 说明 |
| --- | --- |
| `#toolbar` | 工具栏左侧：自定义业务按钮（新增/删除/导出等）统一放在这里，右侧为固定内置功能 |
| `#[prop]` | 单元格插槽，需列配置 `slot: true`；参数 `{ row, column, $index }` |
| `#[prop]-header` | 表头插槽，需列配置 `headerSlot: true` |
| `#expand` | 展开行内容，需 `options.showExpand: true`；参数 `{ row, $index }` |
| `#empty` | 空数据占位 |
| `#search-actions` | 筛选按钮区追加内容（查询/重置按钮之后）；参数 `{ query }` |
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
  @query-change="onQueryChange"
  @selection-change="onSelectionChange"
  @single-change="onSingleChange"
  @page-change="onPageChange"
/>
```

- `v-model:query`：双向同步查询条件对象
- `v-model:selection`：双向同步选中行（多选为数组，单选长度 ≤ 1）
- `fetch-success` 载荷：`{ data, total, params }`；`page-change` 载荷：`{ page, pageSize }`
- `query-change`：任一筛选值变化时触发
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

## 发布新版本

npm 包由 GitHub Actions 自动发布（`.github/workflows/publish-npm.yml`）：推送 `v*` 格式的 git tag 后，自动执行类型检查 → 单元测试 → 构建 → 发布到 npm（带 provenance 签名）。仅推送代码到 main 不会发包（同一版本号在 npm 只能发布一次，打 tag 即代表一次正式发版）。

发新版只需两条命令：

```bash
npm version patch      # 升版本号并自动打 tag（补丁用 patch，新功能用 minor，破坏性变更用 major）
git push --follow-tags # 推送代码与 tag，tag 到达 GitHub 后自动触发发布
```

前置条件（一次性配置）：仓库 `Settings → Secrets and variables → Actions` 中需存在名为 `NPM_TOKEN` 的 secret，值为 npm 的 Granular Access Token（勾选 Bypass 2FA，Packages 权限 Read and write）。

发布后可在仓库 Actions 页面查看 "Publish to npm" 运行结果，并用 `npm view vue-el-protable version` 确认新版本已上线。

## 文档

完整 API、列配置参考、联动与远程搜索指南、FAQ（在线版见顶部链接），本地运行：

```bash
npm run docs:dev
```

文档站由 GitHub Actions 自动部署（`.github/workflows/deploy-docs.yml`）：推送到 main 后构建 VitePress 并发布到 GitHub Pages。

## License

MIT
