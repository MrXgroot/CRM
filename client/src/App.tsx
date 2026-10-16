import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/Login/Login';
import { RequireAuth } from './components/AuthMiddleware';
import MainLayout from './components/MainLayout/MainLayout';
import Profile from './pages/Profile';
import { useEffect, useRef, useState } from 'react';
import { axios } from './utils/axios';
import Loader from './components/Loader';
import Entity from './pages/Masters/Entity';
import Roles from './pages/Masters/Roles';
import PagesMaster from './pages/Masters/PagesMaster';
import Branch from './pages/Masters/Branch';
import NotFound from './pages/NotFound';
import Users from './pages/Masters/Users';
import ChangePassword from './pages/changePassword';
import Designation from './pages/Masters/Designation';
import LeadsPage from './pages/CRM/Leads';
import CustomersPage from './pages/CRM/Customers';
import DealsPage from './pages/CRM/Deals';
import ActivitiesPage from './pages/CRM/Activities';
import ReportsPage from './pages/CRM/Reports';
import { toastError } from './utils/SweetAlert';
import Home from './pages/Home';
import CustomerPortal from './pages/Portal/CustomerPortal';
import StaffSupport from './pages/Portal/StaffSupport';

export default function App() {
    const [loading, setloading] = useState(0);
    const { signout } = useAuth();
    const navigate = useNavigate();
    const interceptorsSet = useRef(false);

    useEffect(() => {
        if (!interceptorsSet.current) {
            axios.interceptors.request.use(
                (config) => {
                    setloading(prev => (prev + 1));
                    return config;
                },
                (error) => {
                    return Promise.reject(error);
                }
            );

            axios.interceptors.response.use(
                (res) => {
                    setloading(prev => (prev - 1));
                    return res;
                },
                (error) => {
                    setloading(prev => (prev - 1));
                    if (
                        error.response?.status == 500 &&
                        error.response?.data?.code == 120 &&
                        window.location.pathname != '/login'
                    ) {
                        signout(() => {
                            navigate('/login');
                        });
                        toastError.fire({
                            title: error.response.data.message,
                        });
                    } else {
                        return Promise.reject(error);
                    }
                }
            );

            interceptorsSet.current = true;
        }
    }, [navigate, signout]);

    return (
        <>
            {loading > 0 && <Loader />}
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/customer/login" element={<LoginPage customer />} />
                <Route path="/portal" element={<CustomerPortal />} />

                <Route element={<MainLayout />}>
                    <Route path="/crm/support" element={<RequireAuth><StaffSupport /></RequireAuth>} />
                    <Route path="/crm/reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />
                    <Route
                        path="/"
                        element={
                            <RequireAuth>
                                <Home />
                            </RequireAuth> 
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <RequireAuth>
                                <Profile />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/changePassword"
                        element={
                            <RequireAuth>
                                <ChangePassword />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/entity"
                        element={
                            <RequireAuth>
                                <Entity />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/branch"
                        element={
                            <RequireAuth>
                                <Branch />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/roles"
                        element={
                            <RequireAuth>
                                <Roles />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <RequireAuth>
                                <Users />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/designation"
                        element={
                            <RequireAuth>
                                <Designation />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/pages"
                        element={
                            <RequireAuth>
                                <PagesMaster />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/crm/leads"
                        element={
                            <RequireAuth>
                                <LeadsPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/crm/customers"
                        element={
                            <RequireAuth>
                                <CustomersPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/crm/deals"
                        element={
                            <RequireAuth>
                                <DealsPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/crm/activities"
                        element={
                            <RequireAuth>
                                <ActivitiesPage />
                            </RequireAuth>
                        }
                    />
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
}

