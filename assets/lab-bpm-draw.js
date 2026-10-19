/* 实验三 · 自己画业务流程图（自由练习 + 三个情景任务 + 规则自检） */
(function () {
  'use strict';

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ---------- 五类图元 ---------- */
  var SHAPES = {
    unit: { label: '业务处理单位', hint: '方框 · 科室 / 岗位', w: 122, h: 56, def: '处理单位' },
    proc: { label: '业务处理', hint: '圆角矩形 · 一个动作', w: 126, h: 56, def: '处理动作' },
    doc: { label: '单据 / 报表', hint: '折角矩形 · 表单', w: 118, h: 58, def: '单据' },
    store: { label: '数据存储', hint: '圆柱 · 台账 / 文件', w: 114, h: 60, def: '台账' },
    ext: { label: '外部实体', hint: '椭圆 · 系统外的人', w: 128, h: 60, def: '外部实体' }
  };
  var ORDER = ['unit', 'proc', 'doc', 'store', 'ext'];

  function shapeIcon(t) {
    var w = 74, h = 38, cx = w / 2, cy = h / 2, s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">';
    if (t === 'ext') s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (w / 2 - 4) + '" ry="' + (h / 2 - 6) + '" fill="#fff" stroke="#33507f" stroke-width="1.8"/>';
    else if (t === 'unit') s += '<rect x="6" y="8" width="' + (w - 12) + '" height="' + (h - 16) + '" fill="#fff" stroke="#33507f" stroke-width="1.8"/>';
    else if (t === 'proc') s += '<rect x="6" y="8" width="' + (w - 12) + '" height="' + (h - 16) + '" rx="10" fill="#fff" stroke="#33507f" stroke-width="1.8"/>';
    else if (t === 'doc') s += '<path d="M6,8 L' + (w - 22) + ',8 L' + (w - 6) + ',23 L' + (w - 6) + ',' + (h - 8) + ' L6,' + (h - 8) + ' Z" fill="#fff" stroke="#33507f" stroke-width="1.8"/>' +
      '<path d="M' + (w - 22) + ',8 L' + (w - 22) + ',23 L' + (w - 6) + ',23" fill="none" stroke="#33507f" stroke-width="1.3"/>';
    else if (t === 'store') s += '<path d="M10,12 L10,' + (h - 12) + ' a' + (cx - 10) + ',6 0 0 0 ' + (w - 20) + ',0 L' + (w - 10) + ',12" fill="#fff" stroke="#33507f" stroke-width="1.8"/>' +
      '<ellipse cx="' + cx + '" cy="12" rx="' + (cx - 10) + '" ry="6" fill="#fff" stroke="#33507f" stroke-width="1.8"/>';
    s += '</svg>';
    return s;
  }

  /* ---------- 情景任务 ---------- */
  var TASKS = {
    free: {
      name: '自由练习',
      brief: '自己定一个情景（借书、请假、报修、报销都行），把「谁 → 做什么 → 产生什么单据 → 存到哪」画出来。',
      expect: []
    },
    borrow: {
      name: '图书借阅（课件原例）',
      brief: '读者来借书，管理员办理，开出借书单并登记到借阅台账；读者还书时注销记录。',
      expect: [
        { type: 'ext', any: ['读者', '学生', '借阅者'], label: '外部实体：读者' },
        { type: 'ext', any: ['管理员', '馆员', '图书管理员'], label: '外部实体：图书管理员' },
        { type: 'proc', any: ['借书', '借阅', '办理借'], label: '业务处理：借书处理' },
        { type: 'doc', any: ['借书单', '借阅单', '借书证', '借阅记录'], label: '单据：借书单 / 借阅记录' },
        { type: 'store', any: ['借阅台账', '借阅表', '图书台账', '库存'], label: '数据存储：借阅台账' }
      ]
    },
    leave: {
      name: '学生请假（含审批）',
      brief: '学生填请假单提交，辅导员审批；通过的记录进请假台账，不通过退回学生。',
      expect: [
        { type: 'ext', any: ['学生'], label: '外部实体：学生' },
        { type: 'ext', any: ['辅导员', '班主任', '院系', '老师'], label: '外部实体：辅导员 / 院系' },
        { type: 'proc', any: ['填写', '提交', '申请'], label: '业务处理：填写 / 提交申请' },
        { type: 'proc', any: ['审批', '审核', '批准'], label: '业务处理：审批' },
        { type: 'doc', any: ['请假单', '请假条', '申请表'], label: '单据：请假单' },
        { type: 'store', any: ['台账', '记录', '考勤'], label: '数据存储：请假台账' }
      ]
    }
  };

  /* ---------- 参考图 ---------- */
  var REFS = {
    borrow: {
      nodes: [
        { id: 'r', type: 'ext', x: 82, y: 92, name: '读者' },
        { id: 'm', type: 'ext', x: 82, y: 322, name: '图书管理员' },
        { id: 'p1', type: 'proc', x: 296, y: 92, name: '借书处理' },
        { id: 'p2', type: 'proc', x: 296, y: 322, name: '还书处理' },
        { id: 'd1', type: 'doc', x: 512, y: 92, name: '借书单' },
        { id: 'd2', type: 'store', x: 512, y: 322, name: '借阅台账' }
      ],
      edges: [
        { from: 'r', to: 'p1', label: '借书申请' },
        { from: 'p1', to: 'd1', label: '开借书单' },
        { from: 'd1', to: 'd2', label: '借阅记录' },
        { from: 'p1', to: 'r', label: '借阅结果', bend: -46 },
        { from: 'm', to: 'p2', label: '还书申请' },
        { from: 'p2', to: 'd2', label: '注销记录' },
        { from: 'p2', to: 'm', label: '还书结果', bend: 46 }
      ]
    },
    leave: {
      nodes: [
        { id: 's', type: 'ext', x: 78, y: 96, name: '学生' },
        { id: 'p1', type: 'proc', x: 288, y: 96, name: '填写请假单' },
        { id: 'd1', type: 'doc', x: 492, y: 96, name: '请假单' },
        { id: 'p2', type: 'proc', x: 492, y: 310, name: '辅导员审批' },
        { id: 'd2', type: 'store', x: 272, y: 310, name: '请假台账' },
        { id: 't', type: 'ext', x: 686, y: 310, name: '辅导员' }
      ],
      edges: [
        { from: 's', to: 'p1', label: '提交申请' },
        { from: 'p1', to: 'd1', label: '生成请假单' },
        { from: 'd1', to: 'p2', label: '送审' },
        { from: 't', to: 'p2', label: '审批意见' },
        { from: 'p2', to: 'd2', label: '通过记录' },
        { from: 'p2', to: 's', label: '审批结果', bend: 84 }
      ]
    }
  };

  /* ---------- 状态 ---------- */
  function state() {
    if (!Store.data.bpm.draw || typeof Store.data.bpm.draw !== 'object') {
      Store.data.bpm.draw = { nodes: [], edges: [], score: 0, checked: false, task: 'borrow' };
    }
    var d = Store.data.bpm.draw;
    if (!Array.isArray(d.nodes)) d.nodes = [];
    if (!Array.isArray(d.edges)) d.edges = [];
    if (!d.task || !TASKS[d.task]) d.task = 'borrow';
    return d;
  }

  function anchor(n, tx, ty) {
    var dx = tx - n.x, dy = ty - n.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len; dy /= len;
    var w = SHAPES[n.type].w / 2, h = SHAPES[n.type].h / 2;
    if (n.type === 'ext') {
      var t = 1 / Math.sqrt((dx / w) * (dx / w) + (dy / h) * (dy / h));
      return { x: n.x + dx * t, y: n.y + dy * t };
    }
    var t1 = Math.abs(dx) < 1e-6 ? 1e9 : w / Math.abs(dx);
    var t2 = Math.abs(dy) < 1e-6 ? 1e9 : h / Math.abs(dy);
    var tt = Math.min(t1, t2);
    return { x: n.x + dx * tt, y: n.y + dy * tt };
  }

  function mount(host) {
    var data = state();
    var sel = { node: null, edge: null };
    var linkFrom = null, connectMode = false, drag = null, lastCheck = null;

    var wrap = el('div', 'bpmw-wrap');

    /* 左：图元 */
    var pal = el('div', 'palette');
    pal.innerHTML = '<div class="small muted" style="margin-bottom:2px">点一下，加到画布</div>' +
      ORDER.map(function (t) {
        return '<div class="pal-item" data-t="' + t + '"><div class="pv">' + shapeIcon(t) + '</div>' +
          '<div class="nm">' + SHAPES[t].label + '</div><div class="ds">' + SHAPES[t].hint + '</div></div>';
      }).join('') +
      '<div class="ref-block small" style="margin-top:6px"><b>五步画法</b><br />① 谁参与 → ② 做什么 → ③ 出什么单 → ④ 存到哪 → ⑤ 箭头写清单据名</div>';

    /* 中：画布 */
    var shell = el('div', 'canvas-shell');
    var bar = el('div', 'canvas-bar');
    bar.innerHTML =
      '<select class="bpmw-task" id="taskSel">' +
      Object.keys(TASKS).map(function (k) { return '<option value="' + k + '">' + esc(TASKS[k].name) + '</option>'; }).join('') +
      '</select>' +
      '<button class="btn sm" id="connectBtn">连线模式：关</button>' +
      '<button class="btn sm" id="delBtn">删除所选</button>' +
      '<span class="sep"></span>' +
      '<button class="btn sm primary" id="checkBtn">自检并打分</button>' +
      '<button class="btn sm" id="refBtn">看参考图</button>' +
      '<button class="btn sm ghost" id="clearBtn">清空</button>' +
      '<span class="small muted" id="cntInfo" style="margin-left:auto"></span>';
    var canvas = el('div', 'canvas bpmw-canvas');
    canvas.innerHTML = '<svg class="edge-layer" id="edgeLayer"></svg>' +
      '<div class="linkbar" id="linkbar"><span class="small"></span><input placeholder="这条线上传的是什么？如：借书单" /><button class="btn sm primary">确定</button><button class="btn sm ghost">取消</button></div>';
    shell.appendChild(bar); shell.appendChild(canvas);

    /* 右：任务 + 提示 + 自检 */
    var side = el('div', 'dfd-side');
    side.innerHTML =
      '<div class="card" style="padding:14px 16px"><h4 style="margin-top:0">画这张图</h4>' +
      '<p class="small hint" style="margin:6px 0 0" id="brief"></p>' +
      '<div id="needBox" style="margin-top:8px"></div></div>' +
      '<div class="card" style="padding:14px 16px" id="tutorBox"></div>' +
      '<div class="card" style="padding:14px 16px"><h4 style="margin-top:0">规则自检</h4>' +
      '<div id="ruleBox"><p class="small muted" style="margin:4px 0 0">画完后点「自检并打分」，五条规则逐项批改。</p></div></div>';

    wrap.appendChild(pal); wrap.appendChild(shell); wrap.appendChild(side);
    host.appendChild(wrap);

    var layer = canvas.querySelector('#edgeLayer');
    var linkbar = canvas.querySelector('#linkbar');
    var cntInfo = bar.querySelector('#cntInfo');
    var taskSel = bar.querySelector('#taskSel');
    taskSel.value = data.task;

    function save() { Store.save(); }
    function byId(id) { return data.nodes.filter(function (n) { return n.id === id; })[0]; }
    function task() { return TASKS[data.task]; }

    function addNode(type) {
      var r = canvas.getBoundingClientRect();
      var n = data.nodes.length;
      var node = {
        id: 'b' + Date.now() + Math.floor(Math.random() * 999),
        type: type,
        name: SHAPES[type].def,
        x: 110 + (n % 3) * 170,
        y: 70 + Math.floor(n / 3) * 120
      };
      node.x = Math.min(node.x, Math.max(90, r.width - 90));
      node.y = Math.min(node.y, Math.max(60, r.height - 60));
      data.nodes.push(node);
      render(); save();
      flash('加了一个' + SHAPES[type].label + '。双击里面的字就能改名字。');
    }

    /* ---------- 绘制 ---------- */
    function drawEdges(full) {
      var marks = '';
      data.edges.forEach(function (e) {
        var A = byId(e.from), B = byId(e.to);
        if (!A || !B) return;
        var a = anchor(A, B.x, B.y), b = anchor(B, A.x, A.y);
        var on = sel.edge === e.id;
        marks += '<path d="M' + a.x + ',' + a.y + ' L' + b.x + ',' + b.y + '" stroke="' + (on ? '#2f5bd0' : '#33507f') +
          '" stroke-width="' + (on ? 2.6 : 1.7) + '" fill="none" marker-end="url(#bah)" data-edge="' + e.id + '" style="pointer-events:stroke"/>';
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (e.name) {
          var tw = Math.min(150, e.name.length * 12.5 + 10);
          marks += '<rect x="' + (mx - tw / 2) + '" y="' + (my - 10) + '" width="' + tw + '" height="19" rx="4" fill="#fff" opacity="0.96" stroke="#e3e8f2"/>' +
            '<text x="' + mx + '" y="' + (my + 3.5) + '" font-size="11.5" fill="#4a5772" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">' + esc(e.name) + '</text>';
        } else {
          marks += '<text x="' + mx + '" y="' + (my + 3) + '" font-size="11" fill="#b42318" text-anchor="middle" font-family="Microsoft YaHei, sans-serif">未命名</text>';
        }
      });
      layer.innerHTML = '<defs><marker id="bah" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#33507f"/></marker></defs>' + marks;
      if (full) {
        var r = canvas.getBoundingClientRect();
        layer.setAttribute('viewBox', '0 0 ' + Math.max(r.width, 10) + ' ' + Math.max(r.height, 10));
      }
    }

    function render() {
      drawEdges(true);
      Array.prototype.slice.call(canvas.querySelectorAll('.bnode')).forEach(function (n) { n.remove(); });
      data.nodes.forEach(function (n) {
        var s = SHAPES[n.type];
        var d = el('div', 'bnode ' + n.type + (sel.node === n.id ? ' sel' : '') + (linkFrom === n.id ? ' linkfrom' : ''));
        d.style.left = (n.x - s.w / 2) + 'px';
        d.style.top = (n.y - s.h / 2) + 'px';
        d.style.width = s.w + 'px';
        d.style.height = s.h + 'px';
        d.dataset.id = n.id;
        d.innerHTML = '<input value="' + esc(n.name) + '" />' + (n.type === 'doc' ? '<i class="fold"></i>' : '') +
          (n.type === 'store' ? '<i class="cap"></i>' : '') + '<button class="del" title="删除">×</button>';
        canvas.appendChild(d);
        var inp = d.querySelector('input');
        inp.addEventListener('input', function () { n.name = this.value; save(); count(); });
        inp.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
        inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') this.blur(); });
        d.querySelector('.del').addEventListener('click', function (ev) {
          ev.stopPropagation();
          data.nodes = data.nodes.filter(function (x) { return x.id !== n.id; });
          data.edges = data.edges.filter(function (e) { return e.from !== n.id && e.to !== n.id; });
          sel.node = null; render(); save(); count();
        });
        d.addEventListener('mousedown', function (ev) { startDrag(ev, n, d); });
        d.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (connectMode) { pickForLink(n); return; }
          sel = { node: n.id, edge: null }; render();
        });
      });
      layer.querySelectorAll('path[data-edge]').forEach(function (p) {
        p.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (connectMode) return;
          sel = { node: null, edge: p.dataset.edge }; render();
          var e = data.edges.filter(function (x) { return x.id === p.dataset.edge; })[0];
          if (!e) return;
          linkbar.dataset.mode = 'edit'; linkbar.dataset.edge = e.id;
          linkbar.querySelector('span').textContent = '改这条线上的名字：';
          linkbar.querySelector('input').value = e.name || '';
          linkbar.classList.add('show');
          linkbar.querySelector('input').focus();
        });
      });
      count();
    }

    function count() {
      var c = { unit: 0, proc: 0, doc: 0, store: 0, ext: 0 };
      data.nodes.forEach(function (n) { c[n.type] = (c[n.type] || 0) + 1; });
      var unnamed = data.edges.filter(function (e) { return !e.name; }).length;
      cntInfo.textContent = '图元 ' + data.nodes.length + ' 个 · 连线 ' + data.edges.length + ' 条' + (unnamed ? '（' + unnamed + ' 条未命名）' : '');
    }

    /* ---------- 拖拽 ---------- */
    function startDrag(ev, n, d) {
      if (ev.target.tagName === 'INPUT' || ev.target.classList.contains('del')) return;
      if (connectMode) return;
      ev.preventDefault();
      var r = canvas.getBoundingClientRect();
      drag = { n: n, d: d, ox: ev.clientX - r.left - n.x, oy: ev.clientY - r.top - n.y, moved: false };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    function onMove(ev) {
      if (!drag) return;
      var r = canvas.getBoundingClientRect(), s = SHAPES[drag.n.type];
      drag.n.x = Math.max(s.w / 2 + 4, Math.min(r.width - s.w / 2 - 4, ev.clientX - r.left - drag.ox));
      drag.n.y = Math.max(s.h / 2 + 4, Math.min(r.height - s.h / 2 - 4, ev.clientY - r.top - drag.oy));
      drag.moved = true;
      drag.d.style.left = (drag.n.x - s.w / 2) + 'px';
      drag.d.style.top = (drag.n.y - s.h / 2) + 'px';
      drawEdges(false);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (drag && drag.moved) save();
      drag = null;
    }

    /* ---------- 连线 ---------- */
    function pickForLink(n) {
      if (!linkFrom) {
        linkFrom = n.id; render();
        flash('起点是「' + n.name + '」。再点一下终点，箭头就从起点指向终点。');
        return;
      }
      if (linkFrom === n.id) { linkFrom = null; render(); return; }
      var from = linkFrom;
      var edge = { id: 'e' + Date.now(), from: from, to: n.id, name: '' };
      data.edges.push(edge);
      linkFrom = null; render();
      var A = byId(edge.from);
      linkbar.classList.add('show');
      linkbar.dataset.mode = 'new'; linkbar.dataset.edge = edge.id;
      linkbar.querySelector('span').textContent = '「' + A.name + ' → ' + n.name + '」传的是什么？';
      linkbar.querySelector('input').value = '';
      linkbar.querySelector('input').focus();
      save();
    }

    function commitLink() {
      var v = linkbar.querySelector('input').value.trim();
      if (linkbar.dataset.mode === 'new') {
        var e = data.edges.filter(function (x) { return x.id === linkbar.dataset.edge; })[0];
        if (!e) { linkbar.classList.remove('show'); return; }
        if (!v) data.edges = data.edges.filter(function (x) { return x !== e; });
        else e.name = v;
      } else if (linkbar.dataset.mode === 'edit') {
        var e2 = data.edges.filter(function (x) { return x.id === linkbar.dataset.edge; })[0];
        if (e2) e2.name = v;
      }
      linkbar.classList.remove('show');
      linkbar.dataset.mode = '';
      render(); save();
      if (v) flash('已命名：「' + v + '」。线上写的是单据或信息名，不是编号。');
    }

    bar.querySelector('#connectBtn').addEventListener('click', function () {
      connectMode = !connectMode;
      this.textContent = '连线模式：' + (connectMode ? '开' : '关');
      this.classList.toggle('primary', connectMode);
      if (!connectMode) { linkFrom = null; render(); }
      flash(connectMode ? '连线模式：先点起点，再点终点。方向就是单据流动的方向。' : '退出连线模式了，现在可以拖动图元。');
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
      sel = { node: null, edge: null }; linkFrom = null; lastCheck = null;
      render(); save();
      side.querySelector('#ruleBox').innerHTML = '<p class="small muted" style="margin:4px 0 0">画完后点「自检并打分」。</p>';
    });
    bar.querySelector('#checkBtn').addEventListener('click', function () {
      var res = check(task(), data);
      data.score = res.score; data.checked = true;
      lastCheck = res;
      save();
      renderRules(side.querySelector('#ruleBox'), res);
      flash(res.verdict, res.score >= 70 ? 'ok' : 'bad');
    });
    bar.querySelector('#refBtn').addEventListener('click', function () {
      var key = data.task === 'leave' ? 'leave' : 'borrow';
      var box = side.querySelector('#tutorBox');
      box.innerHTML = '<div class="tutor"><div class="who"><span class="avatar">参</span>参考图（先自己画，再对照）</div>' +
        '<div class="small" style="margin:4px 0 6px">对照时只看三件事：图元类型用对了吗？单据有没有落到存储？箭头写的是不是单据名？</div>' +
        '<div class="ref-svg">' + (window.LabBPM && window.LabBPM._svg ? window.LabBPM._svg(REFS[key]) : '') + '</div></div>';
    });

    bar.querySelector('#taskSel').addEventListener('change', function () {
      data.task = this.value;
      save(); paintTask();
      flash('换成「' + task().name + '」。画布里的图保留着，你可以接着改，也可以清空重画。');
    });

    linkbar.querySelectorAll('button')[0].addEventListener('click', commitLink);
    linkbar.querySelectorAll('button')[1].addEventListener('click', function () {
      if (linkbar.dataset.mode === 'new') {
        data.edges = data.edges.filter(function (x) { return x.id !== linkbar.dataset.edge; });
      }
      linkbar.classList.remove('show');
      linkbar.dataset.mode = '';
      render(); save();
    });
    linkbar.querySelector('input').addEventListener('keydown', function (e) { if (e.key === 'Enter') commitLink(); });

    pal.querySelectorAll('.pal-item').forEach(function (p) {
      p.addEventListener('click', function () { addNode(p.dataset.t); });
    });
    canvas.addEventListener('click', function () {
      if (!connectMode && (sel.node || sel.edge)) { sel = { node: null, edge: null }; render(); }
    });

    function flash(html, kind) {
      side.querySelector('#tutorBox').innerHTML = '<div class="tutor' + (kind === 'bad' ? ' bad' : '') + '">' +
        '<div class="who"><span class="avatar">助</span>助教提示</div><div class="small">' + html + '</div></div>';
    }

    function paintTask() {
      var t = task();
      side.querySelector('#brief').textContent = t.brief;
      var nb = side.querySelector('#needBox');
      if (!t.expect.length) {
        nb.innerHTML = '<div class="small muted">自由练习不设标准答案：五类图元用全、箭头都写名字、每个处理有进有出，就能拿到高分。</div>';
        return;
      }
      nb.innerHTML = '<div class="small muted" style="margin-bottom:4px">这张图至少要出现：</div><ul class="checklist small">' +
        t.expect.map(function (x) { return '<li><span class="dot">·</span><span>' + esc(x.label) + '</span></li>'; }).join('') + '</ul>';
    }

    paintTask();
    render();
    if (data.nodes.length) flash('已载入你上次画的图（' + data.nodes.length + ' 个图元）。接着画，或者点「自检并打分」看看现在几分。');
    else flash('先别急着拖方框。用一句话说出这段业务：<b>谁</b>找<b>谁</b>办<b>什么事</b>，办完留下<b>什么单</b>？说清了再开始画。');

    /* ---------- 自检 ---------- */
    function check(t, d) {
      var items = [], score = 0;
      var nodes = d.nodes, edges = d.edges;
      var deg = {};
      nodes.forEach(function (n) { deg[n.id] = { in: 0, out: 0 }; });
      edges.forEach(function (e) {
        if (deg[e.from]) deg[e.from].out++;
        if (deg[e.to]) deg[e.to].in++;
      });
      var byType = { unit: [], proc: [], doc: [], store: [], ext: [] };
      nodes.forEach(function (n) { (byType[n.type] || []).push(n); });

      /* 1 要素齐备 40 */
      if (t.expect.length) {
        var hit = 0;
        t.expect.forEach(function (g) {
          var ok = nodes.some(function (n) {
            return n.type === g.type && g.any.some(function (k) { return (n.name || '').indexOf(k) >= 0; });
          });
          if (ok) hit++;
          else items.push({ st: 'bad', text: '还缺「' + g.label + '」' });
        });
        score += Math.round(40 * hit / t.expect.length);
        items.unshift({ st: hit === t.expect.length ? 'ok' : 'warn', text: '要素齐备：' + hit + ' / ' + t.expect.length + ' 项到位' });
      } else {
        var used = ORDER.filter(function (k) { return byType[k].length > 0; }).length;
        score += Math.round(40 * used / 5);
        items.push({ st: used === 5 ? 'ok' : 'warn', text: '五类图元用了 ' + used + ' / 5 类' + (used === 5 ? '' : '（缺：' + ORDER.filter(function (k) { return !byType[k].length; }).map(function (k) { return SHAPES[k].label; }).join('、') + '）') });
      }

      /* 2 有进有出 20 */
      var needs = nodes.filter(function (n) { return n.type === 'proc' || n.type === 'doc' || n.type === 'unit'; });
      var lonely = [];
      needs.forEach(function (n) {
        var g = deg[n.id];
        if (!g.in || !g.out) lonely.push(n.name + (g.in ? ' 只有出没有进' : g.out ? ' 只有进没有出' : ' 没连任何线'));
      });
      var iso = nodes.filter(function (n) { return !deg[n.id].in && !deg[n.id].out; });
      if (!needs.length) items.push({ st: 'bad', text: '还没有业务处理 / 单据，先各拖一个进来' });
      else if (!lonely.length) { score += 20; items.push({ st: 'ok', text: '每个处理、单据都有进有出' }); }
      else {
        score += Math.round(20 * (needs.length - lonely.length) / needs.length);
        items.push({ st: bad_or_warn(), text: '这些节点没接好：' + lonely.slice(0, 3).join('；') + (lonely.length > 3 ? ' 等 ' + lonely.length + ' 处' : '') });
      }

      /* 3 起止在外部实体 10 */
      var extLinked = (byType.ext || []).some(function (n) { return deg[n.id].in + deg[n.id].out > 0; });
      if (extLinked) { score += 10; items.push({ st: 'ok', text: '流程有外部实体作为起点或终点' }); }
      else items.push({ st: 'bad', text: '流程从谁开始？把外部实体（椭圆）接进来' });

      /* 4 箭头命名 15 */
      if (!edges.length) items.push({ st: 'bad', text: '还没有箭头，画完图元要连线' });
      else {
        var named = edges.filter(function (e) { return e.name && e.name.trim(); }).length;
        score += Math.round(15 * named / edges.length);
        items.push({ st: named === edges.length ? 'ok' : 'warn', text: '箭头命名：' + named + ' / ' + edges.length + ' 条（每条都要写传的是什么单据或信息）' });
      }

      /* 5 命名规范 15 */
      var badName = [];
      nodes.forEach(function (n) {
        var nm = (n.name || '').trim();
        if (!nm || nm === SHAPES[n.type].def) { badName.push('有一个' + SHAPES[n.type].label + '还没改名字'); return; }
        if (n.type === 'proc' && /(单|表|台账|记录|清单)$/.test(nm)) badName.push('「' + nm + '」是单据，不该画成处理');
        if (n.type === 'doc' && !/(单|表|台账|记录|凭证|报告|清单|通知|回执)/.test(nm)) badName.push('「' + nm + '」看不出是单据，名字里带个"单/表/记录"');
      });
      var total = nodes.length || 1;
      if (!badName.length) { score += 15; items.push({ st: 'ok', text: '图元命名符合规范' }); }
      else {
        score += Math.round(15 * Math.max(0, total - badName.length) / total);
        items.push({ st: bad_or_warn(), text: badName.slice(0, 2).join('；') });
      }

      score = Math.max(0, Math.min(100, score));
      var verdict;
      if (!nodes.length) verdict = '画布还是空的。先拖一个外部实体和一个业务处理进来，我们只做第一步。';
      else if (score >= 85) verdict = '这张图结构清楚了，' + score + ' 分。可以换个情景再画一张，或者去「参考图」对照细节。';
      else if (score >= 70) verdict = score + ' 分，已经能读懂了。把没通过的规则改一处，就能上 85。';
      else verdict = score + ' 分。别一次改全部，先解决第一条：' + (items.filter(function (i) { return i.st !== 'ok'; })[0] || { text: '' }).text;

      function bad_or_warn() { return score < 40 ? 'bad' : 'warn'; }
      return { score: score, items: items, verdict: verdict };
    }

    function renderRules(box, res) {
      box.innerHTML = '<div class="score-ring" style="margin-bottom:6px"><b>' + res.score + '</b><span>/100</span>' +
        '<i class="' + (res.score >= 70 ? 'ok' : 'bad') + '">' + (res.score >= 70 ? '通过' : '再改改') + '</i></div>' +
        '<ul class="checklist small">' + res.items.map(function (i) {
          return '<li class="' + i.st + '"><span class="dot">' + (i.st === 'ok' ? '✓' : i.st === 'warn' ? '!' : '✕') + '</span><span>' + esc(i.text) + '</span></li>';
        }).join('') + '</ul>';
    }

    /* ---------- AI 助教上下文 ---------- */
    function aiCtx() {
      var c = { unit: 0, proc: 0, doc: 0, store: 0, ext: 0 };
      data.nodes.forEach(function (n) { c[n.type] = (c[n.type] || 0) + 1; });
      var unnamed = data.edges.filter(function (e) { return !e.name; }).length;
      var bad = lastCheck ? lastCheck.items.filter(function (i) { return i.st !== 'ok'; }).map(function (i) { return i.text; }) : [];
      return {
        lab: '实验三 · 分析业务流程（自己画图）',
        task: task().name + '｜' + task().brief,
        state: '画布上有业务处理单位 ' + c.unit + '、业务处理 ' + c.proc + '、单据 ' + c.doc + '、数据存储 ' + c.store + '、外部实体 ' + c.ext +
          '，连线 ' + data.edges.length + ' 条（未命名 ' + unnamed + ' 条）。' + (lastCheck ? '最近一次自检 ' + lastCheck.score + ' 分。' : '还没点过自检。'),
        feedback: bad.length ? '未通过项：' + bad.join('；') : '',
        progress: lastCheck ? lastCheck.score + '/100（≥70 记为通过）' : '',
        name: Store.data.name || ''
      };
    }

    return { ai: aiCtx, refresh: render };
  }

  window.BpmDraw = { mount: mount, SHAPES: SHAPES, TASKS: TASKS };
})();
