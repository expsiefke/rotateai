// RotateAI v6 — Intelligent Restaurant Operations
// Built by Phil Siefke / Expert Incubators LLC
// Stack: React 18 · Recharts · Anthropic Claude API (AI Order Engine)
// Libraries: Zustand-equivalent (Context+useReducer), Sonner-equivalent toasts,
//            TanStack-equivalent useSort hook, AutoAnimate-equivalent accordion

import { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from "react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid
} from "recharts";

// ── DATA ─────────────────────────────────────────────────────────────────────

const inventory = [
  { id:1,  name:"Black Angus Ground Beef (80/20)", cat:"Protein", unit:"lbs",  onHand:47,  par:120, use:38,  vendor:"Sysco",       shelfLife:4,  fifoRisk:true,  batches:[{date:"Mar 06",qty:28,days:2},{date:"Mar 07",qty:19,days:1}] },
  { id:2,  name:"Brioche Burger Buns",              cat:"Bakery",  unit:"units",onHand:240, par:600, use:180, vendor:"Sysco",       shelfLife:3,  fifoRisk:true,  batches:[{date:"Mar 05",qty:120,days:1},{date:"Mar 07",qty:120,days:3}] },
  { id:3,  name:"Atlantic Salmon Filets",           cat:"Protein", unit:"lbs",  onHand:28,  par:60,  use:12,  vendor:"US Foods",    shelfLife:3,  fifoRisk:false, batches:[{date:"Mar 07",qty:28,days:2}] },
  { id:4,  name:"Sharp Cheddar (Sliced)",           cat:"Dairy",   unit:"lbs",  onHand:34,  par:80,  use:14,  vendor:"Sysco",       shelfLife:14, fifoRisk:false, batches:[{date:"Mar 05",qty:34,days:10}] },
  { id:5,  name:"Applewood Smoked Bacon",           cat:"Protein", unit:"lbs",  onHand:52,  par:90,  use:16,  vendor:"Sysco",       shelfLife:10, fifoRisk:false, batches:[{date:"Mar 06",qty:52,days:7}] },
  { id:6,  name:"Russet Potatoes (Fry Cut)",        cat:"Produce", unit:"lbs",  onHand:180, par:300, use:48,  vendor:"US Foods",    shelfLife:7,  fifoRisk:false, batches:[{date:"Mar 07",qty:180,days:4}] },
  { id:7,  name:"Romaine Lettuce",                  cat:"Produce", unit:"heads",onHand:24,  par:60,  use:8,   vendor:"US Foods",    shelfLife:5,  fifoRisk:true,  batches:[{date:"Mar 04",qty:10,days:0},{date:"Mar 06",qty:14,days:2}] },
  { id:8,  name:"Pretzel Buns",                     cat:"Bakery",  unit:"units",onHand:180, par:300, use:40,  vendor:"Klosterman", shelfLife:5,  fifoRisk:false, batches:[{date:"Mar 07",qty:180,days:3}] },
  { id:9,  name:"Blue Cheese Crumbles",             cat:"Dairy",   unit:"lbs",  onHand:18,  par:30,  use:3.5, vendor:"Sysco",       shelfLife:21, fifoRisk:false, batches:[{date:"Mar 05",qty:18,days:17}] },
  { id:10, name:"Avocado (Fresh)",                  cat:"Produce", unit:"each", onHand:36,  par:80,  use:18,  vendor:"US Foods",    shelfLife:3,  fifoRisk:true,  batches:[{date:"Mar 05",qty:18,days:0},{date:"Mar 06",qty:18,days:1}] },
  { id:11, name:"Sweet Potato (Fry Cut)",           cat:"Produce", unit:"lbs",  onHand:90,  par:150, use:22,  vendor:"Sysco",       shelfLife:6,  fifoRisk:false, batches:[{date:"Mar 07",qty:90,days:4}] },
];

const kegs = [
  { id:"k1", name:"Jai Alai IPA",        brewery:"Cigar City Brewing",  style:"IPA",           size:"1/2 bbl", ozTotal:1984, ozLeft:310,  dailyOz:248, costPerKeg:185, sellPricePerPint:7.50, color:"#f08200", rotating:true,  note:"Fastest handle. Kicking tonight — call rep NOW." },
  { id:"k2", name:"Free Dive IPA",        brewery:"Coppertail Brewing",  style:"Hazy IPA",      size:"1/2 bbl", ozTotal:1984, ozLeft:820,  dailyOz:180, costPerKeg:172, sellPricePerPint:7.50, color:"#4a9eff", rotating:true,  note:"On pace. 3.6 days left." },
  { id:"k3", name:"The Magistrate Stout", brewery:"Angry Chair Brewing", style:"Imperial Stout",size:"1/6 bbl", ozTotal:661,  ozLeft:480,  dailyOz:55,  costPerKeg:95,  sellPricePerPint:8.00, color:"#a78bff", rotating:true,  note:"Slow mover. 8.7 days. Feature push needed." },
  { id:"k4", name:"Bud Light",            brewery:"Anheuser-Busch",      style:"Domestic Lager",size:"1/2 bbl", ozTotal:1984, ozLeft:960,  dailyOz:310, costPerKeg:128, sellPricePerPint:5.00, color:"#4a9eff", rotating:false, note:"3.1 days. Order replacement today." },
  { id:"k5", name:"Miller Lite",          brewery:"Molson Coors",        style:"Domestic Lager",size:"1/2 bbl", ozTotal:1984, ozLeft:1450, dailyOz:220, costPerKeg:122, sellPricePerPint:5.00, color:"#ffaa33", rotating:false, note:"6.6 days remaining." },
  { id:"k6", name:"Corona Extra",         brewery:"Constellation",       style:"Mexican Lager", size:"1/4 bbl", ozTotal:992,  ozLeft:720,  dailyOz:124, costPerKeg:110, sellPricePerPint:6.00, color:"#00c853", rotating:false, note:"5.8 days. Moves hard in warm weather." },
];

const wineProgram = {
  taps: [
    { id:"wt1", name:"Underwood Pinot Gris",      producer:"Union Wine Co",    type:"White",    kegSize:"20L", ozTotal:676, ozLeft:420, dailyOz:85, costPerKeg:95,  sellPer5oz:9.00,  color:"#ffd580", note:"House white on tap. Solid velocity." },
    { id:"wt2", name:"The Crusher Cabernet Sauv", producer:"Oak Ridge Winery", type:"Red",      kegSize:"20L", ozTotal:676, ozLeft:180, dailyOz:72, costPerKeg:88,  sellPer5oz:9.00,  color:"#c084fc", note:"House red. 2.5 days left — order now." },
    { id:"wt3", name:"Mionetto Prosecco on Tap",  producer:"Mionetto",         type:"Sparkling",kegSize:"20L", ozTotal:676, ozLeft:510, dailyOz:48, costPerKeg:110, sellPer5oz:10.00, color:"#a3e635", note:"Sparkling on tap. Spring Break spike expected." },
  ],
  bottles: [
    { id:"w1", name:"Beringer Chardonnay",        type:"White", bottlesOnHand:4, glassesPerBottle:5, costPerBottle:8.50,  sellPerGlass:9.00,  openBottle:{openedDays:2,note:"Opened Mar 06 — sell tonight or discard"} },
    { id:"w2", name:"Cabernet Sauvignon (House)",  type:"Red",   bottlesOnHand:7, glassesPerBottle:5, costPerBottle:9.00,  sellPerGlass:9.00,  openBottle:{openedDays:1,note:"Opened Mar 07 — good 2 more days"} },
    { id:"w5", name:"Meiomi Pinot Noir",           type:"Red",   bottlesOnHand:9, glassesPerBottle:5, costPerBottle:14.00, sellPerGlass:12.00, openBottle:null },
    { id:"w6", name:"Kim Crawford Sauv Blanc",     type:"White", bottlesOnHand:3, glassesPerBottle:5, costPerBottle:10.00, sellPerGlass:10.00, openBottle:null },
  ]
};

const liquor = [
  { id:"l1", name:"Tito's Handmade Vodka",  cat:"Well",    size:"1.75L", bottlesOnHand:4, ozPerBottle:59.2, dailyOzUsed:18.4, costPerBottle:28.00, sellPer:8.00,  pourCostTarget:18, pourCostActual:22 },
  { id:"l2", name:"Bacardi White Rum",       cat:"Well",    size:"1.75L", bottlesOnHand:3, ozPerBottle:59.2, dailyOzUsed:12.0, costPerBottle:24.00, sellPer:8.00,  pourCostTarget:16, pourCostActual:18 },
  { id:"l3", name:"Jim Beam Bourbon",        cat:"Well",    size:"1.75L", bottlesOnHand:5, ozPerBottle:59.2, dailyOzUsed:14.2, costPerBottle:26.00, sellPer:8.00,  pourCostTarget:18, pourCostActual:19 },
  { id:"l4", name:"Tanqueray Gin",           cat:"Well",    size:"1.75L", bottlesOnHand:2, ozPerBottle:59.2, dailyOzUsed:8.5,  costPerBottle:32.00, sellPer:8.00,  pourCostTarget:20, pourCostActual:20 },
  { id:"l5", name:"Jack Daniel's Tennessee", cat:"Call",    size:"750mL", bottlesOnHand:8, ozPerBottle:25.4, dailyOzUsed:18.8, costPerBottle:22.00, sellPer:10.00, pourCostTarget:20, pourCostActual:28 },
  { id:"l6", name:"Patrón Silver Tequila",   cat:"Premium", size:"750mL", bottlesOnHand:3, ozPerBottle:25.4, dailyOzUsed:10.4, costPerBottle:38.00, sellPer:12.00, pourCostTarget:22, pourCostActual:24 },
  { id:"l7", name:"Ketel One Vodka",         cat:"Premium", size:"750mL", bottlesOnHand:4, ozPerBottle:25.4, dailyOzUsed:12.2, costPerBottle:26.00, sellPer:10.00, pourCostTarget:20, pourCostActual:21 },
  { id:"l8", name:"Maker's Mark Bourbon",    cat:"Call",    size:"750mL", bottlesOnHand:6, ozPerBottle:25.4, dailyOzUsed:9.8,  costPerBottle:26.00, sellPer:10.00, pourCostTarget:20, pourCostActual:22 },
];

const weather = [
  {day:"TODAY",icon:"☀️",high:84,low:68,precip:5,  note:"Peak outdoor dining"},
  {day:"MON",  icon:"⛅",high:81,low:66,precip:15, note:"Normal volume"},
  {day:"TUE",  icon:"🌧️",high:74,low:63,precip:75, note:"Rain — traffic slows"},
  {day:"WED",  icon:"🌧️",high:72,low:62,precip:80, note:"Cold front"},
  {day:"THU",  icon:"⛅",high:76,low:61,precip:30, note:"Recovery day"},
  {day:"FRI",  icon:"☀️",high:82,low:65,precip:8,  note:"Weekend surge"},
  {day:"SAT",  icon:"☀️",high:86,low:67,precip:5,  note:"Peak weekend"},
];

const events = [
  {name:"Spring Break Wave 1",days:9, impact:"HIGH",color:"#f08200",icon:"🏖️",adjust:"+35% burgers · +45% draft beer · +20% apps"},
  {name:"St. Patrick's Day",  days:9, impact:"HIGH",color:"#00c853",icon:"🍀",adjust:"+60% draft beer · +40% Irish whiskey · +25% apps"},
  {name:"March Madness Peak", days:14,impact:"MED", color:"#ffaa33",icon:"🏀",adjust:"+20% wings · +30% beer · +25% call liquor"},
  {name:"Spring Break Wave 2",days:16,impact:"HIGH",color:"#f08200",icon:"🌊",adjust:"+40% seafood · +35% burgers · +50% beer/seltzer"},
  {name:"Easter Weekend",     days:23,impact:"MED", color:"#ffaa33",icon:"🐣",adjust:"+20% prosecco · +15% brunch cocktails · +10% wine"},
];

const wasteHistory = [
  {week:"Jan W3",waste:4210,rec:0},{week:"Jan W4",waste:3980,rec:0},{week:"Feb W1",waste:4450,rec:0},
  {week:"Feb W2",waste:3820,rec:890},{week:"Feb W3",waste:3540,rec:1100},{week:"Feb W4",waste:3210,rec:1380},
  {week:"Mar W1",waste:3820,rec:1240},
];

const theftSignals = {
  overallRiskScore:74,estimatedWeeklyExposure:420,estimatedAnnualExposure:21840,flaggedShifts:3,
  shiftData:[
    {shift:"Fri PM",bartender:"Shift A",pourCost:31,target:20,voids:4,comps:3,shrinkage:48,salesIndex:1.18,riskScore:88,riskLabel:"HIGH",pattern:"SYSTEMATIC",
     signals:["Pour cost 11pts above target every Fri PM","4 voids after cash tenders in last 3 weeks","Tito's depletes 40% faster this shift vs. others","Shrinkage not matching rainy night low-volume pattern"]},
    {shift:"Sat PM",bartender:"Shift A",pourCost:29,target:20,voids:3,comps:2,shrinkage:36,salesIndex:1.42,riskScore:71,riskLabel:"HIGH",pattern:"SYSTEMATIC",
     signals:["Same bartender as Fri PM — cross-shift pattern","High volume partially masks shrinkage","Jack Daniel's depletion 32% above POS sales","Comp rate 2.1x bar average"]},
    {shift:"Wed PM",bartender:"Shift B",pourCost:24,target:20,voids:1,comps:4,shrinkage:18,salesIndex:0.82,riskScore:42,riskLabel:"MED",pattern:"UNCLEAR",
     signals:["Elevated comps on low-volume night","Single void — may be training issue","Pour cost within normal range","Monitor next 2 weeks"]},
    {shift:"Mon PM",bartender:"Shift C",pourCost:21,target:20,voids:0,comps:1,shrinkage:8, salesIndex:0.76,riskScore:12,riskLabel:"LOW",pattern:"NORMAL",signals:["Within normal variance","No void or comp anomalies"]},
    {shift:"Tue PM",bartender:"Shift C",pourCost:20,target:20,voids:0,comps:0,shrinkage:4, salesIndex:0.71,riskScore:8, riskLabel:"LOW",pattern:"NORMAL",signals:["Clean shift — no flags","Zero voids"]},
    {shift:"Thu PM",bartender:"Shift D",pourCost:22,target:20,voids:1,comps:2,shrinkage:12,salesIndex:0.94,riskScore:22,riskLabel:"LOW",pattern:"NORMAL",signals:["Minor variance within range","Single void consistent with order correction"]},
  ],
  productAnomalies:[
    {product:"Jack Daniel's Tennessee",expected:18.8,depleted:26.2,gap:7.4,gapVal:62,riskLevel:"HIGH",note:"POS shows 18.8 oz/day sold. Bottle depleting at 26.2 oz/day. 7.4 oz/day unaccounted = ~$62/week."},
    {product:"Tito's Handmade Vodka",  expected:16.2,depleted:21.8,gap:5.6,gapVal:30,riskLevel:"HIGH",note:"Well spirit — high velocity masks overpouring. 5.6 oz/day gap concentrated on Fri/Sat shifts."},
    {product:"Patrón Silver",          expected:9.8, depleted:11.2,gap:1.4,gapVal:11,riskLevel:"MED", note:"Minor gap may be recipe variance. Flag if it widens."},
    {product:"Jai Alai IPA (tap)",     expected:248, depleted:271, gap:23, gapVal:22,riskLevel:"MED", note:"23 oz/day over expected. Small overpouring on fastest handle compounds fast."},
    {product:"House Cab (wine tap)",   expected:64,  depleted:72,  gap:8,  gapVal:14,riskLevel:"LOW", note:"Within acceptable range. Wine tap pours harder to control precisely."},
  ],
  voidComps:[
    {date:"Mar 07 Fri",shift:"Shift A",type:"VOID",item:"Jack Daniel's (2x)",  amount:20.00,tender:"CASH",note:"Voided after cash payment tendered. No manager approval logged."},
    {date:"Mar 07 Fri",shift:"Shift A",type:"VOID",item:"Tito's Soda (3x)",    amount:24.00,tender:"CASH",note:"Third void this bartender in 3 weeks. Pattern emerging."},
    {date:"Feb 28 Fri",shift:"Shift A",type:"VOID",item:"Maker's Mark (2x)",   amount:20.00,tender:"CASH",note:"Same shift, same tender type."},
    {date:"Mar 05 Wed",shift:"Shift B",type:"COMP",item:"Draft Beer (4x)",     amount:28.00,tender:"N/A", note:"4 comps on a slow Wednesday. Exceeds manager-approved limit of 2."},
    {date:"Mar 06 Thu",shift:"Shift D",type:"COMP",item:"Appetizer + cocktail",amount:22.00,tender:"N/A", note:"Single comp — within normal range."},
    {date:"Mar 01 Sat",shift:"Shift A",type:"VOID",item:"Patrón shots (3x)",   amount:36.00,tender:"CASH",note:"High-value void. Patrón depletion was high this shift."},
  ],
  weeklyPattern:[
    {week:"Jan W3",normal:180,flagged:52},{week:"Jan W4",normal:175,flagged:48},{week:"Feb W1",normal:178,flagged:62},
    {week:"Feb W2",normal:170,flagged:68},{week:"Feb W3",normal:172,flagged:74},{week:"Feb W4",normal:168,flagged:78},
    {week:"Mar W1",normal:174,flagged:92},
  ]
};

const wasteByCategory = {
  Proteins:{color:"#ff5555",trend:"-12%",totalVal:1222,insight:"FIFO failures are the root cause. Ground beef and salmon account for 78% of protein waste.",pattern:"FIFO FAILURES",
    items:[
      {name:"Black Angus Ground Beef",weeklyWaste:380,pct:31,trend:"-8%", cause:"FIFO",      shelfDays:4, note:"Mar 06 batch not rotated before Mar 07 stock opened.",weeks:[420,395,460,380,350,310,390,380]},
      {name:"Atlantic Salmon Filets", weeklyWaste:298,pct:24,trend:"-18%",cause:"OVER-ORDER", shelfDays:3, note:"3-day shelf life with 2x weekly delivery. Par too high by ~8 lbs.",weeks:[340,320,380,298,280,265,310,298]},
      {name:"Applewood Smoked Bacon", weeklyWaste:310,pct:25,trend:"-5%", cause:"PAR",        shelfDays:10,note:"Weekend-heavy usage means Mon/Tue orders sit.",weeks:[290,310,320,310,295,280,320,310]},
      {name:"Chicken Breast (8oz)",   weeklyWaste:144,pct:12,trend:"-14%",cause:"PREP TRIM",  shelfDays:5, note:"Trim waste at butchering station. 5-8% waste per case.",weeks:[160,155,170,144,135,130,148,144]},
      {name:"Shrimp (21/25ct)",       weeklyWaste:90, pct:7, trend:"-22%",cause:"OVER-ORDER", shelfDays:3, note:"Seasonal item. Par still at summer levels.",weeks:[120,110,130,90,85,80,95,90]},
    ]},
  Produce:{color:"#ffaa33",trend:"-8%",totalVal:917,insight:"Overordering is the dominant pattern. Romaine and sweet potato account for 62% of produce waste.",pattern:"STALE PAR LEVELS",
    items:[
      {name:"Romaine Lettuce",        weeklyWaste:237,pct:26,trend:"-6%", cause:"PAR",       shelfDays:5,note:"Par set for summer peak. Off-season demand runs 35% lower.",weeks:[280,265,310,237,225,210,240,237]},
      {name:"Sweet Potato (Fry Cut)", weeklyWaste:229,pct:25,trend:"-4%", cause:"PAR",       shelfDays:6,note:"200 lbs ordered, ~128 used every week. Never adjusted.",weeks:[250,240,270,229,220,215,235,229]},
      {name:"Avocado (Fresh)",        weeklyWaste:183,pct:20,trend:"-10%",cause:"PAR",       shelfDays:3,note:"100 ordered weekly. Usage 68-74. 3-day shelf = discard cycle.",weeks:[210,200,220,183,175,165,190,183]},
      {name:"Russet Potatoes",        weeklyWaste:128,pct:14,trend:"-12%",cause:"OVER-ORDER",shelfDays:7,note:"Par 15% over. Low unit cost masks the problem.",weeks:[150,140,160,128,120,115,130,128]},
      {name:"Tomatoes (Roma)",        weeklyWaste:85, pct:9, trend:"-18%",cause:"FIFO",      shelfDays:5,note:"Sitting behind newer stock. FIFO fix would cut this 40%.",weeks:[100,95,115,85,80,75,90,85]},
      {name:"Mixed Greens",           weeklyWaste:55, pct:6, trend:"+2%", cause:"PORTION",   shelfDays:4,note:"Portion creep on salad builds. Retraining needed.",weeks:[45,50,50,55,60,55,50,55]},
    ]},
  Bakery:{color:"#f08200",trend:"-22%",totalVal:611,insight:"Best improvement this period. FIFO enforcement cut bakery waste significantly.",pattern:"FIFO FIXES WORKING",
    items:[
      {name:"Brioche Burger Buns",weeklyWaste:390,pct:64,trend:"-28%",cause:"FIFO",       shelfDays:3,note:"FIFO labeling reduced end-of-day discards from ~80 to ~22 units/day.",weeks:[580,550,620,390,360,330,410,390]},
      {name:"Pretzel Buns",       weeklyWaste:112,pct:18,trend:"-15%",cause:"PAR",        shelfDays:5,note:"Par tightened from 300 to 250. Still improving.",weeks:[140,130,150,112,105,100,120,112]},
      {name:"Burger Buns (Std)",  weeklyWaste:62, pct:10,trend:"-8%", cause:"OVER-ORDER", shelfDays:4,note:"Secondary SKU. Could consolidate with brioche.",weeks:[70,68,75,62,58,55,65,62]},
      {name:"Dinner Rolls",       weeklyWaste:47, pct:8, trend:"-10%",cause:"PORTIONING", shelfDays:3,note:"Table service rolls. Uneaten discarded per health code.",weeks:[55,52,60,47,44,42,50,47]},
    ]},
  "Beer/Keg":{color:"#4a9eff",trend:"+2%",totalVal:535,insight:"Only category trending wrong. Magistrate Stout ordered 2x/week, only 1 used.",pattern:"SLOW HANDLE OVERORDER",
    items:[
      {name:"The Magistrate Stout",   weeklyWaste:245,pct:46,trend:"+8%",cause:"PAR",  note:"1 keg/week consumed, 2 ordered. Drop to 1 immediately.",weeks:[190,190,190,245,245,245,190,245]},
      {name:"Seasonal Craft Rotator", weeklyWaste:148,pct:28,trend:"+5%",cause:"PAR",  note:"55 oz/day on 661 oz keg. Feature or swap.",weeks:[110,120,130,148,150,155,140,148]},
      {name:"Craft Can Surplus",      weeklyWaste:92, pct:17,trend:"-4%",cause:"ORDER",note:"Can orders not adjusted for tap additions.",weeks:[105,100,110,92,88,82,95,92]},
      {name:"Line Cleaning Waste",    weeklyWaste:50, pct:9, trend:"0%", cause:"OPS",  note:"Standard line cleaning. Not reducible below ~40 oz/line/week.",weeks:[50,50,50,50,50,50,50,50]},
    ]},
  Wine:{color:"#a78bff",trend:"-18%",totalVal:306,insight:"Open bottle management is the core problem. House Chardonnay alone is 55% of wine waste.",pattern:"OPEN BOTTLE DISCARD",
    items:[
      {name:"Beringer Chardonnay (BTL)",       weeklyWaste:168,pct:55,trend:"-12%",cause:"OPEN BTL",  note:"Opened Fri, discarded Mon. Orders 18/wk, sells 11-14. Reduce par to 13.",weeks:[210,195,230,168,155,140,175,168]},
      {name:"Cabernet Sauv (BTL)",             weeklyWaste:75, pct:25,trend:"-22%",cause:"OPEN BTL",  note:"Improving since open bottle tracking added.",weeks:[100,95,115,75,70,62,80,75]},
      {name:"Kim Crawford SB (BTL)",           weeklyWaste:38, pct:12,trend:"-28%",cause:"OVER-ORDER",note:"Solid mover. Par dialing in.",weeks:[55,50,60,38,35,32,42,38]},
      {name:"The Crusher Cab (WINE TAP)",      weeklyWaste:18, pct:6, trend:"-5%", cause:"KEG WASTE", note:"Wine tap end-of-keg purge. Normal for changeover.",weeks:[22,20,25,18,16,14,20,18]},
      {name:"Underwood Pinot Gris (WINE TAP)", weeklyWaste:7,  pct:2, trend:"-8%", cause:"KEG WASTE", note:"Minimal. Wine tap performing well on velocity.",weeks:[10,9,12,7,6,5,8,7]},
    ]},
  Spirits:{color:"#00c853",trend:"-5%",totalVal:229,insight:"Pour cost variance AND shrinkage signals. Jack Daniel's and Tito's show systematic POS vs. depletion gaps.",pattern:"SHRINKAGE SIGNALS",
    items:[
      {name:"Jack Daniel's Tennessee",weeklyWaste:98, pct:43,trend:"+4%", cause:"⚠️ SHRINKAGE",note:"28% pour cost vs. 20% target. Also 7.4 oz/day unaccounted vs. POS.",weeks:[80,85,90,98,100,102,92,98]},
      {name:"Tito's Handmade Vodka",  weeklyWaste:72, pct:31,trend:"-8%", cause:"⚠️ SHRINKAGE",note:"22% vs. 18% target. 5.6 oz/day gap. Concentrated on Fri/Sat shifts.",weeks:[90,85,95,72,68,62,78,72]},
      {name:"Well Spirits Comp/Spill",weeklyWaste:38, pct:17,trend:"-10%",cause:"COMPS",        note:"Improving. Manager approval now required for comps over 2oz.",weeks:[50,48,55,38,35,32,42,38]},
      {name:"Misc Bar Waste",         weeklyWaste:21, pct:9, trend:"-12%",cause:"OPS",           note:"Mixing errors, spilled drinks. Normal operational range.",weeks:[28,25,30,21,20,18,24,21]},
    ]},
};

const overItems = [
  {id:1,name:"Sweet Potato (Fry Cut)",cat:"Produce",severity:"HIGH",curPar:200,aiPar:140,weekly:62,annual:3224,why:"Par set at menu launch, never adjusted.",fix:"Reduce to 140 lbs. Save $62/week.",
   history:[{w:"Jan W3",o:200,u:128,wv:63},{w:"Jan W4",o:200,u:132,wv:60},{w:"Feb W1",o:200,u:119,wv:71},{w:"Feb W2",o:200,u:135,wv:57},{w:"Feb W3",o:200,u:128,wv:63},{w:"Feb W4",o:200,u:122,wv:69},{w:"Mar W1",o:200,u:130,wv:62},{w:"Mar W2",o:200,u:127,wv:64}]},
  {id:2,name:"Romaine Lettuce",cat:"Produce",severity:"HIGH",curPar:72,aiPar:52,weekly:38,annual:1976,why:"Par set for summer peak.",fix:"Reduce to 52 heads.",
   history:[{w:"Jan W3",o:72,u:48,wv:44},{w:"Jan W4",o:72,u:52,wv:37},{w:"Feb W1",o:72,u:44,wv:52},{w:"Feb W2",o:72,u:50,wv:41},{w:"Feb W3",o:60,u:46,wv:26},{w:"Feb W4",o:60,u:49,wv:20},{w:"Mar W1",o:60,u:48,wv:22},{w:"Mar W2",o:60,u:47,wv:24}]},
  {id:3,name:"Avocado (Fresh)",cat:"Produce",severity:"HIGH",curPar:100,aiPar:80,weekly:36,annual:1872,why:"Round-number ordering. 3-day shelf.",fix:"Set par at 80. Order 3x weekly.",
   history:[{w:"Jan W3",o:100,u:68,wv:38},{w:"Jan W4",o:100,u:72,wv:34},{w:"Feb W1",o:100,u:65,wv:42},{w:"Feb W2",o:100,u:74,wv:31},{w:"Feb W3",o:100,u:70,wv:36},{w:"Feb W4",o:100,u:69,wv:37},{w:"Mar W1",o:100,u:72,wv:34},{w:"Mar W2",o:100,u:68,wv:38}]},
  {id:5,name:"Magistrate Stout Keg",cat:"Beer",severity:"MED",curPar:2,aiPar:1,weekly:95,annual:4940,why:"Moves 1/week, ordered 2.",fix:"Drop to 1 keg/week.",
   history:[{w:"Jan W3",o:2,u:1,wv:95},{w:"Jan W4",o:2,u:1,wv:95},{w:"Feb W1",o:2,u:2,wv:0},{w:"Feb W2",o:2,u:1,wv:95},{w:"Feb W3",o:2,u:1,wv:95},{w:"Feb W4",o:2,u:1,wv:95},{w:"Mar W1",o:2,u:1,wv:95},{w:"Mar W2",o:2,u:1,wv:95}]},
  {id:6,name:"House Chardonnay (BTG)",cat:"Wine",severity:"HIGH",curPar:18,aiPar:13,weekly:51,annual:2652,why:"Opens Friday, discards Monday.",fix:"Reduce par to 13 bottles.",
   history:[{w:"Jan W3",o:18,u:11,wv:60},{w:"Jan W4",o:18,u:13,wv:43},{w:"Feb W1",o:18,u:10,wv:68},{w:"Feb W2",o:18,u:12,wv:51},{w:"Feb W3",o:18,u:14,wv:34},{w:"Feb W4",o:18,u:13,wv:43},{w:"Mar W1",o:18,u:11,wv:60},{w:"Mar W2",o:18,u:12,wv:51}]},
];

const orderRecs = [
  {vendor:"Sysco",color:"#4a9eff",cutoff:"3:00 PM TODAY",delivery:"Tomorrow 6AM",subtotal:1881.60,savings:null,
   items:[{name:"Black Angus Ground Beef",qty:150,unit:"lbs",sub:723.00,note:"3-day supply + Spring Break pre-stock"},{name:"Brioche Burger Buns",qty:720,unit:"units",sub:345.60,note:"Matched to beef ratio"},{name:"Sharp Cheddar",qty:80,unit:"lbs",sub:408.00,note:"Replenish to par"},{name:"Applewood Bacon",qty:60,unit:"lbs",sub:405.00,note:"Replenish to par"}]},
  {vendor:"Tampa Bay Seafood",color:"#00c853",cutoff:"2:00 PM TODAY ⚡",delivery:"Tomorrow 7AM",subtotal:472.80,savings:64.80,
   items:[{name:"Atlantic Salmon Filets",qty:48,unit:"lbs",sub:472.80,note:"$1.35/lb cheaper than US Foods · redirected"}]},
  {vendor:"Cigar City Brewing",color:"#f08200",cutoff:"CALL REP NOW ⚡⚡",delivery:"Same/Next Day",subtotal:370.00,savings:null,
   items:[{name:"Jai Alai IPA 1/2 bbl",qty:2,unit:"kegs",sub:370.00,note:"URGENT — keg kicking tonight"}]},
  {vendor:"Gold Coast Eagle",color:"#ffaa33",cutoff:"2:00 PM TODAY ⚡",delivery:"Tomorrow 4AM",subtotal:384.00,savings:null,
   items:[{name:"Bud Light 1/2 bbl",qty:2,unit:"kegs",sub:256.00,note:"Kicking in 3 days"},{name:"Miller Lite 1/2 bbl",qty:1,unit:"keg",sub:122.00,note:"Replenish reserve"}]},
  {vendor:"Southern Glazer's",color:"#a78bff",cutoff:"5:00 PM TODAY",delivery:"Day After Tomorrow",subtotal:725.00,savings:null,
   items:[{name:"Tito's Vodka 1.75L",qty:4,unit:"handles",sub:112.00,note:"Well spirits"},{name:"Jack Daniel's 750mL",qty:4,unit:"bottles",sub:88.00,note:"⚠️ Pour cost flagged"},{name:"Beringer Chardonnay",qty:8,unit:"bottles",sub:68.00,note:"Reduce par 18→13"},{name:"Crusher Cab Keg 20L",qty:1,unit:"keg",sub:88.00,note:"Wine tap kicking"},{name:"Underwood Pinot Gris Keg",qty:1,unit:"keg",sub:95.00,note:"Spring Break pre-stock"},{name:"Mionetto Prosecco Keg",qty:1,unit:"keg",sub:110.00,note:"Spring Break prep"},{name:"Patrón Silver 750mL",qty:3,unit:"bottles",sub:114.00,note:"Warm weekend"},{name:"Kim Crawford SB",qty:4,unit:"bottles",sub:40.00,note:"Running low"},{name:"Meiomi Pinot Noir",qty:3,unit:"bottles",sub:42.00,note:"Replenish BTG"}]},
];

const aiSteps = [
  "Reading current food & beverage inventory levels...",
  "Scanning keg velocity — beer and wine taps...",
  "Checking open bottle & wine keg status...",
  "Flagging pour cost variance — spirits and tap wine...",
  "Running shrinkage analysis: POS vs. actual depletion...",
  "Loading invoice-based pricing from all vendors...",
  "Checking delivery windows and cutoff times...",
  "Running vendor split optimization algorithm...",
  "Cross-referencing upcoming events with par levels...",
  "Building optimized purchase orders...",
];

// ── GLOBAL APP STORE (Zustand-equivalent) ────────────────────────────────────

const AppCtx = createContext(null);

function AppProvider({ children }) {
  const [tab, setTab] = useState("waste");
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const navigate = useCallback(t => setTab(t), []);
  const addToast = useCallback(cfg => {
    const id = ++idRef.current;
    setToasts(p => [...p, { id, ...cfg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), cfg.duration || 7000);
  }, []);
  const removeToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return (
    <AppCtx.Provider value={{ tab, navigate, toasts, addToast, removeToast }}>
      {children}
    </AppCtx.Provider>
  );
}

const useApp = () => useContext(AppCtx);

// ── TOASTER (Sonner-equivalent) ───────────────────────────────────────────────

function Toaster() {
  const { toasts, removeToast, navigate } = useApp();
  if (!toasts.length) return null;
  const visible = [...toasts].slice(-4);
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:0, pointerEvents:"none", alignItems:"flex-end" }}>
      {visible.map((t, idx) => {
        const fromBottom = visible.length - 1 - idx;
        const scale = 1 - fromBottom * 0.04;
        const ty = fromBottom * 8;
        const opacity = 1 - fromBottom * 0.18;
        return (
          <div key={t.id}
            onClick={() => { if (t.tab) navigate(t.tab); removeToast(t.id); }}
            style={{ pointerEvents:"all", background:"#0d0f18", border:`1px solid ${(t.color||"#f08200")}44`, borderLeft:`3px solid ${t.color||"#f08200"}`, borderRadius:6, padding:"11px 14px", minWidth:290, maxWidth:370, cursor:t.tab?"pointer":"default", transform:`translateY(-${ty}px) scale(${scale})`, transformOrigin:"bottom right", opacity, transition:"all 0.35s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", zIndex:idx+1, marginTop:idx===0?0:-46 }}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <span style={{ fontSize:15, flexShrink:0 }}>{t.icon || "🔔"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, color:t.color||"#f08200", fontFamily:"'DM Mono',monospace", letterSpacing:2, marginBottom:3 }}>{t.type}</div>
                <div style={{ fontSize:12, color:"#c0b8b0", lineHeight:1.5 }}>{t.msg}</div>
                {t.tab && <div style={{ fontSize:9, color:"#555", fontFamily:"'DM Mono',monospace", marginTop:3 }}>→ tap to view</div>}
              </div>
              <button onClick={e => { e.stopPropagation(); removeToast(t.id); }} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16, lineHeight:1, padding:0, flexShrink:0 }}>×</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

const dL  = i => +(i.onHand / i.use).toFixed(1);
const dUK = k => +(k.ozLeft / k.dailyOz).toFixed(1);
const kC  = d => d <= 1 ? "#ff5555" : d <= 3 ? "#ffaa33" : d <= 5 ? "#4a9eff" : "#00c853";
const pF  = k => Math.round((k.ozLeft / k.ozTotal) * 100);
const rC  = r => r === "HIGH" ? "#ff3333" : r === "MED" ? "#ffaa33" : "#00c853";
const sC  = s => s === "HIGH" ? "#ff5555" : s === "MED" ? "#ffaa33" : "#4a9eff";
function cC(c) {
  if (c.includes("SHRINK")) return "#ff2222";
  if (c === "FIFO")         return "#ff5555";
  if (c === "PAR")          return "#f08200";
  if (c === "OVER-ORDER")   return "#ffaa33";
  if (c === "OPEN BTL")     return "#ff8800";
  if (c === "KEG WASTE")    return "#4a9eff";
  if (c === "COMPS" || c === "POUR COST") return "#a78bff";
  return "#555";
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function AnimCount({ val, pre = "", suf = "", dur = 1200 }) {
  const [n, setN] = useState(0);
  const t = useRef(null);
  useEffect(() => {
    t.current = null;
    const go = ts => {
      if (!t.current) t.current = ts;
      const p = Math.min((ts - t.current) / dur, 1);
      setN(Math.floor((1 - Math.pow(1 - p, 4)) * val));
      if (p < 1) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }, [val]);
  return <>{pre}{n.toLocaleString()}{suf}</>;
}

function KegGauge({ pct, color, size = 52 }) {
  const r = size / 2 - 4, circ = 2 * Math.PI * r, fill = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2230" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
    </svg>
  );
}

function Sparkline({ weeks, color, h = 28 }) {
  const max = Math.max(...weeks), min = Math.min(...weeks), range = max - min || 1, w = 90;
  const pts = weeks.map((v, i) => `${(i / (weeks.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.8}/>
      {weeks.map((v, i) => i === weeks.length - 1 && <circle key={i} cx={(i/(weeks.length-1))*w} cy={h-((v-min)/range)*(h-4)-2} r={3} fill={color}/>)}
    </svg>
  );
}

function SL({ children, color = "#555" }) {
  return <div style={{ fontSize:9, color, letterSpacing:2, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", marginBottom:10 }}>{children}</div>;
}

function RiskMeter({ score }) {
  const col = score >= 70 ? "#ff3333" : score >= 40 ? "#ffaa33" : "#00c853";
  return <div style={{ width:80, height:7, background:"#1e2230", borderRadius:4, overflow:"hidden" }}><div style={{ height:"100%", width:`${score}%`, background:col, borderRadius:4 }}/></div>;
}

const DarkTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0a0c14", border:"1px solid #1e2230", borderRadius:4, padding:"8px 12px" }}>
      {label && <div style={{ fontSize:9, color:"#555", fontFamily:"'DM Mono',monospace", marginBottom:4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize:11, color:p.color||"#e8ddd0", fontFamily:"'DM Mono',monospace", marginBottom:1 }}>
          {p.name}: {typeof p.value === "number" ? "$" + p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

// ── useSort (TanStack Table-equivalent) ───────────────────────────────────────

function useSort(data, defKey = null, defDir = "desc") {
  const [key, setKey] = useState(defKey);
  const [dir, setDir] = useState(defDir);
  const sorted = useMemo(() => {
    if (!key) return data;
    return [...data].sort((a, b) => {
      const av = a[key], bv = b[key];
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return dir === "asc" ? cmp : -cmp;
    });
  }, [data, key, dir]);
  const toggle = k => { if (key === k) setDir(d => d === "asc" ? "desc" : "asc"); else { setKey(k); setDir("desc"); } };
  const SortBtn = ({ k, label }) => (
    <button onClick={() => toggle(k)} style={{ background:"none", border:"none", color:key===k?"#f08200":"#444", cursor:"pointer", fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:1, padding:0 }}>
      {label} {key === k ? (dir === "asc" ? "↑" : "↓") : "↕"}
    </button>
  );
  return { sorted, SortBtn };
}

// ── [Component implementations continue — see full source in App.jsx] ─────────
// The complete component tree is included in the repository.
// Components: WasteAnalytics, AiOrderEngine, BarBev, MorningBrief,
//             FifoManager, SeasonalIntel, OverorderAnalysis, AppInner

// For brevity in this header file, see the complete implementation
// in the Claude.ai artifact export or request the full source.

export { AppProvider, useApp, Toaster, AnimCount, KegGauge, Sparkline, SL, RiskMeter, DarkTip, useSort };
export { inventory, kegs, wineProgram, liquor, weather, events, wasteHistory, theftSignals, wasteByCategory, overItems, orderRecs, aiSteps };
export { dL, dUK, kC, pF, rC, sC, cC };

// Default export is the full App — see repository for complete implementation
export default function App() {
  return <AppProvider><div style={{ fontFamily:"sans-serif", padding:40, color:"#333" }}><h1>RotateAI v6</h1><p>See src/App.jsx for the full interactive demo.</p></div></AppProvider>;
}
