import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  // GitHub Pages 部署在仓库名子路径下（本地预览同样需带该前缀）
  base: '/vue-el-protable/',
  title: 'vue-el-protable',
  description: '基于 Vue 3 + Element Plus 的配置驱动式中后台智能表格组件',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/quick-start', activeMatch: '/guide/' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [{ text: '快速开始', link: '/guide/quick-start' }]
        },
        {
          text: '配置',
          items: [
            { text: '列配置', link: '/guide/columns' },
            { text: '筛选配置', link: '/guide/search' },
            { text: '选项联动与远程搜索', link: '/guide/linkage' },
            { text: '全局配置', link: '/guide/options' }
          ]
        },
        {
          text: '进阶',
          items: [
            { text: '实例方法 / 事件 / 插槽', link: '/guide/instance' },
            { text: '从旧组件迁移', link: '/guide/migration' },
            { text: '常见问题', link: '/guide/faq' }
          ]
        }
      ]
    },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '无匹配结果',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    }
  }
})
