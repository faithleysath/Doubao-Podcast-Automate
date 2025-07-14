import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import Demo from './demo'
import ArticleUpload from './components/ArticleUpload'

const router = createBrowserRouter([
  {
    path: '/',
    element: <ArticleUpload></ArticleUpload>
  },
  {
    path: '/demo',
    element: <Demo />
  },
  {
    path: '/test',
    element: <textarea style={{
      resize: 'none',
      overflow: 'hidden',
      minHeight: '50px',
      height: 'auto',
      boxSizing: 'border-box',
    }}></textarea>
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
