const rootStyles = getComputedStyle(document.documentElement);
const LIGHT    = rootStyles.getPropertyValue('--light-green').trim();
const CONNECT  = rootStyles.getPropertyValue('--connect-green').trim();
const H_FILL   = 'rgba(20,30,21,0.50)';
const H_BORDER = '#1A946B';

const HEAD_FONT  = 32;   
const SEQ_FONT   = 64;
const TIMER_FONT = 18;
const V_GAP      = 20;

const HEAD_C  = HEAD_FONT/2 + V_GAP;
const SEQ_C   = HEAD_C + HEAD_FONT/2 + V_GAP + SEQ_FONT/2;
const TIMER_C = SEQ_C + SEQ_FONT/2 + V_GAP + TIMER_FONT/2;
const BOX_Y   = TIMER_C + TIMER_FONT/2 + V_GAP;

const WIDTH  = 800, HEIGHT = 700;
const ROWS   = 8, COLS   = 10;
const CW     = 57.5, CH     = 50;
const SHIFT_INTERVAL = 1750;
let GAME_TIME     = 15000;
let TARGET_SCORE  = 10;
const CONNECT_TIME = 2000;
const OFFSET_X     = (WIDTH - COLS * CW) / 2;

const DIFFICULTIES = [
  { label: 'B', time: 12000, score: 10 },
  { label: 'A', time: 9000,  score: 12 },
  { label: 'A+', time: 8000, score: 12 },
  { label: 'S', time: 8000,  score: 15 }
];

let grid, target, curR, curC;
let lastShift, startTime;
let score = 0, fails = 0;
let state = 'menu', stateStart = 0, menuIndex = 0;

function randPair() {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return A[Math.floor(Math.random()*26)] + A[Math.floor(Math.random()*26)];
}
const ORDER = [];
for (let r = ROWS-1; r >= 0; r--) {
  for (let c = COLS-1; c >= 0; c--) {
    ORDER.push([r,c]);
  }
}
function shiftPuzzle(g) {
  const flat = ORDER.map(([r,c])=>g[r][c]);
  flat.unshift(flat.pop());
  ORDER.forEach(([r,c],i)=>g[r][c]=flat[i]);
}
function nextCell(r,c){ 
  c++; 
  if (c>=COLS) { c=0; r++; }
  if (r>=ROWS) r=0; 
  return [r,c]; 
}

function newRound() {
  grid = Array.from({length:ROWS}, ()=>Array.from({length:COLS}, randPair));
  target = [randPair(),randPair(),randPair(),randPair()];
  const start = Math.floor(Math.random()*ORDER.length);
  for (let i=0; i<4; i++) {
    const [r,c] = ORDER[(start+i)%ORDER.length];
    grid[r][c] = target[i];
  }
  curR = Math.floor(ROWS/2);
  curC = Math.max(0, Math.floor(COLS/2)-2);
  lastShift  = performance.now();
  startTime  = performance.now();
  state       = 'connecting';
  stateStart  = performance.now();
}

function initGame() {
  score = 0;
  fails = 0;
  GAME_TIME    = DIFFICULTIES[menuIndex].time;
  TARGET_SCORE = DIFFICULTIES[menuIndex].score;
  newRound();
}

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
ctx.textBaseline = 'middle';

function drawText(txt,size,y,color){
  ctx.fillStyle  = color;
  ctx.font       = `${size}px Consolas`;
  ctx.textAlign  = 'center';
  ctx.fillText(txt, WIDTH/2, y);
}

function update(){
  const now = performance.now();
  if (state==='connecting') {
    if (now - stateStart >= CONNECT_TIME) {
      state     = 'playing';
      startTime = now;
    }
  } else if (state==='playing') {
    if (now - lastShift >= SHIFT_INTERVAL) {
      shiftPuzzle(grid);
      lastShift = now;
    }
    if (now - startTime >= GAME_TIME) {
      fails++;
      state      = 'timeout';
      stateStart = now;
    }
  }
}

function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  if (state==='menu') {
    drawText("The Boosting Palace", HEAD_FONT, HEAD_C, LIGHT);
    drawText('Select Difficulty',
             SEQ_FONT/2,
             HEAD_C + HEAD_FONT/2 + V_GAP + SEQ_FONT/4,
             LIGHT);
    const w=120,h=160,g=30,
          total=DIFFICULTIES.length*w+(DIFFICULTIES.length-1)*g,
          startX=(WIDTH-total)/2;
    DIFFICULTIES.forEach((opt,i)=>{
      const x=startX+i*(w+g), y=BOX_Y;
      ctx.fillStyle   = (i===menuIndex? LIGHT : 'rgba(0,0,0,0.5)');
      ctx.fillRect(x,y,w,h);
      ctx.strokeStyle = LIGHT;
      ctx.lineWidth   = 3;
      ctx.strokeRect(x,y,w,h);
      ctx.fillStyle   = (i===menuIndex? 'rgba(0,0,0,0.8)' : LIGHT);
      ctx.font        = '48px Consolas';
      ctx.textBaseline= 'middle';
      ctx.fillText(opt.label, x+w/2, y+h/2);
    });
    return;
  }

  if (state==='connecting' || state==='playing') {
    ctx.shadowColor=LIGHT; ctx.shadowBlur=4;
    drawText('CONNECTING TO THE HOST', HEAD_FONT, HEAD_C, LIGHT);
    ctx.shadowBlur=0;
  }

  if (state==='connecting') {
    ctx.shadowColor=LIGHT; ctx.shadowBlur=12;
    drawText('CONNECTING...', HEAD_FONT, HEAD_C + HEAD_FONT + V_GAP, LIGHT);
    ctx.shadowBlur=0;
    return;
  }

  if (state!=='playing') {
    const ok=['connected','boostsuccess'];
    const col = ok.includes(state)? LIGHT : 'rgba(255,0,0,0.6)';
    const msgs={
      connected:   'CONNECTED!',
      boostsuccess:'SEQUENCE COMPLETED!',
      wrong:       'WRONG SEQUENCE!',
      timeout:     "TIME'S UP!",
      totalfail:   'BETTER LUCK NEXT TIME'
    };
    drawText(msgs[state], SEQ_FONT, HEIGHT/2, col);
    ctx.font      = `bold ${TIMER_FONT}px Consolas`;
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText('Press Any Key',
                 WIDTH/2,
                 HEIGHT/2 + SEQ_FONT/2 + V_GAP);
    ctx.font      = `${TIMER_FONT}px Consolas`;
    ctx.textAlign = 'center';
    return;
  }

  ctx.shadowColor=LIGHT; ctx.shadowBlur=12;
  drawText(target.slice().reverse().join(' '), SEQ_FONT, SEQ_C, LIGHT);
  ctx.shadowBlur=0;

  const rem = ((GAME_TIME - (performance.now()-startTime))/1000).toFixed(2);
  drawText(rem.padStart(5,'0') + ' SEC LEFT', TIMER_FONT, TIMER_C, '#fff');

  const R=12, x0=OFFSET_X, y0=BOX_Y, w0=COLS*CW, h0=ROWS*CH;
  ctx.fillStyle='black';
  ctx.beginPath();
  ctx.moveTo(x0+R,y0);
  ctx.lineTo(x0+w0-R,y0);
  ctx.quadraticCurveTo(x0+w0,y0,x0+w0,y0+R);
  ctx.lineTo(x0+w0,y0+h0-R);
  ctx.quadraticCurveTo(x0+w0,y0+h0,x0+w0-R,y0+h0);
  ctx.lineTo(x0+R,y0+h0);
  ctx.quadraticCurveTo(x0,y0+h0,x0,y0+h0-R);
  ctx.lineTo(x0,y0+R);
  ctx.quadraticCurveTo(x0,y0,x0+R,y0);
  ctx.closePath();
  ctx.fill();

  ctx.font='32px Consolas';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=LIGHT;
  ctx.shadowColor=LIGHT;
  ctx.shadowBlur=6;
  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      ctx.fillText(grid[r][c],
        OFFSET_X + c*CW + CW/2,
        BOX_Y     + r*CH + CH/2
      );
    }
  }
  ctx.shadowBlur=0;

  const cells=[]; let [rr,cc]=[curR,curC]; cells.push([rr,cc]);
  for (let i=0; i<3; i++) ([rr,cc]=nextCell(rr,cc), cells.push([rr,cc]));
  ctx.fillStyle = H_FILL;
  cells.forEach(([r,c])=>ctx.fillRect(OFFSET_X+c*CW, BOX_Y+r*CH, CW, CH));

  ctx.strokeStyle=H_BORDER;
  ctx.lineWidth=4;
  const groups={};
  cells.forEach(([r,c])=>(groups[r]=groups[r]||[]).push(c));
  for (let row in groups) {
    const arr = groups[row].sort((a,b)=>a-b);
    ctx.strokeRect(
      OFFSET_X + arr[0]*CW,
      BOX_Y     + row*CH,
      (arr[arr.length-1] - arr[0] + 1)*CW,
      CH
    );
  }

  ctx.font='32px Consolas';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=LIGHT;
  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      ctx.fillText(grid[r][c],
        OFFSET_X + c*CW + CW/2,
        BOX_Y     + r*CH + CH/2
      );
    }
  }
  ctx.shadowBlur=0;

  const infoY = BOX_Y + ROWS*CH + V_GAP;
  ctx.font='28px Consolas';
  ctx.textAlign='left';  ctx.fillStyle=LIGHT;
  ctx.fillText(`Score: ${score}/${TARGET_SCORE}`, OFFSET_X, infoY);
  ctx.textAlign='right'; ctx.fillStyle='red';
  ctx.fillText(`Fails: ${fails}/5`, OFFSET_X + COLS*CW, infoY);
}

function applyResult(ok) {
  ok = Boolean(ok);

  if (ok) {
    score = Math.min(TARGET_SCORE, score + 1);
    state = score >= TARGET_SCORE ? 'connected' : 'boostsuccess';
  } else {
    fails++;
    score = Math.max(0, score - 2);
    state = fails >= 5 ? 'totalfail' : 'wrong';
  }

  stateStart = performance.now();
}


window.addEventListener('keydown', e=>{
  const now = performance.now();
  if (state==='menu') {
    if (e.key==='ArrowLeft')  menuIndex = (menuIndex-1 + DIFFICULTIES.length)%DIFFICULTIES.length;
    if (e.key==='ArrowRight') menuIndex = (menuIndex+1) % DIFFICULTIES.length;
    if (e.key==='Enter')      initGame();
    return;
  }
  if (state!=='playing' && now - stateStart>=CONNECT_TIME) {
    if (state==='totalfail' || state==='connected') state='menu';
    else newRound();
    return;
  }
  if (state==='playing') {
    if (e.key.startsWith('Arrow')) {
      if (e.key==='ArrowLeft')  { curC = curC>0 ? curC-1 : COLS-1; if(curC===COLS-1) curR=(curR-1+ROWS)%ROWS; }
      if (e.key==='ArrowRight') { curC = curC<COLS-1 ? curC+1 : 0;   if(curC===0)   curR=(curR+1)%ROWS; }
      if (e.key==='ArrowUp')    { curR = curR>0 ? curR-1 : ROWS-1;   if(curR===ROWS-1) curC=(curC-1+COLS)%COLS; }
      if (e.key==='ArrowDown')  { curR = curR<ROWS-1 ? curR+1 : 0;    if(curR===0)      curC=(curC+1)%COLS; }
    }
    if (e.key==='Enter') {
      let sel=[], [r,c]=[curR,curC];
      sel.push(grid[r][c]);
      for (let i=0;i<3;i++) ([r,c]=nextCell(r,c), sel.push(grid[r][c]));
      applyResult(sel.join(',')===target.slice().reverse().join(','));
    }
  }
});

(function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
})();
