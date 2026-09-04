// WebClass の内部 JSON API から課題を取得し /import#<JSON> を開くブックマークレット。
// /import と /docs/webclass の両方で使うため、生成ロジックをここに集約する。
//
// 旧版は「課題実施状況一覧」の DOM を読んでいたため、(1) 学生が普段開かないページまで
// 移動する必要があり、(2) WebClass の CSS 更新で無言で壊れた。現在は API を直接叩くので
// **WebClass のどのページで実行してもよい**。仕様は docs/webclass-api.md を参照。
//
// WebClass サーバへの配慮:
// - fetch のキャッシュを無効化しない。ブラウザが If-Modified-Since を自動で付けるので、
//   変化が無いコースは 304（ボディ無し）で返る。no-store やキャッシュバスターは付けない。
// - コースごとの取得は直列＋250ms間隔。年度が2年以上前のコースはそもそも叩かない。

/** 読みやすく書いたソースを 1 行の javascript: URL に畳む。行コメントは使えない。 */
function inline(src: string): string {
  return "javascript:void(" + src.replace(/\s*\n\s*/g, " ").trim() + ")";
}

/** ペイロードを載せる URL の上限。超えたら締切が古いものから間引く。 */
const MAX_URL = 60000;

export function buildBookmarkletCode(origin: string): string {
  const src = `
(async function(){
  try{
    var scripts=[].slice.call(document.scripts).map(function(s){return s.src}).filter(Boolean);
    var hit=scripts.filter(function(s){return /\\/js\\/webclass\\.js/.test(s)})[0];
    var BASE=hit?hit.replace(/js\\/webclass\\.js.*$/,''):location.origin+'/webclass/';
    var API=BASE+'ip_mods.php/plugin/score_summary_table';
    var getJson=async function(u){
      var r=await fetch(u,{credentials:'same-origin'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.json();
    };
    var courses=await getJson(API+'/courses');
    if(!Array.isArray(courses)||!courses.length){alert('コースを取得できませんでした。WebClass にログインした状態で実行してください。');return}
    var year=new Date().getFullYear();
    courses=courses.filter(function(c){
      var m=/^(\\d{4})/.exec(String(c.group_name||''));
      return !m||(year-parseInt(m[1],10))<2;
    });
    var oldest=Date.now()-180*86400000;
    var cs=[],tasks=[],title=document.title,failed=0;
    for(var k=0;k<courses.length;k++){
      var c=courses[k];
      document.title='取り込み中 '+(k+1)+'/'+courses.length;
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
    document.title=title;
    if(!tasks.length){alert(failed?'課題を取得できませんでした。WebClass にログインし直してから、もう一度実行してください。':'締切のある課題が見つかりませんでした。');return}
    tasks.sort(function(a,b){return b.d.localeCompare(a.d)});
    var build=function(list){
      var used={},remap={},kept=[];
      list.forEach(function(t){used[t.k]=1});
      cs.forEach(function(c,i){if(used[i]){remap[i]=kept.length;kept.push(c)}});
      var t=list.map(function(x){return{k:remap[x.k],i:x.i,n:x.n,d:x.d,s:x.s}});
      return '${origin}/import#'+encodeURIComponent(JSON.stringify({v:2,b:BASE,cs:kept,t:t}));
    };
    var url=build(tasks);
    while(url.length>${MAX_URL}&&tasks.length>50){
      tasks=tasks.slice(0,Math.floor(tasks.length*0.8));
      url=build(tasks);
    }
    var w=window.open(url);
    if(!w)location.href=url;
  }catch(e){
    alert('取り込みに失敗しました: '+(e&&e.message?e.message:e)+'\\nWebClass にログインした状態で実行してください。');
  }
})()`;
  return inline(src);
}
