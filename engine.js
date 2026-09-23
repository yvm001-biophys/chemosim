/* Explicit occupancy + motor CTMC; rates held constant within 0.2 s signal bins. */
const ResearchEngine = (() => {
  // Orthogonal controls: KD fixes equilibrium; exchange fixes relaxation at Yref=3.15 µM.
  const YREF=3.15;
  const config = p => {
    const kd=p.kd ?? ((p.koff ?? 3.15)/(p.kon ?? 1));
    const exchange=p.exchange ?? ((p.kon ?? 1)*YREF+(p.koff ?? 3.15));
    return {kd,exchange,kon:exchange/(YREF+kd),koff:exchange*kd/(YREF+kd),
      motorRate:p.motorRate ?? 2,sites:Math.round(p.sites ?? 34),hill:p.hill ?? 9.5,threshold:p.threshold ?? .5};
  };
  const bias = (q,p) => {
    if(q<=0) return 0; if(q>=1) return 1;
    return 1/(1+Math.exp(-(p.hill ?? 9.5)*(Math.log(q/(1-q))-Math.log((p.threshold ?? .5)/(1-(p.threshold ?? .5))))));
  };
  function binomial(N,q) {
    const out=new Float64Array(N+1);
    if(q<=0){out[0]=1;return out;}if(q>=1){out[N]=1;return out;}
    // Recurse outwards from the mode to avoid underflow at either endpoint.
    const m=Math.floor((N+1)*q);out[m]=1;
    for(let n=m;n<N;n++)out[n+1]=out[n]*(N-n)/(n+1)*q/(1-q);
    for(let n=m;n>0;n--)out[n-1]=out[n]*n/(N-n+1)*(1-q)/q;
    const sum=out.reduce((x,y)=>x+y,0);return out.map(x=>x/sum);
  }
  function average(q,N,B){return binomial(N,q).reduce((s,v,n)=>s+v*B[n],0);}
  function stationary(Y,p) {
    const c=config(p),N=c.sites,a=c.kon*Y,b=c.koff,w=c.motorRate;
    const pi=binomial(N,a/(a+b)),B=Array.from({length:N+1},(_,n)=>bias(n/N,c));
    // Solve (w I - Q_binding^T)x = w B*pi for x_n=P(n,CW).
    const diag=new Float64Array(N+1),rhs=new Float64Array(N+1),upper=new Float64Array(N+1);
    for(let n=0;n<=N;n++){
      diag[n]=w+a*(N-n)+b*n;rhs[n]=w*B[n]*pi[n];upper[n]=-b*(n+1);
      if(n){const f=-a*(N-n+1)/diag[n-1];diag[n]-=f*upper[n-1];rhs[n]-=f*rhs[n-1];}
    }
    const jointCW=new Float64Array(N+1);jointCW[N]=rhs[N]/diag[N];
    for(let n=N-1;n>=0;n--)jointCW[n]=(rhs[n]-upper[n]*jointCW[n+1])/diag[n];
    const cw=jointCW.reduce((s,x)=>s+x,0);
    const flux=jointCW.reduce((s,x,n)=>s+w*x*(1-B[n]),0);
    return {pi,jointCW,cw,flux,frequency:2*flux,cwDwell:flux>0?cw/flux:Infinity,ccwDwell:flux>0?(1-cw)/flux:Infinity};
  }
  function expected(r,p) {
    const c=config(p),N=c.sites,B=Array.from({length:N+1},(_,n)=>bias(n/N,c));
    let q=r.cheYP[0]/(r.cheYP[0]+c.kd),cw=stationary(r.cheYP[0],c).cw;
    r.occupancy=[q];r.cw=[cw];
    // Exact occupancy evolution; integrate dPcw/dt=w(E[B(n/N)]-Pcw).
    // RK4 substeps resolve both binding relaxation and motor relaxation.
    for(let i=1;i<r.time.length;i++){
      const a=c.kon*r.cheYP[i-1],rate=a+c.koff,eq=a/rate,dt=r.time[i]-r.time[i-1];
      const steps=Math.max(1,Math.ceil(dt*Math.max(rate,c.motorRate)/.15)),h=dt/steps;
      for(let j=0;j<steps;j++){
        const qm=eq+(q-eq)*Math.exp(-rate*h/2),qe=eq+(q-eq)*Math.exp(-rate*h);
        const f0=average(q,N,B),fm=average(qm,N,B),fe=average(qe,N,B),w=c.motorRate;
        const k1=w*(f0-cw),k2=w*(fm-cw-h*k1/2),k3=w*(fm-cw-h*k2/2),k4=w*(fe-cw-h*k3);
        cw+=h*(k1+2*k2+2*k3+k4)/6;q=qe;
      }
      r.occupancy.push(q);r.cw.push(Math.max(0,Math.min(1,cw)));
    }
    return r;
  }
  function calibrate(p,target) {
    const {Y,cw,cwDwell,ccwDwell}=target;
    if(![Y,cw,cwDwell,ccwDwell].every(Number.isFinite)||Y<=0||cw<=0||cw>=1||cwDwell<=0||ccwDwell<=0)throw Error('Invalid calibration targets');
    const dwellBias=cwDwell/(cwDwell+ccwDwell);
    if(Math.abs(cw-dwellBias)>.005)throw Error('CW bias and mean dwells are inconsistent (tolerance 0.005).');
    // Two independent constraints: dwell ratio fixes bias; sum fixes cycle flux.
    // Rounded reported bias is checked independently, not counted as a third constraint.
    let lo=.01,hi=.99;
    for(let i=0;i<55;i++){const threshold=(lo+hi)/2,c=config({...p,threshold});
      const B=Array.from({length:c.sites+1},(_,n)=>bias(n/c.sites,c));
      if(average(Y/(Y+c.kd),c.sites,B)>dwellBias)lo=threshold;else hi=threshold;
    }
    const threshold=(lo+hi)/2,flux=1/(cwDwell+ccwDwell);
    lo=.01;hi=100;
    if(stationary(Y,{...p,threshold,motorRate:hi}).flux<flux||stationary(Y,{...p,threshold,motorRate:lo}).flux>flux)throw Error('Target dwell times are outside the supported switching-rate range.');
    for(let i=0;i<55;i++){const motorRate=(lo+hi)/2;if(stationary(Y,{...p,threshold,motorRate}).flux<flux)lo=motorRate;else hi=motorRate;}
    const params={...p,threshold,motorRate:(lo+hi)/2},prediction=stationary(Y,params);
    if(Math.abs(prediction.cw-dwellBias)>1e-6)throw Error('Target bias is outside the occupancy-threshold range.');
    return {params,prediction,target:{...target},biasResidual:prediction.cw-cw};
  }
  function trace(r,p,seed) {
    const c=config(p),random=seededRandom(seed),N=c.sites;
    const st=stationary(r.cheYP[0],c),q=r.cheYP[0]/(r.cheYP[0]+c.kd);
    const bound=Array.from({length:5},()=>Array.from({length:N},()=>random()<q?1:0).reduce((a,b)=>a+b,0));
    const states=bound.map(n=>random()<(st.pi[n]>0?st.jointCW[n]/st.pi[n]:0));
    const samples=[states.slice()],occupancy=[bound.slice()],events=[],initial=states.slice();
    for(let i=1;i<r.time.length;i++) {
      let t=r.time[i-1];const end=r.time[i],a=c.kon*r.cheYP[i-1];
      while(t<end) {
        const rates=[];
        for(let m=0;m<5;m++){const b=bias(bound[m]/N,p);rates.push(a*(N-bound[m]),c.koff*bound[m],c.motorRate*(states[m]?1-b:b));}
        const total=rates.reduce((x,y)=>x+y,0);if(total<=0)break;
        t+=-Math.log(Math.max(1e-12,random()))/total;if(t>=end)break;
        let choice=random()*total,j=0;while(j<14&&choice>=rates[j])choice-=rates[j++];
        const m=Math.floor(j/3),kind=j%3;
        if(kind===0)bound[m]++;else if(kind===1)bound[m]--;else {states[m]=!states[m];events.push({time:t,motor:m,cw:states[m]});}
      }
      samples.push(states.slice());occupancy.push(bound.slice());
    }
    samples.events=events;samples.occupancy=occupancy;samples.initial=initial;samples.seed=seed;
    return samples;
  }
  function stats(tr,start=0,end=60) {
    const states=tr.initial.slice(),last=Array(5).fill(start),left=Array(5).fill(true),dwells=[];
    let time=start,cwTime=0,tumbleTime=0,bundleTime=0,switches=0;
    for(const e of tr.events)if(e.time<start)states[e.motor]=e.cw;
    function integrate(t){const n=states.filter(Boolean).length,dt=t-time;cwTime+=n*dt;tumbleTime+=(n>=2?dt:0);bundleTime+=(n===0?dt:0);time=t;}
    for(const e of tr.events){if(e.time<start||e.time>end)continue;integrate(e.time);const m=e.motor;dwells.push({motor:m,state:states[m]?'CW':'CCW',duration:e.time-last[m],left_censored:left[m],right_censored:false});last[m]=e.time;left[m]=false;states[m]=e.cw;switches++;}
    integrate(end);for(let m=0;m<5;m++)dwells.push({motor:m,state:states[m]?'CW':'CCW',duration:end-last[m],left_censored:left[m],right_censored:true});
    return {cw:cwTime/(5*(end-start)),tumble:tumbleTime/(end-start),bundle:bundleTime/(end-start),frequency:switches/(5*(end-start)),dwells};
  }
  function summary(values){const n=values.length,mean=values.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,n-1));return {n,mean,sd,low:mean-1.96*sd/Math.sqrt(n),high:mean+1.96*sd/Math.sqrt(n)};}
  return {config,bias,binomial,stationary,calibrate,expected,trace,stats,summary,YREF};
})();
