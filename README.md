# Js 前端水印

本项目提取于 FineReport 10.0 的水印功能，经过商业项目的检验，质量有保障。
兼容至 IE6。在同类商业产品的水印功能中，浏览器兼容能力是最强的。

## 使用方法
可以给任意 dom 元素添加一个水印层（不会遮挡其他元素）。
使用前，先引入 jquery，watermark.js，watermark.css。
提供了两个接口：
- PL.loadWatermark()
- PL.showWatermark()
以下是一段示例代码。
```js
var conf = {
    text: '水印测试<br>123456',
    color: 'red',
    fontSize: '20'
}
var $target = $('.targetDiv');

// 第一步，加载水印配置
PL.loadWatermark(conf);
// 第二步，将水印层显示到待覆盖的 dom 元素上
PL.showWatermark($target);
```

完整示例可以直接看本仓库的 index.html。

## 应用范围
需要提高安全性的网页。或者自己随便弄着玩。

## 效果演示
浏览器打开 index.html。
![](https://raw.githubusercontent.com/plough/JsWatermark/master/img/watermarkDemo.png)

## 大致的算法
与 [JavaWatermark](https://github.com/plough/JavaWatermark) 的基本思路相同。

## todo：更进一步
### 防破解
前端水印，怎样避免直接在浏览器中删除水印层 dom，从而去掉水印？
看能否监听 dom 删除事件。如果检测到水印 dom 被删掉了，就立马重建。
