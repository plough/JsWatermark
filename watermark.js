/**
 * 水印相关的一些方法
 * Created by plough on 2018/5/17.
 */

(function ($) {
    var PLACE_HOLDER = "，";  // 一个全角字符（不能用全角空格，Edge 会忽略空白字符的尺寸）

    var currentWatermarkConfig = {};
    var _lowVersionIE = undefined;  // 做一个缓存

    function _isEmpty(value) {
        return value === "" || value === null || value === undefined;
    }

    function _isIE8Before() {
        if (_lowVersionIE === undefined) {
            var agent = navigator.userAgent.toLowerCase();
            var isIE = /(msie\s|trident.*rv:)([\w.]+)/.test(agent) > -1;
            if (isIE) {
                var v1 = agent.match(/(?:msie\s([\w.]+))/);
                var v2 = agent.match(/(?:trident.*rv:([\w.]+))/);
                if (v1 && v2 && v1[1] && v2[1]) {
                    version = Math.max(v1[1] * 1, v2[1] * 1);
                } else if (v1 && v1[1]) {
                    version = v1[1] * 1;
                } else if (v2 && v2[1]) {
                    version = v2[1] * 1;
                } else {
                    version = 0;
                }
                _lowVersionIE = version < 9;
            }
            _lowVersionIE = false;
        }
        return _lowVersionIE;
    }

    function _supportCanvas() {
        var elem = document.createElement('canvas');
        // 使用!!的原因：确保返回 bool 值，而不是 undefined
        return !!(elem.getContext && elem.getContext('2d'));
    }

    function _parseInt(value) {
        var result = parseInt(value);
        if (isNaN(result)) {
            result = 0;
        }
        return result;
    }

    function _rotateDiv($el, angle) {
        if ($el) {
            angle = parseFloat(angle) || 0;
            if (typeof(angle) === "number") {
                var transform = 'rotate(' + angle + 'deg)';
                var transformOrigin = '0% 0%';
                $el.css({
                    'transform': transform,
                    '-transform-origin': transformOrigin,
                    '-webkit-transform': transform,
                    '-webkit-transform-origin': transformOrigin,
                    '-ms-transform': transform,
                    '-ms-transform-origin': transformOrigin,
                    '-moz-transform': transform,
                    '-moz-transform-origin': transformOrigin,
                    '-o-transform': transform,
                    '-o-transform-origin': transformOrigin
                });
            }
        }
    }

    function _addFilterForOldIE($el, angle, alpha) {
        if ($el && _isIE8Before()) {
            angle = parseFloat(angle) || 0;
            alpha = parseFloat(alpha) || 0;
            if (typeof(angle) === "number" && typeof(alpha) === "number") {
                var rad = angle * (Math.PI / 180);
                var m11 = Math.cos(rad), m12 = -1 * Math.sin(rad), m21 = Math.sin(rad), m22 = m11;

                var filters = "progid:DXImageTransform.Microsoft.Chroma(color='white') progid:DXImageTransform.Microsoft.Matrix(M11="
                    + m11 + ",M12=" + m12 + ",M21=" + m21 + ",M22=" + m22 + ",SizingMethod='auto expand') alpha(opacity="
                    + alpha * 100 + ")";
                $el.css({
                    'background': 'white',
                    'filter': filters
                });

                // IE8 下只能旋转单个元素，这里要移动位置
                var x = _parseInt($el.css('left'));
                var y = _parseInt($el.css('top'));
                var downY = x * Math.sin(rad); // 需要沿 Y 轴向下移动的距离
                var rightX = x * (1 - Math.cos(rad));  // 需要沿 X 轴向右移动的距离
                y = y + downY;
                x = x + rightX;
                $el.css({
                    'top': y + 'px',
                    'left': x + 'px'
                });
            }
        }
    }

    function _createCanvasAndGetContext($absOutdiv, width, height) {
        // 创建 canvas
        var $canvas = $('<canvas/>', {
                          'class' : 'watermark-canvas'
                      }).prop({
                          width: width,
                          height: height
                      });
        $absOutdiv.append($canvas);

        return $canvas[0].getContext("2d");
    }

    function _drawBlock(x, y, o, ctx) {
        var midX = x + o.blockWidth / 2;
        for (var i = 0; i < o.textLines.length; i++) {
            var textLine = o.textLines[i];
            var lineWidth = ctx.measureText(textLine).width;
            var lineX = midX - lineWidth / 2;
            ctx.fillText(textLine, lineX, y);
            y += o.lineHeight;
        }
    }

    function _calcBlockSize(textLines, lineHeight, ctx) {
        var n = textLines.length;
        var blockHeight = n * lineHeight;
        var blockWidth = 0;
        for (var i = 0; i < n; i++) {
            blockWidth = Math.max(ctx.measureText(textLines[i]).width, blockWidth);
        }
        return [blockWidth, blockHeight];
    }

    function _showWatermarkByCanvas($contentDiv, $absOutdiv, o) {
        // 创建 canvas
        var width = parseInt($contentDiv.css('width'));
        var height = parseInt($contentDiv.css('height'));
        var ctx = _createCanvasAndGetContext($absOutdiv, width, height);

        prepareToDrawWatermark(ctx, o);

        // 具体的绘制算法
        var evenStartX = -(o.blockWidth + o.xSpace) / 2 + o.startX;  // 偶数行的起始位置
        var lineNum = 0;
        for (var y = o.startY; y < o.endY; y += (o.ySpace + o.blockHeight)) {
            lineNum ++;
            var startX = lineNum % 2 === 0 ? evenStartX : o.startX;
            for (var x = startX; x < o.endX; x += (o.xSpace + o.blockWidth)) {
                _drawBlock(x, y, o, ctx);
            }
        }

        function prepareToDrawWatermark(ctx, o) {
            ctx.rotate(-o.angle * Math.PI / 180);
            ctx.fillStyle=o.color;
            ctx.font=o.fontSize + " " + o.fontFamily;
            o.textLines = o.text.split('<br>');
            var fontSizeInPixel = ctx.measureText(PLACE_HOLDER).width;
            o.fontWidth = fontSizeInPixel;
            o.lineHeight = fontSizeInPixel;
            o.xSpace = fontSizeInPixel;
            o.ySpace = 2 * fontSizeInPixel;
            [o.blockWidth, o.blockHeight] = _calcBlockSize(o.textLines, o.lineHeight, ctx);
        }
    }

    function _showWatermarkByDiv($absOutdiv, o) {

        var $outdiv = $('<div/>').addClass('watermark-outdiv');
        $absOutdiv.append($outdiv);

        $outdiv.css({
            'font-size': o.fontSize,
            'font-family': o.fontFamily,
            'color': o.color
        });

        _rotateDiv($outdiv, -o.angle);

        _updateWatermarkTextWidthAndHeight($outdiv, o);

        var evenStartX = o.startX - parseInt((o.width + o.xSpace) / 2);  // 偶数行的起始位置
        var lineNum = 0;
        for (var y = o.startY; y < o.endY; y += (o.ySpace + o.height)) {
            // 水印交错排列
            lineNum ++;
            var startX = lineNum % 2 === 0 ? evenStartX : o.startX;

            for (var x = startX; x < o.endX; x += o.width + o.xSpace) {
                var $markDiv = $('<div/>').addClass('watermark-div').append(o.text);
                $markDiv.css({
                    'left': x + 'px',
                    'top': y + 'px'
                });
                _addFilterForOldIE($markDiv, -o.angle, o.alpha);
                $outdiv.append($markDiv);
            }
        }
    }

    function _showWatermark(config, useCanvas) {
        var o = $.extend({
            text: '',
            color: 'black',  // 水印字体颜色
            fontSize: '20pt',  // 水印字体大小
            alpha: 0.1,  // 水印透明度
            angle: 20,  // 水印倾斜度数（绝对值）
            adjustRatio: 0.1  // 增加水印层高度，用来校正误差
        }, config);

        var $contentDiv = config.$contentDiv;
        if ($contentDiv.length === 0) {
            return;
        }

        var sinAngle = Math.sin(o.angle / 180 * Math.PI);
        var cosAngle = Math.cos(o.angle / 180 * Math.PI);

        var contentDivTop = _parseInt($contentDiv.offset().top);
        var contentDivLeft = _parseInt($contentDiv.offset().left);

        var $parent = $contentDiv.parent();

        // 初始化一些配置
        var w = $contentDiv.width();
        var h = $contentDiv.height();
        o.startX = -h * sinAngle * cosAngle;
        o.startY = -h * sinAngle * sinAngle;
        o.endX = o.startX + w * cosAngle + h * sinAngle;
        o.endY = o.startY + w * sinAngle + h * cosAngle;
        o.endY += h * o.adjustRatio; // 由于存在计算误差，给水印层高度多加一点
        if (isWindows()) {
            o.fontFamily = '"Microsoft YaHei", SimHei, Airal, Verdana, SimSun';
        } else {
            o.fontFamily = '"PingFang SC", "Hiragino Sans GB", Airal, Verdana';
        }

        $('.watermark-abs-outdiv', $parent).remove();  // 防止重复加载
        // 创建水印外壳div
        var $absOutdiv = $('<div/>').addClass('watermark-abs-outdiv');  // 最外层绝对布局div
        $absOutdiv.css({
            'top': contentDivTop,
            'left': contentDivLeft,
            'width': $contentDiv.css('width'),
            'height': $contentDiv.css('height'),
            'margin': $contentDiv.css('margin'),
            'padding': $contentDiv.css('padding'),
            'opacity': o.alpha
        });
        $parent.append($absOutdiv);

        if (useCanvas) {
            _showWatermarkByCanvas($contentDiv, $absOutdiv, o);
        } else {
            _showWatermarkByDiv($absOutdiv, o);
        }
    }

    function _updateWatermarkTextWidthAndHeight($outdiv, o) {
        // 因为字体大小的单位是 pt，需要从这里算出一个字的像素大小
        var fontSizeInPixel = _getWatermarkDivSizeOnScreen($outdiv, PLACE_HOLDER).width;
        o.xSpace = fontSizeInPixel;
        o.ySpace = 2 * fontSizeInPixel;

        var divSize = _getWatermarkDivSizeOnScreen($outdiv, o.text);
        o.width = divSize.width;
        // line-height 大约是 fontSize 的 1.4 倍。需要减去上下的留白
        var offset = parseInt(0.4 * fontSizeInPixel);
        o.height = divSize.height - offset;
    }

    // 包含 text 的水印块在屏幕上的真实大小
    function _getWatermarkDivSizeOnScreen($outdiv, text) {
        var size = {};
        var $markDiv = $('<div/>').addClass('watermark-div').append(text);
        $outdiv.append($markDiv);
        size.width = $markDiv.width();
        size.height = $markDiv.height();
        $markDiv.remove();
        return size;
    }

    function isWindows() {
        return /windows|win32/i.test(navigator.userAgent);
    }

    window.PL = {};

    $.extend(PL, {
        /**
         * 加载水印配置
         * */
        loadWatermark: function (config) {
            if (_isEmpty(config) || _isEmpty(config.text)) {
                return;
            }
            currentWatermarkConfig = {
                text: config.text,
                color: config.color,
                fontSize: config.fontSize + 'pt'
            };
        },

        /**
         * 显示水印
         * 低版本浏览器(~IE10)保证视觉效果，不保证操作；IE8及以下，视觉效果略有偏差
         * $contentDiv：水印要覆盖的 div；
         * displayMode：指定显示方式，div 还是 canvas
         *
         * 举例：
         * 1. FR.showWatermark($target)  // 使用 canvas
         * 2. FR.showWatermark($target, displayMode='div')  // 使用 div
         * */
        showWatermark: function ($contentDiv, displayMode) {
            if (_isEmpty($contentDiv) || _isEmpty(currentWatermarkConfig.text)) {
                return;
            }
            var useCanvas = true;
            if (displayMode === 'div' || !_supportCanvas()) {
                useCanvas = false;
            }
            _showWatermark($.extend(currentWatermarkConfig, {
                $contentDiv: $contentDiv
            }), useCanvas);
        }
    });
})(jQuery);
