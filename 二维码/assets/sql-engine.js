/* 迷你 SQL 引擎（教学用）：支持
 * SELECT [DISTINCT] 列/表达式/聚合 [AS 别名] FROM 表 [别名]
 *   [WHERE 条件] [ORDER BY 列 [ASC|DESC]] [LIMIT n]
 * 条件：AND OR NOT、= <> != > >= < <=、BETWEEN…AND、IN(列表|子查询)、LIKE、
 *       IS [NOT] NULL、EXISTS(子查询)、比较符 ANY/ALL (子查询)、标量子查询
 * 数据修改：INSERT / UPDATE / DELETE
 * 说明：面向课堂练习，不追求完整 SQL 标准。表名/列名大小写不敏感。
 */
(function () {
  'use strict';

  var KEYWORDS = ['SELECT', 'DISTINCT', 'FROM', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT',
    'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'EXISTS', 'ANY', 'ALL', 'SOME',
    'AS', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'GROUP', 'HAVING', 'JOIN', 'ON'];

  function tokenize(sql) {
    var out = [], i = 0;
    while (i < sql.length) {
      var c = sql[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '-' && sql[i + 1] === '-') { while (i < sql.length && sql[i] !== '\n') i++; continue; }
      if (c === "'" ) {
        var j = i + 1, v = '';
        while (j < sql.length) {
          if (sql[j] === "'" && sql[j + 1] === "'") { v += "'"; j += 2; continue; }
          if (sql[j] === "'") break;
          v += sql[j++];
        }
        if (j >= sql.length) throw new Error('字符串缺少右侧单引号');
        out.push({ t: 'str', v: v }); i = j + 1; continue;
      }
      if (c === '"' || c === '`' || c === '[') {
        var close = c === '[' ? ']' : c;
        var k = sql.indexOf(close, i + 1);
        if (k < 0) throw new Error('标识符缺少右侧引号');
        out.push({ t: 'id', v: sql.slice(i + 1, k) }); i = k + 1; continue;
      }
      if (/[0-9]/.test(c)) {
        var m = i;
        while (m < sql.length && /[0-9.]/.test(sql[m])) m++;
        out.push({ t: 'num', v: parseFloat(sql.slice(i, m)) }); i = m; continue;
      }
      if (/[A-Za-z_\u4e00-\u9fa5]/.test(c)) {
        var n = i;
        while (n < sql.length && /[A-Za-z0-9_\u4e00-\u9fa5]/.test(sql[n])) n++;
        out.push({ t: 'id', v: sql.slice(i, n) }); i = n; continue;
      }
      var two = sql.substr(i, 2);
      if (two === '>=' || two === '<=' || two === '<>' || two === '!=') { out.push({ t: 'op', v: two }); i += 2; continue; }
      if ('=<>(),.*;+-'.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; }
      throw new Error('无法识别的字符："' + c + '"');
    }
    return out;
  }

  function Parser(tokens) { this.ts = tokens; this.p = 0; }
  Parser.prototype.peek = function (o) { return this.ts[this.p + (o || 0)]; };
  Parser.prototype.eof = function () { return this.p >= this.ts.length; };
  Parser.prototype.next = function () { return this.ts[this.p++]; };
  Parser.prototype.isKw = function (w, o) {
    var t = this.peek(o);
    return t && t.t === 'id' && t.v.toUpperCase() === w;
  };
  Parser.prototype.isOp = function (w, o) {
    var t = this.peek(o);
    return t && t.t === 'op' && t.v === w;
  };
  Parser.prototype.takeKw = function (w) {
    if (this.isKw(w)) { this.p++; return true; }
    return false;
  };
  Parser.prototype.expectKw = function (w) {
    if (!this.takeKw(w)) throw new Error('语法错误：这里应该是 ' + w);
  };
  Parser.prototype.takeOp = function (w) {
    if (this.isOp(w)) { this.p++; return true; }
    return false;
  };
  Parser.prototype.expectOp = function (w) {
    if (!this.takeOp(w)) throw new Error('语法错误：缺少 ' + w);
  };
  Parser.prototype.ident = function () {
    var t = this.next();
    if (!t || t.t !== 'id') throw new Error('语法错误：这里应该是一个名字');
    return t.v;
  };

  Parser.prototype.parseStatement = function () {
    if (this.isKw('SELECT')) return this.parseSelect();
    if (this.isKw('INSERT')) return this.parseInsert();
    if (this.isKw('UPDATE')) return this.parseUpdate();
    if (this.isKw('DELETE')) return this.parseDelete();
    throw new Error('语句必须以 SELECT / INSERT / UPDATE / DELETE 开头');
  };

  Parser.prototype.parseSelect = function () {
    this.expectKw('SELECT');
    var q = { type: 'select', distinct: this.takeKw('DISTINCT'), items: [], from: null, where: null, orderBy: [], limit: null };
    if (this.isKw('TOP')) throw new Error('本平台不支持 TOP，请用 LIMIT');
    do { q.items.push(this.parseSelectItem()); } while (this.takeOp(','));
    this.expectKw('FROM');
    var tname = this.ident();
    var alias = tname;
    if (this.takeKw('AS')) alias = this.ident();
    else if (this.peek() && this.peek().t === 'id' && KEYWORDS.indexOf(this.peek().v.toUpperCase()) < 0) alias = this.next().v;
    q.from = { table: tname, alias: alias };
    if (this.isKw('JOIN') || this.isOp(',')) throw new Error('本实验不涉及多表连接，请用嵌套查询');
    if (this.takeKw('WHERE')) q.where = this.parseExpr();
    if (this.isKw('GROUP')) throw new Error('本实验暂不支持 GROUP BY，请用子查询或单个聚合函数');
    if (this.takeKw('ORDER')) {
      this.expectKw('BY');
      do {
        var e = this.parseOperand();
        var dir = 'ASC';
        if (this.takeKw('DESC')) dir = 'DESC'; else this.takeKw('ASC');
        q.orderBy.push({ expr: e, dir: dir });
      } while (this.takeOp(','));
    }
    if (this.takeKw('LIMIT')) {
      var n = this.next();
      if (!n || n.t !== 'num') throw new Error('LIMIT 后面应该是数字');
      q.limit = n.v;
    }
    return q;
  };

  Parser.prototype.parseSelectItem = function () {
    if (this.isOp('*')) { this.p++; return { kind: 'star' }; }
    var e = this.parseExpr();
    var alias = null;
    if (this.takeKw('AS')) alias = this.ident();
    else if (this.peek() && this.peek().t === 'id' && KEYWORDS.indexOf(this.peek().v.toUpperCase()) < 0) alias = this.next().v;
    return { kind: 'expr', expr: e, alias: alias };
  };

  Parser.prototype.parseInsert = function () {
    this.expectKw('INSERT'); this.expectKw('INTO');
    var table = this.ident();
    var cols = null;
    if (this.takeOp('(')) {
      cols = [];
      do { cols.push(this.ident()); } while (this.takeOp(','));
      this.expectOp(')');
    }
    this.expectKw('VALUES');
    this.expectOp('(');
    var vals = [];
    do { vals.push(this.parseExpr()); } while (this.takeOp(','));
    this.expectOp(')');
    return { type: 'insert', table: table, cols: cols, values: vals };
  };

  Parser.prototype.parseUpdate = function () {
    this.expectKw('UPDATE');
    var table = this.ident();
    this.expectKw('SET');
    var sets = [];
    do {
      var col = this.ident();
      this.expectOp('=');
      sets.push({ col: col, expr: this.parseExpr() });
    } while (this.takeOp(','));
    var where = null;
    if (this.takeKw('WHERE')) where = this.parseExpr();
    return { type: 'update', table: table, sets: sets, where: where };
  };

  Parser.prototype.parseDelete = function () {
    this.expectKw('DELETE'); this.expectKw('FROM');
    var table = this.ident();
    var where = null;
    if (this.takeKw('WHERE')) where = this.parseExpr();
    return { type: 'delete', table: table, where: where };
  };

  Parser.prototype.parseExpr = function () { return this.parseOr(); };
  Parser.prototype.parseOr = function () {
    var l = this.parseAnd();
    while (this.takeKw('OR')) l = { k: 'or', l: l, r: this.parseAnd() };
    return l;
  };
  Parser.prototype.parseAnd = function () {
    var l = this.parseNot();
    while (this.takeKw('AND')) l = { k: 'and', l: l, r: this.parseNot() };
    return l;
  };
  Parser.prototype.parseNot = function () {
    if (this.takeKw('NOT')) return { k: 'not', e: this.parseNot() };
    return this.parsePredicate();
  };

  Parser.prototype.parsePredicate = function () {
    if (this.isKw('EXISTS')) {
      this.p++;
      this.expectOp('(');
      var sq = this.parseSelect();
      this.expectOp(')');
      return { k: 'exists', q: sq };
    }
    var left = this.parseOperand();
    var neg = false;
    if (this.isKw('NOT') && (this.isKw('IN', 1) || this.isKw('LIKE', 1) || this.isKw('BETWEEN', 1))) { this.p++; neg = true; }
    if (this.takeKw('BETWEEN')) {
      var lo = this.parseOperand();
      this.expectKw('AND');
      var hi = this.parseOperand();
      return { k: 'between', e: left, lo: lo, hi: hi, neg: neg };
    }
    if (this.takeKw('IN')) {
      this.expectOp('(');
      if (this.isKw('SELECT')) {
        var q2 = this.parseSelect();
        this.expectOp(')');
        return { k: 'in', e: left, q: q2, neg: neg };
      }
      var list = [];
      if (!this.isOp(')')) { do { list.push(this.parseExpr()); } while (this.takeOp(',')); }
      this.expectOp(')');
      return { k: 'inlist', e: left, list: list, neg: neg };
    }
    if (this.takeKw('LIKE')) {
      return { k: 'like', e: left, pat: this.parseOperand(), neg: neg };
    }
    if (this.takeKw('IS')) {
      var notNull = this.takeKw('NOT');
      this.expectKw('NULL');
      return { k: 'isnull', e: left, neg: notNull };
    }
    var t = this.peek();
    if (t && t.t === 'op' && ['=', '<>', '!=', '>', '>=', '<', '<='].indexOf(t.v) >= 0) {
      this.p++;
      if (this.isKw('ANY') || this.isKw('SOME') || this.isKw('ALL')) {
        var quant = this.next().v.toUpperCase();
        this.expectOp('(');
        var qq = this.parseSelect();
        this.expectOp(')');
        return { k: 'quant', op: t.v, quant: quant, e: left, q: qq };
      }
      return { k: 'cmp', op: t.v, l: left, r: this.parseOperand() };
    }
    return left;
  };

  Parser.prototype.parseOperand = function () {
    var t = this.peek();
    if (!t) throw new Error('语句不完整');
    if (t.t === 'num') { this.p++; return { k: 'lit', v: t.v }; }
    if (t.t === 'str') { this.p++; return { k: 'lit', v: t.v }; }
    if (t.t === 'op' && t.v === '-') { this.p++; return { k: 'neg', e: this.parseOperand() }; }
    if (t.t === 'op' && t.v === '(') {
      this.p++;
      if (this.isKw('SELECT')) {
        var q = this.parseSelect();
        this.expectOp(')');
        return { k: 'sub', q: q };
      }
      var e = this.parseExpr();
      this.expectOp(')');
      return e;
    }
    if (t.t === 'id') {
      var up = t.v.toUpperCase();
      if (['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'].indexOf(up) >= 0 && this.isOp('(', 1)) {
        this.p += 2;
        var distinct = this.takeKw('DISTINCT');
        var arg = null;
        if (this.isOp('*')) { this.p++; arg = { k: 'star' }; }
        else arg = this.parseExpr();
        this.expectOp(')');
        return { k: 'agg', fn: up, arg: arg, distinct: distinct };
      }
      if (up === 'NULL') { this.p++; return { k: 'lit', v: null }; }
      if (KEYWORDS.indexOf(up) >= 0) throw new Error('语法错误：' + t.v + ' 不能出现在这里');
      this.p++;
      var name = t.v, tbl = null;
      if (this.isOp('.')) {
        this.p++;
        tbl = name; name = this.ident();
      }
      return { k: 'col', table: tbl, name: name };
    }
    throw new Error('语法错误：无法解析 "' + (t.v === undefined ? t.t : t.v) + '"');
  };

  /* ---------------- 执行 ---------------- */
  function norm(s) { return String(s).toLowerCase(); }
  function isNum(v) { return typeof v === 'number'; }
  function num(v) { if (v === null || v === undefined) return NaN; if (isNum(v)) return v; var n = parseFloat(v); return isNaN(n) ? NaN : n; }

  function compare(a, b) {
    if (a === null || b === null) return null;
    if (isNum(a) || isNum(b)) {
      if (!isNaN(num(a)) && !isNaN(num(b))) { var x = num(a), y = num(b); return x < y ? -1 : x > y ? 1 : 0; }
    }
    var p = String(a), q = String(b);
    return p < q ? -1 : p > q ? 1 : 0;
  }

  function evalNode(node, ctx, aggRow) {
    switch (node.k) {
      case 'lit': return node.v;
      case 'neg': return -num(evalNode(node.e, ctx, aggRow));
      case 'col': {
        var v = resolveColumn(node, ctx);
        return v;
      }
      case 'star': return '*';
      case 'sub': {
        var r = runSelect(node.q, ctx);
        if (r.rows.length === 0) return null;
        if (r.rows.length > 1) throw new Error('子查询返回了多行，这里只允许单值（可用 =ANY / IN / 聚合函数）');
        return r.rows[0][0];
      }
      case 'agg': return evalAgg(node, ctx, aggRow);
      case 'cmp': {
        var a = evalNode(node.l, ctx, aggRow), b = evalNode(node.r, ctx, aggRow);
        var c = compare(a, b);
        if (c === null) return false;
        switch (node.op) {
          case '=': return c === 0;
          case '<>': case '!=': return c !== 0;
          case '>': return c > 0;
          case '>=': return c >= 0;
          case '<': return c < 0;
          case '<=': return c <= 0;
        }
        return false;
      }
      case 'between': {
        var x = evalNode(node.e, ctx, aggRow);
        var lo = evalNode(node.lo, ctx, aggRow), hi = evalNode(node.hi, ctx, aggRow);
        var ok = compare(x, lo) >= 0 && compare(x, hi) <= 0;
        return node.neg ? !ok : ok;
      }
      case 'in': case 'inlist': {
        var val = evalNode(node.e, ctx, aggRow);
        var set = [];
        if (node.k === 'in') {
          var rr = runSelect(node.q, ctx);
          set = rr.rows.map(function (r) { return r[0]; });
        } else {
          set = node.list.map(function (n) { return evalNode(n, ctx, aggRow); });
        }
        var hit = set.some(function (s) { return compare(val, s) === 0; });
        return node.neg ? !hit : hit;
      }
      case 'like': {
        var s = evalNode(node.e, ctx, aggRow);
        var pat = String(evalNode(node.pat, ctx, aggRow));
        if (s === null) return false;
        var re = '^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '[\\s\\S]*').replace(/_/g, '[\\s\\S]') + '$';
        var m = new RegExp(re, 'i').test(String(s));
        return node.neg ? !m : m;
      }
      case 'isnull': {
        var v2 = evalNode(node.e, ctx, aggRow);
        var isn = v2 === null || v2 === undefined;
        return node.neg ? !isn : isn;
      }
      case 'exists': {
        var er = runSelect(node.q, ctx);
        return er.rows.length > 0;
      }
      case 'quant': {
        var lv = evalNode(node.e, ctx, aggRow);
        var qr = runSelect(node.q, ctx).rows.map(function (r) { return r[0]; });
        if (qr.length === 0) return false;
        var test = function (rv) {
          var c2 = compare(lv, rv);
          if (c2 === null) return false;
          switch (node.op) {
            case '=': return c2 === 0;
            case '<>': case '!=': return c2 !== 0;
            case '>': return c2 > 0;
            case '>=': return c2 >= 0;
            case '<': return c2 < 0;
            case '<=': return c2 <= 0;
          }
          return false;
        };
        return node.quant === 'ALL' ? qr.every(test) : qr.some(test);
      }
      case 'and': return !!evalNode(node.l, ctx, aggRow) && !!evalNode(node.r, ctx, aggRow);
      case 'or': return !!evalNode(node.l, ctx, aggRow) || !!evalNode(node.r, ctx, aggRow);
      case 'not': return !evalNode(node.e, ctx, aggRow);
      case 'truthy': {
        var tv = evalNode(node.e, ctx, aggRow);
        return tv === true || (isNum(tv) && tv !== 0);
      }
    }
    throw new Error('无法计算的表达式');
  }

  function resolveColumn(node, ctx) {
    var chain = ctx.scope;
    for (var i = 0; i < chain.length; i++) {
      var s = chain[i];
      if (node.table && norm(node.table) !== norm(s.alias) && norm(node.table) !== norm(s.table)) continue;
      var idx = s.cols.map(norm).indexOf(norm(node.name));
      if (idx >= 0) return s.row[idx];
    }
    var t = node.table ? node.table + '.' + node.name : node.name;
    throw new Error('找不到列 "' + t + '"，请检查列名或表别名');
  }

  function evalAgg(node, ctx, aggRow) {
    if (!aggRow) throw new Error('聚合函数 ' + node.fn + ' 不能出现在 WHERE 子句中');
    if (node.arg.k === 'star') {
      return node.fn === 'COUNT' ? aggRow.count : NaN;
    }
    var vals = aggRow.rows.map(function (r) {
      var c = { scope: [{ alias: ctx.scope[0].alias, table: ctx.scope[0].table, cols: ctx.scope[0].cols, row: r }].concat(ctx.scope.slice(1)) };
      return evalNode(node.arg, c, null);
    }).filter(function (v) { return v !== null && v !== undefined; });
    if (node.distinct) vals = vals.filter(function (v, i, a) { return a.findIndex(function (x) { return compare(x, v) === 0; }) === i; });
    if (node.fn === 'COUNT') return vals.length;
    if (vals.length === 0) return null;
    if (node.fn === 'SUM') return vals.reduce(function (a, b) { return a + num(b); }, 0);
    if (node.fn === 'AVG') return vals.reduce(function (a, b) { return a + num(b); }, 0) / vals.length;
    if (node.fn === 'MAX') return vals.reduce(function (a, b) { return compare(a, b) >= 0 ? a : b; });
    if (node.fn === 'MIN') return vals.reduce(function (a, b) { return compare(a, b) <= 0 ? a : b; });
    throw new Error('不支持的聚合函数 ' + node.fn);
  }

  function hasAgg(nodes) {
    var found = false;
    (function walk(n) {
      if (!n || typeof n !== 'object' || found) return;
      if (n.k === 'agg') { found = true; return; }
      Object.keys(n).forEach(function (k) {
        if (k === 'q' || k === 'from') return;
        var v = n[k];
        if (v && typeof v === 'object') {
          if (Array.isArray(v)) v.forEach(walk);
          else walk(v);
        }
      });
    })(nodes);
    return found;
  }

  function runSelect(q, parentCtx) {
    var db = currentDB;
    var tbl = lookupTable(db, q.from.table);
    var sourceRows = tbl.rows;
    var ctxBase = { scope: [] };
    var parents = parentCtx ? parentCtx.scope.slice() : [];
    var matched = [];
    var aggNeeded = hasAgg(q.items)>0 || hasAgg(q.where) || hasAgg(q.orderBy);
    for (var i = 0; i < sourceRows.length; i++) {
      var scope = [{ alias: q.from.alias, table: tbl.name, cols: tbl.columns, row: sourceRows[i] }].concat(parents);
      var ctx = { scope: scope };
      if (q.where) {
        var ok = evalNode(q.where, ctx, null);
        if (!ok) continue;
      }
      matched.push(sourceRows[i]);
    }
    var outRows = [], outCols = [];
    var aggRow = { rows: matched, count: matched.length };
    var aggCtx = { scope: [{ alias: q.from.alias, table: tbl.name, cols: tbl.columns, row: matched[0] || [] }].concat(parents) };
    if (aggNeeded) {
      outRows.push(q.items.map(function (it) {
        if (it.kind === 'star') return matched.length;
        return evalNode(it.expr, aggCtx, aggRow);
      }));
      outCols = q.items.map(function (it) { return it.alias || exprLabel(it.expr); });
    } else {
      outCols = q.items.map(function (it) {
        if (it.kind === 'star') return tbl.columns.slice();
        return it.alias || exprLabel(it.expr);
      }).reduce(function (a, b) { return a.concat(b); }, []);
      matched.forEach(function (row) {
        var ctx = { scope: [{ alias: q.from.alias, table: tbl.name, cols: tbl.columns, row: row }].concat(parents) };
        var vals = [];
        q.items.forEach(function (it) {
          if (it.kind === 'star') { vals = vals.concat(row.slice()); }
          else vals.push(evalNode(it.expr, ctx, null));
        });
        outRows.push(vals);
      });
    }
    if (q.orderBy.length) {
      var keysOf = function (row) {
        var ctx = { scope: [{ alias: q.from.alias, table: tbl.name, cols: tbl.columns, row: row }].concat(parents) };
        return q.orderBy.map(function (o) { return evalNode(o.expr, ctx, aggRow); });
      };
      if (!aggNeeded) {
        var pairs = matched.map(function (r, i) { return { r: r, o: outRows[i], k: keysOf(r) }; });
        pairs.sort(function (A, B) {
          for (var j = 0; j < q.orderBy.length; j++) {
            var c = compare(A.k[j], B.k[j]);
            if (c === null) c = 0;
            if (c !== 0) return q.orderBy[j].dir === 'DESC' ? -c : c;
          }
          return 0;
        });
        outRows = pairs.map(function (p) { return p.o; });
      }
    }
    if (q.distinct) {
      var seen = [];
      outRows = outRows.filter(function (r) {
        var key = r.map(function (v) { return v === null ? '∅' : String(v); }).join('\u0001');
        if (seen.indexOf(key) >= 0) return false;
        seen.push(key); return true;
      });
    }
    if (q.limit != null) outRows = outRows.slice(0, q.limit);
    return { columns: outCols, rows: outRows };
  }

  function exprLabel(e) {
    if (!e) return '';
    if (e.k === 'col') return e.name;
    if (e.k === 'agg') return e.fn + '(' + (e.arg.k === 'star' ? '*' : exprLabel(e.arg)) + ')';
    if (e.k === 'lit') return String(e.v);
    return '表达式';
  }

  function lookupTable(db, name) {
    var keys = Object.keys(db.tables);
    for (var i = 0; i < keys.length; i++) {
      if (norm(keys[i]) === norm(name)) return db.tables[keys[i]];
    }
    throw new Error('找不到表 "' + name + '"，可用表：' + keys.join('、'));
  }

  var currentDB = null;

  function cloneDB(db) {
    var t = {};
    Object.keys(db.tables).forEach(function (k) {
      t[k] = { name: db.tables[k].name, columns: db.tables[k].columns.slice(), rows: db.tables[k].rows.map(function (r) { return r.slice(); }) };
    });
    return { tables: t };
  }

  function run(sql, db) {
    currentDB = db;
    var clean = String(sql || '').trim().replace(/;+\s*$/, '');
    if (!clean) return { ok: false, error: '请输入 SQL 语句' };
    if (/;\s*\S/.test(clean)) return { ok: false, error: '一次只能执行一条语句' };
    try {
      var p = new Parser(tokenize(clean));
      var st = p.parseStatement();
      if (!p.eof()) throw new Error('语句结尾有多余内容："' + (p.peek() && p.peek().v) + '"');
      if (st.type === 'select') {
        var r = runSelect(st, null);
        return { ok: true, columns: r.columns, rows: r.rows, kind: 'select' };
      }
      if (st.type === 'insert') return execInsert(st, db);
      if (st.type === 'update') return execUpdate(st, db);
      if (st.type === 'delete') return execDelete(st, db);
      return { ok: false, error: '不支持的语句' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function execInsert(st, db) {
    var t = lookupTable(db, st.table);
    var cols = st.cols ? st.cols.map(function (c) {
      var i = t.columns.map(norm).indexOf(norm(c));
      if (i < 0) throw new Error('表 ' + t.name + ' 没有列 "' + c + '"');
      return i;
    }) : t.columns.map(function (_, i) { return i; });
    if (cols.length !== st.values.length) throw new Error('列的数量与值的数量不一致');
    var row = t.columns.map(function () { return null; });
    st.values.forEach(function (v, i) { row[cols[i]] = evalNode(v, { scope: [] }, null); });
    t.rows.push(row);
    return { ok: true, kind: 'dml', message: '已插入 1 行到 ' + t.name, affected: 1, columns: t.columns, rows: [row] };
  }

  function execUpdate(st, db) {
    var t = lookupTable(db, st.table);
    var n = 0;
    st.sets.forEach(function (s) {
      if (t.columns.map(norm).indexOf(norm(s.col)) < 0) throw new Error('表 ' + t.name + ' 没有列 "' + s.col + '"');
    });
    t.rows.forEach(function (row) {
      var scope = [{ alias: t.name, table: t.name, cols: t.columns, row: row }];
      if (st.where && !evalNode(st.where, { scope: scope }, null)) return;
      var snapshot = row.slice();
      var ctx = { scope: [{ alias: t.name, table: t.name, cols: t.columns, row: snapshot }] };
      st.sets.forEach(function (s) {
        var i = t.columns.map(norm).indexOf(norm(s.col));
        row[i] = evalNode(s.expr, ctx, null);
      });
      n++;
    });
    return { ok: true, kind: 'dml', message: '已修改 ' + n + ' 行（' + t.name + '）', affected: n };
  }

  function execDelete(st, db) {
    var t = lookupTable(db, st.table);
    var before = t.rows.length;
    t.rows = t.rows.filter(function (row) {
      var scope = [{ alias: t.name, table: t.name, cols: t.columns, row: row }];
      if (!st.where) return false;
      return !evalNode(st.where, { scope: scope }, null);
    });
    var n = before - t.rows.length;
    return { ok: true, kind: 'dml', message: '已删除 ' + n + ' 行（' + t.name + '）', affected: n };
  }

  window.MiniSQL = { run: run, cloneDB: cloneDB, tokenize: tokenize };
})();
