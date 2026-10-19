/* 实验一：制作数据流图（概念小测 / 画图工作台 / 找错 / 参考图） */
(function () {
  'use strict';

  var QUIZ = [
    {
      q: '数据流图中，表示"处理"（对数据做的加工）的符号是？',
      opts: ['方框', '圆（或椭圆）', '开口矩形', '带箭头的线'],
      a: 1,
      exp: '记法：方框是"人"（外部实体），圆是"干活"（处理），开口矩形是"存东西"（数据存储），带箭头的线是"流动"（数据流）。见第四章第 21 页。'
    },
    {
      q: '顶层数据流图里有几个处理？',
      opts: ['1 个', '2 个', '3 个', '和外部实体一样多'],
      a: 0,
      exp: '顶层图把整个系统看成一个黑盒，只有 1 个处理，只画它和外部实体的数据交换。0 层图才把它拆成若干主要处理。'
    },
    {
      q: '下面哪种画法一定违反数据流图规则？',
      opts: ['处理与数据存储之间画两条方向相反的单向箭头', '读者与管理员之间直接连一条数据流', '一条数据流的名字叫"借书申请"', '某个数据存储既有写入也有读取'],
      a: 1,
      exp: '两个外部实体之间的数据交换必须经过系统内部的处理。要双向就画两条单向箭头 —— 这是合法的，双向箭头才不合法。'
    },
    {
      q: '数据存储"图书表"只被写入、从未被读出，问题是什么？',
      opts: ['没有问题，存储本来就只写', '存储只进不出，成了死数据', '应该改成外部实体', '应该给它编号 1.0'],
      a: 1,
      exp: '数据存储要有进有出：写入是为了以后读。只进不出说明这个存储没有必要存在，或者图漏了一条读的数据流。'
    },
    {
      q: '"父子平衡"指的是？',
      opts: ['父图和子图的图形大小一致', '子图的输入、输出数据流必须与父图中对应处理的输入、输出一致', '父图的处理个数等于子图的处理个数', '子图的数据存储必须比父图多'],
      a: 1,
      exp: '0 层图里 1.0 借书处理的输入是"借书申请"、输出是"借阅记录"；把它细化为 1 层图后，整个 1 层图的输入输出必须还是这两条，不能凭空多出或少掉。'
    }
  ];

  var TASKS = [
    {
      id: 'lib',
      name: '任务 A · 图书借阅系统（0 层）',
      level: '基础',
      brief: '读者提交借书申请，系统办理借书并写入借阅表；读者还书时系统办理还书、更新库存；管理员可以查询统计并得到统计报表。',
      asks: ['外部实体 2 个：读者、图书管理员', '处理 3 个：借书处理、还书处理、查询统计', '数据存储 2 个：D1 借阅表、D2 图书表'],
      expect: {
        entity: [['读者'], ['管理员', '图书管理员', '工作人员']],
        process: [['借书', '借阅'], ['还书', '归还'], ['查询', '统计']],
        store: [['借阅'], ['图书']]
      }
    },
    {
      id: 'course',
      name: '任务 B · 学生选课系统（0 层）',
      level: '进阶',
      brief: '学生查询开课情况并提交选课，系统维护选课记录并生成选课名单交给任课教师；教师根据名单录入成绩，成绩保存在选课记录中；教务处随时统计每门课的选课人数与成绩分布。',
      asks: ['外部实体 3 个：学生、教师、教务处', '处理 3 个：选课处理、成绩录入、统计查询', '数据存储 2 个：D1 选课表、D2 课程表'],
      expect: {
        entity: [['学生'], ['教师', '老师', '任课教师'], ['教务']],
        process: [['选课'], ['成绩', '录入'], ['统计', '查询']],
        store: [['选课'], ['课程']]
      }
    }
  ];

  var FIND = [
    {
      id: 'f1',
      q: '① 读者与管理员之间这条数据流',
      opts: ['数据流没有名字', '两个外部实体不能直接交换数据', '箭头方向画反了', '应该改成虚线'],
      a: 1,
      exp: '外部实体之间的数据交换必须经过系统内部的处理。删掉这条线，读者和管理员各自与处理相连。'
    },
    {
      id: 'f2',
      q: '② 借书处理与 D1 借阅表之间',
      opts: ['数据存储不能有名字', '画成了双向箭头，数据流必须单向', '处理不能连着存储', '缺少处理编号'],
      a: 1,
      exp: '要表达"既写又读"，应画两条方向相反的单向箭头：一条写入借阅记录，一条读出借阅数据。'
    },
    {
      id: 'f3',
      q: '③ 还书处理',
      opts: ['只有输出、没有输入，数据凭空产生', '编号应该改成 1.0', '不应该连数据存储', '输出流名字太长'],
      a: 0,
      exp: '每个处理都必须有输入。应补一条输入数据流，如"读者 → 2.0 还书处理：还书申请"。'
    },
    {
      id: 'f4',
      q: '④ D2 图书表',
      opts: ['名字应该叫"图书数据"', '只有流入、没有流出，数据只进不出', '应该画成圆', '应该与 D1 合并'],
      a: 1,
      exp: '存储要既有写入又有读取。补一条流出，如"D2 图书表 → 3.0 查询统计：图书信息"。'
    }
  ];

  /* ---------- 小工具 ---------- */
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var SVG_ID = 0;
  function anchorFor(n, tx, ty) {
    var dx = tx - n.x, dy = ty - n.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len; dy /= len;
    if (n.type === 'process') return { x: n.x + dx * (n.r || 54), y: n.y + dy * (n.r || 54) };
    var hw = n.type === 'store' ? 68 : 62, hh = n.type === 'store' ? 23 : 25;
    var t1 = Math.abs(dx) < 1e-6 ? 1e9 : hw / Math.abs(dx);
    var t2 = Math.abs(dy) < 1e-6 ? 1e9 : hh / Math.abs(dy);
    var t = Math.min(t1, t2);
    return { x: n.x + dx * t, y: n.y + dy * t };
  }

  function dfdSVG(spec) {
    var id = 'dfd' + (++SVG_ID);
    var w = spec.w || 780, h = spec.h || 460;
    var nodes = spec.nodes, byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; n.r = n.r || 46; });
    var s = '<svg class="flow-svg" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><marker id="' + id + '-a" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#33507f"/></marker>' +
      '<marker id="' + id + '-s" markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto"><path d="M9,0 L0,4.5 L9,9 z" fill="#33507f"/></marker></defs>';
    s += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#fff"/>';
      (spec.edges || []).forEach(function (e) {
      var A = byId[e.from], B = byId[e.to];
      if (!A || !B) return;
      var p1 = anchorFor(A, B.x, B.y), p2 = anchorFor(B, A.x, A.y);
      var mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      var d = '';
      if (e.dashed) {
        d = 'M' + p1.x + ',' + p1.y + ' L' + p2.x + ',' + p2.y;
        s += '<path d="' + d + '" stroke="#c026d3" stroke-width="2" stroke-dasharray="5 4" fill="none"/>';
      } else if (e.bend) {
        var dx0 = p2.x - p1.x, dy0 = p2.y - p1.y, l0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
        var cx = mid.x + (-dy0 / l0) * e.bend, cy = mid.y + (dx0 / l0) * e.bend;
        d = 'M' + p1.x + ',' + p1.y + ' Q' + cx + ',' + cy + ' ' + p2.x + ',' + p2.y;
        mid = { x: 0.25 * p1.x + 0.5 * cx + 0.25 * p2.x, y: 0.25 * p1.y + 0.5 * cy + 0.25 * p2.y };
        s += '<path d="' + d + '" stroke="#33507f" stroke-width="1.8" fill="none" marker-end="url(#' + id + '-a)"/>';
      } else {
        d = 'M' + p1.x + ',' + p1.y + ' L' + p2.x + ',' + p2.y;
        s += '<path d="' + d + '" stroke="#33507f" stroke-width="1.8" fill="none" marker-end="url(#' + id + '-a)"' +
          (e.both ? ' marker-start="url(#' + id + '-s)"' : '') + '/>';
      }
      if (e.label) {
        var mx = mid.x, my = mid.y;
        var dx = p2.x - p1.x, dy = p2.y - p1.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
        mx += -dy / l * 11; my += dx / l * 11;
        var tw = Math.min(150, e.label.length * 12 + 8);
        s += '<rect x="' + (mx - tw / 2) + '" y="' + (my - 9) + '" width="' + tw + '" height="18" rx="4" fill="#fff" opacity="0.94"/>' +
          '<text x="' + mx + '" y="' + (my + 4) + '" font-size="11.5" fill="#4a5772" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(e.label) + '</text>';
      }
    });
    nodes.forEach(function (n) {
      var label = n.label || '', code = n.code || '';
      if (n.type === 'entity') {
        s += '<rect x="' + (n.x - 62) + '" y="' + (n.y - 25) + '" width="124" height="50" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<text x="' + n.x + '" y="' + (n.y + 4) + '" font-size="12.5" font-weight="600" fill="#17233d" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(label) + '</text>';
      } else if (n.type === 'process') {
        s += '<circle cx="' + n.x + '" cy="' + n.y + '" r="46" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<text x="' + n.x + '" y="' + (n.y - 4) + '" font-size="10.5" fill="#7d879c" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(code) + '</text>' +
          '<text x="' + n.x + '" y="' + (n.y + 13) + '" font-size="12" font-weight="600" fill="#17233d" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(label) + '</text>';
      } else {
        s += '<line x1="' + (n.x - 68) + '" y1="' + (n.y - 22) + '" x2="' + (n.x + 68) + '" y2="' + (n.y - 22) + '" stroke="#33507f" stroke-width="2"/>' +
          '<line x1="' + (n.x - 68) + '" y1="' + (n.y + 22) + '" x2="' + (n.x + 68) + '" y2="' + (n.y + 22) + '" stroke="#33507f" stroke-width="2"/>' +
          '<text x="' + (n.x - 64) + '" y="' + (n.y - 6) + '" font-size="10.5" fill="#7d879c" font-family="Microsoft YaHei, sans-serif">' + esc(code) + '</text>' +
          '<text x="' + n.x + '" y="' + (n.y + 11) + '" font-size="12" font-weight="600" fill="#17233d" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(label) + '</text>';
      }
    });
    (spec.marks || []).forEach(function (m) {
      s += '<circle cx="' + m.x + '" cy="' + m.y + '" r="13" fill="#b42318"/>' +
        '<text x="' + m.x + '" y="' + (m.y + 4.5) + '" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + m.n + '</text>';
    });
    s += '</svg>';
    return s;
  }

  var REF_LIB = {
    w: 780, h: 430,
    nodes: [
      { id: 'r', type: 'entity', x: 82, y: 105, label: '读者' },
      { id: 'm', type: 'entity', x: 82, y: 330, label: '图书管理员' },
      { id: 'p1', type: 'process', x: 278, y: 105, code: '1.0', label: '借书处理' },
      { id: 'p2', type: 'process', x: 278, y: 330, code: '2.0', label: '还书处理' },
      { id: 'p3', type: 'process', x: 570, y: 215, code: '3.0', label: '查询统计' },
      { id: 'd1', type: 'store', x: 435, y: 105, code: 'D1', label: '借阅表' },
      { id: 'd2', type: 'store', x: 435, y: 330, code: 'D2', label: '图书表' }
    ],
    edges: [
      { from: 'r', to: 'p1', label: '借书申请' },
      { from: 'p1', to: 'r', label: '借阅结果', bend: -34 },
      { from: 'p1', to: 'd1', label: '借阅记录' },
      { from: 'm', to: 'p2', label: '还书申请' },
      { from: 'p2', to: 'd1', label: '还书更新' },
      { from: 'p2', to: 'd2', label: '更新库存' },
      { from: 'd1', to: 'p3', label: '借阅数据' },
      { from: 'd2', to: 'p3', label: '图书信息' },
      { from: 'p3', to: 'm', label: '统计报表' }
    ]
  };

  var REF_COURSE = {
    w: 780, h: 430,
    nodes: [
      { id: 's', type: 'entity', x: 80, y: 85, label: '学生' },
      { id: 't', type: 'entity', x: 80, y: 340, label: '教师' },
      { id: 'j', type: 'entity', x: 690, y: 215, label: '教务处' },
      { id: 'p1', type: 'process', x: 265, y: 85, code: '1.0', label: '选课处理' },
      { id: 'p2', type: 'process', x: 265, y: 340, code: '2.0', label: '成绩录入' },
      { id: 'p3', type: 'process', x: 520, y: 215, code: '3.0', label: '统计查询' },
      { id: 'd1', type: 'store', x: 430, y: 85, code: 'D1', label: '选课表' },
      { id: 'd2', type: 'store', x: 430, y: 340, code: 'D2', label: '课程表' }
    ],
    edges: [
      { from: 's', to: 'p1', label: '选课申请' },
      { from: 'p1', to: 's', label: '选课结果', bend: -30 },
      { from: 'p1', to: 'd1', label: '选课记录' },
      { from: 'p1', to: 't', label: '选课名单', bend: 26 },
      { from: 't', to: 'p2', label: '成绩数据' },
      { from: 'p2', to: 'd1', label: '录入成绩' },
      { from: 'd2', to: 'p1', label: '课程信息' },
      { from: 'd1', to: 'p3', label: '选课成绩' },
      { from: 'p3', to: 'j', label: '统计报表' }
    ]
  };

  var REF_BROKEN = {
    w: 780, h: 440,
    nodes: [
      { id: 'r', type: 'entity', x: 76, y: 86, label: '读者' },
      { id: 'm', type: 'entity', x: 176, y: 356, label: '管理员' },
      { id: 'p1', type: 'process', x: 320, y: 86, code: '1.0', label: '借书处理' },
      { id: 'p2', type: 'process', x: 320, y: 356, code: '2.0', label: '还书处理' },
      { id: 'p3', type: 'process', x: 580, y: 215, code: '3.0', label: '查询统计' },
      { id: 'd1', type: 'store', x: 465, y: 86, code: 'D1', label: '借阅表' },
      { id: 'd2', type: 'store', x: 465, y: 356, code: 'D2', label: '图书表' }
    ],
    edges: [
      { from: 'r', to: 'm', label: '借阅信息' },
      { from: 'r', to: 'p1', label: '借书申请' },
      { from: 'p1', to: 'd1', label: '借阅记录', both: true },
      { from: 'p2', to: 'd1', label: '还书更新' },
      { from: 'p2', to: 'd2', label: '更新库存', bend: 18 },
      { from: 'd1', to: 'p3', label: '借阅数据' },
      { from: 'p3', to: 'm', label: '统计报表' }
    ],
    marks: [{ n: '①', x: 126, y: 221 }, { n: '②', x: 392, y: 86 }, { n: '③', x: 262, y: 356 }, { n: '④', x: 465, y: 305 }]
  };

  /* ---------- 画图工作台 ---------- */
  var NODE_W = { entity: 124, process: 108, store: 132 };

  function ensureTaskData(taskId) {
    if (!Store.data.dfd.draw[taskId]) Store.data.dfd.draw[taskId] = { nodes: [], edges: [], score: 0, checked: false };
    return Store.data.dfd.draw[taskId];
  }

  function mountDraw(host, task) {
    var data = ensureTaskData(task.id);
    var lastCheck = null;
    var sel = { node: null, edge: null };
    var linkFrom = null;
    var connectMode = false;

    var wrap = el('div', 'dfd-wrap');
    var pal = el('div', 'palette');
    pal.innerHTML =
      '<div class="small muted" style="margin-bottom:2px">点击添加到画布</div>' +
      '<div class="pal-item" data-type="entity"><div class="pv">' + shapeIcon('entity') + '</div><div class="nm">外部实体</div><div class="ds">方框 · 人/单位</div></div>' +
      '<div class="pal-item" data-type="process"><div class="pv">' + shapeIcon('process') + '</div><div class="nm">处理</div><div class="ds">圆 · 动词</div></div>' +
      '<div class="pal-item" data-type="store"><div class="pv">' + shapeIcon('store') + '</div><div class="nm">数据存储</div><div class="ds">开口矩形 · 名词</div></div>' +
      '<div class="ref-block small" style="margin-top:6px"><b>四步法</b><br />① 找人 → ② 找事 → ③ 找账 → ④ 连线命名</div>';

    var shell = el('div', 'canvas-shell');
    var bar = el('div', 'canvas-bar');
    bar.innerHTML =
      '<button class="btn sm" id="connectBtn">连线模式：关</button>' +
      '<button class="btn sm" id="delBtn">删除所选</button>' +
      '<span class="sep"></span>' +
      '<button class="btn sm" id="checkBtn">自检并打分</button>' +
      '<button class="btn sm" id="aiBtn">截图问助教</button>' +
      '<button class="btn sm ghost" id="clearBtn">清空</button>' +
      '<span class="small muted" id="cntInfo" style="margin-left:auto"></span>';
    var canvas = el('div', 'canvas');
    canvas.innerHTML = '<svg class="edge-layer" id="edgeLayer"></svg>' +
      '<div class="linkbar" id="linkbar"><span class="small"></span><input placeholder="给这条数据流命名，如：借书申请" /><button class="btn sm primary">确定</button><button class="btn sm ghost">取消</button></div>';
    shell.appendChild(bar); shell.appendChild(canvas);

    var side = el('div', 'dfd-side');
    side.innerHTML =
      '<div class="card" style="padding:14px 16px"><h4 style="margin-top:0">任务要求</h4>' +
      '<p class="small hint" style="margin:6px 0 0">' + esc(task.brief) + '</p>' +
      '<ul class="checklist small" style="margin-top:8px">' + task.asks.map(function (a) { return '<li><span class="dot">·</span><span>' + esc(a) + '</span></li>'; }).join('') + '</ul></div>' +
      '<div class="card" style="padding:14px 16px" id="tutorBox"></div>' +
      '<div class="card" style="padding:14px 16px"><h4 style="margin-top:0">规则自检</h4><div id="ruleBox"><p class="small muted" style="margin:4px 0 0">画完后点「自检并打分」。</p></div></div>';

    wrap.appendChild(pal); wrap.appendChild(shell); wrap.appendChild(side);
    host.appendChild(wrap);

    var layer = canvas.querySelector('#edgeLayer');
    var linkbar = canvas.querySelector('#linkbar');
    var cntInfo = bar.querySelector('#cntInfo');

    function measure() {
      var r = canvas.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }

    function addNode(type) {
      var m = measure();
      var n = data.nodes.length;
      var node = {
        id: 'n' + Date.now() + Math.floor(Math.random() * 99),
        type: type,
        name: type === 'entity' ? '外部实体' : type === 'process' ? '处理' : '存储',
        code: type === 'process' ? (data.nodes.filter(function (x) { return x.type === 'process'; }).length + 1) + '.0' : type === 'store' ? 'D' + (data.nodes.filter(function (x) { return x.type === 'store'; }).length + 1) : '',
        x: 120 + (n % 3) * 150,
        y: 70 + Math.floor(n / 3) * 130
      };
      node.x = Math.min(node.x, Math.max(140, m.w - 140));
      data.nodes.push(node);
      render();
      save();
    }

    function save() { Store.save(); }

    function render() {
      // edges
      var svg = '';
      var r = canvas.getBoundingClientRect();
      var marks = '';
      data.edges.forEach(function (e) {
        var A = data.nodes.filter(function (n) { return n.id === e.from; })[0];
        var B = data.nodes.filter(function (n) { return n.id === e.to; })[0];
        if (!A || !B) return;
        var a = anchorFor(A, B.x, B.y), b = anchorFor(B, A.x, A.y);
        var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        marks += '<path d="M' + a.x + ',' + a.y + ' L' + b.x + ',' + b.y + '" stroke="' + (sel.edge === e.id ? '#2f5bd0' : '#33507f') + '" stroke-width="' + (sel.edge === e.id ? 2.6 : 1.7) + '" fill="none" marker-end="url(#ah)" data-edge="' + e.id + '" style="pointer-events:stroke"/>';
        if (e.name) {
          var tw = Math.min(120, e.name.length * 12 + 8);
          marks += '<rect x="' + (mid.x - tw / 2) + '" y="' + (mid.y - 10) + '" width="' + tw + '" height="19" rx="4" fill="#fff" opacity="0.95" stroke="#e3e8f2"/>' +
            '<text x="' + mid.x + '" y="' + (mid.y + 3.5) + '" font-size="11.5" fill="#4a5772" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(e.name) + '</text>';
        } else {
          marks += '<text x="' + mid.x + '" y="' + (mid.y + 3) + '" font-size="11" fill="#b42318" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">未命名</text>';
        }
      });
      layer.innerHTML = '<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#33507f"/></marker></defs>' + marks;
      layer.setAttribute('viewBox', '0 0 ' + Math.max(r.width, 10) + ' ' + Math.max(r.height, 10));

      // nodes (保留输入焦点)
      Array.prototype.slice.call(canvas.querySelectorAll('.node')).forEach(function (n) { n.remove(); });
      data.nodes.forEach(function (n) {
        var d = el('div', 'node ' + n.type + (sel.node === n.id ? ' sel' : '') + (linkFrom === n.id ? ' linkfrom' : ''));
        d.style.left = (n.x - NODE_W[n.type] / 2) + 'px';
        d.style.top = (n.y - (n.type === 'process' ? 54 : n.type === 'store' ? 23 : 26)) + 'px';
        d.dataset.id = n.id;
        var inner = '';
        if (n.type === 'store') inner += '<span class="did">' + esc(n.code) + '</span>';
        if (n.type === 'process') inner += '<span class="pid">' + esc(n.code) + '</span>';
        inner += '<input value="' + esc(n.name) + '" data-name="' + n.id + '" />';
        d.innerHTML = inner + '<button class="del" title="删除">×</button>';
        canvas.appendChild(d);
        var inp = d.querySelector('input');
        inp.addEventListener('input', function () { n.name = this.value; save(); updateInfo(); });
        inp.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
        d.querySelector('.del').addEventListener('click', function (ev) {
          ev.stopPropagation();
          data.nodes = data.nodes.filter(function (x) { return x.id !== n.id; });
          data.edges = data.edges.filter(function (e) { return e.from !== n.id && e.to !== n.id; });
          sel.node = null; render(); save();
        });
        d.addEventListener('mousedown', function (ev) { startDrag(ev, n, d); });
        d.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (connectMode) { pickForLink(n); return; }
          sel.node = n.id; sel.edge = null; render();
        });
      });
      layer.querySelectorAll('path[data-edge]').forEach(function (p) {
        p.addEventListener('click', function (ev) {
          ev.stopPropagation();
          sel.edge = p.getAttribute('data-edge');
          sel.node = null;
          render();
          var e = data.edges.filter(function (x) { return x.id === sel.edge; })[0];
          linkbar.classList.add('show');
          linkbar.querySelector('span').textContent = '修改这条数据流的名字：';
          linkbar.querySelector('input').value = e ? e.name : '';
          linkbar.dataset.mode = 'rename';
        });
      });
      updateInfo();
    }

    function updateInfo() {
      var c = { entity: 0, process: 0, store: 0 };
      data.nodes.forEach(function (n) { c[n.type]++; });
      cntInfo.textContent = '外部实体 ' + c.entity + ' · 处理 ' + c.process + ' · 存储 ' + c.store + ' · 数据流 ' + data.edges.length;
    }

    var drag = null;
    function startDrag(ev, n, d) {
      if (ev.target.tagName === 'INPUT' || ev.target.classList.contains('del')) return;
      ev.preventDefault();
      var r = canvas.getBoundingClientRect();
      drag = { n: n, ox: ev.clientX - r.left - n.x, oy: ev.clientY - r.top - n.y, moved: false };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    function onMove(ev) {
      if (!drag) return;
      var r = canvas.getBoundingClientRect();
      drag.n.x = Math.max(60, Math.min(r.width - 60, ev.clientX - r.left - drag.ox));
      drag.n.y = Math.max(40, Math.min(r.height - 40, ev.clientY - r.top - drag.oy));
      drag.moved = true;
      var d = canvas.querySelector('.node[data-id="' + drag.n.id + '"]');
      if (d) {
        d.style.left = (drag.n.x - NODE_W[drag.n.type] / 2) + 'px';
        d.style.top = (drag.n.y - (drag.n.type === 'process' ? 54 : drag.n.type === 'store' ? 23 : 26)) + 'px';
      }
      redrawEdgesOnly();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (drag && drag.moved) save();
      drag = null;
    }
    function redrawEdgesOnly() {
      var marks = '';
      data.edges.forEach(function (e) {
        var A = data.nodes.filter(function (n) { return n.id === e.from; })[0];
        var B = data.nodes.filter(function (n) { return n.id === e.to; })[0];
        if (!A || !B) return;
        var a = anchorFor(A, B.x, B.y), b = anchorFor(B, A.x, A.y);
        marks += '<path d="M' + a.x + ',' + a.y + ' L' + b.x + ',' + b.y + '" stroke="#33507f" stroke-width="1.7" fill="none" marker-end="url(#ah)"/>';
        if (e.name) {
          var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, tw = Math.min(120, e.name.length * 12 + 8);
          marks += '<rect x="' + (mx - tw / 2) + '" y="' + (my - 10) + '" width="' + tw + '" height="19" rx="4" fill="#fff" opacity="0.95" stroke="#e3e8f2"/>' +
            '<text x="' + mx + '" y="' + (my + 3.5) + '" font-size="11.5" fill="#4a5772" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(e.name) + '</text>';
        }
      });
      layer.innerHTML = '<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#33507f"/></marker></defs>' + marks;
    }

    function pickForLink(n) {
      if (!linkFrom) {
        linkFrom = n.id;
        render();
        flashTutor('已选中起点「' + n.name + '」，再点终点即可连线。');
        return;
      }
      if (linkFrom === n.id) { linkFrom = null; render(); return; }
      var from = linkFrom;
      var edge = { id: 'e' + Date.now(), from: from, to: n.id, name: '' };
      data.edges.push(edge);
      linkFrom = null;
      render();
      var A = data.nodes.filter(function (x) { return x.id === edge.from; })[0];
      linkbar.classList.add('show');
      linkbar.dataset.mode = 'new';
      linkbar.dataset.edge = edge.id;
      linkbar.querySelector('span').textContent = '「' + A.name + ' → ' + n.name + '」搬的是什么数据？';
      var inp = linkbar.querySelector('input');
      inp.value = '';
      inp.focus();
      save();
    }

    function commitLinkName() {
      var v = linkbar.querySelector('input').value.trim();
      if (linkbar.dataset.mode === 'new') {
        var e = data.edges.filter(function (x) { return x.id === linkbar.dataset.edge; })[0];
        if (!v) { data.edges = data.edges.filter(function (x) { return x !== e; }); }
        else e.name = v;
      } else {
        var e2 = data.edges.filter(function (x) { return x.id === sel.edge; })[0];
        if (e2) e2.name = v || e2.name;
      }
      linkbar.classList.remove('show');
      linkbar.dataset.mode = '';
      render(); save();
    }

    bar.querySelector('#connectBtn').addEventListener('click', function () {
      connectMode = !connectMode;
      this.textContent = '连线模式：' + (connectMode ? '开' : '关');
      this.classList.toggle('primary', connectMode);
      if (!connectMode) { linkFrom = null; render(); }
      flashTutor(connectMode ? '连线模式：先点起点，再点终点。方向就是数据流动的方向。' : '已退出连线模式，可以拖动节点调整位置。');
    });
    bar.querySelector('#delBtn').addEventListener('click', function () {
      if (sel.node) {
        data.nodes = data.nodes.filter(function (x) { return x.id !== sel.node; });
        data.edges = data.edges.filter(function (e) { return e.from !== sel.node && e.to !== sel.node; });
        sel.node = null;
      } else if (sel.edge) {
        data.edges = data.edges.filter(function (e) { return e.id !== sel.edge; });
        sel.edge = null;
      }
      render(); save();
    });
    bar.querySelector('#clearBtn').addEventListener('click', function () {
      if (!confirm('清空这张图？')) return;
      data.nodes = []; data.edges = []; data.score = 0; data.checked = false;
      sel = { node: null, edge: null }; linkFrom = null;
      render(); save(); side.querySelector('#ruleBox').innerHTML = '<p class="small muted" style="margin:4px 0 0">画完后点「自检并打分」。</p>';
    });
    bar.querySelector('#checkBtn').addEventListener('click', function () {
      var res = checkGraph(task, data);
      data.score = res.score; data.checked = true;
      lastCheck = res;
      Store.data.dfd.draw[task.id] = data;
      save();
      renderRules(side.querySelector('#ruleBox'), res);
      flashTutor(res.verdict);
    });
    /* AI 助教：带上当前图的结构与最近一次自检的未通过项 */
    function dfdAiCtx() {
      function cnt(t) { return data.nodes.filter(function (n) { return n.type === t; }).length; }
      var unnamed = data.edges.filter(function (e) { return !e.name; }).length;
      var bad = lastCheck ? lastCheck.items.filter(function (i) { return i.st !== 'ok'; }).map(function (i) { return i.text; }) : [];
      return {
        lab: '实验一 · 制作数据流图',
        task: task.title + '｜' + task.brief,
        state: '画布上有外部实体 ' + cnt('entity') + ' 个、处理 ' + cnt('process') + ' 个、数据存储 ' + cnt('store') + ' 个，连线 ' + data.edges.length + ' 条（未命名 ' + unnamed + ' 条）。' +
          (lastCheck ? '最近一次自检 ' + lastCheck.score + ' 分。' : '还没点过自检。'),
        feedback: bad.length ? '未通过的规则：' + bad.join('；') : '',
        progress: (lastCheck ? lastCheck.score + '/100（≥70 记为通过）' : ''),
        name: Store.data.name || ''
      };
    }
    window.LabAI = dfdAiCtx;
    bar.querySelector('#aiBtn').addEventListener('click', function () {
      if (window.CloudApp) window.CloudApp.openAsk(dfdAiCtx());
    });
    linkbar.querySelectorAll('button')[0].addEventListener('click', commitLinkName);
    linkbar.querySelectorAll('button')[1].addEventListener('click', function () {
      if (linkbar.dataset.mode === 'new') {
        data.edges = data.edges.filter(function (x) { return x.id !== linkbar.dataset.edge; });
      }
      linkbar.classList.remove('show');
      linkbar.dataset.mode = '';
      render(); save();
    });
    linkbar.querySelector('input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') commitLinkName();
    });

    pal.querySelectorAll('.pal-item').forEach(function (p) {
      p.addEventListener('click', function () { addNode(p.dataset.type); });
    });
    canvas.addEventListener('click', function () {
      if (!connectMode && (sel.node || sel.edge)) { sel = { node: null, edge: null }; render(); }
    });

    function flashTutor(html) {
      side.querySelector('#tutorBox').innerHTML = '<div class="tutor"><div class="who"><span class="avatar">助</span>助教提示</div><div class="small">' + html + '</div></div>';
    }

    render();
    if (data.nodes.length) flashTutor('已载入你上次的画图。接着画，或点「自检并打分」看看现在能得多少分。');
    else flashTutor('先按四步法想一遍：这段需求里有<b>几类人</b>？<b>几件事</b>？要<b>记住哪些数据</b>？想好了再从左边拖符号。');
  }

  function shapeIcon(type) {
    if (type === 'entity') return '<svg width="66" height="34"><rect x="3" y="6" width="60" height="22" fill="#fff" stroke="#33507f" stroke-width="2"/></svg>';
    if (type === 'process') return '<svg width="66" height="34"><circle cx="33" cy="17" r="15" fill="#fff" stroke="#33507f" stroke-width="2"/></svg>';
    return '<svg width="66" height="34"><line x1="3" y1="10" x2="63" y2="10" stroke="#33507f" stroke-width="2"/><line x1="3" y1="24" x2="63" y2="24" stroke="#33507f" stroke-width="2"/></svg>';
  }

  /* ---------- 规则检查 ---------- */
  function checkGraph(task, data) {
    var items = [];
    var score = 0;
    var nodes = data.nodes, edges = data.edges;
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    var cnt = { entity: 0, process: 0, store: 0 };
    nodes.forEach(function (n) { cnt[n.type]++; });

    // 1 要素齐备 40
    var hit = 0, need = 0;
    ['entity', 'process', 'store'].forEach(function (type) {
      (task.expect[type] || []).forEach(function (group) {
        need++;
        var found = nodes.some(function (n) {
          return n.type === type && group.some(function (kw) { return (n.name || '').indexOf(kw) >= 0; });
        });
        if (found) hit++;
        else items.push({ st: 'bad', text: '缺少' + typeName(type) + '：应包含「' + group[0] + '」这类要素' });
      });
    });
    var p1 = need ? hit / need : 0;
    score += Math.round(p1 * 40);
    if (hit === need) items.unshift({ st: 'ok', text: '要素齐备：外部实体、处理、数据存储都找到了（' + hit + '/' + need + '）' });

    // 2 处理有进有出 20
    var pNoIn = [], pNoOut = [];
    nodes.filter(function (n) { return n.type === 'process'; }).forEach(function (n) {
      var ins = edges.filter(function (e) { return e.to === n.id; }).length;
      var outs = edges.filter(function (e) { return e.from === n.id; }).length;
      if (!ins) pNoIn.push(n.name);
      if (!outs) pNoOut.push(n.name);
    });
    if (!pNoIn.length && !pNoOut.length && cnt.process > 0) {
      score += 20;
      items.push({ st: 'ok', text: '每个处理都有输入、也有输出' });
    } else {
      score += Math.round(20 * (1 - (pNoIn.length + pNoOut.length) / Math.max(1, cnt.process * 2)));
      if (pNoIn.length) items.push({ st: 'bad', text: '处理「' + pNoIn.join('、') + '」只有输出、没有输入 —— 数据从哪来？' });
      if (pNoOut.length) items.push({ st: 'bad', text: '处理「' + pNoOut.join('、') + '」只有输入、没有输出 —— 这个处理在干什么？' });
    }

    // 3 存储有进有出 15
    var sIn = [], sOut = [];
    nodes.filter(function (n) { return n.type === 'store'; }).forEach(function (n) {
      if (!edges.some(function (e) { return e.to === n.id; })) sIn.push(n.name);
      if (!edges.some(function (e) { return e.from === n.id; })) sOut.push(n.name);
    });
    if (!sIn.length && !sOut.length && cnt.store > 0) {
      score += 15;
      items.push({ st: 'ok', text: '每个数据存储都既有写入、又有读取' });
    } else {
      score += Math.round(15 * (1 - (sIn.length + sOut.length) / Math.max(1, cnt.store * 2)));
      if (sIn.length) items.push({ st: 'bad', text: '数据存储「' + sIn.join('、') + '」没有任何写入，数据从哪来？' });
      if (sOut.length) items.push({ st: 'bad', text: '数据存储「' + sOut.join('、') + '」只进不出，成了死数据' });
    }

    // 4 外部实体不直连 10
    var badLink = edges.filter(function (e) {
      return byId[e.from] && byId[e.to] && byId[e.from].type === 'entity' && byId[e.to].type === 'entity';
    });
    if (!badLink.length) { score += 10; items.push({ st: 'ok', text: '没有外部实体之间的直接连线' }); }
    else items.push({ st: 'bad', text: '「' + byId[badLink[0].from].name + '」与「' + byId[badLink[0].to].name + '」都是外部实体，不能直接连线，必须经过处理' });

    // 5 命名 15
    var noName = edges.filter(function (e) { return !e.name || !e.name.trim(); });
    var vague = edges.filter(function (e) { return e.name && ['数据', '信息', '流', '内容'].indexOf(e.name.trim()) >= 0; });
    if (!edges.length) {
      items.push({ st: 'warn', text: '还没有任何数据流，先用「连线模式」把节点连起来' });
    } else if (!noName.length && !vague.length) {
      score += 15;
      items.push({ st: 'ok', text: '每条数据流都有具体名字（' + edges.length + ' 条）' });
      var bad = edges.filter(function (e) { return !nameFits(byId[e.from], byId[e.to], e.name); });
      if (bad.length) {
        items.push({ st: 'warn', text: '命名类型可以再推敲：' + bad.slice(0, 3).map(function (e) {
          return '「' + byId[e.from].name + '→' + byId[e.to].name + '：' + e.name + '」';
        }).join('、') });
      }
    } else {
      score += Math.round(15 * (1 - (noName.length + vague.length) / edges.length));
      if (noName.length) items.push({ st: 'bad', text: '有 ' + noName.length + ' 条数据流没有名字 —— 数据流必须命名' });
      if (vague.length) items.push({ st: 'warn', text: '「' + vague.map(function (e) { return e.name; }).join('、') + '」太笼统，要写清搬的是什么，如"借书申请"而不是"数据"' });
    }

    // 6 孤立节点提示
    var lonely = nodes.filter(function (n) { return !edges.some(function (e) { return e.from === n.id || e.to === n.id; }); });
    if (lonely.length) items.push({ st: 'warn', text: '「' + lonely.map(function (n) { return n.name; }).join('、') + '」还没有连任何数据流' });

    if (score > 100) score = 100;
    var verdict = score >= 90 ? '结构基本正确（' + score + ' 分）。再核对一遍命名，就可以对照参考图了。'
      : score >= 70 ? '主要结构对了（' + score + ' 分），按下面标红的两三条改一下就能通过。'
        : '还有关键问题（' + score + ' 分），先看标红的条目，一条一条补。';
    return { score: score, items: items, verdict: verdict };
  }

  function typeName(t) { return t === 'entity' ? '外部实体' : t === 'process' ? '处理' : '数据存储'; }

  function nameFits(a, b, name) {
    if (!a || !b || !name) return true;
    var n = name;
    if (a.type === 'entity' && b.type === 'process') return /申请|请求|单|信息|数据|名单|成绩/.test(n);
    if (a.type === 'process' && b.type === 'store') return /记录|信息|更新|明细|台账|结果/.test(n);
    if (a.type === 'store' && b.type === 'process') return /数据|信息|记录|明细|台账/.test(n);
    if (a.type === 'process' && b.type === 'entity') return /结果|报表|通知|名单|单|信息/.test(n);
    return true;
  }

  function renderRules(box, res) {
    var icon = { ok: '✓', bad: '✕', warn: '!' };
    box.innerHTML = '<div class="score-box"><b style="color:' + (res.score >= 70 ? '#157347' : '#b42318') + '">' + res.score + '</b><span class="small muted">/ 100</span></div>' +
      '<ul class="rule-list">' + res.items.map(function (i) {
        return '<li><span class="st ' + i.st + '">' + icon[i.st] + '</span><span>' + esc(i.text) + '</span></li>';
      }).join('') + '</ul>';
  }

  /* ---------- 找错 ---------- */
  function mountFind(host) {
    var card = el('div', 'card');
    card.innerHTML = '<h3>这张 0 层数据流图有 4 处错，逐处找出来</h3>' +
      '<p class="small hint" style="margin:4px 0 12px">提示：外部实体之间能直接传数据吗？数据流能双向吗？每个处理都必须有输入吗？存储只进不出行不行？</p>' +
      '<div style="border:1px solid #e3e8f2;border-radius:12px;overflow:hidden;margin-bottom:14px">' + dfdSVG(REF_BROKEN) + '</div>' +
      '<div class="grid-2" id="findQs"></div>' +
      '<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="findCheck">提交批改</button><span class="small muted" id="findInfo"></span></div>' +
      '<div id="findMsg"></div>';
    host.appendChild(card);

    var box = card.querySelector('#findQs');
    FIND.forEach(function (f, i) {
      var d = el('div', 'q');
      d.style.padding = '12px 0';
      d.innerHTML = '<div class="q-title">' + esc(f.q) + '</div>' +
        f.opts.map(function (o, j) {
          return '<label class="opt" data-q="' + f.id + '" data-j="' + j + '"><span class="k">' + 'ABCD'[j] + '</span><span>' + esc(o) + '</span></label>';
        }).join('');
      box.appendChild(d);
    });
    var picks = {};
    box.querySelectorAll('.opt').forEach(function (o) {
      o.addEventListener('click', function () {
        var qid = o.dataset.q;
        picks[qid] = parseInt(o.dataset.j, 10);
        box.querySelectorAll('.opt[data-q="' + qid + '"]').forEach(function (x) { x.classList.remove('on', 'right', 'wrong'); });
        o.classList.add('on');
      });
    });

    card.querySelector('#findCheck').addEventListener('click', function () {
      var right = 0, total = FIND.length;
      FIND.forEach(function (f) {
        var got = picks[f.id];
        var opts = box.querySelectorAll('.opt[data-q="' + f.id + '"]');
        opts.forEach(function (x, j) {
          x.classList.remove('right', 'wrong', 'on');
          if (j === f.a) x.classList.add('right');
          if (j === got && got !== f.a) x.classList.add('wrong');
        });
        var ok = got === f.a;
        if (ok) right++;
        Store.data.dfd.find[f.id] = ok;
      });
      Store.save();
      var msg = card.querySelector('#findMsg');
      msg.innerHTML = '<div class="msg ' + (right === total ? 'ok' : 'info') + '"><b>批改结果：' + right + ' / ' + total + '</b>' +
        FIND.map(function (f, i) {
          var ok = picks[f.id] === f.a;
          return '<div style="margin-top:6px">' + (ok ? '✓' : '✕') + ' <b>第 ' + (i + 1) + ' 处</b>：' + esc(f.exp) + '</div>';
        }).join('') + '</div>';
      msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* ---------- 主入口 ---------- */
  window.LabDFD = {
    _check: checkGraph,
    _svg: dfdSVG,
    render: function (root, ctx) {
      var head = el('div', 'page-head');
      head.innerHTML = '<div><div class="crumb">实验一 · 依据第四章《数据库设计》需求分析</div><h2>制作数据流图</h2>' +
        '<p class="sub">目标：给你一段文字需求，你能按「找人 → 找事 → 找账 → 连线」独立画出一张 0 层数据流图，并自己检查出六类错误</p></div>' +
        '<div class="badge brand">建议 90 分钟</div>';
      root.appendChild(head);

      var tabs = el('div', 'tabs');
      tabs.innerHTML = '<button class="tab on" data-t="quiz">① 概念小测</button><button class="tab" data-t="draw">② 画图工作台</button><button class="tab" data-t="find">③ 找错练习</button><button class="tab" data-t="ref">④ 参考图与口诀</button>';
      root.appendChild(tabs);
      var body = el('div');
      root.appendChild(body);

      var cur = 'quiz';
      function show(t) {
        cur = t;
        tabs.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
        body.innerHTML = '';
        if (t === 'quiz') mountQuiz(body);
        else if (t === 'draw') mountDrawTab(body);
        else if (t === 'find') mountFind(body);
        else mountRef(body);
      }
      tabs.querySelectorAll('.tab').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.t); }); });
      show('quiz');
    }
  };

  function mountQuiz(host) {
    var card = el('div', 'card');
    card.innerHTML = '<h3>先确认你认得这四类符号</h3><p class="small hint" style="margin:4px 0 6px">五道题，选完立刻给解析 —— 这是第四章第 21、22、27 页的原话。</p><div id="quizBody"></div>' +
      '<div class="btn-row" style="margin-top:12px"><span class="small muted" id="quizScore"></span></div>';
    host.appendChild(card);
    var body = card.querySelector('#quizBody');
    var state = {};
    QUIZ.forEach(function (q, i) {
      var d = el('div', 'q');
      d.innerHTML = '<div class="q-title"><span class="muted">' + (i + 1) + '.</span> ' + esc(q.q) + '</div>' +
        q.opts.map(function (o, j) { return '<label class="opt" data-q="' + i + '" data-j="' + j + '"><span class="k">' + 'ABCD'[j] + '</span><span>' + esc(o) + '</span></label>'; }).join('') +
        '<div class="explain" style="display:none"></div>';
      body.appendChild(d);
      var answered = Store.data.dfd.quiz[i] === true;
      d.querySelectorAll('.opt').forEach(function (o) {
        if (answered && parseInt(o.dataset.j, 10) === q.a) o.classList.add('right');
        o.addEventListener('click', function () {
          if (d.dataset.locked) return;
          d.dataset.locked = '1';
          var j = parseInt(o.dataset.j, 10);
          d.querySelectorAll('.opt').forEach(function (x, k) {
            x.classList.remove('on');
            if (k === q.a) x.classList.add('right');
            if (k === j && j !== q.a) x.classList.add('wrong');
          });
          var ex = d.querySelector('.explain');
          ex.style.display = 'block';
          ex.innerHTML = (j === q.a ? '<b style="color:#157347">答对了。</b> ' : '<b style="color:#b42318">再想想：</b> ') + esc(q.exp);
          state[i] = (j === q.a);
          Store.data.dfd.quiz[i] = j === q.a;
          Store.save();
          updateScore();
        });
      });
    });
    function updateScore() {
      var n = Object.keys(Store.data.dfd.quiz).filter(function (k) { return Store.data.dfd.quiz[k]; }).length;
      card.querySelector('#quizScore').textContent = '当前答对 ' + n + ' / ' + QUIZ.length + ' 题（答错也可以重做，换个角度再看一遍解析）';
    }
    updateScore();
  }

  function mountDrawTab(host) {
    var bar = el('div', 'card');
    bar.style.padding = '14px 16px';
    bar.innerHTML = '<div class="btn-row"><span class="small muted">选择任务：</span><button class="btn sm primary" data-task="lib">任务 A · 图书借阅系统</button><button class="btn sm" data-task="course">任务 B · 学生选课系统</button>' +
      '<span class="small muted" style="margin-left:auto" id="drawScore"></span></div>';
    host.appendChild(bar);
    var holder = el('div');
    host.appendChild(holder);

    function open(id) {
      bar.querySelectorAll('button[data-task]').forEach(function (b) {
        b.classList.toggle('primary', b.dataset.task === id);
        b.classList.toggle('btn', true);
      });
      holder.innerHTML = '';
      var task = TASKS.filter(function (t) { return t.id === id; })[0];
      mountDraw(holder, task);
      var d = Store.data.dfd.draw[id];
      bar.querySelector('#drawScore').textContent = d && d.checked ? '上次自检：' + d.score + ' 分' : '尚未自检';
    }
    bar.querySelectorAll('button[data-task]').forEach(function (b) {
      b.addEventListener('click', function () { open(b.dataset.task); });
    });
    open('lib');
  }

  function mountRef(host) {
    var c1 = el('div', 'card');
    c1.innerHTML = '<h3>任务 A 参考图 · 图书借阅系统 0 层</h3><p class="small hint" style="margin:4px 0 10px">看图三件事：谁是外部实体、输入流有哪些、输出流有哪些。</p>' +
      '<div style="border:1px solid #e3e8f2;border-radius:12px;overflow:hidden">' + dfdSVG(REF_LIB) + '</div>' +
      '<div class="ref-block" style="margin-top:12px"><b>注意</b>：0 层图里"借书处理"的输入是"借书申请"、输出是"借阅记录"和"借阅结果"。把它细化成 1 层图（1.1 验证读者 → 1.2 检查图书 → 1.3 登记借阅）时，整个子图的输入输出必须还是这两三条 —— 这就是父子平衡。</div>';
    host.appendChild(c1);

    var c2 = el('div', 'card');
    c2.innerHTML = '<h3>任务 B 参考图 · 学生选课系统 0 层</h3><p class="small hint" style="margin:4px 0 10px">外部实体 3 个、处理 3 个、数据存储 2 个。重点看：教师只能录入成绩，教务处只能看统计。</p>' +
      '<div style="border:1px solid #e3e8f2;border-radius:12px;overflow:hidden">' + dfdSVG(REF_COURSE) + '</div>';
    host.appendChild(c2);

    var c3 = el('div', 'card');
    c3.innerHTML = '<h3>两个口诀，考场直接用</h3>' +
      '<div class="grid-2" style="margin-top:10px">' +
      '<div class="ref-block"><b>画图口诀</b><p class="small" style="margin:6px 0 0">找人 → 找事 → 找账 → 连线。<br />画完自检：每个处理都有进有出吗？每个存储都既写又读吗？有没有实体之间直连？</p></div>' +
      '<div class="ref-block"><b>命名规律</b><p class="small" style="margin:6px 0 0">外部实体 → 处理：××申请 / ××请求 / ××单<br />处理 → 存储：××记录 / ××信息<br />存储 → 处理：××数据<br />处理 → 外部实体：××报表 / ××结果</p></div>' +
      '</div>' +
      '<h4>六类常见错误（第四章第 27 页）</h4>' +
      '<table class="data" style="margin-top:4px"><thead><tr><th>#</th><th>错误做法</th><th>为什么错 / 正确做法</th></tr></thead><tbody>' +
      [['1', '一条数据流画成双向箭头', '数据流有方向；要双向就画两条单向箭头'],
      ['2', '处理只有输入、没有输出', '处理必须有输出，否则不知道它在干什么'],
      ['3', '处理只有输出、没有输入', '数据凭空产生'],
      ['4', '两个外部实体直接连线', '外部实体之间的交换必须经过系统内部的处理'],
      ['5', '父图与子图输入输出不一致', '违反父子平衡'],
      ['6', '数据存储只进不出（或只出不进）', '存储既要有写入、也要有读取，否则是死数据']]
        .map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') +
      '</tbody></table>';
    host.appendChild(c3);
  }
})();
