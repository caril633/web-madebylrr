/* 实验三：分析业务流程（图元配对 / 抽象与排序 / 单据填空 / 参考图） */
(function () {
  'use strict';

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ---------- 图元 ---------- */
  var SYMBOLS = [
    { id: 'unit', label: '业务处理单位', hint: '方框：某科室 / 某岗位' },
    { id: 'proc', label: '业务处理（功能）', hint: '圆角矩形：一个具体动作' },
    { id: 'doc', label: '单据 / 报表', hint: '折角矩形：纸质或电子表单' },
    { id: 'store', label: '数据存储', hint: '圆柱：被保存的台账 / 文件' },
    { id: 'ext', label: '外部实体', hint: '椭圆：系统外的人 / 单位' }
  ];

  function symIcon(type, w, h) {
    w = w || 82; h = h || 46;
    var cx = w / 2, cy = h / 2;
    var s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">';
    if (type === 'ext') s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (w / 2 - 4) + '" ry="' + (h / 2 - 6) + '" fill="#fff" stroke="#33507f" stroke-width="2"/>';
    else if (type === 'unit') s += '<rect x="4" y="8" width="' + (w - 8) + '" height="' + (h - 16) + '" fill="#fff" stroke="#33507f" stroke-width="2"/>';
    else if (type === 'proc') s += '<rect x="4" y="8" width="' + (w - 8) + '" height="' + (h - 16) + '" rx="11" fill="#fff" stroke="#33507f" stroke-width="2"/>';
    else if (type === 'doc') s += '<path d="M6,10 L' + (w - 22) + ',10 L' + (w - 6) + ',26 L' + (w - 6) + ',' + (h - 8) + ' L6,' + (h - 8) + ' Z" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
      '<path d="M' + (w - 22) + ',10 L' + (w - 22) + ',26 L' + (w - 6) + ',26" fill="none" stroke="#33507f" stroke-width="1.4"/>';
    else if (type === 'store') s += '<rect x="8" y="12" width="' + (w - 16) + '" height="' + (h - 22) + '" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
      '<ellipse cx="' + cx + '" cy="12" rx="' + (w / 2 - 8) + '" ry="5" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
      '<path d="M8,' + (h - 10) + ' a' + (w / 2 - 8) + ',5 0 0 0 ' + (w - 16) + ',0" fill="none" stroke="#33507f" stroke-width="2"/>';
    s += '</svg>';
    return s;
  }

  /* ---------- 参考业务流程图 ---------- */
  var SVG_ID = 0;
  function bpmAnchor(n, tx, ty) {
    var dx = tx - n.x, dy = ty - n.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len; dy /= len;
    if (n.type === 'ext') {
      var a = 62, b = 27;
      var t = 1 / Math.sqrt((dx / a) * (dx / a) + (dy / b) * (dy / b));
      return { x: n.x + dx * t, y: n.y + dy * t };
    }
    var hw = n.type === 'unit' ? 62 : n.type === 'proc' ? 64 : n.type === 'doc' ? 58 : 54;
    var hh = n.type === 'unit' ? 26 : n.type === 'proc' ? 24 : 28;
    var t1 = Math.abs(dx) < 1e-6 ? 1e9 : hw / Math.abs(dx);
    var t2 = Math.abs(dy) < 1e-6 ? 1e9 : hh / Math.abs(dy);
    var tt = Math.min(t1, t2);
    return { x: n.x + dx * tt, y: n.y + dy * tt };
  }

  function bpmSVG(spec) {
    var id = 'bpm' + (++SVG_ID);
    var w = spec.w || 760, h = spec.h || 420;
    var byId = {};
    spec.nodes.forEach(function (n) { byId[n.id] = n; });
    var s = '<svg class="flow-svg" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><marker id="' + id + '-a" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#33507f"/></marker></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="#fff"/>';
    spec.edges.forEach(function (e) {
      var A = byId[e.from], B = byId[e.to];
      if (!A || !B) return;
      var p1 = bpmAnchor(A, B.x, B.y), p2 = bpmAnchor(B, A.x, A.y), mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      var d;
      if (e.bend) {
        var dx0 = p2.x - p1.x, dy0 = p2.y - p1.y, l0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
        var cx0 = mid.x + (-dy0 / l0) * e.bend, cy0 = mid.y + (dx0 / l0) * e.bend;
        d = 'M' + p1.x + ',' + p1.y + ' Q' + cx0 + ',' + cy0 + ' ' + p2.x + ',' + p2.y;
        mid = { x: 0.25 * p1.x + 0.5 * cx0 + 0.25 * p2.x, y: 0.25 * p1.y + 0.5 * cy0 + 0.25 * p2.y };
      } else {
        d = 'M' + p1.x + ',' + p1.y + ' L' + p2.x + ',' + p2.y;
      }
      s += '<path d="' + d + '" fill="none" stroke="' + (e.dashed ? '#b45309' : '#33507f') + '" stroke-width="1.8"' +
        (e.dashed ? ' stroke-dasharray="6 4"' : '') + ' marker-end="url(#' + id + '-a)"/>';
      if (e.label) {
        var dx1 = p2.x - p1.x, dy1 = p2.y - p1.y, l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
        var mx = mid.x + (-dy1 / l1) * 11, my = mid.y + (dx1 / l1) * 11;
        var tw = Math.min(130, e.label.length * 12 + 8);
        s += '<rect x="' + (mx - tw / 2) + '" y="' + (my - 9) + '" width="' + tw + '" height="18" rx="4" fill="#fff" opacity="0.95"/>' +
          '<text x="' + mx + '" y="' + (my + 4) + '" font-size="11.5" fill="#4a5772" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(e.label) + '</text>';
      }
    });
    spec.nodes.forEach(function (n) {
      var t = esc(n.label || '');
      if (n.type === 'ext') {
        s += '<ellipse cx="' + n.x + '" cy="' + n.y + '" rx="62" ry="27" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<text x="' + n.x + '" y="' + (n.y + 4) + '" font-size="12.5" font-weight="600" text-anchor="middle" fill="#17233d" font-family="Microsoft YaHei, sans-serif">' + t + '</text>';
      } else if (n.type === 'unit') {
        s += '<rect x="' + (n.x - 62) + '" y="' + (n.y - 26) + '" width="124" height="52" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<text x="' + n.x + '" y="' + (n.y + 4) + '" font-size="12.5" font-weight="600" text-anchor="middle" fill="#17233d" font-family="Microsoft YaHei, sans-serif">' + t + '</text>';
      } else if (n.type === 'proc') {
        s += '<rect x="' + (n.x - 64) + '" y="' + (n.y - 24) + '" width="128" height="48" rx="12" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<text x="' + n.x + '" y="' + (n.y + 4) + '" font-size="12.5" font-weight="600" text-anchor="middle" fill="#17233d" font-family="Microsoft YaHei, sans-serif">' + t + '</text>';
      } else if (n.type === 'doc') {
        s += '<path d="M' + (n.x - 58) + ',' + (n.y - 26) + ' L' + (n.x + 36) + ',' + (n.y - 26) + ' L' + (n.x + 58) + ',' + (n.y - 4) + ' L' + (n.x + 58) + ',' + (n.y + 26) + ' L' + (n.x - 58) + ',' + (n.y + 26) + ' Z" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<path d="M' + (n.x + 36) + ',' + (n.y - 26) + ' L' + (n.x + 36) + ',' + (n.y - 4) + ' L' + (n.x + 58) + ',' + (n.y - 4) + '" fill="none" stroke="#33507f" stroke-width="1.3"/>' +
          '<text x="' + n.x + '" y="' + (n.y + 5) + '" font-size="12" font-weight="600" text-anchor="middle" fill="#17233d" font-family="Microsoft YaHei, sans-serif">' + t + '</text>';
      } else {
        s += '<rect x="' + (n.x - 54) + '" y="' + (n.y - 22) + '" width="108" height="44" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<ellipse cx="' + n.x + '" cy="' + (n.y - 22) + '" rx="54" ry="6" fill="#fff" stroke="#33507f" stroke-width="2"/>' +
          '<path d="M' + (n.x - 54) + ',' + (n.y + 22) + ' a54,6 0 0 0 108,0" fill="none" stroke="#33507f" stroke-width="2"/>' +
          '<text x="' + n.x + '" y="' + (n.y + 5) + '" font-size="12" font-weight="600" text-anchor="middle" fill="#17233d" font-family="Microsoft YaHei, sans-serif">' + t + '</text>';
      }
    });
    return s + '</svg>';
  }

  var REF_BORROW = {
    w: 780, h: 400,
    nodes: [
      { id: 's', type: 'ext', x: 78, y: 110, label: '学生' },
      { id: 'u', type: 'unit', x: 300, y: 110, label: '图书馆管理员' },
      { id: 'k', type: 'store', x: 300, y: 315, label: '图书库' },
      { id: 'd', type: 'doc', x: 570, y: 110, label: '借书记录' }
    ],
    edges: [
      { from: 's', to: 'u', label: '借书请求' },
      { from: 'u', to: 'k', label: '查询库存' },
      { from: 'k', to: 'u', label: '库存结果', bend: 30 },
      { from: 'u', to: 'd', label: '登记借书' },
      { from: 'u', to: 's', label: '借出图书', bend: -40 }
    ]
  };

  var REF_LEAVE = {
    w: 780, h: 400,
    nodes: [
      { id: 's', type: 'ext', x: 74, y: 100, label: '学生' },
      { id: 'doc1', type: 'doc', x: 250, y: 100, label: '请假条' },
      { id: 'u', type: 'unit', x: 430, y: 100, label: '辅导员' },
      { id: 'j', type: 'unit', x: 640, y: 250, label: '教务处' },
      { id: 'k', type: 'store', x: 430, y: 300, label: '请假台账' }
    ],
    edges: [
      { from: 's', to: 'doc1', label: '填写' },
      { from: 'doc1', to: 'u', label: '提交' },
      { from: 'u', to: 'k', label: '备案' },
      { from: 'u', to: 'j', label: '审核通过' },
      { from: 'j', to: 'k', label: '存档' },
      { from: 'u', to: 's', label: '退回（不通过）', bend: 60, dashed: true }
    ]
  };

  /* ---------- 排序题 ---------- */
  var SORTS = [
    {
      id: 'borrow',
      title: '把「图书馆借书」的业务步骤排成正确顺序',
      steps: ['学生选书，提出借书请求', '管理员查询图书库存', '判断这本书是否可借', '登记借书，生成借书记录', '把书交给学生', '更新图书库存'],
      init: [3, 0, 5, 1, 4, 2],
      note: '口诀：实体（学生）→ 单位（管理员）→ 查存储（图书库）→ 登单据（借书记录）→ 回到实体。'
    },
    {
      id: 'leave',
      title: '把「学生请假」的业务步骤排成正确顺序',
      steps: ['学生填写请假条', '学生把请假条交给辅导员', '辅导员审核并签署意见', '审核通过后报教务处备案', '教务处存档', '不通过则退回学生并说明原因'],
      init: [2, 5, 0, 3, 1, 4],
      note: '含审批的流程一定要有「不通过」的去向，否则流程走不通 —— 这是最常见的漏画。'
    }
  ];

  /* ---------- 填空题 ---------- */
  var BLANKS = [
    {
      id: 'b1',
      q: '在业务流程图中，"学生"属于系统之外的人，应画成',
      accept: ['椭圆', '椭圆形', '椭圆（外部实体）'],
      suffix: '（填图元名称）',
      exp: '外部实体用椭圆。方框是"业务处理单位"（科室/岗位），学生不属于任何单位。'
    },
    {
      id: 'b2',
      q: '"图书库"用',
      accept: ['圆柱', '圆柱体', '圆柱形'],
      suffix: '表示，它属于"数据存储"类图元。',
      exp: '被保存的台账、文件用圆柱。它和方框的区别：方框是"谁在干活"，圆柱是"什么东西被存起来"。'
    },
    {
      id: 'b3',
      q: '学生借到书后，这笔业务留下的单据是',
      accept: ['借书记录', '借书单', '借阅记录', '借书记录单'],
      suffix: '。',
      exp: '单据是业务处理完成后留下的凭证。借书 → 借书记录；请假 → 请假条；选课 → 选课结果单。'
    },
    {
      id: 'b4',
      q: '表示"一个具体动作"（如审批、登记）的图元是',
      accept: ['圆角矩形', '圆角矩形（业务处理）', '业务处理'],
      suffix: '。',
      exp: '圆角矩形 = 业务处理（功能）。注意它和方框（单位）的区别：方框回答"谁做"，圆角矩形回答"做什么"。'
    }
  ];

  function shuffleBy(arr, order) {
    return order.map(function (i) { return arr[i]; });
  }
  function norm(s) { return String(s || '').replace(/\s|（|）|\(|\)|。|，/g, '').trim(); }

  /* ---------- 主入口 ---------- */
  window.LabBPM = {
    _svg: bpmSVG,
    render: function (root) {
      var head = el('div', 'page-head');
      head.innerHTML = '<div><div class="crumb">实验三 · 依据第五章《管理信息系统规划》业务流程图</div><h2>分析业务流程</h2>' +
        '<p class="sub">目标：能把一段口语描述抽象成"谁 → 做了什么 → 产生什么单据"，再用五类图元画出业务流程图</p></div>' +
        '<div class="btn-row"><button class="btn sm" id="bpmAi">截图问助教</button><span class="badge warn">建议 90 分钟</span></div>';
      root.appendChild(head);
      head.querySelector('#bpmAi').addEventListener('click', function () {
        if (window.CloudApp) window.CloudApp.openAsk(window.LabAI ? window.LabAI() : null);
      });

      var tabs = el('div', 'tabs');
      tabs.innerHTML = '<button class="tab on" data-t="sym">① 图元配对</button><button class="tab" data-t="sort">② 抽象与排序</button><button class="tab" data-t="blank">③ 单据填空</button><button class="tab" data-t="draw">④ 自己画一张</button><button class="tab" data-t="ref">⑤ 参考图与画法</button>';
      root.appendChild(tabs);
      var body = el('div');
      root.appendChild(body);
      var cur = 'sym';
      /* AI 助教：带上当前练的是哪一步、已完成多少 */
      function baseAI() {
        var names = { sym: '① 图元配对（认五类符号）', sort: '② 口语 → 业务活动清单排序', blank: '③ 借书流程单据填空', draw: '④ 自己画业务流程图', ref: '⑤ 参考图与画法' };
        var c = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k]; }).length; };
        var d = Store.data.bpm;
        var drawScore = d.draw && d.draw.score ? d.draw.score : 0;
        return {
          lab: '实验三 · 分析业务流程',
          task: '当前在第 ' + (names[cur] || '练习') + ' 部分',
          state: '图元配对 ' + c(d.sym) + '/5，步骤排序 ' + c(d.sort) + '/2，单据填空 ' + c(d.blank) + '/4，自画图 ' + (drawScore ? drawScore + ' 分' : '未自检'),
          progress: (c(d.sym) + c(d.sort) + c(d.blank) + (drawScore >= 70 ? 1 : 0)) + ' / 12',
          name: Store.data.name || ''
        };
      }
      function show(t) {
        cur = t;
        tabs.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
        body.innerHTML = '';
        window.LabAI = baseAI;
        if (t === 'sym') mountSym(body);
        else if (t === 'sort') mountSort(body);
        else if (t === 'blank') mountBlank(body);
        else if (t === 'draw') {
          if (window.BpmDraw) {
            var api = window.BpmDraw.mount(body);
            if (api && api.ai) window.LabAI = api.ai;
          } else {
            body.innerHTML = '<div class="card"><p class="small">画图组件没有加载。请刷新页面，或检查 assets/lab-bpm-draw.js 是否存在。</p></div>';
          }
        }
        else mountRef(body);
      }
      tabs.querySelectorAll('.tab').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.t); }); });
      show('sym');
    }
  };

  /* ---- ① 图元配对 ---- */
  function mountSym(host) {
    var card = el('div', 'card');
    card.innerHTML = '<h3>五类图元，五种长相</h3>' +
      '<p class="small hint" style="margin:4px 0 12px">先点左边的图形，再点右边对应的名称。配错的会自动弹回来，别怕试。</p>' +
      '<div class="grid-2"><div><div class="small muted" style="margin-bottom:6px">图形</div><div id="leftSyms" style="display:flex;flex-direction:column;gap:8px"></div></div>' +
      '<div><div class="small muted" style="margin-bottom:6px">名称</div><div id="rightSyms" style="display:flex;flex-direction:column;gap:8px"></div></div></div>' +
      '<div class="btn-row" style="margin-top:14px"><span class="small muted" id="symInfo"></span><button class="btn sm ghost" id="symReset">重做</button></div>';
    host.appendChild(card);

    var left = card.querySelector('#leftSyms'), right = card.querySelector('#rightSyms');
    var order = [3, 0, 4, 1, 2];
    var nameOrder = [2, 4, 1, 3, 0];
    var picked = null;

    function paint() {
      left.innerHTML = ''; right.innerHTML = '';
      order.forEach(function (si) {
        var s = SYMBOLS[si];
        var d = el('div', 'sym' + (Store.data.bpm.sym[s.id] ? ' matched' : '') + (picked && picked.id === s.id ? ' on' : ''));
        d.innerHTML = '<div class="sh">' + symIcon(s.id, 96, 52) + '</div>';
        d.addEventListener('click', function () {
          if (Store.data.bpm.sym[s.id]) return;
          picked = s; paint();
        });
        left.appendChild(d);
      });
      nameOrder.forEach(function (si) {
        var s = SYMBOLS[si];
        var d = el('div', 'sym' + (Store.data.bpm.sym[s.id] ? ' matched' : ''));
        d.innerHTML = '<div style="height:44px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600">' + s.label + '</div>';
        d.addEventListener('click', function () {
          if (Store.data.bpm.sym[s.id]) return;
          if (!picked) { info('先点左边的图形，再点这里。', false); return; }
          if (picked.id === s.id) {
            Store.data.bpm.sym[s.id] = true; Store.save();
            info('对了：' + s.label + ' —— ' + s.hint, true);
            picked = null; paint(); score();
          } else {
            info('不对。想想「' + picked.label + '」和「' + s.label + '」的差别：' + SYMBOLS.filter(function (x) { return x.id === picked.id; })[0].hint, false);
          }
        });
        right.appendChild(d);
      });
    }
    function info(t, ok) {
      card.querySelector('#symInfo').innerHTML = '<span class="' + (ok ? 'badge ok' : 'badge bad') + '">' + (ok ? '✓' : '✕') + '</span> ' + esc(t);
    }
    function score() {
      var n = Object.keys(Store.data.bpm.sym).filter(function (k) { return Store.data.bpm.sym[k]; }).length;
      card.querySelector('#symInfo').innerHTML = '<span class="badge ok">' + n + ' / 5</span> 已配对' + (n === 5 ? '　全部正确，去做下一项吧。' : '');
    }
    card.querySelector('#symReset').addEventListener('click', function () {
      Store.data.bpm.sym = {}; Store.save(); picked = null; paint();
      card.querySelector('#symInfo').textContent = '';
    });
    paint();
    if (Object.keys(Store.data.bpm.sym).length) score();
  }

  /* ---- ② 抽象与排序 ---- */
  function mountSort(host) {
    SORTS.forEach(function (sc) {
      var card = el('div', 'card');
      card.innerHTML = '<h3>' + esc(sc.title) + '</h3>' +
        '<p class="small hint" style="margin:4px 0 10px">用 ↑ ↓ 调整顺序，把最先发生的放最上面。排完点「检查顺序」。</p>' +
        '<div class="steps" id="steps-' + sc.id + '"></div>' +
        '<div class="btn-row" style="margin-top:10px"><button class="btn sm primary" data-check="' + sc.id + '">检查顺序</button>' +
        '<button class="btn sm ghost" data-reset="' + sc.id + '">打乱重来</button><span class="small muted" data-info="' + sc.id + '"></span></div>' +
        '<div data-msg="' + sc.id + '"></div>';
      host.appendChild(card);

      var box = card.querySelector('#steps-' + sc.id);
      var arr = shuffleBy(sc.steps, sc.init);
      if (Store.data.bpm.sort[sc.id]) arr = sc.steps.slice();

      function paint(showResult) {
        box.innerHTML = '';
        arr.forEach(function (txt, i) {
          var d = el('div', 'step');
          var cls = '';
          if (showResult) cls = txt === sc.steps[i] ? ' right' : ' wrongpos';
          d.className = 'step' + cls;
          d.innerHTML = '<span class="ord">' + (i + 1) + '</span><span class="txt">' + esc(txt) + '</span>' +
            '<span class="mv"><button data-up="' + i + '">↑</button><button data-down="' + i + '">↓</button></span>';
          box.appendChild(d);
        });
        box.querySelectorAll('button[data-up]').forEach(function (b) {
          b.addEventListener('click', function () {
            var i = parseInt(b.dataset.up, 10);
            if (i > 0) { var t = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = t; paint(); }
          });
        });
        box.querySelectorAll('button[data-down]').forEach(function (b) {
          b.addEventListener('click', function () {
            var i = parseInt(b.dataset.down, 10);
            if (i < arr.length - 1) { var t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t; paint(); }
          });
        });
      }
      paint();

      card.querySelector('[data-check="' + sc.id + '"]').addEventListener('click', function () {
        var right = arr.filter(function (t, i) { return t === sc.steps[i]; }).length;
        paint(true);
        var ok = right === sc.steps.length;
        Store.data.bpm.sort[sc.id] = ok;
        Store.save();
        card.querySelector('[data-msg="' + sc.id + '"]').innerHTML = '<div class="msg ' + (ok ? 'ok' : 'info') + '"><b>' +
          (ok ? '顺序正确 ✓' : '对了 ' + right + ' / ' + sc.steps.length + ' 步') + '</b>' +
          (ok ? esc(sc.note) : '标绿的步骤位置正确，标红的还需调整。想一想：哪一步必须等前一步的结果才能做？') + '</div>';
        card.querySelector('[data-info="' + sc.id + '"]').textContent = ok ? '已通过' : '';
      });
      card.querySelector('[data-reset="' + sc.id + '"]').addEventListener('click', function () {
        arr = shuffleBy(sc.steps, sc.init.slice().reverse());
        paint();
        card.querySelector('[data-msg="' + sc.id + '"]').innerHTML = '';
      });
    });
  }

  /* ---- ③ 单据填空 ---- */
  function mountBlank(host) {
    var card = el('div', 'card');
    card.innerHTML = '<h3>借书流程里的符号与单据</h3><p class="small hint" style="margin:4px 0 12px">四道填空，填完点「批改」。同义说法也算对。</p>' +
      '<div style="border:1px solid #e3e8f2;border-radius:12px;overflow:hidden;margin-bottom:14px">' + bpmSVG(REF_BORROW) + '</div>' +
      '<div id="blankBody"></div><div class="btn-row" style="margin-top:12px"><button class="btn primary" id="blankCheck">批改</button><span class="small muted" id="blankInfo"></span></div><div id="blankMsg"></div>';
    host.appendChild(card);
    var body = card.querySelector('#blankBody');
    BLANKS.forEach(function (b) {
      var d = el('div', 'q');
      d.innerHTML = '<div class="q-title">' + (b.id === 'b2' ? '' : '') + esc(b.q) + ' <input class="blank" data-b="' + b.id + '" /> ' + esc(b.suffix) + '</div><div class="explain" style="display:none"></div>';
      body.appendChild(d);
    });
    card.querySelector('#blankCheck').addEventListener('click', function () {
      var right = 0;
      BLANKS.forEach(function (b) {
        var inp = body.querySelector('input[data-b="' + b.id + '"]');
        var ok = b.accept.some(function (a) { return norm(a) === norm(inp.value); });
        inp.classList.remove('right', 'wrong');
        inp.classList.add(ok ? 'right' : 'wrong');
        var ex = inp.closest('.q').querySelector('.explain');
        ex.style.display = 'block';
        ex.innerHTML = (ok ? '<b style="color:#157347">对。</b>' : '<b style="color:#b42318">参考答案：' + esc(b.accept[0]) + '。</b>') + ' ' + esc(b.exp);
        if (ok) right++;
        Store.data.bpm.blank[b.id] = ok;
      });
      Store.save();
      card.querySelector('#blankInfo').textContent = right + ' / ' + BLANKS.length;
      card.querySelector('#blankMsg').innerHTML = '<div class="msg ' + (right === BLANKS.length ? 'ok' : 'info') + '"><b>' + (right === BLANKS.length ? '全部正确' : '答对 ' + right + ' 空') + '</b>' +
        (right === BLANKS.length ? '符号和单据都清楚了，接下来去「参考图与画法」看完整流程。' : '看下面的解析，特别注意「方框 vs 圆角矩形」「方框 vs 椭圆」这两组最容易混的。') + '</div>';
    });
  }

  /* ---- ⑤ 参考图 ---- */
  function mountRef(host) {
    var c1 = el('div', 'card');
    c1.innerHTML = '<h3>参考图 ① 图书馆借书</h3><p class="small hint" style="margin:4px 0 10px">实体（学生）→ 单位（管理员）→ 查存储（图书库）→ 登单据（借书记录）→ 回到实体。</p>' +
      '<div style="border:1px solid #e3e8f2;border-radius:12px;overflow:hidden">' + bpmSVG(REF_BORROW) + '</div>';
    host.appendChild(c1);

    var c2 = el('div', 'card');
    c2.innerHTML = '<h3>参考图 ② 学生请假（含审批）</h3><p class="small hint" style="margin:4px 0 10px">注意橙色虚线：审批不通过必须有一条回流，否则流程走不通。</p>' +
      '<div style="border:1px solid #e3e8f2;border-radius:12px;overflow:hidden">' + bpmSVG(REF_LEAVE) + '</div>';
    host.appendChild(c2);

    var c3 = el('div', 'card');
    c3.innerHTML = '<h3>画业务流程图：四步 + 三张清单</h3>' +
      '<div class="grid-2" style="margin-top:10px">' +
      '<div class="ref-block"><b>画法四步（第五章第 15 页）</b><p class="small" style="margin:6px 0 0">① 提问：让学生说这个业务怎么走<br />② 抽象：把口语提炼成"谁 + 做什么 + 什么单据"<br />③ 绘图：摆图元、连箭头、写单据名<br />④ 出题：就这张图提问，检验是否真懂</p></div>' +
      '<div class="ref-block"><b>抽象示例（老师说的话 → 规范表达）</b><p class="small" style="margin:6px 0 0">"我拿书去借书台，把书给老师看" → 学生：提出借书请求<br />"老师会先看书还能不能借" → 管理员：查图书库存<br />"能借的话老师会登记一下" → 管理员：登记借书（借书记录）<br />"还要在系统里记一笔" → 数据存储：借阅台账</p></div>' +
      '</div>' +
      '<h4>五类图元对照表</h4>' +
      '<table class="data" style="margin-top:4px"><thead><tr><th>图元</th><th>形状</th><th>回答的问题</th><th>例子</th></tr></thead><tbody>' +
      [['业务处理单位', '方框', '谁在干活', '图书馆、教务处、辅导员'],
      ['业务处理（功能）', '圆角矩形', '做了什么动作', '审批、登记、查询'],
      ['单据 / 报表', '折角矩形', '产生/传递什么凭证', '请假条、借书记录、选课结果单'],
      ['数据存储', '圆柱', '什么被存起来', '图书库、学生台账'],
      ['外部实体', '椭圆', '系统外的人/单位', '学生、供应商']]
        .map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<div class="ref-block" style="margin-top:12px"><b>它和数据流图的区别</b>：数据流图从「数据」看系统，只画数据怎么流、被谁加工、存在哪；业务流程图从「人和单据」看现行系统，画谁把什么交给谁。两者是伙伴关系，不是替代关系。</div>';
    host.appendChild(c3);
  }
})();
