const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm')
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(name=>name in mocks?mocks[name]:require(name),module,module.exports);return module.exports}
const policy=load('lib/opportunity-policy.ts',{'./countries':load('lib/countries.ts')})
const dbSchema=load('lib/db/schema.ts')
const next={'@/lib/server-log':{serverLog(){}},'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}}}
const id='123e4567-e89b-42d3-a456-426614174000'

test('support is public without exposing private applicant routes',async()=>{
 const route=load('middleware.ts',{
  '@clerk/nextjs/server':{clerkMiddleware:fn=>fn,createRouteMatcher:paths=>req=>paths.includes(req.nextUrl.pathname)},
  '@/lib/admin-session':{},'@/lib/request-origin':{},
  'next/server':{NextResponse:{next:()=>new Response(null,{status:200}),json:(body,init)=>Response.json(body,init),redirect:()=>new Response(null,{status:307})}},
 })
 const response=await route.default(()=>{throw Error('support must not require login')},{method:'GET',nextUrl:{pathname:'/support'}})
 assert.equal(response.status,200)
 const privateResponse=await route.default(async()=>({userId:null}),{method:'GET',nextUrl:{pathname:'/api/applications'},url:'http://localhost/api/applications'})
 assert.equal(privateResponse.status,401)
})

test('document assignment rejects a missing opportunity before writing',async()=>{
 const route=load('app/api/admin/document-types/route.ts',{...next,'@/lib/opportunity-policy':policy,'@/lib/db/schema':dbSchema,'@/lib/db':{db:{query:{programs:{findFirst:async()=>undefined}},insert:()=>{throw Error('must not write')}}},'@/lib/require-admin':{requireAdmin:async()=>({admin:{id}})}})
 const response=await route.POST(new Request('http://localhost/api/admin/document-types',{method:'POST',body:JSON.stringify({name:'Transcript',section:'academic',acceptedFormats:['pdf'],maxSizeMb:4,isGlobal:false,programId:id,isMandatory:true})}))
 assert.equal(response.status,404)
})

test('worker must change the temporary password before accessing assigned applications',async()=>{
 const route=load('app/api/worker/applications/route.ts',{...next,'@/lib/db/schema':dbSchema,'@/lib/db':{db:{query:{users:{findFirst:async()=>({id,role:'worker',isActive:true,firstLogin:true})}},select:()=>{throw Error('must not read applications')}}},'@clerk/nextjs/server':{auth:async()=>({userId:'test-worker'})},'@/lib/require-admin':{requireAdmin:async()=>{throw Error('worker is not admin')}}})
 const response=await route.GET()
 assert.equal(response.status,403)
 assert.equal((await response.json()).code,'PASSWORD_CHANGE_REQUIRED')
})

test('standalone opportunity accepts a typed name without a school and validates lifecycle input',()=>{
 const good={title:'Chevening',deadline:'',scholarshipAvailable:true,opportunityStatus:'draft'}
 assert.equal(policy.opportunitySchema.safeParse(good).success,true)
 for(const extra of [{title:' '},{deadline:'2027-02-30'},{opportunityStatus:'published'},{universityId:id},{isActive:true}]) assert.equal(policy.opportunitySchema.safeParse({...good,...extra}).success,false)
})

test('creating an opportunity requires PIN-verified administrator access',async()=>{
 const route=load('app/api/admin/opportunities/route.ts',{...next,'@/lib/opportunity-policy':policy,'@/lib/db/schema':dbSchema,'@/lib/db':{db:{}},'@/lib/require-admin':{requireAdmin:async()=>({response:Response.json({error:'Forbidden'},{status:403})})}})
 const response=await route.POST(new Request('http://localhost/api/admin/opportunities',{method:'POST',body:'{}'}))
 assert.equal(response.status,403)
})

test('standalone opportunity creation saves a draft without inventing a school',async()=>{
 let values
 const route=load('app/api/admin/opportunities/route.ts',{...next,'@/lib/opportunity-policy':policy,'@/lib/db/schema':dbSchema,'@/lib/db':{db:{insert:()=>({values:v=>{values=v;return{returning:async()=>[{id,...v}]}}})}},'@/lib/require-admin':{requireAdmin:async()=>({user:{id}})}})
 const response=await route.POST(new Request('http://localhost/api/admin/opportunities',{method:'POST',body:JSON.stringify({title:'Erasmus Mundus',deadline:'',scholarshipAvailable:true,opportunityStatus:'draft'})}))
 assert.equal(response.status,200)
 assert.equal(values.universityId,undefined)
 assert.equal(values.isActive,false)
 assert.equal(values.deadline,null)
})
test('country price rejects zero, negative amounts, invalid country and unexpected fields',()=>{
 const good={programId:id,payerCountry:'NG',amount:'25000.50',currency:'NGN',bankDetails:'Test bank details only',active:true}
 assert.equal(policy.priceSchema.safeParse(good).success,true)
 for(const overrides of [{amount:'0'},{amount:'-1'},{amount:'NaN'},{amount:'1.234'},{payerCountry:'XX'},{currency:'ngn'},{clientId:id}]) assert.equal(policy.priceSchema.safeParse({...good,...overrides}).success,false)
})
test('checkout accepts a price identifier, never applicant-provided amounts or bank accounts',()=>{
 assert.equal(policy.checkoutSchema.safeParse({priceId:id}).success,true)
 for(const extra of [{amount:'1'},{currency:'NGN'},{bankDetails:'mine'},{clientId:id},{paymentConfirmed:true}]) assert.equal(policy.checkoutSchema.safeParse({priceId:id,...extra}).success,false)
})
test('portal requests refresh authentication and never send tokens to outside URLs',async()=>{
 let requested,tokenCalls=0
 const original=globalThis.fetch
 try{
 globalThis.fetch=async(path,options)=>{requested={path,options};return Response.json({ok:true})}
 const hook=load('lib/use-portal-fetch.ts',{'react':{useCallback:fn=>fn},'@clerk/nextjs':{useAuth:()=>({getToken:async()=>{tokenCalls++;return 'test-token-only'}})}})
 const fetch=hook.usePortalFetch()
 await assert.rejects(fetch('https://outside.example/api/'))
 assert.equal(tokenCalls,0)
 await fetch('/api/opportunities',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
 assert.equal(tokenCalls,1);assert.equal(requested.options.headers.get('Authorization'),'Bearer test-token-only')
 assert.equal(requested.options.headers.get('Content-Type'),'application/json')
 assert.equal(requested.options.credentials,'same-origin')
 }finally{globalThis.fetch=original}
})
test('document readiness requires valid upload or waiver for the exact document',()=>{
 assert.equal(policy.requirementSatisfied('a',[{documentTypeId:'a',status:'rejected'}],[]),false)
 assert.equal(policy.requirementSatisfied('a',[{documentTypeId:'a',status:'uploaded'}],[]),true)
 assert.equal(policy.requirementSatisfied('a',[],[{documentTypeId:'b'}]),false)
 assert.equal(policy.requirementSatisfied('a',[],[{documentTypeId:'a'}]),true)
})
test('opportunity payment receipt does not become a second document requirement',()=>{
 const applies=policy.appliesToApplicationDocuments
 assert.equal(applies({name:'Receipt',global:true},true),false)
 assert.equal(applies({name:' receipt ',global:true},true),false)
 assert.equal(applies({name:'Receipt',global:true},false),true)
 assert.equal(applies({name:'Receipt',global:false},true),true)
 assert.equal(applies({name:'Recommendation letter',global:true},true),true)
})
test('price changes, payment review and waivers reject non-admin access before database use',async()=>{
 const mocks={...next,'@/lib/opportunity-policy':policy,'@/lib/db/schema':dbSchema,'@/lib/db':{db:{}},'@/lib/r2':{},'@/lib/require-admin':{requireAdmin:async()=>({response:Response.json({error:'Forbidden'},{status:403})})}}
 for(const [file,method] of [['opportunity-prices','POST'],['opportunity-payments','PATCH'],['document-waivers','POST']]){
 const route=load(`app/api/admin/${file}/route.ts`,mocks)
 assert.equal((await route[method](new Request('https://example.test/api',{method,body:'{}'}))).status,403)
 }
})
test('checkout rejects a tampered price before database function execution',async()=>{
 let calls=0
 const route=load('app/api/opportunities/route.ts',{...next,'@clerk/nextjs/server':{auth:async()=>({userId:'clerk'})},'@/lib/client-profile':{ensureClientProfile:async()=>({id,isActive:true,role:'client'})},'@/lib/opportunity-policy':policy,'@/lib/db/schema':dbSchema,'@/lib/db':{db:{execute:async()=>{calls++;return {rows:[{id}]}}}}})
 assert.equal((await route.POST(new Request('https://example.test/api',{method:'POST',body:JSON.stringify({priceId:id,amount:'1'})}))).status,400)
 assert.equal(calls,0)
 assert.equal((await route.POST(new Request('https://example.test/api',{method:'POST',body:JSON.stringify({priceId:id})}))).status,200)
 assert.equal(calls,1)
})
