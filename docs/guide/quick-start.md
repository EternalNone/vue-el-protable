# 快速开始

`vue-el-protable` 是基于 Vue 3 + Element Plus 的配置驱动式智能表格组件：

- `columns` 同时描述**表格列**与**筛选项**；
- `options.api` 负责列表请求，组件自动携带查询参数、分页参数与排序参数；
- 响应结构默认**自动识别**，无需手动映射。

## 安装

```bash
npm install vue-el-protable
```

依赖 `vue >= 3` 与 `element-plus`，请确保项目中已安装并按需或全量引入 Element Plus。

## 注册

全局注册：

```ts
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { ProTable } from 'vue-el-protable'
import 'vue-el-protable/style.css'

const app = createApp(App)
app.use(ElementPlus)
app.component('ProTable', ProTable)
app.mount('#app')
```

或在单文件中局部引入：

```vue
<script setup lang="ts">
import { ProTable } from 'vue-el-protable'
import 'vue-el-protable/style.css'
</script>
```

## 最小示例

最小配置只需 `columns` + `options.api`：

```vue
<script setup lang="ts">
import { ProTable } from 'vue-el-protable'
import type { ProTableColumn, ProTableOptions } from 'vue-el-protable'
import { getUserPageApi } from './api'

const columns: ProTableColumn[] = [
  // search: { key: 'keyword' } 表示该筛选项提交时使用 keyword 参数
  { prop: 'name', label: '姓名', search: { key: 'keyword' } },
  // search: true 表示以默认 input 控件参与筛选，参数键为 prop
  { prop: 'account', label: '账号', search: true },
  {
    prop: 'status',
    label: '状态',
    search: {
      type: 'select',
      options: [
        { label: '启用', value: 'enabled' },
        { label: '禁用', value: 'disabled' }
      ],
      searchOnChange: true
    }
  },
  // sortable: 'custom' 触发服务端排序（自动携带 sortProp / sortOrder）
  { prop: 'amount', label: '金额', align: 'right', sortable: 'custom' },
  { prop: 'createdAt', label: '创建时间', sortable: 'custom' }
]

const options: ProTableOptions = {
  api: getUserPageApi
}
</script>

<template>
  <ProTable :columns="columns" :options="options" />
</template>
```

接口只需返回常见分页结构，组件自动识别：

```ts
// 请求参数：查询参数 + { page, pageSize }（+ 排序参数 { sortProp, sortOrder }）
export async function getUserPageApi(params: any) {
  const res = await request('/api/users', params)
  return res // { records: [...], total: 100 }
}
```

## 默认行为

| 行为 | 默认值 | 说明 |
| --- | --- | --- |
| 挂载时自动请求 | `true` | `options.autoFetch` 可关闭 |
| 分页 | 显示 | 默认每页 `10` 条，参数名 `page` / `pageSize` |
| 筛选区 | 显示 | 超过 4 项时初始收起为一行（`collapsedSize` / `searchCollapsed`） |
| 回车查询 | 开启 | `options.searchOnEnter` |
| 查询 / 重置按钮 | 显示 | `options.showSearchButtons` |
| 工具栏 | 刷新、密度、列设置、全屏 | `options.toolbarConfig` 逐项开关 |
| 响应结构 | 自动识别 | 见 [常见问题：响应字段识别规则](./faq.md) |

## 本地 playground

仓库内置可直接运行的示例工程：

```bash
npm install
npm run dev
```

包含基础用法、选项联动、选择列与插槽四个示例。
