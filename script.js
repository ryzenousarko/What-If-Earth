/* ============================================================
   WHAT IF EARTH — COMBINED PHASE 1–6 ENGINE
   Phase 1: Foundation
   Phase 2: Interconnected Earth model
   Phase 3: Regional visual consequences
   Phase 4: 2026–2100 timeline simulation
   Phase 5: Interactive D3/TopoJSON globe
   Phase 6: Scenarios + local saved scenarios
   ============================================================ */

const DEFAULTS = { temperature:5, seaLevel:4, rainfall:60, forest:40, population:14, cleanEnergy:90, year:2100 };
const state = {...DEFAULTS, running:false, region:"all"};
let worldFeatures = [];
let rotation = [0, -15, 0];
let scale = 245;
let autoRotate = true;
let rotateTimer = null;

const cities = [
  {name:"New York", lon:-74, lat:40.7, region:"north", flood:1.2},
  {name:"London", lon:-0.1, lat:51.5, region:"north", flood:.9},
  {name:"Tokyo", lon:139.7, lat:35.7, region:"north", flood:1.0},
  {name:"Mumbai", lon:72.9, lat:19.1, region:"tropics", flood:1.35},
  {name:"Jakarta", lon:106.8, lat:-6.2, region:"tropics", flood:1.4},
  {name:"Lagos", lon:3.4, lat:6.5, region:"tropics", flood:1.3},
  {name:"Sydney", lon:151.2, lat:-33.9, region:"south", flood:.7},
  {name:"Cape Town", lon:18.4, lat:-33.9, region:"south", flood:.8}
];

const regions = [
  {id:"north", name:"Northern latitudes", desc:"Heat, thawing and precipitation shifts amplify at high latitudes.", heat:1.05, flood:.7, food:.75, eco:.82},
  {id:"tropics", name:"Tropical belt", desc:"Heavy rainfall, heat stress and coastal exposure interact strongly.", heat:1.35, flood:1.25, food:1.2, eco:1.12},
  {id:"south", name:"Southern latitudes", desc:"Water stress, fire risk and warming reshape ecosystems.", heat:1.18, flood:.88, food:1.0, eco:1.02},
  {id:"oceans", name:"Coasts & oceans", desc:"Sea-level rise and warming oceans drive the strongest exposure.", heat:1.0, flood:1.55, food:1.12, eco:1.35}
];

const scenarioTemplates = [
  {id:"baseline",name:"Baseline world",desc:"Moderate warming with a partial energy transition.",values:{temperature:2,seaLevel:1.4,rainfall:8,forest:31,population:10.4,cleanEnergy:58}},
  {id:"fourdeg",name:"+4°C world",desc:"High warming with large climate and ecological pressure.",values:{temperature:4,seaLevel:3.2,rainfall:35,forest:20,population:11,cleanEnergy:30}},
  {id:"green",name:"Green Energy Revolution",desc:"Fast clean-energy adoption reduces long-term pressure.",values:{temperature:1.7,seaLevel:1.1,rainfall:5,forest:34,population:10.2,cleanEnergy:95}},
  {id:"forest",name:"Mass Reforestation",desc:"Large-scale forest recovery improves ecological resilience.",values:{temperature:2.1,seaLevel:1.4,rainfall:10,forest:55,population:10.5,cleanEnergy:72}},
  {id:"population",name:"Extreme Population Growth",desc:"Demand rises rapidly as population reaches 17 billion.",values:{temperature:2.8,seaLevel:2.1,rainfall:20,forest:23,population:17,cleanEnergy:55}}
];

const $ = id => document.getElementById(id);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const lerp = (a,b,t) => a+(b-a)*t;

function fmt(v,d=0){return Number(v).toFixed(d)}
function showToast(message){
  const t=$("toast"); t.textContent=message; t.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove("show"),2200);
}
function updateLabels(){
  $("temperatureValue").textContent=`${state.temperature>=0?"+":""}${fmt(state.temperature,1)}°C`;
  $("seaLevelValue").textContent=`${fmt(state.seaLevel,1)} m`;
  $("rainfallValue").textContent=`${state.rainfall>=0?"+":""}${fmt(state.rainfall)}%`;
  $("forestValue").textContent=`${fmt(state.forest)}%`;
  $("populationValue").textContent=`${fmt(state.population,1)} B`;
  $("cleanEnergyValue").textContent=`${fmt(state.cleanEnergy)}%`;
  $("yearValue").textContent=state.year;
  $("yearSlider").value=state.year;
}

function bindControls(){
  ["temperature","seaLevel","rainfall","forest","population","cleanEnergy"].forEach(id=>{
    $(id).addEventListener("input",e=>{
      state[id]=Number(e.target.value); updateLabels();
      if(state.running) renderSimulation(false);
    });
  });
  $("yearSlider").addEventListener("input",e=>{
    state.year=Number(e.target.value); updateLabels();
    if(state.running) renderSimulation(false);
  });
  $("runSimulation").onclick=()=>{state.running=true; renderSimulation(true)};
  $("resetSimulation").onclick=()=>{
    Object.assign(state,DEFAULTS,{running:false,region:"all"});
    ["temperature","seaLevel","rainfall","forest","population","cleanEnergy"].forEach(id=>$(id).value=state[id]);
    updateLabels(); renderSimulation(false); showToast("Earth reset to the default scenario");
  };
  $("randomScenario").onclick=()=>{
    state.temperature=Number((Math.random()*8-1.5).toFixed(1));
    state.seaLevel=Number((Math.random()*7).toFixed(1));
    state.rainfall=Math.round(Math.random()*150-50);
    state.forest=Math.round(10+Math.random()*55);
    state.population=Number((6+Math.random()*12).toFixed(1));
    state.cleanEnergy=Math.round(Math.random()*100);
    syncInputs(); state.running=true; renderSimulation(true); showToast("A new Earth scenario was generated");
  };
  $("saveScenario").onclick=saveCurrentScenario;
  $("autoRotate").onclick=()=>{
    autoRotate=!autoRotate; $("autoRotate").classList.toggle("active",autoRotate);
    if(autoRotate) startRotation(); else stopRotation();
  };
  $("resetGlobe").onclick=()=>{rotation=[0,-15,0];scale=245;drawGlobe();showToast("Globe view reset")};
  document.querySelectorAll(".region-tab").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll(".region-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); state.region=btn.dataset.region; renderRegions();
  });
}
function syncInputs(){["temperature","seaLevel","rainfall","forest","population","cleanEnergy"].forEach(id=>$(id).value=state[id]);updateLabels()}

function calculate(year=2100){
  const progress=clamp((year-2026)/74,0,1);
  const temp=state.temperature*progress;
  const sea=state.seaLevel*progress;
  const rain=Math.abs(state.rainfall)*progress;
  const forestLoss=clamp((45-state.forest)/45,0,1);
  const popPressure=clamp((state.population-7.8)/12.2,0,1);
  const energyBenefit=state.cleanEnergy/100;
  const climate=clamp(22 + temp*8.4 + Math.max(0,temp-2)*5 + popPressure*10 - energyBenefit*13,0,100);
  const flood=clamp(sea*16 + Math.max(0,sea-1.5)*5 + climate*.18,0,100);
  const food=clamp(18 + temp*8 + rain*.22 + popPressure*22 + forestLoss*13 - energyBenefit*5,0,100);
  const eco=clamp(15 + temp*5.2 + forestLoss*36 + popPressure*15 + rain*.1 - energyBenefit*9,0,100);
  const resilience=clamp(100-eco + state.forest*.15 + energyBenefit*10,0,100);
  const energy=clamp(state.cleanEnergy + energyBenefit*5 - popPressure*4,0,100);
  return {progress,temp,sea,rain,climate,flood,food,eco,resilience,energy};
}
function labelScore(v){
  if(v>=75)return"Extreme pressure";
  if(v>=55)return"High pressure";
  if(v>=35)return"Moderate pressure";
  return"Lower pressure";
}
function renderSimulation(animate=true){
  const m=calculate(state.year);
  $("climateScore").textContent=fmt(m.climate);
  $("floodScore").textContent=fmt(m.flood);
  $("foodScore").textContent=fmt(m.food);
  $("ecoScore").textContent=fmt(m.eco);
  $("energyScore").textContent=fmt(m.energy);
  $("climateLabel").textContent=labelScore(m.climate);
  $("floodLabel").textContent=labelScore(m.flood);
  $("foodLabel").textContent=labelScore(m.food);
  $("ecoLabel").textContent=`${labelScore(m.eco)} · resilience ${fmt(m.resilience)}`;
  $("energyLabel").textContent=state.cleanEnergy>=80?"Strong transition":"Transition pressure";
  $("statusText").textContent=state.running?`Simulation active · ${state.year}`:"Simulation ready";
  renderConsequences(m); renderTimeline(); renderRegions(); drawGlobe();
}

function renderConsequences(m){
  const items=[
    ["🌡️","Heat stress",`Global warming reaches ${fmt(m.temp,1)}°C above baseline by ${state.year}. Heat exposure rises fastest in already-warm regions.`,m.climate],
    ["🌊","Coastal flooding",`Sea level reaches about ${fmt(m.sea,1)} m in the modeled trajectory, increasing exposure for low-lying coasts.`,m.flood],
    ["🌧️","Rainfall disruption",`${state.rainfall>=0?"+":""}${state.rainfall}% rainfall change creates uneven regional water pressure rather than a uniform global effect.`,clamp(m.rain*.7+25,0,100)],
    ["🌲","Ecosystem pressure",`${state.forest}% forest coverage changes carbon storage, habitat resilience and regional land-system feedbacks.`,m.eco],
    ["🍚","Food-system pressure",`Population, warming, rainfall variability and ecosystem loss combine into a ${labelScore(m.food).toLowerCase()} food-system signal.`,m.food],
    ["⚡","Energy transition",`${state.cleanEnergy}% clean energy reduces modeled long-term climate pressure in this simplified system.`,100-m.energy]
  ];
  $("consequenceList").innerHTML=items.map(x=>`
    <div class="consequence">
      <div class="consequence-icon">${x[0]}</div>
      <div><h3>${x[1]}</h3><p>${x[2]}</p></div>
      <span class="severity ${x[3]>=65?"high":x[3]>=40?"medium":"low"}">${x[3]>=65?"HIGH":x[3]>=40?"MED":"LOW"}</span>
    </div>`).join("");
}

function renderTimeline(){
  const host=$("timelineChart"); host.innerHTML="";
  const w=host.clientWidth||700,h=220;
  const svg=d3.select(host).append("svg").attr("viewBox",`0 0 ${w} ${h}`);
  const years=d3.range(2026,2101,2);
  const series=[
    {key:"climate",name:"Climate",fn:y=>calculate(y).climate},
    {key:"flood",name:"Flood",fn:y=>calculate(y).flood},
    {key:"food",name:"Food",fn:y=>calculate(y).food}
  ];
  const x=d3.scaleLinear().domain([2026,2100]).range([25,w-15]);
  const y=d3.scaleLinear().domain([0,100]).range([h-28,15]);
  svg.append("g").selectAll("line").data([25,50,75]).join("line")
    .attr("x1",25).attr("x2",w-15).attr("y1",d=>y(d)).attr("y2",d=>y(d))
    .attr("stroke","rgba(170,210,240,.08)");
  svg.append("g").attr("transform",`translate(0,${h-28})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")))
    .call(g=>g.selectAll("text").attr("fill","#71879a").attr("font-size","9px")).call(g=>g.select(".domain").attr("stroke","rgba(170,210,240,.12)"));
  const line=d3.line().x(d=>x(d.year)).y(d=>y(d.value)).curve(d3.curveMonotoneX);
  series.forEach((s,i)=>{
    const vals=years.map(year=>({year,value:s.fn(year)}));
    svg.append("path").datum(vals).attr("d",line).attr("fill","none")
      .attr("stroke",["#64d9ff","#ff6d73","#ffc857"][i]).attr("stroke-width",2.2).attr("opacity",.85);
  });
  const current=calculate(state.year);
  [["Climate",current.climate,"#64d9ff"],["Flood",current.flood,"#ff6d73"],["Food",current.food,"#ffc857"]].forEach((d,i)=>{
    svg.append("circle").attr("cx",x(state.year)).attr("cy",y(d[1])).attr("r",4).attr("fill",d[2]);
    svg.append("text").attr("x",x(state.year)+7).attr("y",y(d[1])+3+i*11).text(d[0]).attr("fill","#91a8ba").attr("font-size","9px");
  });
  $("timelineEvents").innerHTML=[2026,2050,2075,2100].map(year=>{
    const m=calculate(year);
    return `<div class="timeline-event"><b>${year}</b><span>Climate ${fmt(m.climate)} · Flood ${fmt(m.flood)}</span></div>`;
  }).join("");
}

function regionalMetric(r,m){
  const base=clamp((m.climate*r.heat + m.flood*r.flood + m.food*r.food + m.eco*r.eco)/4,0,100);
  return base;
}
function renderRegions(){
  const m=calculate(state.year);
  let data=regions.filter(r=>state.region==="all"||r.id===state.region);
  $("regionCards").innerHTML=data.map(r=>{
    const score=regionalMetric(r,m);
    return `<article class="region-card"><div class="region-top"><h3>${r.name}</h3><span class="region-score">${fmt(score)}/100</span></div><div class="bar"><i style="width:${score}%"></i></div><p>${r.desc}</p></article>`;
  }).join("");
}

function setupGlobe(){
  const svg=d3.select("#earthGlobe");
  const wrap=document.querySelector(".globe-wrap");
  const projection=d3.geoOrthographic().clipAngle(90).translate([wrap.clientWidth/2,wrap.clientHeight/2]).scale(scale);
  window.globeProjection=projection;
  window.globeSvg=svg;
  const path=d3.geoPath(projection);
  window.globePath=path;
  const graticule=d3.geoGraticule10();
  svg.select("#graticuleLayer").append("path").datum(graticule).attr("class","graticule").attr("fill","none").attr("stroke","rgba(120,190,225,.11)").attr("stroke-width",".6");
  svg.select("#globeOcean").attr("cx",wrap.clientWidth/2).attr("cy",wrap.clientHeight/2).attr("r",scale);
  svg.select("#globeAtmosphere").attr("cx",wrap.clientWidth/2).attr("cy",wrap.clientHeight/2).attr("r",scale+8).attr("fill","none").attr("stroke","rgba(100,217,255,.14)").attr("stroke-width","7").attr("filter","url(#glow)");
  svg.call(d3.drag().on("start",()=>stopRotation()).on("drag",(event)=>{
    rotation[0]+=event.dx*.35; rotation[1]-=event.dy*.35; rotation[1]=clamp(rotation[1],-75,75); drawGlobe();
  }).on("end",()=>{if(autoRotate)startRotation()})).on("wheel",(event)=>{
    event.preventDefault(); scale=clamp(scale-event.deltaY*.12,160,360); drawGlobe();
  },{passive:false});
  startRotation();
  window.addEventListener("resize",()=>{const w=wrap.clientWidth,h=wrap.clientHeight;projection.translate([w/2,h/2]);drawGlobe()});
  loadWorld();
}
async function loadWorld(){
  try{
    const world=await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    worldFeatures=topojson.feature(world,world.objects.countries).features;
    drawGlobe();
  }catch(e){
    $("statusText").textContent="Globe data unavailable";
  }
}
function startRotation(){
  stopRotation();
  if(!autoRotate)return;
  rotateTimer=d3.timer(()=>{rotation[0]+=0.018;drawGlobe()});
}
function stopRotation(){if(rotateTimer){rotateTimer.stop();rotateTimer=null}}
function drawGlobe(){
  if(!window.globeProjection)return;
  const wrap=document.querySelector(".globe-wrap"), svg=window.globeSvg, p=window.globeProjection, path=window.globePath;
  p.scale(scale).rotate(rotation);
  const c=p.translate();
  svg.select("#globeOcean").attr("cx",c[0]).attr("cy",c[1]).attr("r",scale);
  svg.select("#globeAtmosphere").attr("cx",c[0]).attr("cy",c[1]).attr("r",scale+8);
  svg.select("#graticuleLayer path").attr("d",path);
  const m=calculate(state.year);
  svg.select("#landLayer").selectAll("path").data(worldFeatures).join("path")
    .attr("d",path).attr("fill",d=>{
      const centroid=d3.geoCentroid(d);
      const lat=Math.abs(centroid[1]);
      const tropical=lat<23.5;
      const heat=clamp((m.climate/100)*(tropical?1.18:1),0,1);
      return `rgb(${Math.round(13+heat*100)},${Math.round(46-heat*23)},${Math.round(65-heat*25)})`;
    }).attr("stroke","rgba(140,205,230,.18)").attr("stroke-width",".55");
  const climateLayer=svg.select("#climateLayer");
  const points=cities.map(city=>({...city,xy:p([city.lon,city.lat])})).filter(d=>d.xy);
  climateLayer.selectAll("circle").data(points).join("circle")
    .attr("cx",d=>d.xy[0]).attr("cy",d=>d.xy[1])
    .attr("r",d=>2.5+regionalMetric(regions.find(r=>r.id===d.region)||regions[1],m)/35)
    .attr("fill",d=>d.flood*m.flood>45?"#ff6d73":"#ffc857").attr("opacity",.7)
    .attr("display",d=>p.invert([d.xy[0],d.xy[1]])[0]!==null && visiblePoint(d,p)?"block":"none");
  svg.select("#cityLayer").selectAll("circle").data(points).join("circle")
    .attr("cx",d=>d.xy[0]).attr("cy",d=>d.xy[1]).attr("r",1.8).attr("fill","#fff")
    .attr("display",d=>visiblePoint(d,p)?"block":"none");
}
function visiblePoint(d,p){
  const center=p.invert(p.translate());
  if(!center)return true;
  const a=d3.geoDistance([d.lon,d.lat],[-rotation[0],-rotation[1]]);
  return a<Math.PI/2;
}

function renderScenarios(){
  const saved=JSON.parse(localStorage.getItem("whatIfEarthScenarios")||"[]");
  const all=[...scenarioTemplates,...saved.map((s,i)=>({...s,id:`saved-${i}`,saved:true}))];
  $("scenarioGrid").innerHTML=all.map(s=>`
    <button class="scenario" data-scenario="${encodeURIComponent(JSON.stringify(s.values))}">
      <b>${s.name}${s.saved?" · saved":""}</b>
      <p>${s.desc}</p>
      <div class="scenario-values">
        <span>${s.values.temperature>0?"+":""}${s.values.temperature}°C</span>
        <span>${s.values.seaLevel}m sea</span>
        <span>${s.values.forest}% forest</span>
        <span>${s.values.cleanEnergy}% clean</span>
      </div>
    </button>`).join("");
  document.querySelectorAll(".scenario").forEach(btn=>btn.onclick=()=>{
    const values=JSON.parse(decodeURIComponent(btn.dataset.scenario));
    Object.assign(state,values,{year:2100,running:true});syncInputs();renderSimulation(true);showToast("Scenario loaded");
  });
  $("savedCount").textContent=`${saved.length} saved`;
}
function saveCurrentScenario(){
  const saved=JSON.parse(localStorage.getItem("whatIfEarthScenarios")||"[]");
  const name=prompt("Name this scenario:");
  if(!name)return;
  saved.push({name:name.trim()||"Custom scenario",desc:"Your saved What If Earth configuration.",values:{
    temperature:state.temperature,seaLevel:state.seaLevel,rainfall:state.rainfall,forest:state.forest,population:state.population,cleanEnergy:state.cleanEnergy
  }});
  localStorage.setItem("whatIfEarthScenarios",JSON.stringify(saved));renderScenarios();showToast("Scenario saved locally");
}

function init(){
  bindControls();updateLabels();setupGlobe();renderSimulation(false);renderScenarios();
}
init();
