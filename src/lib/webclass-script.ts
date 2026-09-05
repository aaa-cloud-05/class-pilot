// WebClass から課題を取り出すクライアント側コードの生成。
//
// 出口は2つあるが、**取得ロジックは COLLECT 1か所**にまとめてある。
//   - ブックマークレット   … 手動。iOS Safari を含む全環境で動く（フォールバック）
//   - ユーザースクリプト   … Tampermonkey。WebClass を開くと自動で走る（PCの本命）
//
// どちらも「学生自身のブラウザの、学生自身のログイン済みセッション」で WebClass の
// 内部 JSON API を叩くだけ。資格情報は預からない。仕様は docs/webclass-api.md を参照。
//
// WebClass サーバへの配慮:
// - fetch のキャッシュを無効化しない。ブラウザが If-Modified-Since を自動で付けるので、
//   変化が無いコースは 304（ボディ無し）で返る。no-store やキャッシュバスターは付けない。
// - コースごとの取得は直列＋250ms間隔。年度が2年以上前のコースはそもそも叩かない。
// - ユーザースクリプトは60分のスロットルを持つ（タブを何枚開いても1回）。

/** ペイロードを URL ハッシュに載せられる上限。超えたら締切の古いものから間引く。 */
const MAX_URL = 60000;

/** 自動同期の最短間隔（ミリ秒）。 */
const THROTTLE_MS = 60 * 60 * 1000;

/**
 * 収集の本体。`unionfetchCollect(onProgress)` を定義する。
 * 成功すると `{b, cs, t, failed}` を返し、失敗はコード付きの Error を投げる
 * （呼び出し側が alert するか黙るかを選べるようにするため）。
 */
const COLLECT = `
async function unionfetchCollect(onProgress){
  var scripts=[].slice.call(document.scripts).map(function(s){return s.src}).filter(Boolean);
  var hit=scripts.filter(function(s){return /\\/js\\/webclass\\.js/.test(s)})[0];
  var path=location.pathname.match(/^(.*\\/webclass\\/)/);
  var BASE=hit?hit.replace(/js\\/webclass\\.js.*$/,''):(path?location.origin+path[1]:'');
  if(!BASE)throw new Error('NOT_WEBCLASS');
  var API=BASE+'ip_mods.php/plugin/score_summary_table';
  var getJson=async function(u){
    var r=await fetch(u,{credentials:'same-origin'});
    if(r.status===401||r.status===403)throw new Error('NOT_LOGGED_IN');
    if(!r.ok)throw new Error('HTTP_'+r.status);
    if((r.headers.get('content-type')||'').indexOf('json')<0)throw new Error('NOT_LOGGED_IN');
    return await r.json();
  };
  var courses=await getJson(API+'/courses');
  if(!Array.isArray(courses)||!courses.length)throw new Error('NO_COURSES');
  var year=new Date().getFullYear();
  courses=courses.filter(function(c){
    var m=/^(\\d{4})/.exec(String(c.group_name||''));
    return !m||(year-parseInt(m[1],10))<2;
  });
  var oldest=Date.now()-180*86400000;
  var cs=[],tasks=[],failed=0;
  for(var k=0;k<courses.length;k++){
    var c=courses[k];
    if(onProgress)onProgress(k+1,courses.length);
    cs.push({g:String(c.group_id||''),c:String(c.group_name||'')});
    try{
      var list=await getJson(API+'/contents?group_id='+encodeURIComponent(c.group_id));
      (Array.isArray(list)?list:[]).forEach(function(x){
        if(x.contents_kind!=='Question')return;
        if(x.hidden_content&&x.hidden_content!=='0')return;
        if(!x.end_date)return;
        var due=Date.parse(String(x.end_date).replace(' ','T'));
        if(!due||due<oldest)return;
        var sc=(x.scores||[])[0];
        tasks.push({k:k,i:String(x.contents_id||''),n:String(x.contents_name||''),d:String(x.end_date),s:(sc&&sc.answer_datetime)?1:0});
      });
    }catch(e){failed++}
    await new Promise(function(r){setTimeout(r,250)});
  }
  if(!tasks.length)throw new Error(failed?'FETCH_FAILED':'NO_TASKS');
  tasks.sort(function(a,b){return b.d.localeCompare(a.d)});
  var used={},remap={},kept=[];
  tasks.forEach(function(t){used[t.k]=1});
  cs.forEach(function(c,i){if(used[i]){remap[i]=kept.length;kept.push(c)}});
  return {b:BASE,cs:kept,t:tasks.map(function(x){return{k:remap[x.k],i:x.i,n:x.n,d:x.d,s:x.s}}),failed:failed};
}
`;

/** エラーコードを日本語にする（両方の出口で同じ文言を使う）。 */
const MESSAGES = `
var unionfetchMessage=function(code){
  if(code==='NOT_WEBCLASS')return 'WebClass のページで実行してください。\\n（いま開いているのは WebClass ではありません）';
  if(code==='NOT_LOGGED_IN')return 'WebClass のログインが切れています。ログインし直してから、もう一度実行してください。';
  if(code==='NO_COURSES')return 'コースを取得できませんでした。WebClass にログインした状態で実行してください。';
  if(code==='FETCH_FAILED')return '課題を取得できませんでした。WebClass にログインし直してから、もう一度実行してください。';
  if(code==='NO_TASKS')return '締切のある課題が見つかりませんでした。';
  return '取り込みに失敗しました: '+code;
};
`;

/** 読みやすく書いたソースを 1 行の javascript: URL に畳む。行コメントは使えない。 */
function inline(src: string): string {
  return "javascript:void(" + src.replace(/\s*\n\s*/g, " ").trim() + ")";
}

/**
 * 手動用ブックマークレット。取得したデータを `/import#<JSON>` として開く。
 * 拡張機能もトークンも要らないので、iOS Safari を含めどこでも動く。
 */
export function buildBookmarkletCode(origin: string): string {
  const src = `
(async function(){
  ${COLLECT}
  ${MESSAGES}
  var title=document.title;
  try{
    var r=await unionfetchCollect(function(i,n){document.title='取り込み中 '+i+'/'+n});
    document.title=title;
    var tasks=r.t;
    var build=function(list){
      return '${origin}/import#'+encodeURIComponent(JSON.stringify({v:2,b:r.b,cs:r.cs,t:list}));
    };
    var url=build(tasks);
    while(url.length>${MAX_URL}&&tasks.length>50){
      tasks=tasks.slice(0,Math.floor(tasks.length*0.8));
      url=build(tasks);
    }
    var w=window.open(url);
    if(!w)location.href=url;
  }catch(e){
    document.title=title;
    alert(unionfetchMessage(e&&e.message?e.message:String(e)));
  }
})()`;
  return inline(src);
}

/**
 * Tampermonkey 用ユーザースクリプト。WebClass を開くと自動で同期する。
 *
 * `/import` を経由せず API へ直接 POST するので、タブが開かず URL 長の制約も無い。
 * ただしクロスサイト送信になりセッション Cookie が付かないため、
 * 設定画面で発行した取り込みトークンを一度だけ貼ってもらう。
 */
export function buildUserscriptCode(origin: string): string {
  const host = new URL(origin).host;
  return `// ==UserScript==
// @name         UnionFetch — WebClass 自動同期
// @namespace    ${origin}
// @version      1.0.1
// @description  WebClass を開くと、締切のある課題を UnionFetch へ自動で取り込みます
// @updateURL    ${origin}/webclass.user.js
// @downloadURL  ${origin}/webclass.user.js
// @match        https://*/webclass/*
// @include      /^https?:\\/\\/webclass\\.[^\\/]+\\//
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      ${host}
// ==/UserScript==

/*
 * 何をするか:
 *   WebClass にログインしているあなた自身の権限で、WebClass の内部APIから
 *   「課題名・締切・提出したかどうか」だけを読み取り、UnionFetch へ送ります。
 *   氏名・学籍番号・点数は読み取りません。パスワードにも触れません。
 *
 * WebClass サーバへの負担:
 *   同期は最短60分に1回。コースごとに直列＋250ms間隔で、
 *   ブラウザのキャッシュを活かすため変化が無ければ 304 が返ります。
 */
(function () {
  "use strict";

  var ORIGIN = ${JSON.stringify(origin)};
  var TOKEN_KEY = "unionfetch:token";
  var LAST_KEY = "unionfetch:lastSync";
  var THROTTLE_MS = ${THROTTLE_MS};

${COLLECT.split("\n").map((l) => (l ? "  " + l : l)).join("\n")}

  function askToken(force) {
    var token = force ? "" : GM_getValue(TOKEN_KEY, "");
    if (token) return token;
    token = (prompt(
      "UnionFetch の取り込みトークンを貼り付けてください。\\n" +
      "（UnionFetch の 設定 → WebClass 自動同期 で発行できます）"
    ) || "").trim();
    if (token) GM_setValue(TOKEN_KEY, token);
    return token;
  }

  GM_registerMenuCommand("UnionFetch: トークンを設定し直す", function () {
    askToken(true);
  });
  GM_registerMenuCommand("UnionFetch: 今すぐ同期する", function () {
    run(true);
  });

  function send(payload, token) {
    GM_xmlhttpRequest({
      method: "POST",
      url: ORIGIN + "/api/import/webclass",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      data: JSON.stringify({ payload: payload }),
      onload: function (res) {
        if (res.status === 401) {
          // トークンが失効・再発行された。保存を消して次回に入れ直してもらう。
          GM_setValue(TOKEN_KEY, "");
          console.warn("[UnionFetch] トークンが無効です。メニューから入れ直してください。");
          return;
        }
        if (res.status < 200 || res.status >= 300) {
          console.warn("[UnionFetch] 送信に失敗:", res.status, res.responseText);
          return;
        }
        GM_setValue(LAST_KEY, String(Date.now()));
        console.log("[UnionFetch] 同期しました:", res.responseText);
      },
      onerror: function (e) {
        console.warn("[UnionFetch] 送信に失敗:", e);
      },
    });
  }

  async function run(force) {
    var last = parseInt(GM_getValue(LAST_KEY, "0"), 10) || 0;
    if (!force && Date.now() - last < THROTTLE_MS) return;

    var token = askToken(false);
    if (!token) return;

    try {
      var r = await unionfetchCollect(null);
      send({ v: 2, b: r.b, cs: r.cs, t: r.t }, token);
    } catch (e) {
      // 自動実行なので alert は出さない。手動実行(メニュー)のときだけ知らせる。
      var code = e && e.message ? e.message : String(e);
      if (force) alert("UnionFetch: 取り込みに失敗しました (" + code + ")");
      else console.log("[UnionFetch] スキップ:", code);
    }
  }

  run(false);
})();
`;
}
