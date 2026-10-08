(function(){
  document.documentElement.classList.remove("nojs");
  var reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll(".rv,.final").forEach(function(n){io.observe(n)});
  // 기웃이는 포인터를 따라 통째로 기울 뿐, 그림은 고치지 않는다
  var g=document.getElementById("hg"),art=document.querySelector(".hero-art");
  if(g&&art&&!reduce){addEventListener("pointermove",function(e){var r=art.getBoundingClientRect();var d=(e.clientX-(r.left+r.width/2))/Math.max(r.width,400);d=Math.max(-1,Math.min(1,d));g.style.transform="translateX("+(d*16)+"px) rotate("+(d*8)+"deg)"},{passive:true})}
  // 동네 체험 (예시 데이터)
  var shops=[
    {n:"골목 칼국수",x:24,y:28,c:7,say:"국물이 진해서 비 오는 날 생각나요"},
    {n:"모퉁이 분식",x:66,y:20,c:3,say:"떡볶이는 포장해서 단지 벤치에서!"},
    {n:"새벽 베이커리",x:40,y:58,c:12,say:"아침 일찍 가면 소금빵이 따뜻해요"},
    {n:"호수 돈가스",x:74,y:62,c:0,say:""},
    {n:"시장 순대국",x:22,y:80,c:5,say:"혼밥하기 편해서 자주 가요"}
  ];
  var town=document.getElementById("tmap"),pn=document.getElementById("pname"),ps=document.getElementById("psay"),pt=document.getElementById("ptip");
  if(!town)return;
  var cur=0,state={};
  shops.forEach(function(s,i){var b=document.createElement("button");b.className="shop";b.style.left=s.x+"%";b.style.top=s.y+"%";b.type="button";
    b.innerHTML=s.n+'<span class="c"></span>';b.onclick=function(){cur=i;sel()};s.el=b;town.appendChild(b)});
  function paint(){shops.forEach(function(s,i){var v=state[i]||0,n=s.c+(v===2?1:0);s.el.classList.toggle("hot",n>=5);s.el.classList.toggle("t",v===2&&n<5);
    s.el.querySelector(".c").textContent=n>0?"😋 "+n:"👀"})}
  function sel(){var s=shops[cur],v=state[cur]||0;pn.textContent=s.n;
    ps.textContent=v===2?"“"+(s.say||"처음 먹어본 이웃이 되었어요. 한마디를 남겨 볼까요?")+"”":(s.c>0?"이웃 "+s.c+"명이 먹어봤어요. ‘먹어봤어요’를 누르면 한마디를 볼 수 있어요.":"아직 이웃의 기록이 없어요. 가본다면 첫 이웃이 될 수 있어요.");
    document.querySelectorAll(".chip").forEach(function(c){c.setAttribute("aria-pressed",String(+c.dataset.v===v))});paint()}
  document.querySelectorAll(".chip").forEach(function(c){c.onclick=function(){state[cur]=+c.dataset.v;sel();
    pt.textContent=state[cur]===2?"이웃의 ‘먹어봤어요’가 쌓이면 가게가 우리 동네 순위에 올라요.":"가게마다 이웃의 한마디가 달라요."}});
  sel();
})();
