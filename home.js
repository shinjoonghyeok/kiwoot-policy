(function(){
  var root=document.documentElement;root.classList.remove("nojs");
  var reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  // reveal
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.15});
  document.querySelectorAll(".rv,.final").forEach(function(n){io.observe(n)});
  // 별
  var st=document.querySelector(".stars");
  if(st){for(var i=0;i<26;i++){var s=document.createElement("i");s.style.left=Math.random()*100+"%";s.style.top=Math.random()*55+"%";s.style.animationDelay=(Math.random()*4)+"s";st.appendChild(s)}}
  // 히어로: 기웃이가 포인터(또는 스크롤)를 따라 기웃거린다. 그림은 통째로 기울일 뿐 고치지 않는다.
  var g=document.getElementById("hg"),stage=document.querySelector(".stage"),bub=document.getElementById("bub");
  if(g&&stage&&!reduce){
    var tx=0;
    function aim(cx){var r=stage.getBoundingClientRect();var d=(cx-(r.left+r.width/2))/Math.max(r.width,400);tx=Math.max(-1,Math.min(1,d));g.style.transform="translateX("+(tx*18)+"px) rotate("+(tx*7)+"deg)"}
    addEventListener("pointermove",function(e){aim(e.clientX)},{passive:true});
    var rising=false;
    addEventListener("scroll",function(){var y=Math.min(scrollY,320);g.style.bottom=(-y*.15)+"px"},{passive:true});
    setTimeout(function(){bub.classList.add("on")},1400);
    setTimeout(function(){bub.classList.remove("on")},6000);
    var poses=["g-peek-over","g-peek-over"];
    g.addEventListener("click",function(){bub.textContent="어, 들켰네요. 같이 기웃거려 볼래요?";bub.classList.add("on");setTimeout(function(){bub.classList.remove("on")},3500)});
  }else if(bub){bub.classList.add("on")}
  // 마을 데모 (예시 데이터)
  var shops=[
    {n:"골목 칼국수",x:22,y:30,c:7,say:"국물이 진해서 비 오는 날 생각나요"},
    {n:"모퉁이 분식",x:62,y:22,c:3,say:"떡볶이는 포장해서 단지 벤치에서!"},
    {n:"새벽 베이커리",x:40,y:62,c:12,say:"아침 일찍 가면 소금빵이 따뜻해요"},
    {n:"호수 돈가스",x:76,y:58,c:0,say:""},
    {n:"시장 순대국",x:16,y:74,c:5,say:"혼밥하기 편해서 자주 가요"}
  ];
  var town=document.getElementById("tmap"),pn=document.getElementById("pname"),ps=document.getElementById("psay"),pt=document.getElementById("ptip");
  if(town){
    var cur=0,state={};
    shops.forEach(function(s,i){var b=document.createElement("button");b.className="shop";b.style.left=s.x+"%";b.style.top=s.y+"%";b.type="button";
      b.innerHTML=s.n+'<span class="c"></span>';b.onclick=function(){cur=i;sel()};s.el=b;town.appendChild(b)});
    function paint(){shops.forEach(function(s,i){var v=state[i]||0,n=s.c+(v===2?1:0);s.el.classList.toggle("hot",n>=5);s.el.classList.toggle("t",v===2&&n<5);
      s.el.querySelector(".c").textContent=n>0?"😋 "+n:"👀"})}
    function sel(){var s=shops[cur],v=state[cur]||0;pn.textContent=s.n;
      ps.textContent=v===2?"“"+(s.say||"처음 먹어본 이웃이 되었어요. 한마디를 남겨 볼까요?")+"”":(s.c>0?"이웃 "+s.c+"명이 먹어봤어요. 먹어봤어요를 누르면 한마디를 볼 수 있어요.":"아직 이웃의 기록이 없어요. 가본다면 첫 이웃이 될 수 있어요.");
      document.querySelectorAll(".chip").forEach(function(c){c.setAttribute("aria-pressed",String(+c.dataset.v===v))});paint()}
    document.querySelectorAll(".chip").forEach(function(c){c.onclick=function(){state[cur]=+c.dataset.v;sel();
      pt.textContent=state[cur]===2?"이렇게 이웃의 ‘먹어봤어요’가 쌓이면 가게가 우리 동네 순위에 올라요.":"눌러 보세요. 가게마다 이웃의 한마디가 달라요."}});
    sel();
  }
  // 점 → 지도
  var cv=document.getElementById("dots");
  if(cv&&cv.getContext){
    var x=cv.getContext("2d"),W,H,pts=[],P=0,run=false;
    function size(){var d=devicePixelRatio||1;W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;x.setTransform(d,0,0,d,0,0)}
    size();addEventListener("resize",size);
    for(var i=0;i<130;i++){var a=Math.random()*6.28,r=Math.pow(Math.random(),.6);pts.push({a:a,r:r,ox:Math.random(),oy:Math.random(),k:Math.random()<.14})}
    function draw(){x.clearRect(0,0,W,H);
      pts.forEach(function(p){var mx=.5+Math.cos(p.a)*p.r*.38*(H/W+.6),my=.5+Math.sin(p.a)*p.r*.4;
        var px=(p.ox+(mx-p.ox)*P)*W,py=(p.oy+(my-p.oy)*P)*H;
        x.beginPath();x.arc(px,py,p.k&&P>.7?4.5:2.4,0,6.28);x.fillStyle=p.k&&P>.7?"#F2A8C0":"rgba(255,233,194,"+(.35+.4*P)+")";x.fill()});
      if(P>.85){x.fillStyle="rgba(248,239,233,.9)";x.font="700 15px sans-serif";x.textAlign="center";x.fillText("흩어진 한 끼가 모여 ‘우리 동네 지도’가 돼요",W/2,H-18)}
    }
    var o=new IntersectionObserver(function(es){run=es[0].isIntersecting;if(run&&!reduce)loop();if(reduce){P=1;draw()}},{threshold:.2});o.observe(cv);
    function loop(){if(!run)return;var r=cv.getBoundingClientRect(),t=(innerHeight-r.top)/(innerHeight+r.height*.2);P=reduce?1:Math.max(0,Math.min(1,(t-.25)*2.2));draw();requestAnimationFrame(loop)}
  }
})();
