---
layout: home

hero:
  name: vue-el-protable
  text: 配置驱动的智能表格
  tagline: 基于 Vue 3 + Element Plus，一份 columns 配置搞定列展示、筛选表单、分页与请求
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 列配置
      link: /guide/columns

features:
  - title: 配置驱动
    details: columns 同时描述表格列与筛选项，options.api 负责请求；最小配置只需两个属性即可渲染一张带筛选、分页的表格。
  - title: 响应自动识别
    details: 自动探测 records / list / rows 等常见列表字段与 total / count 等总数字段，自动剥离 data / result 包装；纯数组响应也可直接使用。
  - title: 选项联动与远程搜索
    details: deps 声明依赖实现级联清空与禁用，内置 300ms 防抖远程搜索，选项按需懒加载并按参数缓存。
  - title: 渐进式定制
    details: 插槽覆盖单元格、表头、工具栏与筛选区；实例方法编程式控制查询与选中；beforeFetch / afterFetch 精确干预请求链路。
---
