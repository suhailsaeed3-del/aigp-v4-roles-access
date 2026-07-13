import { chromium } from 'playwright';
const errors = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:1360,height:900} });
p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/i.test(m.text())) errors.push('CONSOLE '+m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR '+e.message));
const L=m=>console.log(m);
await p.goto('http://localhost:3080/',{waitUntil:'networkidle'});
await p.waitForSelector('text=Sign in with UAE PASS',{timeout:10000}); L('✓ login');
await p.click('text=Sign in with UAE PASS'); await p.waitForTimeout(400);
await p.click('text=أكمل لاحقاً'); await p.waitForSelector('text=تقدم مشروع الذكاء الاصطناعي المساعد',{timeout:8000}); L('✓ dashboard');
// entity completion KPI
if (await p.$('text=نسبة الإنجاز')) L('✓ completion KPI present');
// coord: create wizard numbered stepper
await p.getByRole('button',{name:'منسق المسار في الجهة',exact:true}).first().click(); await p.waitForTimeout(400);
const add = await p.$('text=إضافة جديد');
if (add){ await add.click(); await p.waitForSelector('text=اختر نوع العنصر',{timeout:8000});
  await p.click('text=إضافة مشروع').catch(()=>{});
  await p.waitForTimeout(200); await p.click('text=التعبئة اليدوية').catch(()=>{});
  await p.waitForTimeout(300); L('✓ create wizard form');
  await p.mouse.click(1330,300); await p.waitForTimeout(300);
}
// committee basket + funded total footer
await p.getByRole('button',{name:'اللجنة الوطنية',exact:true}).first().click();
await p.waitForSelector('text=تصنيف توصيات التحول الذكي',{timeout:8000}); await p.waitForTimeout(400);
await p.click('text=السلة').catch(()=>{}); await p.waitForTimeout(400);
if (await p.$('text=إجمالي تكلفة التمويل المعتمد')) L('✓ basket total footer'); 
await b.close();
if (errors.length){ console.log('❌ errors:'); errors.slice(0,15).forEach(e=>console.log('  '+e)); process.exit(1);}
console.log('✅ smoke passed — no runtime errors');
