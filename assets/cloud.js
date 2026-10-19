/* 云服务接入：账号登录、学习进度云端同步、AI 助教（大模型流式问答）
 * 依赖：https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js
 */
(function () {
  'use strict';

  /* 由云服务开通结果返回的 publicConfig —— 前端只允许使用这四个值 */
  var PUBLIC_CONFIG = {
    endpoint: 'https://mis-lab-assistant.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
    publishableKey: 'wbpk_gnyzaZTqVvmlJhmfngtE8z_4JKdXCxy1Ap2UZCzmPffe2AH6pQR3koe'
  };

  var TABLE = 'lab_progress';
  var ASK_LIMIT = 30;

  /* 云能力只在官方托管域名下启用。GitHub Pages / 本地文件等自托管场景自动降级为
     「本机模式」：不连云端、不显示 AI 对话，只给一张「截图发给智能体助教」的提示卡。 */
  var CLOUD_ON = /\.workbuddy\.host$/i.test(location.hostname);

  var S = {
    sdk: null,
    sdkError: '',
    session: null,
    user: null,
    rowId: null,
    sync: 'off',            // off | idle | saving | saved | error
    syncText: '未登录',
    lastSyncAt: 0,
    authErr: '',
    pendingOtp: null,
    cooldownTimer: null,
    dirty: false,
    inflight: false,
    applying: false,
    asks: 0,
    models: null,
    modelId: '',
    history: [],
    ctx: null,
    generating: false,
    abort: null
  };

  var subs = [];
  function emit() { subs.forEach(function (f) { try { f(); } catch (e) { } }); }
  function onUser(fn) { subs.push(fn); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function hhmm(t) {
    var d = t ? new Date(t) : new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function db() { return S.sdk.database; }

  /* ------------------------------------------------------------------ */
  /* 进度：本地 → 云端                                                    */
  /* ------------------------------------------------------------------ */
  function countAll(d) {
    var dfdQuiz = Object.keys(d.dfd.quiz || {}).filter(function (k) { return d.dfd.quiz[k] === true; }).length;
    var dfdDraw = Object.keys(d.dfd.draw || {}).filter(function (k) { return d.dfd.draw[k] && d.dfd.draw[k].score >= 70; }).length;
    var dfdFind = Object.keys(d.dfd.find || {}).filter(function (k) { return d.dfd.find[k] === true; }).length;
    var sql = Object.keys(d.sql.done || {}).filter(function (k) { return d.sql.done[k]; }).length;
    var sym = Object.keys(d.bpm.sym || {}).filter(function (k) { return d.bpm.sym[k]; }).length;
    var sort = Object.keys(d.bpm.sort || {}).filter(function (k) { return d.bpm.sort[k]; }).length;
    var blank = Object.keys(d.bpm.blank || {}).filter(function (k) { return d.bpm.blank[k]; }).length;
    var bpmDraw = d.bpm.draw && d.bpm.draw.score >= 70 ? 1 : 0;
    return { done: dfdQuiz + dfdDraw + dfdFind + sql + sym + sort + blank + bpmDraw, total: 40 };
  }

  function snapshot() {
    var d = (window.Store && window.Store.data) || { name: '', dfd: {}, sql: {}, bpm: {} };
    var c = countAll(d);
    return {
      student_name: (d.name || '').slice(0, 40) || null,
      dfd: d.dfd || {},
      sql_state: d.sql || {},
      bpm: d.bpm || {},
      done_count: c.done,
      total_count: c.total
    };
  }

  function setSync(kind, text) { S.sync = kind; S.syncText = text; emit(); }

  function dbMsg(err) {
    if (!err) return '未知错误';
    if (err.code === '42P01') return '云端数据表不存在，请联系老师重新开通云服务。';
    if (err.code === '42501') return '没有权限读写这条记录，请重新登录。';
    if (err.code === '23505') return '记录重复，请刷新页面后重试。';
    return err.message || '请求失败';
  }

  function markDirty() {
    if (S.applying || !S.session) return;
    S.dirty = true;
    setSync('saving', '待同步…');
    clearTimeout(S.dirtyTimer);
    S.dirtyTimer = setTimeout(flush, 1200);
  }

  function resolveRow() {
    if (S.rowId) return Promise.resolve(S.rowId);
    return Promise.resolve(db().from(TABLE).select('id')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle())
      .then(function (r) {
        if (!r.error && r.data) { S.rowId = r.data.id; return S.rowId; }
        return null;
      })
      .catch(function () { return null; });
  }

  function flush() {
    if (!S.session || !S.dirty || S.inflight || !S.sdk) return;
    S.dirty = false;
    S.inflight = true;
    setSync('saving', '同步中…');
    var payload = snapshot();
    payload.updated_at = new Date().toISOString();

    resolveRow().then(function (id) {
      return id
        ? db().from(TABLE).update(payload).eq('id', id).select('id, done_count, updated_at')
        : db().from(TABLE).insert(payload).select('id, done_count, updated_at');
    }).then(function (res) {
      if (res.error) throw res.error;
      var row = res.data && res.data[0];
      if (!row) {
        // 行已被删除或被 RLS 过滤：清掉本地行号，下次重建成新行
        S.rowId = null;
        S.inflight = false;
        S.dirty = true;
        setTimeout(flush, 300);
        return;
      }
      S.rowId = row.id;
      // 回读校验：确认真的写进去了
      return db().from(TABLE).select('id, done_count, total_count, updated_at').eq('id', S.rowId).maybeSingle()
        .then(function (v) {
          S.inflight = false;
          if (v.error) { setSync('error', '写入后回读失败：' + dbMsg(v.error)); return; }
          if (!v.data) { setSync('error', '写入后没读到记录，请点「立即同步」重试'); return; }
          S.lastSyncAt = Date.parse(v.data.updated_at) || Date.now();
          setSync('saved', '已同步 ' + hhmm(S.lastSyncAt) + '　' + v.data.done_count + '/' + v.data.total_count);
        });
    }).catch(function (err) {
      S.inflight = false;
      S.dirty = true;
      setSync('error', '同步失败：' + dbMsg(err));
    });
  }

  function dict(o) { return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }

  function pull() {
    if (!S.session || !S.sdk) return Promise.resolve();
    return Promise.resolve(db().from(TABLE)
      .select('id, dfd, sql_state, bpm, student_name, done_count, total_count, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle())
      .then(function (res) {
        if (res.error) { setSync('error', '读取云端进度失败：' + dbMsg(res.error)); return; }
        if (!res.data) {
          S.rowId = null;
          setSync('idle', '云端还没有记录，正在建立…');
          S.dirty = true;
          clearTimeout(S.dirtyTimer);
          S.dirtyTimer = setTimeout(flush, 300);
          return;
        }
        S.rowId = res.data.id;
        var remoteDone = res.data.done_count || 0;
        var merged = mergeIntoLocal(res.data);
        S.lastSyncAt = Date.parse(res.data.updated_at) || Date.now();
        var localDone = countAll(Store.data).done;
        setSync('saved', '云端已恢复 ' + Math.max(remoteDone, localDone) + ' / ' + (res.data.total_count || 39) +
          (merged.changed ? '（已合并本机记录）' : ''));
        emit();
        if (window.AppRefreshCurrent) window.AppRefreshCurrent();
        if (merged.changed) { S.dirty = true; clearTimeout(S.dirtyTimer); S.dirtyTimer = setTimeout(flush, 400); }
      })
      .catch(function (err) { setSync('error', '读取云端进度失败：' + dbMsg(err)); });
  }

  /* 合并策略：逐项取并集，本机已有的值优先（避免覆盖学生刚做的题） */
  function mergeIntoLocal(row) {
    var local = Store.data;
    var changed = false;
    function mergeMap(target, remote) {
      var r = dict(remote);
      Object.keys(r).forEach(function (k) {
        if (!(k in target)) { target[k] = r[k]; changed = true; }
      });
    }
    S.applying = true;
    mergeMap(local.dfd.quiz || (local.dfd.quiz = {}), row.dfd && row.dfd.quiz);
    mergeMap(local.dfd.find || (local.dfd.find = {}), row.dfd && row.dfd.find);
    var rd = dict(row.dfd && row.dfd.draw);
    Object.keys(rd).forEach(function (k) {
      var mine = local.dfd.draw[k];
      var theirs = rd[k];
      if (!mine || !(mine.nodes || []).length) { local.dfd.draw[k] = theirs; changed = true; }
      else if (theirs && (theirs.score || 0) > (mine.score || 0)) {
        local.dfd.draw[k].score = theirs.score;
        local.dfd.draw[k].checked = true;
        changed = true;
      }
    });
    mergeMap(local.sql.done || (local.sql.done = {}), row.sql_state && row.sql_state.done);
    mergeMap(local.bpm.sym || (local.bpm.sym = {}), row.bpm && row.bpm.sym);
    mergeMap(local.bpm.sort || (local.bpm.sort = {}), row.bpm && row.bpm.sort);
    mergeMap(local.bpm.blank || (local.bpm.blank = {}), row.bpm && row.bpm.blank);
    /* 自画图：本地没图就取云端；两边都有图则保留分高的那张 */
    var rd = row.bpm && row.bpm.draw;
    if (rd && rd.nodes && rd.nodes.length) {
      if (!local.bpm.draw || !(local.bpm.draw.nodes || []).length) { local.bpm.draw = rd; changed = true; }
      else if ((rd.score || 0) > (local.bpm.draw.score || 0)) {
        local.bpm.draw.score = rd.score;
        local.bpm.draw.checked = true;
        changed = true;
      }
    }
    if (!local.name && row.student_name) { local.name = row.student_name; changed = true; }
    if (changed) Store.save();
    S.applying = false;
    return { changed: changed };
  }

  /* ------------------------------------------------------------------ */
  /* 登录                                                                */
  /* ------------------------------------------------------------------ */
  function authMsg(err) {
    if (!err) return '登录失败，请重试。';
    var k = err.kind || '';
    if (k === 'unauthenticated' || k === 'invalid_grant') return '验证码不正确或已过期，请重新获取。';
    if (k === 'network' || k === 'backend-unavailable') return '网络或服务暂时不可用，请稍后再试。';
    return err.message || '登录失败，请重试。';
  }

  function afterSignIn(session) {
    S.session = session;
    S.user = (session && session.user) || null;
    S.authErr = '';
    setSync('idle', '正在读取云端进度…');
    emit();
    pull();
    return Promise.resolve();
  }

  function restoreSession() {
    return Promise.resolve(S.sdk.auth.getSession()).then(function (res) {
      if (res && res.data) return afterSignIn(res.data);
      S.session = null;
      setSync('off', '未登录');
      emit();
    }).catch(function (err) {
      setSync('off', '未登录');
      S.authErr = authMsg(err);
      emit();
    });
  }

  function bootAuth() {
    var url = new URL(location.href);
    if (!url.searchParams.has('code') && !url.searchParams.has('error')) return restoreSession();

    var provider = url.searchParams.get('provider');
    if (provider !== 'workbuddy' && provider !== 'wechat') {
      S.authErr = '授权回调缺少有效的登录方式，请重新登录。';
      emit();
      return Promise.resolve();
    }
    var handler = provider === 'workbuddy'
      ? S.sdk.auth.handleWorkBuddyCallback
      : S.sdk.auth.handleWechatWebCallback;
    if (typeof handler !== 'function') {
      S.authErr = '当前 SDK 版本不支持该登录方式，请改用手机验证码登录。';
      emit();
      return Promise.resolve();
    }
    return Promise.resolve(handler.call(S.sdk.auth)).then(function (res) {
      if (res && res.error) { S.authErr = authMsg(res.error); emit(); return; }
      if (res && res.data) {
        for (var k of ['code', 'state', 'provider']) url.searchParams.delete(k);
        var back = safeGet('mis-return-hash');
        history.replaceState(null, '', url.pathname + url.search + (back || ''));
        return afterSignIn(res.data);
      }
      return restoreSession();
    }).catch(function (err) { S.authErr = authMsg(err); emit(); });
  }

  function safeGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }

  function sendCode() {
    var input = document.getElementById('ccPhone');
    var phone = (input.value || '').trim();
    if (!/^1\d{10}$/.test(phone)) {
      showAuthErr('请输入正确的 11 位手机号');
      return;
    }
    showAuthErr('');
    var btn = document.getElementById('ccSend');
    btn.disabled = true;
    btn.textContent = '发送中…';
    Promise.resolve(S.sdk.auth.sendOtp({ phone: phone })).then(function (res) {
      if (res.error) {
        btn.disabled = false; btn.textContent = '获取验证码';
        showAuthErr(authMsg(res.error));
        return;
      }
      S.pendingOtp = { phone: phone, verificationId: res.data.verificationId, isExistingUser: res.data.isExistingUser };
      var left = 60;
      btn.textContent = left + ' 秒后重发';
      clearInterval(S.cooldownTimer);
      S.cooldownTimer = setInterval(function () {
        left -= 1;
        if (left <= 0) {
          clearInterval(S.cooldownTimer);
          btn.disabled = false;
          btn.textContent = '获取验证码';
        } else {
          btn.textContent = left + ' 秒后重发';
        }
      }, 1000);
      showAuthErr('验证码已发送，请查看短信');
    }).catch(function (err) {
      btn.disabled = false; btn.textContent = '获取验证码';
      showAuthErr(authMsg(err));
    });
  }

  function doLogin() {
    var phone = (document.getElementById('ccPhone').value || '').trim();
    var code = (document.getElementById('ccCode').value || '').trim();
    if (!S.pendingOtp || S.pendingOtp.phone !== phone) {
      showAuthErr('请先获取当前手机号的验证码');
      return;
    }
    if (!code) { showAuthErr('请输入短信里的验证码'); return; }
    showAuthErr('');
    var btn = document.getElementById('ccLogin');
    btn.disabled = true; btn.textContent = '登录中…';
    Promise.resolve(S.sdk.auth.verifyOtp({
      phone: S.pendingOtp.phone,
      verificationId: S.pendingOtp.verificationId,
      isExistingUser: S.pendingOtp.isExistingUser,
      token: code
    })).then(function (res) {
      btn.disabled = false; btn.textContent = '登录 / 注册';
      if (res.error) { showAuthErr(authMsg(res.error)); return; }
      S.pendingOtp = null;
      closeLogin();
      toast('已登录，进度开始云端同步');
      return afterSignIn(res.data);
    }).catch(function (err) {
      btn.disabled = false; btn.textContent = '登录 / 注册';
      showAuthErr(authMsg(err));
    });
  }

  function wxLogin() {
    if (S.sdkError) { showAuthErr(S.sdkError); return; }
    var back = location.origin + '/';
    safeSet('mis-return-hash', location.hash || '');
    Promise.resolve(S.sdk.auth.signInWithOAuth({ provider: 'wechat', redirectTo: back }))
      .then(function (res) {
        if (res.error) { showAuthErr(authMsg(res.error)); return; }
        location.assign(res.data.url);
      }).catch(function (err) { showAuthErr(authMsg(err)); });
  }

  function signOut() {
    Promise.resolve(S.sdk.auth.signOut()).catch(function () { }).then(function () {
      S.session = null; S.user = null; S.rowId = null;
      setSync('off', '未登录');
      toast('已退出登录，进度仍保存在本机');
      emit();
    });
  }

  function showAuthErr(t) {
    S.authErr = t;
    var box = document.getElementById('ccErr');
    if (box) { box.textContent = t; box.style.display = t ? 'block' : 'none'; }
  }

  function openLogin() {
    var mask = document.getElementById('ccMask');
    if (!mask) return;
    mask.classList.add('on');
    showAuthErr('');
    if (S.sdkError) showAuthErr(S.sdkError);
    var p = document.getElementById('ccPhone');
    if (p) setTimeout(function () { p.focus(); }, 60);
  }
  function closeLogin() {
    var mask = document.getElementById('ccMask');
    if (mask) mask.classList.remove('on');
  }

  /* ------------------------------------------------------------------ */
  /* AI 助教                                                             */
  /* ------------------------------------------------------------------ */
  function contextText() {
    var c = S.ctx;
    if (!c) return '';
    var lines = [];
    if (c.lab) lines.push('实验：' + c.lab);
    if (c.task) lines.push('当前任务：' + c.task);
    if (c.state) lines.push('学生当前状态：' + c.state);
    if (c.code) lines.push('学生写的语句：' + c.code);
    if (c.feedback) lines.push('平台刚给出的判分反馈：' + c.feedback);
    if (c.progress) lines.push('完成度：' + c.progress);
    if (c.name) lines.push('学生姓名：' + c.name);
    return lines.join('\n');
  }

  function systemPrompt() {
    var base = window.TEACHER_PROMPT || '你是《管理信息系统》课程的实验助教。';
    var ctx = contextText();
    return base +
      '\n\n【本次对话的实验上下文】\n' + (ctx || '（学生还没进入具体实验，先问他在做哪一个、卡在哪一步）') +
      '\n\n【交互约束】\n- 上下文由平台自动附带，学生看不到，不要逐字复述它。\n- 只给下一步，不给完整答案；需要示例时用同类小例子。\n- 回答控制在 200 字以内，用短段落或 2~3 条要点。';
  }

  function loadModels() {
    if (S.models) return Promise.resolve(S.models);
    return Promise.resolve(S.sdk.llm.models.list()).then(function (list) {
      S.models = Array.isArray(list) ? list.filter(function (m) { return m && m.disabled !== true && m.enabled !== false; }) : [];
      if (!S.modelId) {
        var def = S.models.filter(function (m) { return m.isDefault; })[0] || S.models[0];
        S.modelId = def ? def.id : '';
      }
      renderModelPicker();
      return S.models;
    }).catch(function () {
      S.models = [];
      renderModelPicker();
      return S.models;
    });
  }

  function renderModelPicker() {
    var sel = document.getElementById('aiModel');
    if (!sel) return;
    if (!S.models || !S.models.length) {
      sel.innerHTML = '<option value="">无可用模型</option>';
      return;
    }
    sel.innerHTML = S.models.map(function (m) {
      return '<option value="' + esc(m.id) + '">' + esc(m.name || m.id) + '</option>';
    }).join('');
    sel.value = S.modelId;
  }

  function openAsk(ctx) {
    if (ctx) S.ctx = ctx;
    var panel = document.getElementById('aiPanel');
    if (!panel) {
      /* 站内对话框已下线：点「问助教」直接打开截图提示卡，并显示当前题目 */
      mountAskTip();
      var tip = document.getElementById('askPanel');
      if (!tip) return;
      renderAskCtx();
      tip.classList.add('on');
      return;
    }
    panel.classList.add('on');
    renderCtx();
    loadModels();
    var ta = document.getElementById('aiInput');
    if (ta) setTimeout(function () { ta.focus(); }, 80);
  }
  function closeAsk() {
    var panel = document.getElementById('aiPanel');
    if (panel) panel.classList.remove('on');
  }

  function renderCtx() {
    var box = document.getElementById('aiCtx');
    if (!box) return;
    var c = S.ctx;
    if (!c) { box.innerHTML = '<span class="ai-ctx-empty">未进入具体实验，助教会先问你在做哪一部分</span>'; return; }
    var chips = [];
    if (c.lab) chips.push('<span class="ai-chip">' + esc(c.lab) + '</span>');
    if (c.task) chips.push('<span class="ai-chip">' + esc(String(c.task).slice(0, 34)) + '</span>');
    if (c.progress) chips.push('<span class="ai-chip ghost">' + esc(c.progress) + '</span>');
    box.innerHTML = chips.join('');
  }

  function bubble(role, text) {
    var body = document.getElementById('aiBody');
    var d = document.createElement('div');
    d.className = 'ai-msg ' + role;
    d.innerHTML = '<div class="ai-who">' + (role === 'user' ? '我' : '助教') + '</div><div class="ai-text">' + fmt(text) + '</div>';
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d.querySelector('.ai-text');
  }

  function fmt(t) {
    return esc(t)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }

  function welcome() {
    var body = document.getElementById('aiBody');
    if (body && !body.children.length) {
      bubble('bot', '我是这门课的助教。把你在这一步想到的做法说给我，我先判断方向对不对，再给你下一小步。\n\n（也可以直接问：「这条数据流该叫什么名字？」「子查询为什么要用 IN？」）');
    }
  }

  async function send() {
    if (S.generating) return;
    var ta = document.getElementById('aiInput');
    var text = (ta.value || '').trim();
    if (!text) return;
    if (S.sdkError) { bubble('bot', '云服务没有连上：' + S.sdkError); return; }
    if (S.asks >= ASK_LIMIT) { bubble('bot', '本次会话的提问次数已用完（' + ASK_LIMIT + ' 次）。刷新页面可以重新开始。'); return; }
    if (!S.modelId) {
      await loadModels();
      if (!S.modelId) { bubble('bot', '当前应用没有可用的模型，请联系老师检查云服务配置。'); return; }
    }

    ta.value = '';
    S.asks += 1;
    bubble('user', text);
    var out = bubble('bot', '');
    out.innerHTML = '<span class="ai-dots"><i></i><i></i><i></i></span>';
    S.generating = true;
    setSendState(true);

    var msgs = [{ role: 'system', content: systemPrompt() }]
      .concat(S.history.slice(-8))
      .concat([{ role: 'user', content: text }]);

    var acc = '';
    var reasoning = '';
    S.abort = new AbortController();
    try {
      var stream = S.sdk.llm.chat.completions.create({
        model: S.modelId,
        messages: msgs,
        stream: true,
        stream_options: { include_usage: true },
        signal: S.abort.signal
      });
      for await (var chunk of stream) {
        var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
        if (!delta) continue;
        if (delta.content) { acc += delta.content; out.innerHTML = fmt(acc); scrollBody(); }
        if (delta.reasoning_content) reasoning += delta.reasoning_content;
      }
      if (!acc) { acc = '（模型没有返回内容，请再问一次或换个模型）'; out.innerHTML = fmt(acc); }
      S.history.push({ role: 'user', content: text });
      S.history.push({ role: 'assistant', content: acc });
      if (S.history.length > 16) S.history = S.history.slice(-16);
    } catch (err) {
      var msg = (err && (err.name === 'AbortError' || String(err.message || '').indexOf('abort') >= 0))
        ? '已停止生成'
        : llmMsg(err);
      out.innerHTML = fmt(acc ? acc + '\n\n（回复被中断：' + msg + '）' : '出错了：' + msg);
    } finally {
      S.generating = false;
      S.abort = null;
      setSendState(false);
    }
  }

  function scrollBody() {
    var b = document.getElementById('aiBody');
    if (b) b.scrollTop = b.scrollHeight;
  }

  function llmMsg(err) {
    var code = (err && (err.error && err.error.code || err.code)) || '';
    if (String(code).indexOf('quota_') === 0) return '助教的调用额度用完了，请联系老师。';
    if (String(code).indexOf('auth_') === 0) return '云服务凭据无效或访问来源不匹配，请在正式发布的链接上打开。';
    if (String(code).indexOf('gateway_') === 0 || code === 'gateway_stream_interrupted') return '模型服务暂时不可用，稍后再试。';
    if (String(code).indexOf('model_') === 0) return '该模型暂时不可用，换一个模型试试。';
    if (String(code).indexOf('request_') === 0) return '请求参数有问题：' + (err.message || code);
    return (err && err.message) || '请求失败，请重试。';
  }

  function setSendState(on) {
    var b = document.getElementById('aiSend');
    if (!b) return;
    b.textContent = on ? '停止' : '发送';
    b.classList.toggle('stop', on);
  }

  function newChat() {
    S.history = [];
    var body = document.getElementById('aiBody');
    if (body) body.innerHTML = '';
    welcome();
  }

  /* ------------------------------------------------------------------ */
  /* 界面挂载                                                            */
  /* ------------------------------------------------------------------ */
  function mount() {
    var side = document.querySelector('.side-foot');
    if (side && !document.getElementById('ccAcct')) {
      var acct = document.createElement('div');
      acct.id = 'ccAcct';
      acct.className = 'acct';
      side.insertBefore(acct, side.firstChild);
    }
    if (CLOUD_ON && !document.getElementById('ccMask')) {
      var mask = document.createElement('div');
      mask.id = 'ccMask';
      mask.className = 'modal-mask';
      mask.innerHTML =
        '<div class="modal">' +
        '<button class="modal-x" id="ccClose" aria-label="关闭">×</button>' +
        '<h3>登录后进度自动保存到云端</h3>' +
        '<p class="small muted">换电脑或手机打开同一个链接，可以接着上次的进度继续做。每个账号只能看到自己的记录。</p>' +
        '<label class="field"><span>手机号</span><input id="ccPhone" inputmode="numeric" maxlength="11" placeholder="11 位手机号" autocomplete="tel" /></label>' +
        '<label class="field"><span>验证码</span>' +
        '<div class="code-row"><input id="ccCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" /><button class="btn" id="ccSend" type="button">获取验证码</button></div>' +
        '</label>' +
        '<div class="auth-err" id="ccErr" style="display:none"></div>' +
        '<button class="btn primary block" id="ccLogin">登录 / 注册</button>' +
        '<div class="or"><span>或</span></div>' +
        '<button class="btn block" id="ccWx">微信登录</button>' +
        '<p class="tiny muted">未注册的手机号验证后会自动创建账号。' +
        '微信登录需在正式发布地址使用，本地双击打开的文件不支持。</p>' +
        '</div>';
      document.body.appendChild(mask);
      mask.addEventListener('click', function (e) { if (e.target === mask) closeLogin(); });
      mask.querySelector('#ccClose').addEventListener('click', closeLogin);
      mask.querySelector('#ccSend').addEventListener('click', sendCode);
      mask.querySelector('#ccLogin').addEventListener('click', doLogin);
      mask.querySelector('#ccWx').addEventListener('click', wxLogin);
      mask.querySelector('#ccPhone').addEventListener('input', function () { showAuthErr(''); });
    }

    /* 站内不再提供对话框（两个域名一致）：只留「截图发给智能体助教」提示卡 */
    mountAskTip();

    if (!document.getElementById('ccToast')) {
      var t = document.createElement('div');
      t.id = 'ccToast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
  }

  /* 自托管（GitHub Pages 等）：不提供对话框，改为「截图发给智能体助教」的提示卡 */
  function mountAskTip() {
    if (document.getElementById('askFab')) return;
    var fab = document.createElement('button');
    fab.id = 'askFab';
    fab.className = 'ai-fab ask';
    fab.innerHTML = '<span>✉</span> 遇到不会的？';
    document.body.appendChild(fab);

    var panel = document.createElement('div');
    panel.id = 'askPanel';
    panel.className = 'ai-panel ask-panel';
    panel.innerHTML =
      '<div class="ai-head"><div class="ai-title">问课程 AI 助教<span class="tiny muted">把截图发给它</span></div>' +
      '<button class="ai-icon" id="askClose" title="关闭">×</button></div>' +
      '<div class="ask-ctx" id="askCtx" style="display:none"></div>' +
      '<div class="ai-body ask-body">' +
      '<p class="ask-step"><b>① 截图</b><span>题目、你画的图、你写的 SQL，截一张就行。</span></p>' +
      '<p class="ask-step"><b>② 发给助教</b><span>在课程群打开「AI 助教」智能体，把图发过去，顺带说一句学号。</span></p>' +
      '<p class="ask-step"><b>③ 它会讲</b><span>错在哪、为什么错、下一步练哪道题——但不会直接给你答案。</span></p>' +
      '<div class="ask-tip">想让它看得更准：先复制下面的学情报告，和截图一起发过去。</div>' +
      '<button class="btn primary block" id="askCopy">复制我的学情报告</button>' +
      '<p class="tiny muted" style="margin-top:10px">老师：对助教说【教师模式】，可以看班级共性问题。</p>' +
      '</div>';
    document.body.appendChild(panel);

    fab.addEventListener('click', function () {
      var on = panel.classList.toggle('on');
      if (on) { S.ctx = pickContext(); renderAskCtx(); }
    });
    panel.querySelector('#askClose').addEventListener('click', function () {
      panel.classList.remove('on');
    });
    panel.querySelector('#askCopy').addEventListener('click', function () {
      var btn = this;
      var txt = (typeof window.MISReport === 'function')
        ? window.MISReport()
        : '（还没有做题记录，先去实验里做几道题吧）';
      copyToClipboard(txt).then(function () {
        btn.textContent = '已复制 ✓ 粘贴给助教就行';
        setTimeout(function () { btn.textContent = '复制我的学情报告'; }, 2400);
      }, function () {
        btn.textContent = '复制失败，请到「学习报告」页手动复制';
      });
    });
  }

  /* 提示卡顶部的「当前题目」，让学生截图时知道自己在问什么 */
  function renderAskCtx() {
    var box = document.getElementById('askCtx');
    if (!box) return;
    var c = S.ctx;
    var task = c && c.task ? String(c.task).slice(0, 64) : '';
    box.innerHTML = task ? '<b>当前题目</b><span>' + esc(task) + '</span>' : '';
    box.style.display = task ? '' : 'none';
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) { reject(e); }
    });
  }

  function pickContext() {
    try {
      if (typeof window.LabAI === 'function') {
        var c = window.LabAI();
        if (c) return c;
      }
    } catch (e) { }
    var n = (window.Store && window.Store.data.name) || '';
    var c = countAll((window.Store && window.Store.data) || { dfd: {}, sql: {}, bpm: {} });
    return { lab: '实验总览', state: '学生还没有进入具体实验', progress: c.done + ' / ' + c.total, name: n };
  }

  var toastTimer = null;
  function toast(text) {
    var t = document.getElementById('ccToast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* 账号区 / 报告页云端卡片 */
  function renderAccount() {
    var box = document.getElementById('ccAcct');
    if (!box) return;
    if (!CLOUD_ON) {
      box.innerHTML = '<div class="acct-row"><span class="avatar">◐</span><div><b>本机模式</b>' +
        '<span class="tiny">进度只保存在这台设备</span></div></div>';
      return;
    }
    if (S.sdkError) {
      box.innerHTML = '<div class="acct-row"><span class="avatar">!</span><div><b>云服务未连接</b>' +
        '<span class="tiny">' + esc(S.sdkError) + '</span></div></div>';
      return;
    }
    if (!S.session) {
      box.innerHTML = '<div class="acct-row"><span class="avatar">?</span><div><b>未登录</b>' +
        '<span class="tiny">进度只保存在本机</span></div></div>' +
        '<button class="btn sm primary block" id="ccOpen">登录 / 注册</button>';
      var b = box.querySelector('#ccOpen');
      if (b) b.addEventListener('click', openLogin);
      return;
    }
    var u = S.user || {};
    var nm = u.name || '同学';
    var initial = nm.slice(0, 1);
    var cls = S.sync === 'error' ? 'bad' : (S.sync === 'saved' ? 'ok' : 'wait');
    box.innerHTML =
      '<div class="acct-row"><span class="avatar' + (u.avatarUrl ? ' img' : '') + '">' +
      (u.avatarUrl ? '<img src="' + esc(u.avatarUrl) + '" alt="" />' : esc(initial)) + '</span>' +
      '<div><b>' + esc(nm) + '</b><span class="tiny sync-' + cls + '">' + esc(S.syncText) + '</span></div></div>' +
      '<div class="acct-actions"><button class="btn sm ghost" id="ccPull">刷新同步</button>' +
      '<button class="btn sm ghost" id="ccOut">退出</button></div>';
    box.querySelector('#ccOut').addEventListener('click', signOut);
    box.querySelector('#ccPull').addEventListener('click', function () {
      setSync('idle', '正在拉取…');
      pull();
    });
  }

  function renderReportCard() {
    var box = document.getElementById('cloudPanel');
    if (!box) return;
    if (!CLOUD_ON) {
      box.innerHTML = '<h3>进度保存</h3>' +
        '<p class="small hint">当前是自托管版本，进度保存在本机浏览器，换设备不会自动同步。' +
        '交作业请用上方「打印 / 存为 PDF」，或复制学情报告发给课程 AI 助教。</p>';
      return;
    }
    if (S.sdkError) {
      box.innerHTML = '<h3>云端同步</h3><p class="small hint">' + esc(S.sdkError) + '</p>';
      return;
    }
    if (!S.session) {
      box.innerHTML = '<h3>云端同步</h3>' +
        '<p class="small hint">现在登录，可以把这份进度保存到云端：换设备打开同一个链接就能接着做，老师也能看到你的完成情况。不登录也能正常做实验，只是记录只在本机。</p>' +
        '<div class="btn-row" style="margin-top:10px"><button class="btn primary" id="rpLogin">登录并同步</button></div>';
      var b = box.querySelector('#rpLogin');
      if (b) b.addEventListener('click', openLogin);
      return;
    }
    var c = countAll(Store.data);
    box.innerHTML = '<h3>云端同步</h3>' +
      '<div class="kv small" style="margin-top:8px">' +
      '<dt>账号</dt><dd>' + esc((S.user && S.user.name) || '已登录') + '</dd>' +
      '<dt>状态</dt><dd>' + esc(S.syncText) + '</dd>' +
      '<dt>云端记录</dt><dd>' + (S.rowId ? '已建立（' + c.done + ' / ' + c.total + '）' : '尚未建立') + '</dd>' +
      '<dt>最近同步</dt><dd>' + (S.lastSyncAt ? new Date(S.lastSyncAt).toLocaleString() : '—') + '</dd>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:10px"><button class="btn" id="rpNow">立即同步</button>' +
      '<button class="btn ghost" id="rpPull">从云端恢复</button></div>';
    box.querySelector('#rpNow').addEventListener('click', function () {
      S.dirty = true; clearTimeout(S.dirtyTimer); flush();
    });
    box.querySelector('#rpPull').addEventListener('click', function () {
      pull().then(function () { if (window.AppRefreshCurrent) window.AppRefreshCurrent(); });
    });
  }

  onUser(function () { renderAccount(); renderReportCard(); });

  /* ------------------------------------------------------------------ */
  /* 启动                                                                */
  /* ------------------------------------------------------------------ */
  function init() {
    mount();
    renderAccount();
    if (!CLOUD_ON) {
      /* 自托管模式：不初始化 SDK，只用本机存储 + 提示卡 */
      renderReportCard();
      emit();
      return;
    }
    if (!window.WorkBuddyCloud || typeof window.WorkBuddyCloud.createWorkBuddyCloud !== 'function') {
      S.sdkError = '云服务脚本未加载（当前可能离线，或直接双击本地文件打开）';
      renderAccount();
      emit();
      return;
    }
    try {
      S.sdk = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: PUBLIC_CONFIG.endpoint,
        oauthRelayBaseUrl: PUBLIC_CONFIG.oauthRelayBaseUrl,
        publishableKey: PUBLIC_CONFIG.publishableKey
      });
    } catch (e) {
      S.sdkError = '云服务初始化失败：' + (e && e.message ? e.message : '未知错误');
      renderAccount();
      emit();
      return;
    }
    bootAuth();
  }

  document.addEventListener('app:page', function () {
    renderAccount();
    renderReportCard();
  });

  /* 离开页面前把没发出去的改动推上去 */
  window.addEventListener('beforeunload', function () {
    if (S.dirty && S.session) { try { flush(); } catch (e) { } }
  });

  window.CloudApp = {
    cloudOn: CLOUD_ON,
    onUser: onUser,
    openLogin: openLogin,
    closeLogin: closeLogin,
    signOut: signOut,
    openAsk: function (ctx) { openAsk(ctx); },
    closeAsk: closeAsk,
    markDirty: markDirty,
    pull: pull,
    flushNow: function () { S.dirty = true; flush(); },
    state: function () { return S; },
    isLoggedIn: function () { return !!S.session; }
  };

  init();
})();
