import { currentUser } from '../lib/auth';
import WorkDoc from './workdoc';
export const dynamic = 'force-dynamic';
export default async function Home() { const user=await currentUser(); return <WorkDoc initialUser={user}/>; }
