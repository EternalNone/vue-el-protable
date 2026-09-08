# 实例方法 / 事件 / 插槽

通过 `ref` 获取组件实例调用方法；事件在模板上直接监听；插槽覆盖表格与筛选区的关键区域。

## 实例方法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ProTable } from 'vue-el-protable'
import type { ProTableInstance } from 'vue-el-protable'

const tableRef = ref<ProTableInstance>()
// tableRef.value?.reload()
</script>

<template>
  <ProTable ref="tableRef" :columns="columns" :options="options" />
</template>
```

| 方法 | 说明 |
| --- | --- |
| `reload()` | 回到第一页重新查询（新增/删除/导入等数据变更后推荐调用） |
| `refresh()` | 保持当前页与当前条件重新请求（工具栏「刷新」按钮即调用它） |
| `getQuery()` | 获取当前查询条件 |
| `setQuery(patch)` | 部分合并写入查询条件（**不自动发起查询**） |
| `resetQuery()` | 恢复默认值并查询 |
| `getSelection()` | 获取选中行数组（多选为多行；单选长度 ≤ 1） |
| `setSelection(rows)` | 编程式设置选中行（跨页保留勾选、默认勾选场景） |
| `clearSelection()` | 清空选中 |
| `getTableRef()` | 获取内部 `el-table` 实例（逃生舱，处理未封装的原生能力） |

## 双向绑定

| v-model | 说明 |
| --- | --- |
| `v-model:query` | 查询条件对象，与筛选区双向同步 |
| `v-model:selection` | 选中行（多选为数组；单选为行对象或 `null`） |

## 事件

| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `fetch-success` | `{ data, total, params }` | 请求成功 |
| `fetch-error` | `error` | 请求失败 |
| `search` | `query` | 点击查询按钮 |
| `reset` | `query` | 点击重置按钮 |
| `query-change` | `query` | 查询条件变化 |
| `selection-change` | `rows` | 多选选中行变化 |
| `single-change` | `row \| null` | 单选选中行变化 |
| `page-change` | `{ page, pageSize }` | 页码/每页条数变化 |

`el-table` 原生事件通过 `$attrs` 全量透传，可直接监听（如 `@row-click`、`@sort-change`）。

## 插槽

| 插槽 | 作用域 | 说明 |
| --- | --- | --- |
| `#toolbar` | - | 工具栏左侧：自定义业务按钮（新增/删除/导出等）统一放在这里 |
| `#{prop}` | `{ row, column, $index }` | 单元格插槽；列配置 `slot: true`（或 `slot: '名称'`） |
| `#{prop}-header` | - | 表头插槽；列配置 `headerSlot: true`（或 `headerSlot: '名称'`） |
| `#expand` | `{ row }` | 展开行内容；需 `options.showExpand: true` |
| `#search-{key}` | `{ query }` | 自定义筛选项；列配置 `search: { type: 'custom', key }`，作用域 `query` 可直接 `v-model` |
| `#search-actions` | - | 筛选按钮区，可追加自定义按钮 |

示例：

```vue
<ProTable :columns="columns" :options="options">
  <template #toolbar>
    <el-button type="primary" size="small">新增</el-button>
    <el-button size="small" plain>导出</el-button>
  </template>

  <template #status="{ row }">
    <el-tag size="small">{{ statusText[row.status] }}</el-tag>
  </template>

  <template #name-header>
    <span class="custom-header">姓名</span>
  </template>

  <template #expand="{ row }">
    <div>创建人：{{ row.creator }}</div>
  </template>

  <template #search-keyword="{ query }">
    <el-input v-model="query.keyword" placeholder="自定义筛选项" />
  </template>

  <template #search-actions>
    <el-button link type="primary">高级搜索</el-button>
  </template>
</ProTable>
```
