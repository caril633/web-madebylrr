/* 平台外壳：导航、进度存储、总览页、报告页 */
(function () {
  'use strict';

  var KEY = 'mis-lab-v1';
  var DEFAULTS = {
    name: '',
    dfd: { quiz: {}, draw: {}, find: {} },
    sql: { done: {} },
    bpm: { sym: {}, sort: {}, blank: {}, draw: null }
  };

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), raw);
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  function deepMerge(a, b) {
    Object.keys(b || {}).forEach(function (k) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]);
      else a[k] = b[k];
    });
    return a;
  }

  var Store = {
    data: load(),
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { }
      if (window.CloudApp) window.CloudApp.markDirty();
    },
    reset: function () { this.data = JSON.parse(JSON.stringify(DEFAULTS)); this.save(); }
  };
  window.Store = Store;

  /* ---------------- 页面骨架 ---------------- */
  var main = document.getElementById('main');
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
  var nameInput = document.getElementById('stuName');
  nameInput.value = Store.data.name || '';
  nameInput.addEventListener('input', function () {
    Store.data.name = nameInput.value.trim();
    Store.save();
    if (current === 'report') renderReport();
  });

  var current = 'home';
  navBtns.forEach(function (b) {
    b.addEventListener('click', function () { go(b.dataset.page); });
  });

  function go(page) {
    current = page;
    window.LabAI = null;
    if (window.location.hash !== '#' + page) { try { history.replaceState(null, '', '#' + page); } catch (e) { } }
    navBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.page === page); });
    main.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (page === 'home') renderHome();
    else if (page === 'dfd') LabDFD.render(main, { go: go });
    else if (page === 'sql') LabSQL.render(main, { go: go });
    else if (page === 'bpm') LabBPM.render(main, { go: go });
    else if (page === 'report') renderReport();
    document.dispatchEvent(new CustomEvent('app:page', { detail: page }));
  }
  window.AppGo = go;
  /* 云端进度回来时，若当前在报告页就近刷新（不打断实验页的操作） */
  window.AppRefreshCurrent = function () {
    if (current === 'report') { main.innerHTML = ''; renderReport(); }
    if (current === 'home') { main.innerHTML = ''; renderHome(); }
  };

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }

  /* ---------------- 总览 ---------------- */
  function pct(lab) {
    var s = labScore(lab);
    return s.total ? Math.round(s.done / s.total * 100) : 0;
  }
  function labScore(lab) {
    var d = Store.data;
    if (lab === 'dfd') {
      var quiz = Object.keys(d.dfd.quiz).filter(function (k) { return d.dfd.quiz[k] === true; }).length;
      var draw = Object.keys(d.dfd.draw).filter(function (k) { return d.dfd.draw[k] && d.dfd.draw[k].score >= 70; }).length;
      var find = Object.keys(d.dfd.find).filter(function (k) { return d.dfd.find[k] === true; }).length;
      return { done: quiz + draw + find, total: 5 + 2 + 4 };
    }
    if (lab === 'sql') {
      var n = Object.keys(d.sql.done).filter(function (k) { return d.sql.done[k]; }).length;
      return { done: n, total: 17 };
    }
    if (lab === 'bpm') {
      var sym = Object.keys(d.bpm.sym).filter(function (k) { return d.bpm.sym[k]; }).length;
      var sort = Object.keys(d.bpm.sort).filter(function (k) { return d.bpm.sort[k]; }).length;
      var blank = Object.keys(d.bpm.blank).filter(function (k) { return d.bpm.blank[k]; }).length;
      var bdraw = d.bpm.draw && d.bpm.draw.score >= 70 ? 1 : 0;
      return { done: sym + sort + blank + bdraw, total: 5 + 2 + 4 + 1 };
    }
    return { done: 0, total: 1 };
  }
  window.labScore = labScore;

  function renderHome() {
    var s1 = labScore('dfd'), s2 = labScore('sql'), s3 = labScore('bpm');
    var total = s1.done + s2.done + s3.done, all = s1.total + s2.total + s3.total;

    var hero = el('section', 'hero');
    hero.innerHTML =
      '<h2>三个实验，把「看不懂的图」变成「画得出来的图」</h2>' +
      '<p>本平台依据第四章《数据库设计》与第五章《管理信息系统规划》的课件内容搭建：先认符号与语法，再在可运行的环境里动手，最后由智能助教按规则逐条批改。三个实验共同指向同一件事 —— 把业务说清楚，才能把数据存明白。</p>' +
      '<div class="meta"><div><b>3</b>个实验</div><div><b>40</b>个练习点</div><div><b>' + total + ' / ' + all + '</b>当前完成</div><div><b>云</b>进度可同步</div></div>';
    main.appendChild(hero);

    var grid = el('div', 'grid-3');
    grid.style.marginTop = '18px';
    [
      { id: 'dfd', n: '01', t: '制作数据流图', d: '认四类符号 → 按四步法搭出 0 层图 → 用六条规则自检 → 找出别人图里的错。', tag: '第四章 · 需求分析', c: '#eaf0ff', f: '#2f5bd0', s: s1 },
      { id: 'sql', n: '02', t: '学习 SQL 语句', d: '在真实数据上写查询：投影、条件、排序、聚合，再到 IN / ANY / ALL / EXISTS 嵌套查询，即写即验。', tag: 'SQL 查询语句 + 数据查询', c: '#e6f4f1', f: '#0f766e', s: s2 },
      { id: 'bpm', n: '03', t: '分析业务流程', d: '把口语对话抽象成业务活动清单，认五类图元、排对流程顺序、填准单据，最后画出业务流程。', tag: '第五章 · 规划', c: '#fdf3e3', f: '#b45309', s: s3 }
    ].forEach(function (x) {
      var c = el('div', 'card lab-card');
      var p = x.s.total ? Math.round(x.s.done / x.s.total * 100) : 0;
      c.innerHTML =
        '<div class="cover" style="background:' + x.c + '"><span style="font-size:30px;font-weight:800;color:' + x.f + ';letter-spacing:-1px">' + x.n + '</span></div>' +
        '<div class="badge" style="align-self:flex-start;background:' + x.c + ';color:' + x.f + '">' + x.tag + '</div>' +
        '<h3>' + x.t + '</h3><p>' + x.d + '</p>' +
        '<div class="small muted" style="margin-top:6px">完成度 ' + x.s.done + ' / ' + x.s.total + '　' + p + '%</div>' +
        '<div class="progress-line"><span style="width:' + p + '%;background:' + x.f + '"></span></div>' +
        '<div class="go btn-row" style="margin-top:6px"><button class="btn primary sm">进入实验 →</button></div>';
      c.querySelector('button').addEventListener('click', function () { go(x.id); });
      grid.appendChild(c);
    });
    main.appendChild(grid);

    var how = el('div', 'card');
    how.innerHTML =
      '<h3>怎么用这三个实验</h3>' +
      '<div class="grid-3" style="margin-top:10px">' +
      '<div><div class="badge accent">第 1 步 · 课前</div><p class="small hint" style="margin-top:8px">在侧边栏登录你的账号，进度会自动同步到云端。跟着 AI 助教的提示走：它会按三个实验的顺序提问、给提示、批改，而不是直接给答案。</p></div>' +
      '<div><div class="badge brand">第 2 步 · 课中</div><p class="small hint" style="margin-top:8px">每个实验先做「认符号 / 认语法」的小测，再进工作台。卡住时点「问助教」，它只会给你下一小步，不会替你画完。</p></div>' +
      '<div><div class="badge warn">第 3 步 · 课后</div><p class="small hint" style="margin-top:8px">打开「学习报告」，看每一项的得分与未完成项。登录后进度会自动同步到云端，换台电脑打开同一个链接就能接着做；报告页可打印或存为 PDF 交给老师。</p></div>' +
      '</div>';
    main.appendChild(how);
  }

  /* ---------------- 报告 ---------------- */
  function renderReport() {
    var s1 = labScore('dfd'), s2 = labScore('sql'), s3 = labScore('bpm');
    var total = s1.done + s2.done + s3.done, all = s1.total + s2.total + s3.total;
    var score = Math.round(total / all * 100);

    var head = el('div', 'page-head');
    head.innerHTML = '<div><div class="crumb">LEARNING REPORT</div><h2>学习报告</h2><p class="sub">' +
      (Store.data.name ? '学生：' + escapeHtml(Store.data.name) + '　·　' : '') +
      (window.CloudApp && window.CloudApp.isLoggedIn()
        ? '已登录，进度自动同步到云端'
        : '未登录，记录只保存在本机浏览器（可登录后同步）') + '</p></div>' +
      '<div class="btn-row"><button class="btn primary" id="copyRepBtn">复制学情报告给 AI 助教</button><button class="btn" id="printBtn">打印 / 存为 PDF</button><button class="btn" id="resetBtn">清空记录</button></div>';
    main.appendChild(head);
    head.querySelector('#copyRepBtn').addEventListener('click', function () {
      copyWithTip(buildLearningReport(), this);
    });
    head.querySelector('#printBtn').addEventListener('click', function () { window.print(); });
    head.querySelector('#resetBtn').addEventListener('click', function () {
      if (confirm('确定清空本机所有实验记录？此操作不可撤销（云端记录不会自动删除）。')) { Store.reset(); go('report'); }
    });

    var cloud = el('div', 'card');
    cloud.id = 'cloudPanel';
    main.appendChild(cloud);

    var over = el('div', 'card');
    over.innerHTML = '<div class="score-box"><b>' + total + '</b><span class="muted">/ ' + all + ' 个练习点　·　总完成度 ' + score + '%</span></div>' +
      '<div class="progress-line" style="margin-top:8px"><span style="width:' + score + '%"></span></div>';
    main.appendChild(over);

    var rows = [
      { t: '实验一 · 制作数据流图', s: s1, items: [['概念小测 5 题', countTrue(Store.data.dfd.quiz), 5], ['DFD 工作台 2 张图（≥70 分记为通过）', countScore(Store.data.dfd.draw), 2], ['找错练习 4 处', countTrue(Store.data.dfd.find), 4]] },
      { t: '实验二 · 学习 SQL 语句', s: s2, items: [['查询任务 17 题', countTrue(Store.data.sql.done), 17]] },
      { t: '实验三 · 分析业务流程', s: s3, items: [['图元配对 5 对', countTrue(Store.data.bpm.sym), 5], ['步骤排序 2 组', countTrue(Store.data.bpm.sort), 2], ['单据填空 4 空', countTrue(Store.data.bpm.blank), 4], ['自己画一张（≥70 分）', (Store.data.bpm.draw && Store.data.bpm.draw.score >= 70) ? 1 : 0, 1]] }
    ];
    rows.forEach(function (r) {
      var c = el('div', 'card');
      var p = Math.round(r.s.done / r.s.total * 100);
      var h = '<div class="report-row"><div><h3 style="margin:0">' + r.t + '</h3><div class="small muted">' + r.s.done + ' / ' + r.s.total + '</div></div>' +
        '<div style="width:220px"><div class="progress-line"><span style="width:' + p + '%"></span></div></div>' +
        '<div class="badge ' + (p >= 80 ? 'ok' : p >= 40 ? 'warn' : '') + '">' + p + '%</div></div>';
      r.items.forEach(function (it) {
        h += '<div class="small" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #f1f4fa">' +
          '<span class="hint">' + it[0] + '</span><span class="muted">' + it[1] + ' / ' + it[2] + '</span></div>';
      });
      c.innerHTML = h;
      main.appendChild(c);
    });

    var advice = el('div', 'card');
    var tips = [];
    if (s1.done < s1.total) tips.push('数据流图还没画完：注意「每个处理都要有进有出」「外部实体之间不能直接连线」，画完后点一次自检。');
    if (s2.done < s2.total) tips.push('SQL 任务还剩 ' + (s2.total - s2.done) + ' 题：嵌套查询建议先单独运行子查询，确认它返回什么，再套进父查询。');
    if (s3.done < s3.total) tips.push('业务流程部分未完成：先做「口语 → 业务活动清单」的抽象，再排顺序，符号就不会用错。');
    if (!tips.length) tips.push('三个实验全部完成。建议再做一遍「找错」和「改错」，把规则记牢 —— 考试就是换个场景考同样的规则。');
    advice.innerHTML = '<h3>助教建议</h3><ul class="checklist">' + tips.map(function (t) {
      return '<li class="warn"><span class="dot">!</span><span>' + t + '</span></li>';
    }).join('') + '</ul>';
    main.appendChild(advice);
  }

  function countTrue(o) { return Object.keys(o || {}).filter(function (k) { return o[k]; }).length; }
  function countScore(o) { return Object.keys(o || {}).filter(function (k) { return o[k] && o[k].score >= 70; }).length; }

  /* ---------- 学情报告导出（MIS-LEARNING-REPORT v1） ---------- */
  function pick(obj, ids, prefix) {
    var r = { p: [], w: [], n: [] };
    ids.forEach(function (id) {
      var v = (obj || {})[id], key = prefix + id;
      if (v === true) r.p.push(key);
      else if (v === false) r.w.push(key);
      else r.n.push(key);
    });
    return r;
  }
  function merge() {
    var out = { p: [], w: [], n: [] };
    for (var i = 0; i < arguments.length; i++) {
      out.p = out.p.concat(arguments[i].p);
      out.w = out.w.concat(arguments[i].w);
      out.n = out.n.concat(arguments[i].n);
    }
    return out;
  }
  function list(arr, max) {
    if (!arr.length) return '-';
    return arr.slice(0, max || 8).join(', ') + (arr.length > (max || 8) ? ' …共' + arr.length + '项' : '');
  }
  function stamp() {
    var t = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()) + ' ' + p(t.getHours()) + ':' + p(t.getMinutes());
  }
  function studentName() {
    if (Store.data.name) return Store.data.name;
    try {
      var s = window.CloudApp && window.CloudApp.state();
      var u = s && s.session && s.session.user;
      if (u) return u.nickname || u.name || u.phone || u.email || '匿名学生';
    } catch (e) { }
    return '匿名学生';
  }
  function buildLearningReport() {
    var d = Store.data;

    var quiz = { p: [], w: [], n: [] };
    for (var i = 0; i < 5; i++) {
      var v = d.dfd.quiz[i], k = 'dfd.quiz.' + i;
      if (v === true) quiz.p.push(k); else if (v === false) quiz.w.push(k); else quiz.n.push(k);
    }
    var draw = { p: [], w: [], n: [] }, scores = [];
    ['lib', 'course'].forEach(function (id) {
      var rec = (d.dfd.draw || {})[id];
      if (rec && rec.score >= 70) draw.p.push('dfd.draw.' + id);
      else if (rec && rec.checked) draw.w.push('dfd.draw.' + id);
      else draw.n.push('dfd.draw.' + id);
      scores.push(id + '=' + (rec && typeof rec.score === 'number' ? rec.score : '-'));
    });
    var dfd = merge(quiz, draw, pick(d.dfd.find, ['f1', 'f2', 'f3', 'f4'], 'dfd.find.'));

    var sqlIds = [];
    for (var j = 1; j <= 17; j++) sqlIds.push('q' + j);
    var sql = { p: [], w: [], n: [] };
    sqlIds.forEach(function (id) {
      if ((d.sql.done || {})[id]) sql.p.push('sql.' + id); else sql.n.push('sql.' + id);
    });

    var bpmBase = merge(
      pick(d.bpm.sym, ['unit', 'proc', 'doc', 'store', 'ext'], 'bpm.sym.'),
      pick(d.bpm.sort, ['borrow', 'leave'], 'bpm.sort.'),
      pick(d.bpm.blank, ['b1', 'b2', 'b3', 'b4'], 'bpm.blank.')
    );
    var bpmDraw = { p: [], w: [], n: [] };
    if (d.bpm.draw && d.bpm.draw.checked) {
      if (d.bpm.draw.score >= 70) bpmDraw.p.push('bpm.draw'); else bpmDraw.w.push('bpm.draw');
    } else bpmDraw.n.push('bpm.draw');
    var bpm = merge(bpmBase, bpmDraw);

    var totalP = dfd.p.length + sql.p.length + bpm.p.length;
    function line(label, r) {
      var s = label + ': ' + r.p.length + '/' + (r.p.length + r.w.length + r.n.length);
      if (r.w.length) s += ' | wrong: ' + list(r.w);
      if (r.n.length) s += ' | pending: ' + list(r.n);
      return s;
    }

    return [
      '[MIS-LEARNING-REPORT v1]',
      'student: ' + studentName(),
      'generated: ' + stamp(),
      line('dfd', dfd),
      'draw_scores: ' + scores.join(', '),
      line('sql', sql),
      line('bpm', bpm),
      'total: ' + totalP + '/40',
      '[/MIS-LEARNING-REPORT]'
    ].join('\n');
  }

  function copyWithTip(text, btn) {
    function done() {
      tip('已复制。粘贴给 AI 助教，它会按题号定位你的薄弱点。');
      if (btn) {
        var old = btn.textContent;
        btn.textContent = '已复制 ✓';
        setTimeout(function () { btn.textContent = old; }, 1800);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { tip('复制失败，请手动选择文本'); }
      document.body.removeChild(ta);
    }
  }
  var tipTimer = null;  function tip(text) {
    var t = document.getElementById('appToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  window.escapeHtml = escapeHtml;
  window.MISReport = buildLearningReport;

  /* ---------------- 内置 AI 助教提示词 ---------------- */
  var PROMPT = [
    '你是《管理信息系统》课程的智能体助教，服务对象是刚学完「数据库设计」与「系统规划」两章、正在做实验的本科生。',
    '你的任务不是替学生完成实验，而是用提问、提示、批改把学生推到「自己能做出来」的那一步。',
    '',
    '【教学总原则】',
    '1. 一次只推进一小步：先问学生现在想到哪一步，再给下一步的具体动作，不要一次给出完整答案。',
    '2. 先诊断再讲解：学生答错时，先判断错在「概念、符号、语法、还是业务理解」，再针对那一点讲，不要泛泛重讲。',
    '3. 用课件里的原话和口诀：数据流图「找人→找事→找账→连线」；业务流程「实体→单位→查存储→登单据→回实体」。',
    '4. 任何结论都要能落到证据：数据流必须说清「从谁出发、到谁那里、搬的是什么数据」；SQL 必须说清「子查询返回什么」。',
    '5. 学生明确要求「直接给答案」时，先给一次同类的小例子；仍坚持才给答案，并追加一道同类变式题让他复述。',
    '',
    '【三个实验的批改规则】',
    '实验一 制作数据流图',
    '- 四类符号：外部实体=方框，处理=圆（编号 1.0/2.0），数据存储=开口矩形（D1/D2），数据流=带箭头的线且必须有名字。',
    '- 六条错：①双向箭头 ②处理只有输入没输出 ③处理只有输出没输入 ④两个外部实体直接连线 ⑤父子图不平衡 ⑥数据存储只进不出/只出不进。',
    '- 命名规律：外部实体→处理 叫「××申请/请求/单」；处理→存储 叫「××记录/信息」；存储→处理 叫「××数据」；处理→外部实体 叫「××报表/结果」。',
    '- 判分只看结构与命名规则，不要求图形位置与标准答案一致；同一含义的不同叫法（如「借阅表」与「借阅记录表」）应判为正确，只在命名类型明显错位时扣分。',
    '实验二 学习 SQL 语句',
    '- 数据环境：Customers(91)、Products(77)、Orders(182)、OrderDetails(每单 2~3 行)，字段与 W3Schools TrySQL 一致。',
    '- 批改顺序：先看语法错误（表名/列名/引号），再看筛选条件，再看投影列，最后看排序与去重。',
    '- 常见错因：字符串没加单引号；COUNT 与 WHERE 混写；子查询返回多行却用 = 比较（应改 IN 或 =ANY）；EXISTS 忘了写相关条件；DISTINCT 位置写错。',
    '- 只给「你返回 X 行，应为 Y 行」这类可验证的反馈，不要直接贴正确 SQL。',
    '实验三 分析业务流程',
    '- 五类图元：业务处理单位=方框，业务处理=圆角矩形，单据/报表=折角矩形，数据存储=圆柱，外部实体=椭圆；箭头写传递的东西。',
    '- 抽象三步：谁（角色/单位）→ 做了什么（动词短语）→ 产生或传递什么单据。口语要规范化：「老师」→「图书馆管理员」，「记一笔」→「借书记录」。',
    '- 常见错：把「学生」画成方框（应为椭圆）、把「图书库」画成方框（应为圆柱）、箭头不写名字、审批环节漏掉「不通过」的回流。',
    '',
    '【回答格式】',
    '- 先一句结论（对/不对/还差什么），再 1~3 条具体理由，最后一句「下一步做什么」。',
    '- 不超过 200 字，除非学生要求展开。不要用「很好的问题」这类客套话。',
    '',
    '【边界】',
    '- 只讨论本课程的三个实验与相关知识点；学生问无关内容时，一句话带回实验。',
    '- 不编造课件里没有的数据、函数或标准；不确定时说明「课件未涉及」，并给出可验证的做法。'
  ].join('\n');
  window.TEACHER_PROMPT = PROMPT;

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res) {
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(ta); res();
    });
  }
  window.copyText = copyText;

  var hashPage = (window.location.hash || '').replace('#', '');
  var allowed = ['home', 'dfd', 'sql', 'bpm', 'report'];
  go(allowed.indexOf(hashPage) >= 0 ? hashPage : 'home');
})();
