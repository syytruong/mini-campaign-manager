import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { CampaignDetailPage } from '../pages/CampaignDetailPage';
import { CampaignsPage } from '../pages/CampaignsPage';
import { LoginPage } from '../pages/LoginPage';
import { NewCampaignPage } from '../pages/NewCampaignPage';
import { RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/campaigns" replace /> },
      { path: 'campaigns', element: <CampaignsPage /> },
      { path: 'campaigns/new', element: <NewCampaignPage /> },
      { path: 'campaigns/:id', element: <CampaignDetailPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
