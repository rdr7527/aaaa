import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root to the new static home page
  redirect('/home/index.html');
}
