const proteinDefs = [
  { id: 'cheA', name: 'CheA', role: 'ヒスチジンキナーゼ' },
  { id: 'cheY', name: 'CheY', role: '応答調節因子' },
  { id: 'cheZ', name: 'CheZ', role: '脱リン酸化促進' },
  { id: 'cheR', name: 'CheR', role: '受容体メチル化' },
  { id: 'cheB', name: 'CheB', role: '受容体脱メチル化' }
];

const defaults = { ...Upstream.defaults, cheA: 1, cheY: 1, cheZ: 1, cheR: 1, cheB: 1, motorInstability: 1, ligand: 10, stepTime: 5, ligandType: 'asp' };
const stimulusDefs = {
  measp: { kind: 'attractant', receptor: 'Tar', kd: 2.6, efficacy: 1.2 },
  asp: { kind: 'attractant', receptor: 'Tar', kd: 2.0, efficacy: 1.15 },
  ser: { kind: 'attractant', receptor: 'Tsr', kd: 8.0, efficacy: 1.15 },
  ni: { kind: 'repellent', receptor: 'Tar', kd: 20.0, efficacy: 1.05 },
  co: { kind: 'repellent', receptor: 'Tar', kd: 35.0, efficacy: .95 }
};
let state = { ...defaults };
let lastResult = null;
let lastMotorTrace = null;
let stochasticSeed = 3107;
const MOTOR_SWITCH_RATE = 2.0;
let playbackIndex = 0;
let playing = true;
let lastFrameTime = performance.now();
let flagellaPhase = 0;

const controls = document.getElementById('proteinControls');
proteinDefs.forEach(p => {
  const wrap = document.createElement('div');
  wrap.className = 'slider-row';
  wrap.innerHTML = `<div class="slider-meta"><label for="${p.id}">${p.name}<span>${p.role}</span></label><output id="${p.id}Out">1.00×</output></div><input id="${p.id}" type="range" min="-1" max="200" value="100" step="1">`;
  controls.appendChild(wrap);
});

const el = id => document.getElementById(id);
const factorFromSlider = value => Number(value)<0 ? 0 : Math.pow(4, (Number(value) - 100) / 100);
const sliderFromFactor = factor => factor<=0 ? -1 : 100 + 100 * Math.log(factor) / Math.log(4);

proteinDefs.forEach(p => {
  el(p.id).addEventListener('input', e => {
    state[p.id] = factorFromSlider(e.target.value);
    el(`${p.id}Out`).value = `${state[p.id].toFixed(2)}×`;
    clearPreset(); scheduleRun();
  });
});
el('ligand').addEventListener('input', e => { state.ligand = Number(e.target.value); el('ligandOut').value = `${state.ligand} µM`; scheduleRun(); });
el('stepTime').addEventListener('input', e => { state.stepTime = Number(e.target.value); el('stepTimeOut').value = `${state.stepTime} s`; scheduleRun(); });
el('ligandSelect').addEventListener('change', e => { state.ligandType = e.target.value; scheduleRun(); });
el('motorInstability').addEventListener('input', e => {
  state.motorInstability = factorFromSlider(e.target.value);
  el('motorInstabilityOut').value = `${state.motorInstability.toFixed(2)}×`;
  clearPreset(); scheduleRun();
});
el('runBtn').addEventListener('click', () => { stochasticSeed += 7919; runAndRender(); });
el('resetBtn').addEventListener('click', () => applyState(defaults, 'wt'));
el('playPause').addEventListener('click', () => {
  playing = !playing;
  el('playPause').textContent = playing ? 'Ⅱ' : '▶';
  el('playPause').setAttribute('aria-label', playing ? 'アニメーションを一時停止' : 'アニメーションを再生');
});
el('timeScrubber').addEventListener('input', e => {
  if (!lastResult) return;
  playbackIndex = Math.round(Number(e.target.value) / 300 * (lastResult.time.length - 1));
  renderCellScene(lastResult, playbackIndex, flagellaPhase);
});

document.querySelectorAll('.preset').forEach(btn => btn.addEventListener('click', () => {
  const presets = {
    wt: { ...defaults },
    cheZlow: { ...defaults, cheZ: .25 },
    cheYhigh: { ...defaults, cheY: 3 },
    adaptOff: { ...defaults, cheR: .25, cheB: .25 }
  };
  applyState(presets[btn.dataset.preset], btn.dataset.preset);
}));

function applyState(next, preset) {
  state = { kd:3.15, exchange:6.3, motorRate:2, sites:34, hill:9.5, threshold:.5, ...defaults, ...next };
  proteinDefs.forEach(p => {
    el(p.id).value = sliderFromFactor(state[p.id]);
    el(`${p.id}Out`).value = `${state[p.id].toFixed(2)}×`;
  });
  el('ligand').value = state.ligand; el('ligandOut').value = `${state.ligand} µM`;
  el('stepTime').value = state.stepTime; el('stepTimeOut').value = `${state.stepTime} s`;
  el('ligandSelect').value = state.ligandType;
  el('motorInstability').value = sliderFromFactor(state.motorInstability);
  el('motorInstabilityOut').value = `${state.motorInstability.toFixed(2)}×`;
  document.querySelectorAll('.preset').forEach(b => b.classList.toggle('active', b.dataset.preset === preset));
  runAndRender();
}

function clearPreset() { document.querySelectorAll('.preset').forEach(b => b.classList.remove('active')); }
let runTimer;
function scheduleRun() { clearTimeout(runTimer); runTimer = setTimeout(runAndRender, 60); }

function simulate(params) {
  const out = Upstream.simulate(params);
  if(params.inputMode==='clamp')out.cheYP.fill(params.clampY ?? 3.15);
  return ResearchEngine.expected(out, params);
}

function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function simulateMotorSwitching(r, seed) {
  return ResearchEngine.trace(r, state, seed);

}

function runAndRender() {
  lastResult = simulate(state);
  lastMotorTrace = simulateMotorSwitching(lastResult, stochasticSeed);
  playbackIndex = 0;
  const r = lastResult, metrics=r.metrics;
  const finalY=r.cheYP.at(-1),finalCW=r.cw.at(-1),finalA=r.activity.at(-1),finalAP=r.cheAP.at(-1);
  const adaptError=metrics.residualPercent??0;
  el('peakMetric').textContent=metrics.delta?`${metrics.delta.toFixed(2)} µM`:'—';
  el('responseMetric').textContent=metrics.excitation90===null?'—':`${metrics.excitation90.toFixed(2)} s`;
  el('adaptMetric').textContent=metrics.residualPercent===null?'—':`${metrics.residualPercent.toFixed(1)}%`;
  const steadyStart = Math.max(0, r.time.findIndex(t => t >= 40));
  const steadyTrace = lastMotorTrace.slice(steadyStart);
  const tumbleFraction = ResearchEngine.stats(lastMotorTrace,40,60).tumble;
  el('tumbleMetric').textContent = `${(tumbleFraction * 100).toFixed(0)}%`;
  el('receptorValue').textContent = finalA.toFixed(2);
  el('cheAPValue').textContent = finalAP.toFixed(2);
  el('cheYPValue').textContent = finalY.toFixed(2);
  el('cwValue').textContent = finalCW.toFixed(2);
  el('biasFill').style.width = `${finalCW * 100}%`;
  el('motorKoffReadout').textContent = `${state.motorInstability.toFixed(2)}×`;
  el('motorLifetimeReadout').textContent = `${(1 / state.motorInstability).toFixed(2)}×`;
  const label = adaptError < 12 ? '適応応答' : finalCW > .7 ? '高CW固定傾向' : finalCW < .05 ? '低CW固定傾向' : '部分適応';
  el('phenotypeBadge').textContent = label;
  renderChart(r); renderMotors(lastMotorTrace.at(-1)); renderTrajectory(r, lastMotorTrace); renderSensitivity(finalCW); renderCellScene(r, playbackIndex, flagellaPhase);
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * dpr); canvas.height = Math.max(1, rect.height * dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); return { ctx, w: rect.width, h: rect.height };
}

function renderChart(r) {
  const {ctx,w,h} = setupCanvas(el('signalChart'));
  const m = {l:44,r:38,t:16,b:28}, pw=w-m.l-m.r, ph=h-m.t-m.b;
  const ymax=Math.max(1,...r.cheYP)*1.1;
  ctx.clearRect(0,0,w,h); ctx.font='11px system-ui'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for(let i=0;i<=4;i++) {
    const y=m.t+ph*i/4; ctx.strokeStyle='#1d323b'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(m.l,y);ctx.lineTo(w-m.r,y);ctx.stroke();
    ctx.fillStyle='#66808a'; ctx.fillText((ymax*(1-i/4)).toFixed(1),m.l-8,y);
    ctx.textAlign='left';ctx.fillText((1-i/4).toFixed(2),w-m.r+4,y);ctx.textAlign='right';
  }
  ctx.textAlign='center';ctx.textBaseline='top';
  for(let i=0;i<=6;i++){const x=m.l+pw*i/6;ctx.fillStyle='#66808a';ctx.fillText(`${i*10}`,x,h-m.b+8);}
  const x=t=>m.l+pw*t/60, yY=v=>m.t+ph*(1-v/ymax), yC=v=>m.t+ph*(1-v);
  const sx=x(state.stepTime); ctx.fillStyle='rgba(88,166,255,.07)';ctx.fillRect(sx,m.t,w-m.r-sx,ph);ctx.strokeStyle='#58a6ff';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(sx,m.t);ctx.lineTo(sx,m.t+ph);ctx.stroke();ctx.setLineDash([]);
  drawLine(ctx,r.time,r.cheYP,x,yY,'#c7f36b',2.2); drawLine(ctx,r.time,r.cw,x,yC,'#ff9e62',1.8);
  ctx.fillStyle='#66808a';ctx.textAlign='left';ctx.fillText('CheY-P (µM)',m.l,0);ctx.textAlign='right';ctx.fillText('time (s)',w-m.r,h-14);
}
function drawLine(ctx,xs,ys,xfn,yfn,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ys.forEach((v,i)=>{const X=xfn(xs[i]),Y=yfn(v);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)});ctx.stroke();}

function renderMotors(states) {
  const arr=el('motorArray'); arr.innerHTML=''; let cwCount=0;
  states.forEach((isCW,i)=>{if(isCW)cwCount++;const u=document.createElement('div');u.className=`motor-unit ${isCW?'cw':''}`;u.innerHTML=`<div class="motor-icon">${isCW?'↻':'↺'}</div>M${i+1} · ${isCW?'CW':'CCW'}`;arr.appendChild(u);});
  const tumble=cwCount>=2; el('behaviorState').textContent=tumble?'TUMBLE':'RUN';el('behaviorState').className=`behavior ${tumble?'tumble':'run'}`;
}

function renderTrajectory(r, motorTrace) {
  const {ctx,w,h}=setupCanvas(el('trajectory')); ctx.clearRect(0,0,w,h);
  let px=w/2,py=h/2,ang=-.25; const pts=[[px,py]];
  for(let i=1;i<r.cw.length;i+=5){const tumble=motorTrace[i].filter(Boolean).length>=2;if(tumble)ang+=1.7*Math.sin(i*12.9898);else {px+=Math.cos(ang)*2.2;py+=Math.sin(ang)*2.2;}if(px<5||px>w-5){ang=Math.PI-ang;px=Math.max(5,Math.min(w-5,px));}if(py<5||py>h-5){ang=-ang;py=Math.max(5,Math.min(h-5,py));}pts.push([px,py]);}
  const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#294b53');grad.addColorStop(1,'#48e0cf');ctx.strokeStyle=grad;ctx.lineWidth=1.6;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
  const end=pts.at(-1);ctx.fillStyle='#c7f36b';ctx.beginPath();ctx.arc(end[0],end[1],3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#607983';ctx.font='10px system-ui';ctx.fillText('simulated trajectory',10,15);
}

function renderSensitivity(baseCW) {
  const factors=[...proteinDefs.map(p=>({id:p.id,name:p.name})),{id:'motorInstability',name:'Motor kₒff'}];
  const values=factors.map(p=>{const test={...state,[p.id]:state[p.id]*1.1};const cw=simulate(test).cw.at(-1);return {name:p.name,val:(cw-baseCW)/.1};});
  const max=Math.max(.01,...values.map(v=>Math.abs(v.val)));el('sensitivityBars').innerHTML=values.map(v=>`<div class="sens ${v.val<0?'negative':''}"><strong>${v.name}</strong><div class="sens-track"><i style="width:${Math.abs(v.val)/max*100}%"></i></div><output>${v.val>=0?'+':''}${v.val.toFixed(2)}</output></div>`).join('');
}

function roundedCapsule(ctx, x, y, w, h) {
  const r = h / 2;
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
}

function deterministicNoise(n) { return Math.sin(n * 91.733 + 17.13) * .5 + .5; }

function cheZMarkers(factor,x,y,w,h) {
  const slots=[0,15,3,12,5,10,6,9,1,14,2,13,4,11,7,8];
  return slots.slice(0,Math.max(0,Math.round(4*factor))).map(slot=>({x:x+w*(.30+.40*(slot%4)/3),y:y+h*(.23+.54*Math.floor(slot/4)/3),radius:Math.min(5,w*.04)}));
}

function drawFlagellum(ctx, mx, my, angle, phase, clockwise, length, color) {
  ctx.save(); ctx.translate(mx, my); ctx.rotate(angle); ctx.strokeStyle = color; ctx.lineWidth = 2.1; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(0, 0);
  // CW projected helical motion: phase advances toward the distal end.
  const dir = clockwise ? -1 : 1;
  for (let s = 2; s <= length; s += 3) {
    const amp = 4 + s * .035;
    const wave = Math.sin(s * .18 + phase * dir) * amp;
    ctx.lineTo(s, wave);
  }
  ctx.stroke(); ctx.restore();
}

function drawRotationArrow(ctx, x, y, radius, clockwise, color) {
  const start = clockwise ? -.9 : Math.PI + .9;
  const end = clockwise ? Math.PI * 1.22 : Math.PI - 1.22;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius, start, end, !clockwise); ctx.stroke();
  const a = end, dir = clockwise ? 1 : -1, px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a - dir * .6) * 7, py - Math.sin(a - dir * .6) * 7); ctx.lineTo(px - Math.cos(a + dir * .6) * 7, py - Math.sin(a + dir * .6) * 7); ctx.closePath(); ctx.fill();
}

function drawPolarCluster(ctx, cellX, cellY, cellW, cellH, side, activity, phase) {
  const poleX = side < 0 ? cellX + 10 : cellX + cellW - 10;
  const centerY = cellY + cellH * .5;
  const receptors = 17;
  ctx.save();
  for (let i = 0; i < receptors; i++) {
    const row = i % 9, layer = Math.floor(i / 9);
    const ry = centerY + (row - 4) * 14 + layer * 6;
    const curve = Math.abs((ry - centerY) / (cellH * .5));
    const rx = poleX + side * (layer * 5 + curve * 9);
    const glow = .42 + activity * .58;
    ctx.strokeStyle = `rgba(88,166,255,${glow})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx, ry - 5); ctx.lineTo(rx - side * 11, ry); ctx.lineTo(rx, ry + 5); ctx.stroke();
    ctx.fillStyle = '#48e0cf'; ctx.globalAlpha = .35 + activity * .65;
    ctx.beginPath(); ctx.arc(rx - side * 16, ry, 2.6 + .5 * Math.sin(phase * .3 + i), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const plateX = poleX - side * 24;
  ctx.strokeStyle = 'rgba(72,224,207,.65)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(plateX, centerY - 54); ctx.lineTo(plateX, centerY + 54); ctx.stroke();
  for (let i = -3; i <= 3; i++) { ctx.fillStyle = '#48e0cf'; ctx.beginPath(); ctx.arc(plateX, centerY + i * 16, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawBundleConnector(ctx, motor, joinX, joinY, index, color, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(motor.x, motor.y);
  const bendY = joinY + (index - 2) * 3;
  ctx.bezierCurveTo(motor.x - 28, motor.y + (motor.y < joinY ? -20 : 20), joinX + 45, bendY, joinX, bendY); ctx.stroke(); ctx.restore();
}

function drawFlagellarBundle(ctx, startX, centerY, phase, filaments, strength, maxLength) {
  const length = maxLength * (.58 + .42 * strength);
  for (let f = 0; f < filaments; f++) {
    ctx.save(); ctx.globalAlpha = .22 + strength * .62; ctx.strokeStyle = f % 2 ? '#9fe7d6' : '#e9f7b0'; ctx.lineWidth = 1.5 + strength * .65; ctx.beginPath();
    for (let s = 0; s <= length; s += 3) {
      const x = startX - s;
      const taper = Math.min(1, s / 32);
      const y = centerY + Math.sin(s * .19 - phase + f * .7) * (4 + s * .018) * taper + (f - (filaments - 1) / 2) * (1.8 - strength);
      s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }
}

function renderCellScene(r, idx, phase) {
  if (!r) return;
  idx = Math.max(0, Math.min(r.time.length - 1, idx));
  const canvas = el('cellScene'), {ctx,w,h} = setupCanvas(canvas);
  const time = r.time[idx], yp = r.cheYP[idx], cw = r.cw[idx], activity = r.activity[idx], ligand = r.stimulus[idx];
  const stimulus = stimulusDefs[state.ligandType] || stimulusDefs.asp;
  const isRepellent = stimulus.kind === 'repellent';
  ctx.clearRect(0,0,w,h);

  const bg = ctx.createRadialGradient(w*.5,h*.48,20,w*.5,h*.48,Math.max(w,h)*.62); bg.addColorStop(0,'rgba(26,65,73,.62)');bg.addColorStop(1,'rgba(4,13,18,.18)');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(79,126,137,.09)';ctx.lineWidth=1;for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}

  const ligandCount = Math.min(36, Math.round(ligand * .8));
  for(let i=0;i<ligandCount;i++){const lx=(deterministicNoise(i+3)*.18 + .03)*w;const ly=(deterministicNoise(i+41)*.78+.1)*h;const pulse=2.2+1.3*Math.sin(phase*.6+i);ctx.fillStyle=isRepellent?'rgba(255,111,112,.84)':'rgba(88,166,255,.82)';ctx.shadowColor=isRepellent?'#ff6f70':'#58a6ff';ctx.shadowBlur=7;ctx.beginPath();ctx.arc(lx,ly,pulse,0,Math.PI*2);ctx.fill();}
  ctx.shadowBlur=0;

  const cellW=Math.min(w*.52,560), cellH=Math.min(h*.42,175), cellX=w*.5-cellW*.5, cellY=h*.49-cellH*.5;
  ctx.save();ctx.shadowColor='rgba(72,224,207,.38)';ctx.shadowBlur=28;roundedCapsule(ctx,cellX,cellY,cellW,cellH);ctx.fillStyle='rgba(11,44,50,.95)';ctx.fill();ctx.restore();
  const membrane=ctx.createLinearGradient(cellX,cellY,cellX,cellY+cellH);membrane.addColorStop(0,'#5aa8a5');membrane.addColorStop(.18,'#164d52');membrane.addColorStop(.78,'#0b3037');membrane.addColorStop(1,'#327b78');roundedCapsule(ctx,cellX,cellY,cellW,cellH);ctx.fillStyle=membrane;ctx.fill();ctx.strokeStyle='#68d6ca';ctx.lineWidth=2;ctx.stroke();
  roundedCapsule(ctx,cellX+8,cellY+8,cellW-16,cellH-16);ctx.fillStyle='rgba(5,28,33,.82)';ctx.fill();ctx.strokeStyle='rgba(102,200,190,.28)';ctx.lineWidth=1;ctx.stroke();

  drawPolarCluster(ctx,cellX,cellY,cellW,cellH,-1,activity,phase);
  drawPolarCluster(ctx,cellX,cellY,cellW,cellH,1,activity,phase);

  const chezCount=Math.max(0,Math.round(4*state.cheZ));
  for(const {x:zx,y:zy,radius} of cheZMarkers(state.cheZ,cellX,cellY,cellW,cellH)){ctx.fillStyle='#09252b';ctx.strokeStyle='#ff6f70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(zx,zy,radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(zx-radius*.6,zy);ctx.lineTo(zx+radius*.6,zy);ctx.stroke();}
  ctx.font='11px system-ui';ctx.fillStyle='#ff9da1';ctx.textAlign='left';ctx.fillText(`CheZ ${state.cheZ.toFixed(2)}× (${chezCount} icons)`,12,65);
  const ypCount=Math.min(80,Math.round(yp*8));
  for(let i=0;i<ypCount;i++){const qx=(deterministicNoise(i+111)+.09*Math.sin(phase*.16+i))%1;const qy=(deterministicNoise(i+177)+.12*Math.cos(phase*.13+i*1.7))%1;const px=cellX+cellH*.45+Math.abs(qx)*(cellW-cellH*.9);const py=cellY+18+Math.abs(qy)*(cellH-36);ctx.fillStyle='rgba(199,243,107,.88)';ctx.shadowColor='#c7f36b';ctx.shadowBlur=5;ctx.beginPath();ctx.arc(px,py,2.1,0,Math.PI*2);ctx.fill();}
  ctx.shadowBlur=0;

  const motors=[
    {x:cellX+cellW*.17,y:cellY+6,a:-2.0},{x:cellX+cellW*.48,y:cellY+3,a:-1.5},{x:cellX+cellW*.78,y:cellY+8,a:-1.0},
    {x:cellX+cellW*.32,y:cellY+cellH-4,a:2.0},{x:cellX+cellW*.68,y:cellY+cellH-5,a:1.15}
  ];
  const motorStates=lastMotorTrace?.[idx] || [false,false,false,false,false];
  const cwCount=motorStates.filter(Boolean).length;
  const bundledCount=5-cwCount;
  const bundleStrength=Math.max(.12,bundledCount/5);
  const bundleX=cellX-8, bundleY=cellY+cellH*.5;
  motors.forEach((m,i)=>{
    if(!motorStates[i] && bundledCount>1) drawBundleConnector(ctx,m,bundleX,bundleY,i,'#9fe7d6',.32+bundleStrength*.58);
    else if(!motorStates[i]) drawFlagellum(ctx,m.x,m.y,m.a,phase,false,Math.min(155,w*.2),'#48e0cf');
    else drawFlagellum(ctx,m.x,m.y,m.a+(i-2)*.18,phase,true,Math.min(155,w*.2),'#ff9e62');
  });
  if(bundledCount>1) drawFlagellarBundle(ctx,bundleX,bundleY,phase,bundledCount,bundleStrength,Math.min(190,w*.25));
  motors.forEach((m,i)=>{const isCW=motorStates[i],color=isCW?'#ff9e62':'#48e0cf';ctx.fillStyle='#08161b';ctx.strokeStyle=color;ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(m.x,m.y,8,0,Math.PI*2);ctx.fill();ctx.stroke();drawRotationArrow(ctx,m.x,m.y,14,isCW,color);const q=(lastMotorTrace?.occupancy?.[idx]?.[i]||0)/(state.sites||34);ctx.strokeStyle='#c7f36b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(m.x,m.y,5,-Math.PI/2,-Math.PI/2+q*Math.PI*2);ctx.stroke();});

  ctx.font='600 10px system-ui';ctx.fillStyle='#71a5b0';ctx.textAlign='left';ctx.fillText('Tar/Tsr–CheA cluster',cellX+18,cellY+cellH+24);ctx.textAlign='right';ctx.fillText('Tar/Tsr–CheA cluster',cellX+cellW-18,cellY+cellH+24);
  if(bundledCount>1){ctx.textAlign='left';ctx.fillStyle=bundleStrength>.55?'#e9f7b0':'#d9b980';ctx.fillText(bundleStrength>.55?'flagellar bundle':'partial bundle',Math.max(8,bundleX-Math.min(175,w*.23)),bundleY-18);}
  if(cwCount<2){ctx.strokeStyle='rgba(72,224,207,.65)';ctx.fillStyle='#48e0cf';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cellX+cellW+18,bundleY);ctx.lineTo(cellX+cellW+70,bundleY);ctx.stroke();ctx.beginPath();ctx.moveTo(cellX+cellW+70,bundleY);ctx.lineTo(cellX+cellW+61,bundleY-5);ctx.lineTo(cellX+cellW+61,bundleY+5);ctx.closePath();ctx.fill();ctx.textAlign='left';ctx.fillStyle='#6f9da3';ctx.fillText(document.documentElement.lang==='en'?'Propulsion':'推進',cellX+cellW+24,bundleY-10);}

  ctx.fillStyle='rgba(7,16,22,.82)';ctx.strokeStyle='#27444c';ctx.lineWidth=1;const pillW=155,pillH=32;roundedCapsule(ctx,w*.5-pillW*.5,14,pillW,pillH);ctx.fill();ctx.stroke();ctx.fillStyle=cwCount>=2?'#ff9e62':'#48e0cf';ctx.font='700 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cwCount>=2?'TUMBLE · CW':'RUN · CCW',w*.5,30);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#6f8992';ctx.font='11px system-ui';ctx.fillText(`${document.documentElement.lang==='en'?'Receptor activity':'受容体活性'} ${activity.toFixed(2)}`,cellX,cellY-20);ctx.textAlign='right';ctx.fillText(`${cwCount}/5 motors CW`,cellX+cellW,cellY-20);

  const bundleLabel=cwCount===0?'完全形成':cwCount===1?'部分形成':'解離';
  el('stimulusKindLabel').textContent=isRepellent?'忌避':'誘引';el('stimulusDot').className=`dot ${isRepellent?'repellent-dot':'ligand-dot'}`;el('cgLigand').textContent=`${ligand.toFixed(0)} µM`;el('cgCheYP').textContent=`${yp.toFixed(2)} µM`;el('cgCW').textContent=cw.toFixed(2);el('bundleState').textContent=bundleLabel;el('playTime').value=`${time.toFixed(1)} s`;el('timeScrubber').value=Math.round(idx/(r.time.length-1)*300);
}

function animateCell(now) {
  const dt=Math.min(100,now-lastFrameTime);lastFrameTime=now;
  if(lastResult&&playing){const speed=el('slowMotion').checked?.22:.75;playbackIndex+=dt/1000*speed*5;if(playbackIndex>=lastResult.time.length-1)playbackIndex=0;flagellaPhase+=dt/1000*7;renderCellScene(lastResult,Math.floor(playbackIndex),flagellaPhase);}
  requestAnimationFrame(animateCell);
}

window.addEventListener('resize',()=>{if(lastResult){renderChart(lastResult);renderTrajectory(lastResult,lastMotorTrace);renderCellScene(lastResult,Math.floor(playbackIndex),flagellaPhase);}});
runAndRender();
requestAnimationFrame(animateCell);
