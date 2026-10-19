/* 实验二：学习 SQL 语句（真实执行 + 结果比对判分 + 错因诊断） */
(function () {
  'use strict';

  var BASE = {
    tables: {
      Customers: window.NW_DATA.customers,
      Products: window.NW_DATA.products,
      Orders: window.NW_DATA.orders,
      OrderDetails: window.NW_DATA.orderDetails
    }
  };

  var TASKS = [
    {
      id: 'q1', g: 'A. 基础查询', tags: ['SELECT', '*'],
      title: '查询所有客户的全部信息',
      ask: '把 Customers 表的所有列、所有行都查出来。',
      ref: 'SELECT * FROM Customers',
      hints: ['列的写法：星号 * 表示"所有列"。', '公式：SELECT * FROM 表名', 'SELECT * FROM Customers']
    },
    {
      id: 'q2', g: 'A. 基础查询', tags: ['投影'],
      title: '只查客户姓名和国家',
      ask: '只要 CustomerName 和 Country 两列，不要其他列。',
      ref: 'SELECT CustomerName, Country FROM Customers',
      hints: ['把要的列名写在 SELECT 后面，逗号分隔。', '列名必须与表中字段完全一致。', 'SELECT CustomerName, Country FROM Customers']
    },
    {
      id: 'q3', g: 'A. 基础查询', tags: ['DISTINCT'],
      title: '查询所有不重复的国家',
      ask: 'Customers 里客户来自哪些国家？每个国家只出现一次。',
      ref: 'SELECT DISTINCT Country FROM Customers',
      hints: ['去重关键字放在 SELECT 后面、列名前面。', '公式：SELECT DISTINCT 列名 FROM 表名', 'SELECT DISTINCT Country FROM Customers']
    },
    {
      id: 'q4', g: 'A. 基础查询', tags: ['BETWEEN'],
      title: '查 CustomerID 在 10~15 之间的客户',
      ask: '返回这些客户的全部信息（含边界 10 和 15）。',
      ref: 'SELECT * FROM Customers WHERE CustomerID BETWEEN 10 AND 15',
      hints: ['区间用 BETWEEN … AND …，包含两个端点。', '数字不要加引号。', 'SELECT * FROM Customers WHERE CustomerID BETWEEN 10 AND 15']
    },
    {
      id: 'q5', g: 'B. 条件筛选', tags: ['WHERE', '字符串'],
      title: '查询国家为 Germany 的客户',
      ask: '返回全部信息。注意 Germany 是字符串。',
      ref: "SELECT * FROM Customers WHERE Country = 'Germany'",
      hints: ['字符串值必须加单引号，否则会被当成列名。', "公式：WHERE 列名 = '值'", "SELECT * FROM Customers WHERE Country = 'Germany'"]
    },
    {
      id: 'q6', g: 'B. 条件筛选', tags: ['LIKE'],
      title: '查询姓名以 A 开头的客户',
      ask: '用模糊匹配，返回全部信息。',
      ref: "SELECT * FROM Customers WHERE CustomerName LIKE 'A%'",
      hints: ['% 代表"任意多个字符"。', "以 A 开头写作 'A%'；包含 A 写作 '%A%'。", "SELECT * FROM Customers WHERE CustomerName LIKE 'A%'"]
    },
    {
      id: 'q7', g: 'B. 条件筛选', tags: ['BETWEEN', '投影'],
      title: '查 ID 50~55 的客户姓名和国家',
      ask: '只返回 CustomerName 和 Country 两列。',
      ref: 'SELECT CustomerName, Country FROM Customers WHERE CustomerID BETWEEN 50 AND 55',
      hints: ['先写要的列，再写条件。', '条件用 BETWEEN 50 AND 55。', 'SELECT CustomerName, Country FROM Customers WHERE CustomerID BETWEEN 50 AND 55']
    },
    {
      id: 'q8', g: 'C. 排序与聚合', tags: ['ORDER BY'],
      title: '按 CustomerID 降序排列所有客户',
      ask: '从大到小排，返回全部信息。',
      ref: 'SELECT * FROM Customers ORDER BY CustomerID DESC',
      hints: ['升序 ASC（可省略），降序必须写 DESC。', 'ORDER BY 放在 WHERE 之后。', 'SELECT * FROM Customers ORDER BY CustomerID DESC']
    },
    {
      id: 'q9', g: 'C. 排序与聚合', tags: ['COUNT'],
      title: '统计客户总数',
      ask: '用聚合函数统计行数，结果列命名为 Total。',
      ref: 'SELECT COUNT(*) AS Total FROM Customers',
      hints: ['COUNT(*) 统计行数。', 'AS 后面是给结果列起的名字。', 'SELECT COUNT(*) AS Total FROM Customers']
    },
    {
      id: 'q10', g: 'C. 排序与聚合', tags: ['MAX', 'MIN'],
      title: '求产品的最高价和最低价',
      ask: '一行两列：最高价、最低价，用 AS 起中文别名。',
      ref: 'SELECT MAX(Price) AS 最高价, MIN(Price) AS 最低价 FROM Products',
      hints: ['两个聚合函数可以写在同一行，逗号分隔。', 'MAX(列名)、MIN(列名)。', 'SELECT MAX(Price) AS 最高价, MIN(Price) AS 最低价 FROM Products']
    },
    {
      id: 'q11', g: 'D. 嵌套查询', tags: ['比较运算符', '子查询'],
      title: '查单价低于 Aniseed Syrup 的所有产品',
      ask: '返回 ProductName 和 Price。子查询先查出参照产品的单价。',
      ref: "SELECT ProductName, Price FROM Products WHERE Price < (SELECT Price FROM Products WHERE ProductName = 'Aniseed Syrup')",
      hints: ['先单独运行子查询：SELECT Price FROM Products WHERE ProductName = \'Aniseed Syrup\'', '确认子查询只返回一个值，才能用 < 比较。', '把它整体放进括号里当比较对象。']
    },
    {
      id: 'q12', g: 'D. 嵌套查询', tags: ['IN', '子查询'],
      title: '查 OrderID 10248 里有哪些产品',
      ask: '返回产品名称和单价。用 IN + 子查询，不要手写产品 ID。',
      ref: 'SELECT ProductName, Price FROM Products WHERE ProductID IN (SELECT ProductID FROM OrderDetails WHERE OrderID = 10248)',
      hints: ['先在 OrderDetails 里查这张订单的 ProductID 列表。', '子查询返回多个值，必须用 IN，不能用 =。', '外层：WHERE ProductID IN (子查询)']
    },
    {
      id: 'q13', g: 'D. 嵌套查询', tags: ['ALL'],
      title: '查单价高于类别 3 全部产品的产品',
      ask: '“高于所有”用 > ALL。返回 ProductName 和 Price。',
      ref: 'SELECT ProductName, Price FROM Products WHERE Price > ALL (SELECT Price FROM Products WHERE CategoryID = 3)',
      hints: ['“高于所有”= 大于最大值，也可以用 > (SELECT MAX(...))。', '语法：比较符 ALL (子查询)', 'SELECT ProductName, Price FROM Products WHERE Price > ALL (SELECT Price FROM Products WHERE CategoryID = 3)']
    },
    {
      id: 'q14', g: 'D. 嵌套查询', tags: ['EXISTS', '相关子查询'],
      title: '查存在订购数量 20 的产品',
      ask: '返回 ProductName。用 EXISTS 相关子查询，两张表都要起别名。',
      ref: 'SELECT p.ProductName FROM Products p WHERE EXISTS (SELECT * FROM OrderDetails od WHERE od.ProductID = p.ProductID AND od.Quantity = 20)',
      hints: ['EXISTS 只看子查询有没有结果，不关心返回什么列（习惯写 *）。', '子查询要引用外层的 p.ProductID，这就是相关子查询。', 'SELECT p.ProductName FROM Products p WHERE EXISTS (SELECT * FROM OrderDetails od WHERE od.ProductID = p.ProductID AND od.Quantity = 20)']
    },
    {
      id: 'q15', g: 'E. 增删改', tags: ['INSERT'], dml: true,
      title: '新增一个客户（CustomerID = 92）',
      ask: 'CustomerName=Test Shop，ContactName=Test Person，Address=Test Road 123，City=Test City，PostalCode=12345，Country=Test Country。',
      ref: "INSERT INTO Customers(CustomerID, CustomerName, ContactName, Address, City, PostalCode, Country) VALUES(92, 'Test Shop', 'Test Person', 'Test Road 123', 'Test City', '12345', 'Test Country')",
      verify: 'SELECT COUNT(*) FROM Customers WHERE CustomerID = 92', expect: 1,
      hints: ['公式：INSERT INTO 表名(列…) VALUES(值…)，两边个数要一致。', '数字不加引号，字符串加单引号。', '列的顺序与值的顺序必须一一对应。']
    },
    {
      id: 'q16', g: 'E. 增删改', tags: ['UPDATE'], dml: true,
      title: '把 92 号客户改到 USA / Los Angeles',
      ask: '同时修改 Country 和 City 两列。',
      ref: "UPDATE Customers SET Country='USA', City='Los Angeles' WHERE CustomerID=92",
      verify: "SELECT Country, City FROM Customers WHERE CustomerID = 92", expect: ['USA', 'Los Angeles'],
      hints: ['公式：UPDATE 表名 SET 列=值, 列=值 WHERE 条件', '必须加 WHERE，否则整张表都会被改。', '多个赋值之间用逗号分隔。']
    },
    {
      id: 'q17', g: 'E. 增删改', tags: ['DELETE'], dml: true,
      title: '删除 92 号客户',
      ask: '只删这一行，不要删全表。',
      ref: 'DELETE FROM Customers WHERE CustomerID = 92',
      verify: 'SELECT COUNT(*) FROM Customers WHERE CustomerID = 92', expect: 0,
      hints: ['公式：DELETE FROM 表名 WHERE 条件', '没有 WHERE 就是清空全表 —— 这是最危险的一句。', 'DELETE 只删行，不删表结构。']
    }
  ];

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function fmt(v) { return v === null || v === undefined ? '<span class="muted">NULL</span>' : esc(v); }

  function runOn(sql, db) { return MiniSQL.run(sql, db); }

  function cell(v) {
    if (v === null || v === undefined) return '∅';
    if (typeof v === 'number') return String(Math.round(v * 10000) / 10000);
    return String(v).trim();
  }
  function rowSigs(rows) { return rows.map(function (r) { return r.map(cell).join('\u0001'); }); }

  function compare(student, reference, ordered) {
    var a = rowSigs(student.rows), b = rowSigs(reference.rows);
    if (student.columns.length !== reference.columns.length) {
      return { ok: false, why: 'columns', cols: [student.columns.length, reference.columns.length] };
    }
    if (a.length !== b.length) return { ok: false, why: 'rows', got: a.length, want: b.length };
    var A = a.slice(), B = b.slice();
    if (!ordered) { A.sort(); B.sort(); }
    for (var i = 0; i < A.length; i++) if (A[i] !== B[i]) return { ok: false, why: ordered ? 'order' : 'values' };
    return { ok: true };
  }

  window.LabSQL = {
    render: function (root) {
      var head = el('div', 'page-head');
      head.innerHTML = '<div><div class="crumb">实验二 · 依据《SQL 查询语句》《SQL 数据查询》</div><h2>学习 SQL 语句</h2>' +
        '<p class="sub">目标：能独立写出从投影、条件、排序、聚合到嵌套查询的语句，并看得懂报错 —— 数据与 W3Schools TrySQL 的四张表一致</p></div>' +
        '<div class="badge accent">建议 120 分钟</div>';
      root.appendChild(head);

      var session = MiniSQL.cloneDB(BASE);
      var cur = TASKS[0].id;
      var codeMap = {};
      var hintStep = {};

      var wrap = el('div', 'sql-wrap');
      var left = el('div');
      var right = el('div');
      wrap.appendChild(left); wrap.appendChild(right);
      root.appendChild(wrap);

      /* ---- 左：任务清单 ---- */
      var listCard = el('div', 'card');
      listCard.style.padding = '16px';
      listCard.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">实验任务</h3><span class="badge" id="sqlProg">0 / ' + TASKS.length + '</span></div>' +
        '<div class="small muted" style="margin:4px 0 10px">按 A → E 顺序做，前面的题是后面的台阶</div>' +
        '<div id="taskList"></div>' +
        '<div class="btn-row" style="margin-top:10px"><button class="btn sm" id="resetData">重置数据</button><button class="btn sm ghost" id="clearProg">清空进度</button></div>';
      left.appendChild(listCard);
      var listBox = listCard.querySelector('#taskList');

      var schemaCard = el('div', 'card');
      schemaCard.style.padding = '16px';
      schemaCard.innerHTML = '<h3>表结构速查</h3><div class="schema" style="margin-top:8px">' +
        window.NW_TABLE_META.map(function (t) {
          return '<details><summary><span>' + t.table + ' <span class="muted" style="font-weight:400">' + t.cn + '</span></span><span class="muted" style="font-weight:400">' + t.desc + '</span></summary><div class="cols">' +
            t.cols.map(function (c) { return '<div>' + c + '</div>'; }).join('') + '</div></details>';
        }).join('') +
        '</div><div class="ref-block small" style="margin-top:10px"><b>书写公式</b><br />SELECT 列 FROM 表 WHERE 条件 ORDER BY 列 DESC<br />聚合：COUNT(*) / MAX(列) / MIN(列) / AVG(列)<br />嵌套：WHERE 列 IN (SELECT …)</div>';
      left.appendChild(schemaCard);

      function renderList() {
        var html = '', lastG = '';
        TASKS.forEach(function (t, i) {
          if (t.g !== lastG) { html += '<div class="nav-label" style="padding:8px 0 4px">' + t.g + '</div>'; lastG = t.g; }
          var done = !!Store.data.sql.done[t.id];
          html += '<div class="task-item' + (t.id === cur ? ' on' : '') + (done ? ' done' : '') + '" data-id="' + t.id + '">' +
            '<div class="tt"><span class="tn">' + (done ? '✓' : (i + 1)) + '</span><span>' + esc(t.title) + '</span></div>' +
            '<div class="tags">' + t.tags.map(function (g) { return '<span class="badge" style="font-size:10.5px;padding:0 6px">' + esc(g) + '</span>'; }).join('') + '</div></div>';
        });
        listBox.innerHTML = html;
        listBox.querySelectorAll('.task-item').forEach(function (d) {
          d.addEventListener('click', function () { switchTo(d.dataset.id); });
        });
        var n = Object.keys(Store.data.sql.done).filter(function (k) { return Store.data.sql.done[k]; }).length;
        listCard.querySelector('#sqlProg').textContent = n + ' / ' + TASKS.length;
      }

      /* ---- 右：做题区 ---- */
      var work = el('div', 'card');
      right.appendChild(work);

      function switchTo(id) {
        cur = id;
        renderList();
        var t = TASKS.filter(function (x) { return x.id === id; })[0];
        work.innerHTML =
          '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">' +
          '<div><div class="badge ' + (t.dml ? 'warn' : 'brand') + '">' + t.g + '</div><h3 style="margin:6px 0 2px">' + esc(t.title) + '</h3>' +
          '<p class="small hint" style="margin:0">' + esc(t.ask) + '</p></div>' +
          '<div class="badge ' + (Store.data.sql.done[t.id] ? 'ok' : '') + '" id="taskState">' + (Store.data.sql.done[t.id] ? '已通过' : '未完成') + '</div></div>' +
          '<div class="editor-shell" style="margin-top:12px">' +
          '<div class="editor-bar"><span class="ttl">SQL 编辑器</span><span class="small muted">Ctrl + Enter 运行</span>' +
          '<span style="margin-left:auto"></span><button class="btn sm" id="hintBtn">问助教</button><button class="btn sm" id="aiBtn">截图问助教</button><button class="btn sm" id="refBtn">看答案</button></div>' +
          '<textarea class="sql" id="editor" spellcheck="false" placeholder="在这里写 SQL…"></textarea></div>' +
          '<div class="btn-row" style="margin-top:10px"><button class="btn primary" id="runBtn">运行</button><button class="btn" id="judgeBtn">提交判分</button>' +
          '<span class="small muted" id="runInfo"></span></div>' +
          '<div id="msgBox"></div><div id="resultBox"></div><div id="refBox"></div>';

        var ed = work.querySelector('#editor');
        ed.value = codeMap[t.id] || '';
        ed.addEventListener('input', function () { codeMap[t.id] = ed.value; });
        ed.addEventListener('keydown', function (e) {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doRun(); }
        });
        work.querySelector('#runBtn').addEventListener('click', doRun);
        work.querySelector('#judgeBtn').addEventListener('click', doJudge);
        work.querySelector('#hintBtn').addEventListener('click', function () {
          var s = hintStep[t.id] || 0;
          var h = t.hints[Math.min(s, t.hints.length - 1)];
          hintStep[t.id] = s + 1;
          showMsg('info', '助教提示 ' + Math.min(s + 1, t.hints.length) + ' / ' + t.hints.length, h, true);
        });
        work.querySelector('#refBtn').addEventListener('click', function () {
          var box = work.querySelector('#refBox');
          box.innerHTML = '<div class="msg info"><b>参考答案（先自己试，再对照）</b><code style="display:block;margin-top:4px;white-space:pre-wrap">' + esc(t.ref) + '</code></div>';
        });

        /* AI 助教：带上当前题目、学生写的语句与平台反馈 */
        function aiCtx() {
          var msg = work.querySelector('#msgBox');
          var n = Object.keys(Store.data.sql.done).filter(function (k) { return Store.data.sql.done[k]; }).length;
          return {
            lab: '实验二 · 学习 SQL 语句',
            task: t.title + '｜' + t.ask,
            code: (ed.value || '').trim() || '（还没写）',
            feedback: msg ? String(msg.textContent || '').replace(/\s+/g, ' ').slice(0, 500) : '',
            state: Store.data.sql.done[t.id] ? '本题已通过' : '本题还没通过',
            progress: n + ' / ' + TASKS.length,
            name: Store.data.name || ''
          };
        }
        window.LabAI = aiCtx;
        work.querySelector('#aiBtn').addEventListener('click', function () {
          if (window.CloudApp) window.CloudApp.openAsk(aiCtx());
        });
        function doRun() { run(false); }
        function doJudge() { run(true); }

        function run(isJudge) {
          var sql = ed.value;
          var box = work.querySelector('#resultBox');
          var msg = work.querySelector('#msgBox');
          msg.innerHTML = ''; box.innerHTML = '';
          if (!sql.trim()) { showMsg('bad', '还没有写语句', '在编辑器里写一条 SQL，再按运行。'); return; }

          var isDml = /^\s*(insert|update|delete)/i.test(sql);
          var target = isDml ? session : MiniSQL.cloneDB(BASE);
          var r = runOn(sql, target);
          work.querySelector('#runInfo').textContent = '';

          if (!r.ok) {
            showMsg('bad', '语句报错了', diagnose(r.error, sql));
            return;
          }
          if (r.kind === 'dml') {
            box.innerHTML = '<div class="msg ok"><b>' + esc(r.message) + '</b>受影响行数：' + r.affected + '</div>';
            if (r.rows && r.rows.length) box.innerHTML += renderTable(r.columns, r.rows);
          } else {
            box.innerHTML = '<div class="result-shell"><div class="result-head"><span>查询结果</span><span>' + r.rows.length + ' 行 × ' + r.columns.length + ' 列</span></div>' +
              (r.rows.length ? '<div class="table-scroll">' + tableHtml(r.columns, r.rows) + '</div>' : '<div class="empty">0 行 —— 条件可能太严，或者表里确实没有符合的数据</div>') + '</div>';
          }

          if (!isJudge) return;
          judge(t, sql, r, isDml);
        }

        function judge(t, sql, r, isDml) {
          if (t.dml) {
            if (!isDml) { showMsg('bad', '这道题要修改数据', '请用 INSERT / UPDATE / DELETE 语句，而不是 SELECT。'); return; }
            var v = runOn(t.verify, session);
            if (!v.ok) { showMsg('bad', '校验失败', diagnose(v.error, t.verify)); return; }
            var got = v.rows.length ? v.rows[0][0] : null;
            var okv = Array.isArray(t.expect) ? (v.rows[0] || []).every(function (x, i) { return cell(x) === cell(t.expect[i]); }) : cell(got) === cell(t.expect);
            if (okv) pass(t);
            else showMsg('bad', '数据状态还不对', '系统复核：<code>' + esc(t.verify) + '</code> 的结果是 <code>' + esc(JSON.stringify(v.rows[0] || [])) + '</code>，与预期不符。检查是否漏了 WHERE、值写错，或重复执行了上一步。');
            return;
          }
          if (isDml) { showMsg('bad', '这道题是查询题', '查询题不要改数据；如果刚改过，请点左侧「重置数据」。'); return; }
          var ref = runOn(t.ref, MiniSQL.cloneDB(BASE));
          var ordered = /order\s+by/i.test(t.ref);
          var cmp = compare(r, ref, ordered);
          if (cmp.ok) pass(t);
          else if (cmp.why === 'columns') showMsg('info', '行数对了，列不对', '你返回 ' + cmp.cols[0] + ' 列，题目要求 ' + cmp.cols[1] + ' 列。检查 SELECT 后面写了哪些列，以及是否多写了 <code>*</code>。');
          else if (cmp.why === 'rows') showMsg('bad', '行数不对：你 ' + cmp.got + ' 行，应为 ' + cmp.want + ' 行', rowHint(t, cmp));
          else if (cmp.why === 'order') showMsg('bad', '数据对了，但顺序不对', '题目要求排序结果。检查 ORDER BY 的列和 ASC / DESC。');
          else showMsg('bad', '行数列数都对，但内容不同', '条件范围可能偏了：再读一遍题目里的限定词（如"低于/高于""所有/任意""包含/开头"）。');
        }

        function pass(t) {
          Store.data.sql.done[t.id] = true;
          Store.save();
          renderList();
          var st = work.querySelector('#taskState');
          if (st) { st.textContent = '已通过'; st.className = 'badge ok'; }
          var next = TASKS[TASKS.indexOf(t) + 1];
          showMsg('ok', '通过 ✓', '这条语句的结果与标准答案一致。' + (next ? '下一题：' + esc(next.title) + '（在左侧点它继续）。' : '全部任务完成，去「学习报告」看看。'));
        }

        function rowHint(t, cmp) {
          if (/between/i.test(t.ref)) return '检查 BETWEEN 的两个端点是否包含边界 —— BETWEEN 是包含端点的。';
          if (/like/i.test(t.ref)) return '检查 % 的位置：以 A 开头是 <code>A%</code>，以 A 结尾是 <code>%A</code>，包含是 <code>%A%</code>。';
          if (/count/i.test(t.ref)) return '聚合查询应该只返回 1 行。如果你返回很多行，说明没写聚合函数。';
          if (/exists/i.test(t.ref)) return 'EXISTS 只判断"有没有"，注意子查询里的关联条件 <code>od.ProductID = p.ProductID</code> 不能少，否则变成全表判断。';
          if (/in\s*\(/i.test(t.ref)) return '子查询的筛选条件可能不对：先单独运行子查询，看它返回的是不是你想要的那一小组 ID。';
          return '条件范围可能偏了：先不加 WHERE 看全表有多少行，再逐步收紧条件。';
        }

        function showMsg(kind, title, body, isHint) {
          work.querySelector('#msgBox').innerHTML = '<div class="msg ' + kind + '"><b>' + esc(title) + '</b><div>' + body + '</div></div>' +
            (isHint ? '' : '');
        }
      }

      function renderTable(cols, rows) { return '<div class="table-scroll">' + tableHtml(cols, rows) + '</div>'; }
      function tableHtml(cols, rows) {
        return '<table class="data"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr>' + r.map(function (v) { return '<td class="' + (typeof v === 'number' ? 'num' : '') + '">' + fmt(v) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>';
      }

      function diagnose(err, sql) {
        var e = String(err);
        var out = '<code>' + esc(e) + '</code>';
        if (/找不到表/.test(e)) out += '<div style="margin-top:5px">表名拼写错误。本实验只有四张表：<code>Customers</code>、<code>Products</code>、<code>Orders</code>、<code>OrderDetails</code>（单复数很容易写错）。</div>';
        else if (/找不到列/.test(e)) {
          out += '<div style="margin-top:5px">列名拼写错误，或者两张表都用到时没写别名。对照左侧「表结构速查」的字段名。</div>';
          if (/'/.test(sql) === false && /=\s*[A-Za-z]/.test(sql)) out += '<div style="margin-top:4px">提示：字符串值要加单引号，如 <code>Country = \'Germany\'</code>。</div>';
        }
        else if (/单引号/.test(e)) out += '<div style="margin-top:5px">字符串两边都要有单引号，且必须是英文半角引号。</div>';
        else if (/应该是 FROM|缺少 FROM/.test(e)) out += '<div style="margin-top:5px">SELECT 之后必须跟 FROM 表名。</div>';
        else if (/子查询返回了多行/.test(e)) out += '<div style="margin-top:5px">子查询返回多个值，不能直接用 <code>=</code> 比较。改用 <code>IN</code>、<code>=ANY</code>，或者在子查询里加聚合函数。</div>';
        else if (/聚合函数/.test(e)) out += '<div style="margin-top:5px">聚合函数不能写在 WHERE 里。要么去掉 WHERE 里的聚合，要么用子查询把聚合结果算出来再比较。</div>';
        else if (/多表连接/.test(e)) out += '<div style="margin-top:5px">本实验不用 JOIN，两张表的关系用嵌套查询表达。</div>';
        else if (/语句不完整|无法解析|语法错误/.test(e)) out += '<div style="margin-top:5px">检查关键字顺序：<code>SELECT … FROM … WHERE … ORDER BY …</code>，以及括号、逗号是否配对。</div>';
        return out;
      }

      listCard.querySelector('#resetData').addEventListener('click', function () {
        session = MiniSQL.cloneDB(BASE);
        showGlobal('ok', '数据已重置', 'Customers 恢复为 91 行，你做的增删改都已撤销。');
      });
      listCard.querySelector('#clearProg').addEventListener('click', function () {
        if (!confirm('清空 SQL 实验的通过记录？')) return;
        Store.data.sql.done = {};
        Store.save(); renderList(); switchTo(cur);
      });

      var globalMsg = el('div');
      right.appendChild(globalMsg);
      function showGlobal(kind, t, b) {
        globalMsg.innerHTML = '<div class="msg ' + kind + '" style="margin-top:12px"><b>' + t + '</b>' + b + '</div>';
        setTimeout(function () { globalMsg.innerHTML = ''; }, 4000);
      }

      /* ---- 数据浏览 ---- */
      var browse = el('div', 'card');
      browse.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
        '<h3 style="margin:0">数据浏览</h3><div class="btn-row" id="tableTabs"></div></div>' +
        '<div class="small muted" style="margin:6px 0 8px">只显示前 12 行。写 SQL 之前先看一眼真实数据，比背语法有用。</div>' +
        '<div id="tableView"></div>';
      right.appendChild(browse);
      var tabsBox = browse.querySelector('#tableTabs');
      window.NW_TABLE_META.forEach(function (t, i) {
        var b = el('button', 'btn sm' + (i === 0 ? ' primary' : ''), t.table);
        b.addEventListener('click', function () {
          tabsBox.querySelectorAll('button').forEach(function (x) { x.classList.remove('primary'); });
          b.classList.add('primary');
          showTable(t.table);
        });
        tabsBox.appendChild(b);
      });
      function showTable(name) {
        var r = MiniSQL.run('SELECT * FROM ' + name, MiniSQL.cloneDB(BASE));
        var view = browse.querySelector('#tableView');
        if (!r.ok) { view.innerHTML = '<div class="empty">' + esc(r.error) + '</div>'; return; }
        view.innerHTML = '<div class="result-shell"><div class="result-head"><span>' + name + '</span><span>共 ' + r.rows.length + ' 行，显示前 12 行</span></div>' +
          '<div class="table-scroll">' + tableHtml(r.columns, r.rows.slice(0, 12)) + '</div></div>';
      }
      showTable('Customers');

      renderList();
      switchTo(TASKS[0].id);
    }
  };
})();
