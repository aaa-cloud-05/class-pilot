// WebClass から課題を取り出すクライアント側コード（ブックマークレット）の生成。
//
// 「学生自身のブラウザの、学生自身のログイン済みセッション」で WebClass の内部 JSON API を
// 呼ぶだけ。資格情報は預からない。仕様は docs/webclass-api.md、利用者向けの説明は
// 設定 › ヘルプ ›「WebClass の取り込みについて」（src/app/settings/help/webclass）。
// WebClass を開くだけで取り込む自動取り込みは検証中のため、配信をやめた（2026-09-30）。
//
// WebClass サーバへの配慮:
// - コースごとの取得は直列（並列にしない）＋250ms間隔。年度が2年以上前のコースはそもそも読まない。
//   公式の「課題実施状況一覧」の画面は、開くたびに全コースの課題一覧を並列で読む。ここで読むのはその一部。
// - 締切がある課題は直近半年ぶん。締切が無い課題は「直近半年に更新されたもの」だけ。
// - fetch のキャッシュは無効化しない。ただし WebClass は Last-Modified を毎回いまの時刻で返すため、
//   条件付きリクエスト（304）にはならない（2026-09-30 に確認）。
//
// 所要時間の目安（13コースの場合）:
//   前面のタブ … 約5秒（通信と、コース間の待ち 3.25秒）
//   背面のタブ … 約13秒。Chrome が setTimeout を1秒以上に間引くため
//   どれも完走はする。途中でタブを閉じると中断されるだけ。

/** ペイロードを URL ハッシュに載せられる上限。超えたら締切の古いものから間引く。 */
const MAX_URL = 60000;

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
    var y=parseInt(String(c.year||''),10);
    if(!y){var m=/^(\\d{4})/.exec(String(c.group_name||''));
      y=m?parseInt(m[1],10):0}
    return !y||(year-y)<2;
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
        var d=null;
        if(x.end_date){
          var due=Date.parse(String(x.end_date).replace(' ','T'));
          if(!due||due<oldest)return;
          d=String(x.end_date);
        }else{
          var u=String(x.updated||x.created_at||'').replace(' ','T');
          var upd=u?Date.parse(u):0;
          if(!upd||upd<oldest)return;
        }
        var sc=(x.scores||[])[0];
        tasks.push({k:k,i:String(x.contents_id||''),n:String(x.contents_name||''),d:d,s:(sc&&sc.answer_datetime)?1:0});
      });
    }catch(e){failed++}
    await new Promise(function(r){setTimeout(r,250)});
  }
  if(!tasks.length)throw new Error(failed?'FETCH_FAILED':'NO_TASKS');
  tasks.sort(function(a,b){return String(b.d||'').localeCompare(String(a.d||''))});
  var used={},remap={},kept=[];
  tasks.forEach(function(t){used[t.k]=1});
  cs.forEach(function(c,i){if(used[i]){remap[i]=kept.length;kept.push(c)}});
  return {b:BASE,cs:kept,t:tasks.map(function(x){return{k:remap[x.k],i:x.i,n:x.n,d:x.d,s:x.s}}),failed:failed};
}
`;

/** エラーコードを日本語にする。 */
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

/**
 * 読みやすく書いたソースを 1 行の javascript: URL に畳む。
 *
 * **行コメント（//）は使えない。** 改行を空白に潰すので、`//` から後ろが
 * スクリプトの末尾まで丸ごとコメントになる。複数行コメントを使うこと。
 * 気づきにくい壊れ方をするので、ここで強めに書いておく。
 */
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
    /* 取得が非同期なので iOS Safari では window.open が塞がれることがある。その場合は同じタブで開く */
    var w=window.open(url);
    if(!w)location.href=url;
  }catch(e){
    document.title=title;
    alert(unionfetchMessage(e&&e.message?e.message:String(e)));
  }
})()`;
  return inline(src);
}
