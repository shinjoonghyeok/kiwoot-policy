
(function(){
  document.documentElement.classList.add('js');
  var FRAMES=[];for(var q=0;q<17;q++)FRAMES.push('img/giraffe/t_'+(q<10?'0':'')+q+'.webp');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  var introDone=false, framesReady=false, playHook=function(){};
  // 0) 입구 영상: 처음 한 번 보여 주고(기본: 다음부터 건너뛰기 체크), 상단 체크박스로 언제든 바꿀 수 있다
  (function(){
    var box=document.getElementById('intro'), v=document.getElementById('introv'), once=document.getElementById('once'), done=false, st=null;
    try{st=localStorage.getItem('kw_intro')}catch(e){}
    once.checked=st!=='0';                                           // 처음 방문(저장 없음)도 체크된 상태
    once.addEventListener('change',function(){try{localStorage.setItem('kw_intro',once.checked?'1':'0')}catch(e){}});
    function end(){if(done)return;done=true;box.classList.add('out');document.body.classList.remove('introing');setTimeout(function(){box.hidden=true},800);setTimeout(function(){introDone=true;playHook()},700);
      try{if(st===null)localStorage.setItem('kw_intro','1')}catch(e){}}   // 처음 본 뒤에는 "건너뛰기"로 저장
    if(st==='1'||reduce){box.hidden=true;introDone=true;return}
    document.body.classList.add('introing');
    document.getElementById('skip').onclick=end;
    v.addEventListener('ended',end);v.addEventListener('error',end);
    var pr=v.play();if(pr&&pr.catch)pr.catch(end);
    setTimeout(function(){if(!done&&v.paused&&v.currentTime===0)end()},2500);
  })();
  // 1) 기웃이 인사: 앱 시작 화면과 같은 움직임 (오른쪽 12° → 왼쪽 12° → 오른쪽 11° → 가운데). 프레임 교체만, 몸은 그대로
  var gi=document.getElementById('gi');
  // 할로윈 한정(한국 시간 10/29~11/7): 호박 쓴 기웃이. 기간이 지나면 저절로 평소 인사로 돌아간다
  var HW=(function(){try{var d=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Seoul'})),m=d.getMonth()+1,n=d.getDate();return (m===10&&n>=29)||(m===11&&n<=7)}catch(e){return false}})();
  if(HW){gi.src='img/giraffe/halloween.webp';gi.width=716;gi.height=980;gi.alt='호박을 쓴 기웃이';document.documentElement.classList.add('hw');
    var st=document.querySelector('.stage');if(st)st.style.aspectRatio='716/980';
    var sb=document.querySelector('.state');if(sb)sb.lastChild.textContent='해피 할로윈! 호박을 쓰고 인사해요 🎃'}
  var imgs=FRAMES.map(function(s){var i=new Image();i.src=s;return i});
  var running=false;
  function draw(i){if(HW)return;var im=imgs[i];if(im&&im.complete)gi.src=im.src}
  var KF=[[0,0],[320,12],[760,-12],[1200,11],[1750,0]];
  function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
  function angle(ms){for(var k=1;k<KF.length;k++){if(ms<=KF[k][0]){var a=KF[k-1],b=KF[k],t=(ms-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*ease(t)}}return 0}
  function play(){if(HW||reduce||running)return;running=true;var t0=performance.now();
    (function step(now){var ms=now-t0;draw(Math.max(0,Math.min(16,Math.round((angle(ms)+12)/1.5))));
      if(ms<1750)requestAnimationFrame(step);else{running=false;draw(8)}})(t0)}
  playHook=function(){if(framesReady)setTimeout(play,200)};
  var ready=0;imgs.forEach(function(i){i.onload=function(){if(++ready===imgs.length){framesReady=true;if(introDone)setTimeout(play,500)}}});
  // 스크롤할 때마다 기웃 (이미 하는 중이면 끝난 뒤에 다시)
  window.addEventListener('wheel',play,{passive:true});window.addEventListener('touchmove',play,{passive:true});
  window.addEventListener('keydown',function(e){if(['PageDown','PageUp','ArrowDown','ArrowUp',' ','Home','End'].indexOf(e.key)>=0)play()});

  // 2) 스크롤 단계마다 폰 화면 교체
  var steps=[].slice.call(document.querySelectorAll('.step')), shots=[].slice.call(document.querySelectorAll('.phone img'));
  function activate(i){steps.forEach(function(s,k){s.classList.toggle('on',k===i)});shots.forEach(function(s,k){s.classList.toggle('on',k===i)})}
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)activate(+e.target.dataset.i)})},{rootMargin:'-45% 0px -45% 0px'});
    steps.forEach(function(s){io.observe(s)});
  }

  // 3) 방문 도장판: 길을 그리며 도장이 하나씩 찍힌다
  var trail=document.getElementById('trail'), box=document.getElementById('stamps'), L=trail.getTotalLength(), N=10;
  var cols=['var(--stamp-peach)','var(--stamp-mint)','var(--stamp-sky)','var(--stamp-butter)'], NS='http://www.w3.org/2000/svg';
  var PLACES=[['해바라기 칼국수','한식 · 도보 6분','9월 12일'],['골목 베이커리','카페·베이커리 · 도보 4분','9월 15일'],['달빛 분식','분식 · 도보 5분','9월 19일'],['초록 샐러드','샐러드 · 도보 8분','9월 23일'],['오늘 커피','카페 · 도보 3분','9월 27일'],['동네 순두부','한식 · 도보 7분','10월 1일'],['별빛 라멘','일식 · 도보 9분','10월 4일'],['따끈 만두집','분식 · 도보 6분','10월 7일'],['소담 한식뷔페','한식 · 도보 5분','10월 9일'],['뭉게 케이크','디저트 · 도보 4분','10월 11일']];
  var tip=document.getElementById('tip'), route=document.getElementById('route'), selStamp=null;
  function show(g,k){var r=g.getBoundingClientRect(), b=route.getBoundingClientRect();
    tip.innerHTML='<b>'+PLACES[k][0]+'<i>예시</i></b><span>'+PLACES[k][1]+'</span><span class="when">'+PLACES[k][2]+' 다녀옴</span>';
    tip.style.left=(r.left+r.width/2-b.left)+'px';tip.style.top=(r.top-b.top)+'px';
    tip.style.transform='translate(-50%,calc(-100% - 8px))';tip.classList.add('on');
    if(selStamp)selStamp.classList.remove('sel');selStamp=g;g.classList.add('sel')}
  function hide(){tip.classList.remove('on');if(selStamp){selStamp.classList.remove('sel');selStamp=null}}
  for(var k=0;k<N;k++){
    var p=trail.getPointAtLength(L*k/(N-1)), g=document.createElementNS(NS,'g');
    g.setAttribute('class','s');g.style.setProperty('--d',(.25+k*.17)+'s');g.style.setProperty('--r',((k*37)%17-8)+'deg');
    g.innerHTML='<circle class="ring" cx="'+p.x+'" cy="'+p.y+'" r="'+(k===N-1?34:27)+'" fill="'+cols[k%4]+'" stroke="var(--stamp-ring)"/><path transform="translate('+(p.x-13)+' '+(p.y-13)+') scale(1.08)" fill="var(--stamp-star)" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>';
    g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label','도장 '+(k+1)+': '+PLACES[k][0]+', '+PLACES[k][2]+' 다녀옴 (예시)');
    (function(g,k){g.addEventListener('mouseenter',function(){show(g,k)});g.addEventListener('mouseleave',hide);g.addEventListener('focus',function(){show(g,k)});g.addEventListener('blur',hide);
      g.addEventListener('click',function(e){e.stopPropagation();selStamp===g&&tip.classList.contains('on')?hide():show(g,k)})})(g,k);
    box.appendChild(g);
  }
  document.addEventListener('click',hide);
  if(!reduce){trail.style.strokeDasharray=L;trail.style.strokeDashoffset=L;trail.style.transition='stroke-dashoffset 1.9s ease .1s'}
  function onceIn(el,fn){if(!('IntersectionObserver' in window)){fn();return}var o=new IntersectionObserver(function(es){if(es[0].isIntersecting){fn();o.disconnect()}},{threshold:.35});o.observe(el)}
  var route=document.getElementById('route');
  onceIn(route,function(){route.classList.add('go');trail.style.strokeDashoffset=0});

  // 4) CTA: 기웃이가 아래에서 빼꼼
  var cta=document.getElementById('cta');onceIn(cta,function(){cta.classList.add('go')});
})();

// App Store 버튼: 앱이 App Store 에 실제로 올라온 뒤에만 보인다(심사 중에는 숨김) — 애플 공개 조회(JSONP)로 확인해서
// 사람이 사이트를 다시 고치지 않아도 출시되는 날 저절로 나타난다. 아이폰으로 들어오면 위쪽 "앱 받기"도 App Store 로.
(function(){
  var APPSTORE='https://apps.apple.com/kr/app/id6829109381';
  window.kwAppStore=function(r){
    if(!r||!r.resultCount)return;
    var bs=document.querySelectorAll('.btn.appstore');for(var i=0;i<bs.length;i++)bs[i].hidden=false;
    if(/iPhone|iPad|iPod/.test(navigator.userAgent)){var g=document.getElementById('getapp');if(g)g.href=APPSTORE}
  };
  var s=document.createElement('script');s.async=true;
  s.src='https://itunes.apple.com/lookup?id=6829109381&country=kr&callback=kwAppStore';
  document.head.appendChild(s);
})();

// SNS 링크(kiwoot.com/?utm_source=threads&utm_medium=post 등)로 들어오면 그 유입 경로를 Play 버튼에 그대로 넘긴다
// — 플레이 콘솔 획득 보고서에서 어디서 왔는지 계속 보이게 (D-070)
(function(){
  var q=location.search.match(/[?&]utm_source=([^&#]+)/), m=location.search.match(/[?&]utm_medium=([^&#]+)/);
  if(!q)return;
  var ref=encodeURIComponent('utm_source='+decodeURIComponent(q[1])+(m?'&utm_medium='+decodeURIComponent(m[1]):''));
  var as=document.querySelectorAll('a[href^="https://play.google.com/store/apps/details?id=com.twoguns.kiwoot"]');
  for(var i=0;i<as.length;i++)as[i].href='https://play.google.com/store/apps/details?id=com.twoguns.kiwoot&referrer='+ref;
})();
