'use client'
import { useState } from 'react'
import OptionalExperience from './optional-experience'
import { useWizard } from '../wizard-context'
const categories = [
  {title:'Work Experience',description:'Add relevant professional experience.',fields:[{key:'jobTitle',label:'Job title'},{key:'company',label:'Company'},{key:'location',label:'Location'},{key:'period',label:'Period'}]},
  {title:'Awards & Achievements',description:'Add awards and achievements that strengthen your application.',fields:[{key:'title',label:'Award title'},{key:'body',label:'Awarding body'},{key:'year',label:'Year',type:'number'}]},
  {title:'Publications',description:'List publications, articles or conference papers.',fields:[{key:'title',label:'Publication title'},{key:'type',label:'Type'},{key:'year',label:'Year',type:'number'},{key:'link',label:'DOI or link'}]},
  {title:'Teaching Experience',description:'Add teaching, mentoring or tutoring experience.',fields:[{key:'institution',label:'Institution'},{key:'location',label:'Location'},{key:'role',label:'Role'},{key:'period',label:'Period'}]},
  {title:'Certifications',description:'Add professional or academic certifications.',fields:[{key:'title',label:'Certification title'},{key:'body',label:'Awarding body'},{key:'date',label:'Date'},{key:'format',label:'Online or in-person'}]},
  {title:'Voluntary Experience',description:'Add community service and voluntary work.',fields:[{key:'organization',label:'Organization'},{key:'role',label:'Role'},{key:'period',label:'Period'}]},
  {title:'Leadership',description:'Add leadership positions and responsibilities.',fields:[{key:'position',label:'Position'},{key:'organization',label:'Organization'},{key:'years',label:'Year(s)'}]},
  {title:'Clubs & Associations',description:'Add clubs, societies and professional associations.',fields:[{key:'name',label:'Club or association'},{key:'role',label:'Role'},{key:'years',label:'Year(s)'}]},
]
export default function Experience(){
  const [selected,setSelected]=useState(0)
  const {flushSave,isSaving}=useWizard()
  return <div className="space-y-6"><label className="block rounded-xl border bg-white p-5 text-sm font-semibold">Experience category (optional)<select className="mt-3 w-full" value={selected} disabled={isSaving} onChange={async event=>{const value=Number(event.target.value);if(await flushSave())setSelected(value)}}>{categories.map((category,index)=><option key={category.title} value={index}>{category.title}</option>)}</select><span className="mt-3 block font-normal text-text-secondary">Add the experience that applies to you. You can skip this section and come back later.</span></label><OptionalExperience key={selected} {...categories[selected]}/></div>
}
