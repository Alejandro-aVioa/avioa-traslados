import { requireChatGPTUser } from './chatgpt-auth';
import TransfersApp from '@/components/transfers/TransfersApp';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireChatGPTUser('/');return <TransfersApp userName={user.fullName||user.email.split('@')[0]}/>;}
