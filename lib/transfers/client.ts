import type { Transfer,TransferInput,TransferStatus,TransferEvent,Provider } from './domain';
async function request<T>(path:string,init?:RequestInit):Promise<T>{const r=await fetch('/api'+path,{...init,headers:{'Content-Type':'application/json',...init?.headers},cache:'no-store'});const body=await r.json() as T & {message?:string};if(!r.ok)throw new Error(body.message||'No fue posible completar la operación');return body;}
// Adapt this service to the portal Axios client when integrating.
export const transferService={
 list:()=>request<{data:Transfer[]}>('/transfers'),detail:(id:string)=>request<{data:Transfer;events:TransferEvent[]}>('/transfers/'+id),create:(input:TransferInput)=>request<{data:Transfer}>('/transfers',{method:'POST',body:JSON.stringify(input)}),update:(t:Transfer,input:TransferInput,status:TransferStatus)=>request<{data:Transfer}>('/transfers/'+t.id,{method:'PATCH',body:JSON.stringify({version:t.version,input,status})}),providers:()=>request<{data:Provider[]}>('/providers'),saveProvider:(p:Provider)=>request<{data:Provider}>('/providers',{method:'PUT',body:JSON.stringify(p)})
};
