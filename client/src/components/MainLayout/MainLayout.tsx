import { Outlet } from 'react-router-dom';
import Nav from '../Nav/Nav';
import Footer from '../Footer/Footer';
export default function MainLayout(){return <div className="crm-shell"><Nav/><main className="workspace-content" id="main-content"><Outlet/></main><Footer/></div>}
