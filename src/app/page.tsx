import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to login page by default. 
  // AuthProvider and protected routes will handle further redirection.
  redirect('/login');
  return null; 
}
