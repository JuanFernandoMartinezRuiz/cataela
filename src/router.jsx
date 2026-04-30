import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from './components/admin/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import PublicLayout from './layouts/PublicLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminFinancePage from './pages/admin/AdminFinancePage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminProductFormPage from './pages/admin/AdminProductFormPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminRafflesPage from './pages/admin/AdminRafflesPage'
import CatalogPage from './pages/public/CatalogPage'
import HomePage from './pages/public/HomePage'
import NotFoundPage from './pages/public/NotFoundPage'
import ProductDetailPage from './pages/public/ProductDetailPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalogo', element: <CatalogPage /> },
      { path: 'producto/:slug', element: <ProductDetailPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'productos', element: <AdminProductsPage /> },
      { path: 'categorias', element: <AdminCategoriesPage /> },
      { path: 'pedidos', element: <AdminOrdersPage /> },
      { path: 'finanzas', element: <AdminFinancePage /> },
      { path: 'productos/nuevo', element: <AdminProductFormPage /> },
      { path: 'productos/:id', element: <AdminProductFormPage /> },
      { path: 'rifas', element: <AdminRafflesPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
